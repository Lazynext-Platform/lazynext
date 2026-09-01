'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Contrast,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SensoryContrastDesignerResult,
  SensoryContrast,
  ContrastPair,
  ContrastImpact,
} from '@/lib/creative/ad-creative-sensory-contrast-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const CONTRAST_DIMENSIONS = [
  'loud_quiet',
  'bright_dark',
  'fast_slow',
  'warm_cold',
  'sharp_soft',
  'chaotic_calm',
  'vibrant_muted',
  'dense_sparse',
] as const;

const IMPACT_COLORS: Record<ContrastImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBarColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function AdCreativeSensoryContrastDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [contrastDimension, setContrastDimension] = useState<string>('loud_quiet');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SensoryContrastDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-sensory-contrast-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          contrastDimension,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeSensoryContrastDesigner.error'));
      setResult(data.result as SensoryContrastDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, contrastDimension, platform, t]);

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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
        >
          {t('adCreativeSensoryContrastDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Contrast className="w-6 h-6" /> {t('adCreativeSensoryContrastDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativeSensoryContrastDesigner.signInPrompt')}
          </p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
      >
        {t('adCreativeSensoryContrastDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Contrast className="w-6 h-6" /> {t('adCreativeSensoryContrastDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativeSensoryContrastDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acscdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSensoryContrastDesigner.productOrBrand')}
            </label>
            <input
              id="acscdProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('adCreativeSensoryContrastDesigner.productOrBrandPh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acscdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeSensoryContrastDesigner.content')}
            </label>
            <textarea
              id="acscdContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('adCreativeSensoryContrastDesigner.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('adCreativeSensoryContrastDesigner.contrastDimension')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTRAST_DIMENSIONS.map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => setContrastDimension(dim)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    contrastDimension === dim
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {dim.replace(/_/g, '/')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('adCreativeSensoryContrastDesigner.platform')}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                {t('adCreativeSensoryContrastDesigner.anyPlatform')}
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
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('adCreativeSensoryContrastDesigner.generating')
              : `${t('adCreativeSensoryContrastDesigner.generate')} (${CREDIT_COST} ${t('adCreativeSensoryContrastDesigner.credits')})`}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSensoryContrastDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />{' '}
            {t('adCreativeSensoryContrastDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div
                role="status"
                className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning"
              >
                {t('adCreativeSensoryContrastDesigner.dryRunNotice')}
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
                {copied
                  ? t('adCreativeSensoryContrastDesigner.copied')
                  : t('adCreativeSensoryContrastDesigner.copy')}
              </button>
            </div>

            {/* Impact score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">
                    {t('adCreativeSensoryContrastDesigner.impactScore')}
                  </p>
                  <p className={`text-3xl font-bold ${scoreColor(result.design.impactScore)}`}>
                    {result.design.impactScore}
                    <span className="text-sm text-fg-muted">{t('adCreativeSensoryContrastDesigner.scoreMax')}</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBarColor(result.design.impactScore)}`}
                  style={{ width: `${result.design.impactScore}%` }}
                />
              </div>
            </div>

            {/* Sensory contrast cards */}
            {result.design.contrasts.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Contrast className="w-4 h-4 text-brand-accent" />{' '}
                  {t('adCreativeSensoryContrastDesigner.contrasts')}
                </p>
                {result.design.contrasts.map((c: SensoryContrast, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                        {c.dimension.replace(/_/g, '/')}
                      </span>
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[c.impact] || IMPACT_COLORS.medium}`}
                      >
                        {c.impact}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-md border border-border bg-bg p-2">
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeSensoryContrastDesigner.before')}</p>
                        <p className="text-xs text-fg">{c.beforeState}</p>
                      </div>
                      <div className="rounded-md border border-border bg-bg p-2">
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('adCreativeSensoryContrastDesigner.after')}</p>
                        <p className="text-xs text-fg">{c.afterState}</p>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">{t('adCreativeSensoryContrastDesigner.transition')}</span> {c.transition}
                    </p>
                    <p className="text-xs text-fg-muted">{c.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Contrast pairs */}
            {result.design.pairs.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-accent" />{' '}
                  {t('adCreativeSensoryContrastDesigner.pairs')}
                </p>
                {result.design.pairs.map((pair: ContrastPair, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{pair.left}</span>
                      <ArrowRight className="w-3 h-3 text-fg-muted" />
                      <span className="text-xs font-medium">{pair.right}</span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg text-fg-muted border-border">
                        {pair.dimension.replace(/_/g, '/')}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{pair.sensoryEffect}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.design.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">
                  {t('adCreativeSensoryContrastDesigner.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.design.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {rec}
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
