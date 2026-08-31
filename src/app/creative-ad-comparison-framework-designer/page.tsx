'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Scale,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  GitCompare,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ComparisonFrameworkDesignerResult,
  ComparisonFramework,
} from '@/lib/creative/creative-ad-comparison-framework-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const COMPARISON_TYPE_COLORS: Record<string, string> = {
  feature_comparison: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  price_comparison: 'bg-success/20 text-success border-success/30',
  quality_comparison: 'bg-warning/20 text-warning border-warning/30',
  speed_comparison: 'bg-danger/20 text-danger border-danger/30',
  convenience_comparison: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  outcome_comparison: 'bg-success/20 text-success border-success/30',
  social_comparison: 'bg-warning/20 text-warning border-warning/30',
  lifestyle_comparison: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBar(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdComparisonFrameworkDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ComparisonFrameworkDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-comparison-framework-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdComparisonFrameworkDesigner.error'));
      setResult(data.result as ComparisonFrameworkDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, targetAudience, platform, t]);

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
          {t('creativeAdComparisonFrameworkDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" /> {t('creativeAdComparisonFrameworkDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdComparisonFrameworkDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdComparisonFrameworkDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" /> {t('creativeAdComparisonFrameworkDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdComparisonFrameworkDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cacfdProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdComparisonFrameworkDesigner.productOrBrand')}
            </label>
            <input
              id="cacfdProduct"
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
            <label htmlFor="cacfdContent" className="block text-sm font-medium mb-1">
              {t('creativeAdComparisonFrameworkDesigner.content')}
            </label>
            <textarea
              id="cacfdContent"
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
            <label htmlFor="cacfdAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdComparisonFrameworkDesigner.targetAudience')}
            </label>
            <input
              id="cacfdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdComparisonFrameworkDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdComparisonFrameworkDesigner.generating') : `${t('creativeAdComparisonFrameworkDesigner.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdComparisonFrameworkDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdComparisonFrameworkDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdComparisonFrameworkDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdComparisonFrameworkDesigner.copied') : t('creativeAdComparisonFrameworkDesigner.copy')}
              </button>
            </div>

            {/* Frameworks */}
            {result.strategy.frameworks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Scale className="w-4 h-4" /> {t('creativeAdComparisonFrameworkDesigner.frameworks')}
                </p>
                {result.strategy.frameworks.map((fw: ComparisonFramework, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${COMPARISON_TYPE_COLORS[fw.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                        {fw.type.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                        <GitCompare className="w-3 h-3" /> {t('creativeAdComparisonFrameworkDesigner.comparisonPathway')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5 flex items-center gap-1">
                          <GitCompare className="w-3 h-3" /> {t('creativeAdComparisonFrameworkDesigner.comparisonAxis')}
                        </p>
                        <p className="text-sm text-fg">{fw.comparisonAxis}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdComparisonFrameworkDesigner.productAdvantage')}</p>
                        <p className="text-sm text-fg">{fw.productAdvantage}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdComparisonFrameworkDesigner.competitorWeakness')}</p>
                        <p className="text-sm text-fg">{fw.competitorWeakness}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-fg-muted mb-0.5">{t('creativeAdComparisonFrameworkDesigner.comparisonPathway')}</p>
                        <p className="text-sm text-fg">{fw.comparisonPathway}</p>
                      </div>
                    </div>

                    {/* Advantage strength bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {t('creativeAdComparisonFrameworkDesigner.advantageStrength')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(fw.advantageStrength)}`}>{fw.advantageStrength}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(fw.advantageStrength)}`}
                          style={{ width: `${fw.advantageStrength}%` }}
                        />
                      </div>
                    </div>

                    {/* Preference shift bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted flex items-center gap-1">
                          <Scale className="w-3 h-3" /> {t('creativeAdComparisonFrameworkDesigner.preferenceShift')}
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(fw.preferenceShift)}`}>{fw.preferenceShift}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(fw.preferenceShift)}`}
                          style={{ width: `${fw.preferenceShift}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdComparisonFrameworkDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.strategy.recommendations.map((rec, i) => (
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
