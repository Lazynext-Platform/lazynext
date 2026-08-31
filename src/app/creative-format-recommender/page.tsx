'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  LayoutGrid,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Trophy,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FormatRecommenderResult,
  FormatRecommendation,
  CreativeFormat,
} from '@/lib/creative/creative-format-recommender';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const GOALS = ['awareness', 'consideration', 'conversion', 'engagement', 'retention'] as const;

const FORMAT_COLORS: Record<CreativeFormat, string> = {
  video: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  carousel: 'bg-success/20 text-success border-success/30',
  image: 'bg-warning/20 text-warning border-warning/30',
  story: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  text: 'bg-fg-muted/20 text-fg-muted border-border',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function CreativeFormatRecommenderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [campaignGoal, setCampaignGoal] = useState<string>('awareness');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FormatRecommenderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-format-recommender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          campaignGoal,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeFormatRecommender.error'));
      setResult(data.result as FormatRecommenderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, campaignGoal, targetAudience, platform, t]);

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
          {t('creativeFormatRecommender.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" /> {t('creativeFormatRecommender.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFormatRecommender.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeFormatRecommender.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" /> {t('creativeFormatRecommender.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFormatRecommender.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cfrProduct" className="block text-sm font-medium mb-1">
              {t('creativeFormatRecommender.productOrBrand')}
            </label>
            <input
              id="cfrProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeFormatRecommender.campaignGoal')}</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCampaignGoal(g)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    campaignGoal === g
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="cfrAudience" className="block text-sm font-medium mb-1">
              {t('creativeFormatRecommender.targetAudience')}
            </label>
            <input
              id="cfrAudience"
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
            <label className="block text-sm font-medium mb-2">{t('creativeFormatRecommender.platform')}</label>
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
            {loading ? t('creativeFormatRecommender.generating') : `${t('creativeFormatRecommender.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeFormatRecommender.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeFormatRecommender.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeFormatRecommender.dryRunNotice')}
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
                {copied ? t('creativeFormatRecommender.copied') : t('creativeFormatRecommender.copy')}
              </button>
            </div>

            {/* Top pick */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeFormatRecommender.topPick')}</p>
                  <p className="text-2xl font-bold capitalize">{result.recommendation.topPick}</p>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            {result.recommendation.reasoning && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeFormatRecommender.reasoning')}
                </p>
                <p className="text-sm text-fg-muted">{result.recommendation.reasoning}</p>
              </div>
            )}

            {/* Formats */}
            {result.recommendation.formats.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeFormatRecommender.formats')}</p>
                {result.recommendation.formats.map((f: FormatRecommendation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${FORMAT_COLORS[f.format] || FORMAT_COLORS.text}`}>
                          {f.format}
                        </span>
                        {i === 0 && (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                            {t('creativeFormatRecommender.topPick')}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${scoreColor(f.score)}`}>{f.score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${f.score >= 75 ? 'bg-success' : f.score >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${f.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{f.rationale}</p>

                    {f.bestUseCases.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-fg mb-1">{t('creativeFormatRecommender.bestUseCases')}</p>
                        <ul className="space-y-1">
                          {f.bestUseCases.map((uc, j) => (
                            <li key={j} className="text-xs text-fg-muted flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {uc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {f.platformTips.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-fg mb-1">{t('creativeFormatRecommender.platformTips')}</p>
                        <ul className="space-y-1">
                          {f.platformTips.map((tip, j) => (
                            <li key={j} className="text-xs text-fg-muted flex items-start gap-1.5">
                              <Sparkles className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" /> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.recommendation.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeFormatRecommender.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.recommendation.recommendations.map((rec, i) => (
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
