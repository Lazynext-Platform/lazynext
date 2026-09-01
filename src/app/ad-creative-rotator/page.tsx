'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Shield,
  Calendar,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CreativeRotatorResult,
  CreativeVariation,
  VariationType,
} from '@/lib/creative/ad-creative-rotator';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const TYPE_COLORS: Record<VariationType, string> = {
  hook: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  angle: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  tone: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  format: 'bg-success/20 text-success border-success/30',
  visual: 'bg-warning/20 text-warning border-warning/30',
  cta: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdCreativeRotatorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [baseContent, setBaseContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [variationCount, setVariationCount] = useState<number>(5);
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreativeRotatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const rotate = useCallback(async () => {
    if (!baseContent.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-rotator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseContent,
          productOrBrand,
          variationCount,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeRotator.error'));
      setResult(data.result as CreativeRotatorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [baseContent, productOrBrand, variationCount, platform, t]);

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
          {t('adCreativeRotator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6" /> {t('adCreativeRotator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeRotator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeRotator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6" /> {t('adCreativeRotator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeRotator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acrContent" className="block text-sm font-medium mb-1">
              {t('adCreativeRotator.baseContent')}
            </label>
            <textarea
              id="acrContent"
              value={baseContent}
              onChange={(e) => setBaseContent(e.target.value)}
              placeholder="e.g., Get 50% off our best-selling vitamin C serum this week only."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acrProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeRotator.productOrBrand')}
            </label>
            <input
              id="acrProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acrCount" className="block text-sm font-medium mb-1">
                {t('adCreativeRotator.variationCount')}
              </label>
              <input
                id="acrCount"
                type="number"
                value={variationCount}
                onChange={(e) => setVariationCount(Number(e.target.value))}
                min={3}
                max={10}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeRotator.platform')}</label>
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
                any
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
            onClick={rotate}
            disabled={loading || !baseContent.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeRotator.rotating') : `${t('adCreativeRotator.rotate')} (${CREDIT_COST} ${t('adCreativeRotator.credits')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeRotator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeRotator.rotating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeRotator.dryRunNotice')}
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
                {copied ? t('adCreativeRotator.copied') : t('adCreativeRotator.copy')}
              </button>
            </div>

            {/* Fatigue analysis + diversification score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adCreativeRotator.diversificationScore')}</span>
                  <span className="ml-auto text-lg font-bold">{result.rotation.diversificationScore}/100</span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2">
                  <div
                    className="bg-brand-accent rounded-full h-2 transition-all"
                    style={{ width: `${result.rotation.diversificationScore}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-1">{t('adCreativeRotator.fatigueAnalysis')}</div>
                <p className="text-sm text-fg-muted">{result.rotation.fatigueAnalysis}</p>
              </div>
            </div>

            {/* Variation cards */}
            <div className="space-y-3">
              {result.rotation.variations.map((variation: CreativeVariation, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted">{variation.id}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[variation.variationType] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {variation.variationType}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-accent">
                      <Shield className="w-3 h-3" /> {variation.fatigueResistanceScore}/100
                    </span>
                  </div>
                  <p className="text-sm mb-2">{variation.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCreativeRotator.bestForAudience')}:</span>
                      <span className="font-medium">{variation.bestForAudience}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">{t('adCreativeRotator.estimatedLifespan')}:</span>
                      <span className="font-medium">{variation.estimatedLifespanDays} {t('adCreativeRotator.days')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rotation schedule */}
            {result.rotation.rotationSchedule.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adCreativeRotator.rotationSchedule')}</span>
                </div>
                <div className="space-y-2">
                  {result.rotation.rotationSchedule.map((sched, i) => (
                    <div key={i} className="flex items-start gap-3 flex-wrap rounded-lg border border-border bg-bg-secondary px-3 py-2">
                      <span className="text-xs font-bold text-brand-accent">{t('adCreativeRotator.week')} {sched.week}</span>
                      <div className="flex flex-wrap gap-1">
                        {sched.variationIds.map((vid) => (
                          <span key={vid} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/30">
                            {vid}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-fg-muted w-full sm:w-auto sm:ml-auto">{sched.strategy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.rotation.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('adCreativeRotator.recommendations')}</div>
                <ul className="space-y-1">
                  {result.rotation.recommendations.map((rec, i) => (
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
