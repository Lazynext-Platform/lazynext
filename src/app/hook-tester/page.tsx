'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Anchor,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Trophy,
  Plus,
  X,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HookTesterResult,
  HookTestResult,
} from '@/lib/creative/hook-tester';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function scoreColor(s: number): string {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-brand-accent';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

export default function HookTesterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [hooks, setHooks] = useState<string[]>(['', '']);
  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HookTesterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const updateHook = (i: number, value: string) => {
    setHooks((prev) => prev.map((h, idx) => (idx === i ? value : h)));
  };

  const addHook = () => {
    setHooks((prev) => (prev.length < 10 ? [...prev, ''] : prev));
  };

  const removeHook = (i: number) => {
    setHooks((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  };

  const test = useCallback(async () => {
    const cleanHooks = hooks.map((h) => h.trim()).filter(Boolean);
    if (cleanHooks.length < 2 || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/hook-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hooks: cleanHooks,
          productOrBrand,
          targetAudience: targetAudience || undefined,
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('hookTester.error'));
      setResult(data.result as HookTesterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hooks, productOrBrand, targetAudience, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  const validHooks = hooks.map((h) => h.trim()).filter(Boolean);
  const canSubmit = validHooks.length >= 2 && productOrBrand.trim() && !loading;

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('hookTester.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Anchor className="w-6 h-6" /> {t('hookTester.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('hookTester.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('hookTester.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Anchor className="w-6 h-6" /> {t('hookTester.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('hookTester.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="htProduct" className="block text-sm font-medium mb-1">
              {t('hookTester.productOrBrand')}
            </label>
            <textarea
              id="htProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="htAudience" className="block text-sm font-medium mb-1">
              {t('hookTester.targetAudience')}
            </label>
            <input
              id="htAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., women 25-40 interested in clean beauty"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('hookTester.platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    platform === p
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('hookTester.hooks')}</label>
            <div className="space-y-2">
              {hooks.map((hook, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 text-xs text-fg-muted">#{i + 1}</span>
                  <input
                    type="text"
                    value={hook}
                    onChange={(e) => updateHook(i, e.target.value)}
                    placeholder={`Hook ${i + 1} — e.g., "Stop scrolling if you have dark circles"`}
                    maxLength={200}
                    className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    disabled={loading}
                  />
                  {hooks.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeHook(i)}
                      className="mt-1 rounded-lg border border-border p-2 text-fg-muted hover:bg-hover"
                      disabled={loading}
                      aria-label={t('hookTester.removeHook')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {hooks.length < 10 && (
              <button
                type="button"
                onClick={addHook}
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-1.5"
                disabled={loading}
              >
                <Plus className="w-3.5 h-3.5" /> {t('hookTester.addHook')}
              </button>
            )}
          </div>

          <button
            onClick={test}
            disabled={!canSubmit}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('hookTester.testing') : `${t('hookTester.test')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('hookTester.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('hookTester.testing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('hookTester.dryRunNotice')}
              </div>
            )}

            {/* Best pick */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-brand-accent" />
                <h2 className="font-medium">{t('hookTester.bestPick')}</h2>
              </div>
              <p className="text-sm font-medium text-brand-accent">&ldquo;{result.bestPick}&rdquo;</p>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('hookTester.copied') : t('hookTester.copy')}
              </button>
            </div>

            {/* Ranked hooks */}
            <div className="space-y-3">
              {result.rankedHooks.map((rec: HookTestResult, i: number) => {
                const isBest = rec.hook === result.bestPick;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border bg-bg-card p-4 ${isBest ? 'border-brand-accent/40' : 'border-border'}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                      <span className="font-medium flex-1">&ldquo;{rec.hook}&rdquo;</span>
                      {isBest && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                          {t('hookTester.bestPick')}
                        </span>
                      )}
                      <span className={`text-lg font-bold ${scoreColor(rec.score)}`}>{rec.score}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-fg-muted" />
                        <span className="text-fg-muted">{t('hookTester.predictedCtrLift')}:</span>
                        <span className={scoreColor(rec.score)}>{rec.predictedCtrLift}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                          {platform}
                        </span>
                        <span className="text-fg-muted">{rec.engagementPrediction}</span>
                      </div>
                    </div>

                    {rec.strengths.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-fg-muted mb-1 flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5 text-success" /> {t('hookTester.strengths')}
                        </div>
                        <ul className="text-xs space-y-1 pl-5 list-disc text-fg-muted">
                          {rec.strengths.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.weaknesses.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-fg-muted mb-1 flex items-center gap-1">
                          <ThumbsDown className="w-3.5 h-3.5 text-danger" /> {t('hookTester.weaknesses')}
                        </div>
                        <ul className="text-xs space-y-1 pl-5 list-disc text-fg-muted">
                          {rec.weaknesses.map((w, j) => (
                            <li key={j}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-start gap-1.5 text-xs text-fg-muted">
                      <Lightbulb className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" />
                      <span><span className="font-medium">{t('hookTester.improvement')}:</span> {rec.improvementSuggestion}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
