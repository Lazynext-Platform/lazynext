'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Sparkles, Loader2, ArrowRight, CheckCircle2, AlertCircle,
  Target, Fish, FileText, Clapperboard, TrendingUp, Coins,
  MessageSquare, Wand2, X, Scissors,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';

type DirectorStep = {
  name: string;
  status: StepStatus;
  result?: unknown;
  error?: string;
  creditsSpent: number;
};

type DirectorResult = {
  steps: DirectorStep[];
  brief?: { product: string; platform: string; format: string; targetAudience: string; keyMessage: string; tone: string; cta: string };
  hooks?: Array<{ hook: string; type: string; rationale: string }>;
  angles?: Array<{ name: string; description: string; emotionalDriver: string }>;
  bestCombination?: {
    angle: { name: string; description: string };
    hook: { hook: string; type: string };
    script: { scenes: Array<{ beat: string; visual: string; voiceover: string }> };
    score: { overall: number; hookStrength: number; clarity: number; emotionalImpact: number; ctaStrength: number; notes: string };
  };
  variants?: Array<{ id: string; variationType: string; hook: string; rationale: string }>;
  totalCreditsSpent: number;
  budgetCredits: number;
};

export default function CreativeDirectorPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [productUrl, setProductUrl] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [productText, setProductText] = useState('');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [budget, setBudget] = useState(30);

  const [step, setStep] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<DirectorResult | null>(null);
  const [error, setError] = useState('');
  const [liveSteps, setLiveSteps] = useState<DirectorStep[]>([]);
  const [liveCredits, setLiveCredits] = useState(0);

  // Conversational refinement state
  const [refineTarget, setRefineTarget] = useState<'hook' | 'angle' | 'script'>('hook');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineResult, setRefineResult] = useState<{ refined: Record<string, unknown>; refinementNote: string } | null>(null);
  const [refineError, setRefineError] = useState('');

  const run = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!productUrl.trim() && !productText.trim()) return;
    setStep('loading'); setError(''); setResult(null);
    setLiveSteps([]); setLiveCredits(0);

    try {
      const res = await fetch('/api/creative/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: productUrl.trim() || undefined,
          brandUrl: brandUrl.trim() || undefined,
          productText: productText.trim() || undefined,
          productName: productName.trim() || undefined,
          platform,
          budgetCredits: budget,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'director_failed');
      }

      // Stream NDJSON response for real-time step updates
      const reader = res.body?.getReader();
      if (!reader) throw new Error('no_stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: DirectorResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.event === 'step') {
              const s = msg.data as DirectorStep;
              setLiveSteps((prev) => {
                const idx = prev.findIndex((p) => p.name === s.name);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = s;
                  return next;
                }
                return [...prev, s];
              });
              if (msg.data.totalCreditsSpent !== undefined) {
                setLiveCredits(msg.data.totalCreditsSpent);
              }
            } else if (msg.event === 'complete') {
              finalResult = msg.data as DirectorResult;
            } else if (msg.event === 'error') {
              throw new Error(msg.data.error || 'director_failed');
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }

      if (finalResult) {
        setResult(finalResult);
        setLiveSteps(finalResult.steps);
      }
      setStep('done');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStep('error');
    }
  }, [session, productUrl, brandUrl, productText, productName, platform, budget]);

  const refine = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!result?.brief || !refineInstruction.trim()) return;

    let element: Record<string, unknown>;
    if (refineTarget === 'hook' && result.bestCombination) {
      element = { type: result.bestCombination.hook.type, text: result.bestCombination.hook.hook };
    } else if (refineTarget === 'angle' && result.bestCombination) {
      element = { name: result.bestCombination.angle.name, description: result.bestCombination.angle.description };
    } else if (refineTarget === 'script' && result.bestCombination) {
      element = { scenes: result.bestCombination.script.scenes, cta: result.bestCombination.script.scenes };
    } else {
      return;
    }

    setRefineLoading(true); setRefineError(''); setRefineResult(null);
    try {
      const res = await fetch('/api/creative/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: refineTarget,
          instruction: refineInstruction.trim(),
          brief: result.brief,
          element,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'refine_failed');
      }
      const data = await res.json();
      setRefineResult(data.result);
    } catch (e) {
      setRefineError(String(e instanceof Error ? e.message : e));
    } finally {
      setRefineLoading(false);
    }
  }, [session, result, refineTarget, refineInstruction]);

  const stepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-danger" />;
      case 'awaiting_approval': return <Target className="h-4 w-4 text-warning" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-line" />;
    }
  };

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <Sparkles className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('director.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          {t('director.subtitle')}
        </p>

        {/* Input */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-fg">{t('director.input')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-url">{t('director.productUrl')}</label>
              <input
                id="product-url"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://shop.example.com/product"
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="brand-url">{t('director.brandUrl')}</label>
              <input
                id="brand-url"
                type="url"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="https://brand.example.com"
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-text">{t('director.productDesc')}</label>
              <textarea
                id="product-text"
                value={productText}
                onChange={(e) => setProductText(e.target.value)}
                placeholder="Product name, key features, benefits, price..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-name">{t('director.productName')}</label>
              <input
                id="product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Glow Serum"
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="platform">{t('director.platform')}</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="budget">{t('director.creditBudget', { budget })}</label>
              <input
                id="budget"
                type="range"
                min={10}
                max={50}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <button
            onClick={run}
            disabled={step === 'loading' || (!productUrl.trim() && !productText.trim())}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#0064d9' }}
          >
            {step === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {step === 'loading' ? t('director.running') : t('director.run', { budget })}
          </button>
        </section>

        {/* Error */}
        {step === 'error' && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        {/* Steps progress — live during loading, final when done */}
        {(liveSteps.length > 0 || result) && (
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-fg">
              {step === 'loading' ? t('director.pipelineProgress') : t('director.pipelineSteps')}
            </h2>
            <div className="mt-3 space-y-2">
              {(step === 'loading' ? liveSteps : result?.steps || []).map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  {stepIcon(s.status)}
                  <span className="font-medium text-fg">{s.name}</span>
                  <span className="text-fg-faint">{s.creditsSpent > 0 && `${s.creditsSpent}cr`}</span>
                  {s.error && <span className="text-danger">{s.error}</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-fg-faint">
              <Coins className="h-3 w-3" />
              {t('director.spent', { spent: step === 'loading' ? liveCredits : result?.totalCreditsSpent || 0, budget: result?.budgetCredits || budget })}
            </div>
          </section>
        )}

        {/* Brief */}
        {result?.brief && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><FileText className="h-4 w-4 text-brand-accent" /> {t('director.brief')}</h2>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><span className="text-fg-faint">{t('director.briefProduct')}</span> <span className="text-fg">{result.brief.product}</span></div>
              <div><span className="text-fg-faint">{t('director.briefPlatform')}</span> <span className="text-fg">{result.brief.platform}</span></div>
              <div><span className="text-fg-faint">{t('director.briefFormat')}</span> <span className="text-fg">{result.brief.format}</span></div>
              <div><span className="text-fg-faint">{t('director.briefAudience')}</span> <span className="text-fg">{result.brief.targetAudience}</span></div>
              <div className="sm:col-span-2"><span className="text-fg-faint">{t('director.briefKeyMessage')}</span> <span className="text-fg">{result.brief.keyMessage}</span></div>
              <div><span className="text-fg-faint">{t('director.briefTone')}</span> <span className="text-fg">{result.brief.tone}</span></div>
              <div><span className="text-fg-faint">{t('director.briefCta')}</span> <span className="text-fg">{result.brief.cta}</span></div>
            </div>
          </section>
        )}

        {/* Hooks */}
        {result?.hooks && result.hooks.length > 0 && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Fish className="h-4 w-4 text-brand-accent" /> {t('director.hooks')}</h2>
            <div className="mt-3 space-y-2">
              {result.hooks.map((h, i) => (
                <div key={i} className="rounded-xl border border-line bg-app p-3 text-xs">
                  <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{h.type}</span>
                  <p className="mt-1.5 text-fg">{h.hook}</p>
                  <p className="mt-1 text-fg-faint">{h.rationale}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Best combination */}
        {result?.bestCombination && (
          <section className="mt-4 rounded-2xl border-2 border-brand-accent/30 bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
              <TrendingUp className="h-4 w-4 text-success" /> {t('director.bestCombination', { score: result.bestCombination.score.overall })}
            </h2>
            <div className="mt-3 space-y-3 text-xs">
              <div className="rounded-xl bg-app p-3">
                <span className="font-bold text-fg">{t('director.angle')}</span> <span className="text-fg">{result.bestCombination.angle.name}</span>
                <p className="mt-1 text-fg-faint">{result.bestCombination.angle.description}</p>
              </div>
              <div className="rounded-xl bg-app p-3">
                <span className="font-bold text-fg">{t('director.hook')}</span> <span className="text-fg">{result.bestCombination.hook.hook}</span>
              </div>
              {result.bestCombination.script.scenes && (
                <div className="rounded-xl bg-app p-3">
                  <span className="font-bold text-fg">{t('director.scriptScenes')}</span>
                  <div className="mt-1 space-y-1">
                    {result.bestCombination.script.scenes.map((s, i) => (
                      <div key={i} className="text-fg-faint">
                        <span className="font-medium text-fg">{s.beat}:</span> {s.voiceover}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-app p-3">
                <span className="font-bold text-fg">{t('director.scoreBreakdown')}</span>
                <div className="mt-1 grid grid-cols-2 gap-1 text-fg-faint">
                  <span>{t('director.scoreHook')} {result.bestCombination.score.hookStrength}/10</span>
                  <span>{t('director.scoreClarity')} {result.bestCombination.score.clarity}/10</span>
                  <span>{t('director.scoreEmotion')} {result.bestCombination.score.emotionalImpact}/10</span>
                  <span>{t('director.scoreCta')} {result.bestCombination.score.ctaStrength}/10</span>
                </div>
                {result.bestCombination.score.notes && <p className="mt-1 text-fg-faint">{result.bestCombination.score.notes}</p>}
              </div>
            </div>
            <Link href="/creative-studio" className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
              <Clapperboard className="h-3 w-3" /> {t('director.openInStudio')} <ArrowRight className="h-3 w-3" />
            </Link>
            {result.bestCombination?.script?.scenes && result.bestCombination.script.scenes.length > 0 && (() => {
              const scenes = result.bestCombination.script.scenes;
              // Estimate duration from word count (~2.5 words/sec speech rate),
              // falling back to 3s per scene if no voiceover text
              const segments = scenes.reduce<{ start: number; end: number; text: string }[]>((acc, s) => {
                const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
                const text = s.voiceover || s.beat;
                const wordCount = text.split(/\s+/).filter(Boolean).length;
                const dur = wordCount > 0 ? Math.max(wordCount / 2.5, 1.5) : 3;
                acc.push({ start, end: start + dur, text });
                return acc;
              }, []);
              const totalDuration = segments.length > 0 ? segments[segments.length - 1].end : scenes.length * 3;
              return (
                <Link
                  href={`/editor?transcript=${encodeURIComponent(JSON.stringify({
                    text: scenes.map(s => s.voiceover || s.beat).join(' '),
                    duration: totalDuration,
                    segments,
                  }))}`}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
                >
                  <Scissors className="h-3 w-3" /> {t('director.sendToEditor')} <ArrowRight className="h-3 w-3" />
                </Link>
              );
            })()}
          </section>
        )}

        {/* Variants */}
        {result?.variants && result.variants.length > 0 && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Sparkles className="h-4 w-4 text-brand-accent" /> {t('director.variants')}</h2>
            <div className="mt-3 space-y-2">
              {result.variants.map((v) => (
                <div key={v.id} className="rounded-xl border border-line bg-app p-3 text-xs">
                  <span className="rounded bg-[#00b2fc]/15 px-1.5 py-0.5 text-[10px] font-medium" style={{ color: 'var(--color-brand-accent)' }}>{v.variationType}</span>
                  <p className="mt-1.5 text-fg">{v.hook}</p>
                  <p className="mt-1 text-fg-faint">{v.rationale}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conversational Refinement */}
        {result?.bestCombination && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
              <MessageSquare className="h-4 w-4 text-brand-accent" /> {t('director.refineTitle')}
            </h2>
            <p className="mt-1 text-xs text-fg-faint">{t('director.refineSubtitle')}</p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-fg-faint" htmlFor="refine-target">{t('director.refineTarget')}</label>
                <select
                  id="refine-target"
                  value={refineTarget}
                  onChange={(e) => setRefineTarget(e.target.value as 'hook' | 'angle' | 'script')}
                  className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
                >
                  <option value="hook">{t('director.refineTargetHook')}</option>
                  <option value="angle">{t('director.refineTargetAngle')}</option>
                  <option value="script">{t('director.refineTargetScript')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-fg-faint" htmlFor="refine-instruction">{t('director.refineInstruction')}</label>
                <textarea
                  id="refine-instruction"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-brand-accent"
                />
              </div>
              <button
                onClick={refine}
                disabled={refineLoading || !refineInstruction.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-elevated px-4 py-2.5 text-sm font-medium text-fg disabled:opacity-50"
              >
                {refineLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {refineLoading ? t('director.refineRunning') : t('director.refineBtn')}
              </button>

              {refineError && (
                <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                  <AlertCircle className="mr-1 inline h-3 w-3" /> {t('director.refineError')}: {refineError}
                </div>
              )}

              {refineResult && (
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg">{t('director.refineResult')}</span>
                    <button
                      onClick={() => setRefineResult(null)}
                      aria-label={t('director.refineDismiss')}
                      className="text-fg-faint hover:text-fg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-fg">
                    {JSON.stringify(refineResult.refined, null, 2)}
                  </pre>
                  {refineResult.refinementNote && (
                    <p className="mt-2 border-t border-line pt-2 text-fg-faint">
                      <span className="font-medium text-fg">{t('director.refineNote')}:</span> {refineResult.refinementNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
