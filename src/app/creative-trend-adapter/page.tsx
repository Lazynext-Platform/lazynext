'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Clock,
  Hash,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  TrendAdapterResult,
  RiskOfDatedness,
} from '@/lib/creative/creative-trend-adapter';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const TREND_CATEGORIES = ['viral', 'seasonal', 'cultural', 'industry', 'aesthetic'] as const;

const RISK_COLORS: Record<RiskOfDatedness, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

export default function CreativeTrendAdapterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [trendCategory, setTrendCategory] = useState<string>('viral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrendAdapterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-trend-adapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          platform,
          trendCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeTrendAdapter.error'));
      setResult(data.result as TrendAdapterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, platform, trendCategory, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const a = result.adaptation;
      const text = [
        a.adaptedContent,
        '',
        `Trends: ${a.identifiedTrends.join(', ')}`,
        `Hashtags: ${a.suggestedHashtags.map((h) => `#${h}`).join(' ')}`,
        `Timing: ${a.timingAdvice}`,
        `Recommendations: ${a.recommendations.join('; ')}`,
      ].join('\n');
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
          {t('creativeTrendAdapter.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('creativeTrendAdapter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeTrendAdapter.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeTrendAdapter.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('creativeTrendAdapter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeTrendAdapter.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ctaContent" className="block text-sm font-medium mb-1">
              {t('creativeTrendAdapter.content')}
            </label>
            <textarea
              id="ctaContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Check out our new vitamin C serum for glowing skin"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="ctaProduct" className="block text-sm font-medium mb-1">
              {t('creativeTrendAdapter.productOrBrand')}
            </label>
            <input
              id="ctaProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., GlowUp Skincare"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('creativeTrendAdapter.platform')}</label>
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
              <label className="block text-sm font-medium mb-2">{t('creativeTrendAdapter.trendCategory')}</label>
              <div className="flex flex-wrap gap-2">
                {TREND_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTrendCategory(c)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      trendCategory === c
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeTrendAdapter.generating') : `${t('creativeTrendAdapter.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeTrendAdapter.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeTrendAdapter.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeTrendAdapter.dryRunNotice')}
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
                {copied ? t('creativeTrendAdapter.copied') : t('creativeTrendAdapter.copy')}
              </button>
            </div>

            {/* Adapted content */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('creativeTrendAdapter.adaptedContent')}
              </h2>
              <p className="text-sm text-fg">{result.adaptation.adaptedContent}</p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('creativeTrendAdapter.trendRelevance')}</div>
                <div className="text-lg font-bold text-brand-accent">{result.adaptation.trendRelevance}/10</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('creativeTrendAdapter.longevityScore')}</div>
                <div className="text-lg font-bold text-success">{result.adaptation.longevityScore}/10</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('creativeTrendAdapter.riskOfDatedness')}</div>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${RISK_COLORS[result.adaptation.riskOfDatedness]}`}>
                  {result.adaptation.riskOfDatedness}
                </span>
              </div>
            </div>

            {/* Identified trends */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" /> {t('creativeTrendAdapter.identifiedTrends')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.adaptation.identifiedTrends.map((trend, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-400 px-2.5 py-1 text-xs font-medium"
                  >
                    {trend}
                  </span>
                ))}
              </div>
            </div>

            {/* Timing advice */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> {t('creativeTrendAdapter.timingAdvice')}
              </h2>
              <p className="text-sm text-fg">{result.adaptation.timingAdvice}</p>
            </div>

            {/* Suggested hashtags */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4 text-brand-accent" /> {t('creativeTrendAdapter.suggestedHashtags')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.adaptation.suggestedHashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-brand-accent/30 bg-brand-accent/10 text-brand-accent px-2.5 py-1 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" /> {t('creativeTrendAdapter.recommendations')}
              </h2>
              <ul className="space-y-2">
                {result.adaptation.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-fg flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
