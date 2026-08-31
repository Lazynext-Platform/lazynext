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
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ContrastAmplifierResult,
  ContrastElement,
  ContrastPair,
  ContrastImpact,
} from '@/lib/creative/ad-creative-contrast-amplifier';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const CONTRAST_TYPES = [
  'before_after',
  'problem_solution',
  'with_without',
  'expectation_reality',
  'then_now',
  'ordinary_extraordinary',
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

export default function AdCreativeContrastAmplifierPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [contrastType, setContrastType] = useState<string>('before_after');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ContrastAmplifierResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-contrast-amplifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          contrastType,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeContrastAmplifier.error'));
      setResult(data.result as ContrastAmplifierResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, contrastType, platform, t]);

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
          {t('adCreativeContrastAmplifier.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Contrast className="w-6 h-6" /> {t('adCreativeContrastAmplifier.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeContrastAmplifier.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeContrastAmplifier.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Contrast className="w-6 h-6" /> {t('adCreativeContrastAmplifier.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeContrastAmplifier.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="accaProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeContrastAmplifier.productOrBrand')}
            </label>
            <input
              id="accaProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="accaContent" className="block text-sm font-medium mb-1">
              {t('adCreativeContrastAmplifier.content')}
            </label>
            <textarea
              id="accaContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Tired of dull skin? Our vitamin C serum brightens in just 7 days..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeContrastAmplifier.contrastType')}</label>
            <div className="flex flex-wrap gap-2">
              {CONTRAST_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setContrastType(ct)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    contrastType === ct
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {ct.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeContrastAmplifier.platform')}</label>
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
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !content.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeContrastAmplifier.generating') : `${t('adCreativeContrastAmplifier.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeContrastAmplifier.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeContrastAmplifier.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeContrastAmplifier.dryRunNotice')}
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
                {copied ? t('adCreativeContrastAmplifier.copied') : t('adCreativeContrastAmplifier.copy')}
              </button>
            </div>

            {/* Amplified content */}
            {result.analysis.amplifiedContent && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('adCreativeContrastAmplifier.amplifiedContent')}
                </p>
                <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-fg whitespace-pre-wrap">
                  {result.analysis.amplifiedContent}
                </div>
              </div>
            )}

            {/* Contrast score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Contrast className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeContrastAmplifier.contrastScore')}</p>
                    <p className={`text-3xl font-bold ${scoreColor(result.analysis.contrastScore)}`}>
                      {result.analysis.contrastScore}<span className="text-sm text-fg-muted">/100</span>
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="h-3 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${result.analysis.contrastScore >= 75 ? 'bg-success' : result.analysis.contrastScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${result.analysis.contrastScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contrast elements */}
            {result.analysis.elements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeContrastAmplifier.elements')}</p>
                {result.analysis.elements.map((el: ContrastElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{el.type.replace(/_/g, ' ')}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[el.impact] || IMPACT_COLORS.medium}`}>
                        {el.impact}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded border border-border bg-bg-card p-2">
                        <p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">Before</p>
                        <p className="text-xs text-fg">{el.before}</p>
                      </div>
                      <div className="rounded border border-border bg-bg-card p-2">
                        <p className="text-[10px] uppercase tracking-wide text-fg-muted mb-1">After</p>
                        <p className="text-xs text-fg">{el.after}</p>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{el.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Contrast pairs */}
            {result.analysis.pairs.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeContrastAmplifier.pairs')}</p>
                {result.analysis.pairs.map((pair: ContrastPair, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded border border-border bg-bg-card px-2 py-1 text-xs font-medium text-fg">{pair.left}</span>
                      <ArrowRight className="w-4 h-4 text-brand-accent flex-shrink-0" />
                      <span className="rounded border border-border bg-bg-card px-2 py-1 text-xs font-medium text-fg">{pair.right}</span>
                      <span className="text-[10px] uppercase tracking-wide text-fg-muted ml-auto">{pair.contrastType.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{pair.emotionalImpact}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning" /> {t('adCreativeContrastAmplifier.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.analysis.recommendations.map((rec, i) => (
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
