'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Sparkles, Loader2, ArrowRight, CheckCircle2, AlertCircle,
  Target, Fish, FileText, Clapperboard, TrendingUp, Coins,
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

  const run = useCallback(async () => {
    if (!session?.user) { setAuthOpen(true); return; }
    if (!productUrl.trim() && !productText.trim()) return;
    setStep('loading'); setError(''); setResult(null);
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
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'director_failed');
      setResult(j.result as DirectorResult);
      setStep('done');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStep('error');
    }
  }, [session, productUrl, brandUrl, productText, productName, platform, budget]);

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
          Creative Director
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          Autonomous agent that runs the full creative pipeline: extract → brief → hooks → angles → scripts → score → storyboard → variants.
          Budget-constrained with automatic best-pick selection.
        </p>

        {/* Input */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-fg">Input</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-url">Product URL (optional)</label>
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
              <label className="text-xs font-medium text-fg-faint" htmlFor="brand-url">Brand URL (optional)</label>
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
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-text">Or paste product description</label>
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
              <label className="text-xs font-medium text-fg-faint" htmlFor="product-name">Product name</label>
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
              <label className="text-xs font-medium text-fg-faint" htmlFor="platform">Platform</label>
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
              <label className="text-xs font-medium text-fg-faint" htmlFor="budget">Credit budget: {budget}</label>
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
            {step === 'loading' ? 'Running pipeline...' : `Run Creative Director (${budget} credits)`}
          </button>
        </section>

        {/* Error */}
        {step === 'error' && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        {/* Steps progress */}
        {result && (
          <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-fg">Pipeline Steps</h2>
            <div className="mt-3 space-y-2">
              {result.steps.map((s, i) => (
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
              Spent: {result.totalCreditsSpent} / {result.budgetCredits} credits
            </div>
          </section>
        )}

        {/* Brief */}
        {result?.brief && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><FileText className="h-4 w-4 text-brand-accent" /> Brief</h2>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><span className="text-fg-faint">Product:</span> <span className="text-fg">{result.brief.product}</span></div>
              <div><span className="text-fg-faint">Platform:</span> <span className="text-fg">{result.brief.platform}</span></div>
              <div><span className="text-fg-faint">Format:</span> <span className="text-fg">{result.brief.format}</span></div>
              <div><span className="text-fg-faint">Audience:</span> <span className="text-fg">{result.brief.targetAudience}</span></div>
              <div className="sm:col-span-2"><span className="text-fg-faint">Key message:</span> <span className="text-fg">{result.brief.keyMessage}</span></div>
              <div><span className="text-fg-faint">Tone:</span> <span className="text-fg">{result.brief.tone}</span></div>
              <div><span className="text-fg-faint">CTA:</span> <span className="text-fg">{result.brief.cta}</span></div>
            </div>
          </section>
        )}

        {/* Hooks */}
        {result?.hooks && result.hooks.length > 0 && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Fish className="h-4 w-4 text-brand-accent" /> Hooks</h2>
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
              <TrendingUp className="h-4 w-4 text-success" /> Best Combination (Score: {result.bestCombination.score.overall}/10)
            </h2>
            <div className="mt-3 space-y-3 text-xs">
              <div className="rounded-xl bg-app p-3">
                <span className="font-bold text-fg">Angle:</span> <span className="text-fg">{result.bestCombination.angle.name}</span>
                <p className="mt-1 text-fg-faint">{result.bestCombination.angle.description}</p>
              </div>
              <div className="rounded-xl bg-app p-3">
                <span className="font-bold text-fg">Hook:</span> <span className="text-fg">{result.bestCombination.hook.hook}</span>
              </div>
              {result.bestCombination.script.scenes && (
                <div className="rounded-xl bg-app p-3">
                  <span className="font-bold text-fg">Script scenes:</span>
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
                <span className="font-bold text-fg">Score breakdown:</span>
                <div className="mt-1 grid grid-cols-2 gap-1 text-fg-faint">
                  <span>Hook: {result.bestCombination.score.hookStrength}/10</span>
                  <span>Clarity: {result.bestCombination.score.clarity}/10</span>
                  <span>Emotion: {result.bestCombination.score.emotionalImpact}/10</span>
                  <span>CTA: {result.bestCombination.score.ctaStrength}/10</span>
                </div>
                {result.bestCombination.score.notes && <p className="mt-1 text-fg-faint">{result.bestCombination.score.notes}</p>}
              </div>
            </div>
            <Link href="/creative-studio" className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
              <Clapperboard className="h-3 w-3" /> Open in Creative Studio <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        )}

        {/* Variants */}
        {result?.variants && result.variants.length > 0 && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Sparkles className="h-4 w-4 text-brand-accent" /> A/B Variants</h2>
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
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
