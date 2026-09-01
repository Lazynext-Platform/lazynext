'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Grid3x3,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HookMatrixResult,
  MatrixHook,
} from '@/lib/creative/creative-hook-matrix-generator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const TRIGGER_COLORS: Record<string, string> = {
  curiosity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  fear: 'bg-danger/20 text-danger border-danger/30',
  aspiration: 'bg-success/20 text-success border-success/30',
  humor: 'bg-warning/20 text-warning border-warning/30',
  urgency: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  social_proof: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shock: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  nostalgia: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  anger: 'bg-red-600/20 text-red-500 border-red-600/30',
  belonging: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function CreativeHookMatrixGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [audience, setAudience] = useState('');
  const [hookCount, setHookCount] = useState<number>(12);
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HookMatrixResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !audience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-hook-matrix-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          audience,
          hookCount,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeHookMatrixGenerator.error'));
      setResult(data.result as HookMatrixResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, audience, hookCount, platform, t]);

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

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('creativeHookMatrixGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="w-6 h-6" /> {t('creativeHookMatrixGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeHookMatrixGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeHookMatrixGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="w-6 h-6" /> {t('creativeHookMatrixGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeHookMatrixGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="chmgProduct" className="block text-sm font-medium mb-1">
              {t('creativeHookMatrixGenerator.productOrBrand')}
            </label>
            <textarea
              id="chmgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="chmgAudience" className="block text-sm font-medium mb-1">
              {t('creativeHookMatrixGenerator.audience')}
            </label>
            <input
              id="chmgAudience"
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., millennial skincare enthusiasts"
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chmgCount" className="block text-sm font-medium mb-1">
                {t('creativeHookMatrixGenerator.hookCount')}
              </label>
              <input
                id="chmgCount"
                type="number"
                value={hookCount}
                onChange={(e) => setHookCount(Number(e.target.value))}
                min={6}
                max={24}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeHookMatrixGenerator.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === undefined
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                all
              </button>
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

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !audience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeHookMatrixGenerator.generating') : `${t('creativeHookMatrixGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeHookMatrixGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeHookMatrixGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeHookMatrixGenerator.dryRunNotice')}
              </div>
            )}

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('creativeHookMatrixGenerator.copied') : t('creativeHookMatrixGenerator.copy')}
              </button>
            </div>

            {/* Emotional triggers */}
            {result.matrix.emotionalTriggers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('creativeHookMatrixGenerator.emotionalTriggers')}</div>
                <div className="flex flex-wrap gap-2">
                  {result.matrix.emotionalTriggers.map((trigger, i) => (
                    <span key={i} className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[trigger] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Platform distribution */}
            {Object.keys(result.matrix.platformDistribution).length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('creativeHookMatrixGenerator.platformDistribution')}</div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(result.matrix.platformDistribution).map(([p, count]) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[p] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {p}
                      </span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hook cards */}
            <div className="space-y-3">
              {result.matrix.hooks.map((hook: MatrixHook, i: number) => {
                const isTopPick = result.matrix.topPicks.includes(hook.id);
                return (
                  <div key={i} className={`rounded-lg border bg-bg-card p-4 ${isTopPick ? 'border-brand-accent/40' : 'border-border'}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {isTopPick && <Star className="w-4 h-4 text-brand-accent flex-shrink-0" />}
                      <span className="text-xs text-fg-muted">{hook.id}</span>
                      <span className="font-medium text-sm flex-1 min-w-0">{hook.hook}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[hook.emotionalTrigger] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {hook.emotionalTrigger}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-fg-muted">{t('creativeHookMatrixGenerator.platform')}:</span>
                        <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full border ${PLATFORM_COLORS[hook.platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                          {hook.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-fg-muted">{t('creativeHookMatrixGenerator.predictedScore')}:</span>
                        <span className="font-medium text-brand-accent">{hook.predictedScore}/100</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-fg-muted">{t('creativeHookMatrixGenerator.bestUseCase')}:</span>
                        <span className="font-medium">{hook.bestUseCase}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-fg-muted">{t('creativeHookMatrixGenerator.characterCount')}:</span>
                        <span className="font-medium">{hook.characterCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {result.matrix.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('creativeHookMatrixGenerator.recommendations')}</div>
                <ul className="space-y-1">
                  {result.matrix.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" /> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
