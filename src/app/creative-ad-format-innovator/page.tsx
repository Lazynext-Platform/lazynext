'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Layers,
  Target,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FormatInnovatorResult,
  InnovativeFormat,
  FormatElement,
  ImplementationDifficulty,
  ExpectedImpact,
} from '@/lib/creative/creative-ad-format-innovator';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const DIFFICULTY_COLORS: Record<ImplementationDifficulty, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

const IMPACT_COLORS: Record<ExpectedImpact, string> = {
  low: 'bg-bg-secondary text-fg-muted border-border',
  medium: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  high: 'bg-success/20 text-success border-success/30',
};

function noveltyColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function CreativeAdFormatInnovatorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [currentFormats, setCurrentFormats] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FormatInnovatorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-format-innovator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          currentFormats,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdFormatInnovator.error'));
      setResult(data.result as FormatInnovatorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, currentFormats, platform, t]);

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
          {t('creativeAdFormatInnovator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('creativeAdFormatInnovator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdFormatInnovator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdFormatInnovator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('creativeAdFormatInnovator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdFormatInnovator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cafiProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdFormatInnovator.productOrBrand')}
            </label>
            <input
              id="cafiProduct"
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
            <label htmlFor="cafiAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdFormatInnovator.targetAudience')}
            </label>
            <input
              id="cafiAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in clean beauty"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cafiFormats" className="block text-sm font-medium mb-1">
              {t('creativeAdFormatInnovator.currentFormats')}
            </label>
            <textarea
              id="cafiFormats"
              value={currentFormats}
              onChange={(e) => setCurrentFormats(e.target.value)}
              placeholder="e.g., vertical video, image carousel, story ad, influencer clip"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdFormatInnovator.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdFormatInnovator.generating') : `${t('creativeAdFormatInnovator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdFormatInnovator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdFormatInnovator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdFormatInnovator.dryRunNotice')}
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
                {copied ? t('creativeAdFormatInnovator.copied') : t('creativeAdFormatInnovator.copy')}
              </button>
            </div>

            {/* Innovative format cards */}
            <div className="space-y-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-accent" /> {t('creativeAdFormatInnovator.formats')}
              </p>
              {result.innovation.formats.map((fmt: InnovativeFormat, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  {/* Header: name + novelty score */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-brand-accent" />
                      <h2 className="text-base font-bold">{fmt.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-fg-muted">{t('creativeAdFormatInnovator.noveltyScore')}</p>
                      <p className={`text-xl font-bold ${noveltyColor(fmt.noveltyScore)}`}>{fmt.noveltyScore}<span className="text-xs text-fg-muted">/100</span></p>
                    </div>
                  </div>

                  {/* Novelty score bar */}
                  <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fmt.noveltyScore >= 75 ? 'bg-success' : fmt.noveltyScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${fmt.noveltyScore}%` }}
                    />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-fg-muted">{fmt.description}</p>

                  {/* Difficulty + Impact badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[fmt.implementationDifficulty]}`}>
                      {t('creativeAdFormatInnovator.implementationDifficulty')}: {fmt.implementationDifficulty}
                    </span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[fmt.expectedImpact]}`}>
                      <Zap className="w-3 h-3 mr-1" />
                      {t('creativeAdFormatInnovator.expectedImpact')}: {fmt.expectedImpact}
                    </span>
                  </div>

                  {/* Format elements */}
                  {fmt.formatElements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-fg-muted">{t('creativeAdFormatInnovator.formatElements')}</p>
                      {fmt.formatElements.map((el: FormatElement, j: number) => (
                        <div key={j} className="rounded-lg border border-border bg-bg-secondary p-2.5 space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-medium text-fg">{el.element}</span>
                            <span className="text-xs text-fg-muted italic">from: {el.source}</span>
                          </div>
                          <p className="text-xs text-fg-muted">{el.innovation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Platform fit */}
                  {fmt.platformFit.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Target className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-xs font-medium text-fg-muted">{t('creativeAdFormatInnovator.platformFit')}:</span>
                      {fmt.platformFit.map((p, k) => (
                        <span key={k} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.innovation.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdFormatInnovator.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.innovation.recommendations.map((rec, i) => (
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
