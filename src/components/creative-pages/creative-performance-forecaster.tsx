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
  Gauge,
  Target,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PerformanceForecasterResult,
  PerformanceForecast,
  MetricRange,
  Grade,
} from '@/lib/creative/creative-performance-forecaster';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const CAMPAIGN_GOALS = ['awareness', 'engagement', 'conversions', 'traffic', 'app_installs'] as const;
const BUDGET_TIERS = ['small', 'medium', 'large'] as const;

const GRADE_COLORS: Record<Grade, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-warning/20 text-warning border-warning/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

function formatRange(r: MetricRange): string {
  return `${r.low} – ${r.high}`;
}

export default function CreativePerformanceForecasterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [creativeContent, setCreativeContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [campaignGoal, setCampaignGoal] = useState<string>('');
  const [budgetTier, setBudgetTier] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PerformanceForecasterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!creativeContent.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-performance-forecaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeContent,
          productOrBrand,
          platform,
          campaignGoal: campaignGoal || undefined,
          budgetTier: budgetTier || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativePerformanceForecaster.error'));
      setResult(data.result as PerformanceForecasterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [creativeContent, productOrBrand, platform, campaignGoal, budgetTier, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const f: PerformanceForecast = result.forecast;
      const lines: string[] = [
        `Overall Score: ${f.overallScore}/100 (Grade: ${f.grade})`,
        `Confidence: ${f.confidence}%`,
        `Predicted CTR: ${formatRange(f.predictedCTR)}%`,
        `Predicted Engagement: ${formatRange(f.predictedEngagement)}%`,
        `Predicted Conversion: ${formatRange(f.predictedConversion)}%`,
        `Predicted Reach: ${formatRange(f.predictedReach)}K`,
        ``,
        `Risk Assessment:`,
        f.riskAssessment,
        ``,
        `Key Drivers:`,
        ...f.keyDrivers.map((d) => `- ${d}`),
        ``,
        `Optimization Suggestions:`,
        ...f.optimizationSuggestions.map((s) => `- ${s}`),
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
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
          {t('creativePerformanceForecaster.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('creativePerformanceForecaster.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativePerformanceForecaster.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativePerformanceForecaster.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('creativePerformanceForecaster.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativePerformanceForecaster.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cpfCreativeContent" className="block text-sm font-medium mb-1">
              {t('creativePerformanceForecaster.creativeContent')}
            </label>
            <textarea
              id="cpfCreativeContent"
              value={creativeContent}
              onChange={(e) => setCreativeContent(e.target.value)}
              placeholder={t('creativePerformanceForecaster.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cpfProductOrBrand" className="block text-sm font-medium mb-1">
              {t('creativePerformanceForecaster.productOrBrand')}
            </label>
            <textarea
              id="cpfProductOrBrand"
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
            <label className="block text-sm font-medium mb-2">{t('creativePerformanceForecaster.platform')}</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cpfCampaignGoal" className="block text-sm font-medium mb-1">
                {t('creativePerformanceForecaster.campaignGoal')}
              </label>
              <select
                id="cpfCampaignGoal"
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                <option value="">{t('creativePerformanceForecaster.none')}</option>
                {CAMPAIGN_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cpfBudgetTier" className="block text-sm font-medium mb-1">
                {t('creativePerformanceForecaster.budgetTier')}
              </label>
              <select
                id="cpfBudgetTier"
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                <option value="">{t('creativePerformanceForecaster.none')}</option>
                {BUDGET_TIERS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !creativeContent.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativePerformanceForecaster.generating') : `${t('creativePerformanceForecaster.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativePerformanceForecaster.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativePerformanceForecaster.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativePerformanceForecaster.dryRunNotice')}
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
                {copied ? t('creativePerformanceForecaster.copied') : t('creativePerformanceForecaster.copy')}
              </button>
            </div>

            {/* Overall score + grade + confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-3">
                <Gauge className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.overallScore')}</div>
                  <div className="text-xl font-bold">{result.forecast.overallScore}/100</div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-3">
                <Target className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.grade')}</div>
                  <div className={`inline-flex items-center text-xl font-bold px-2 py-0.5 rounded-full border ${GRADE_COLORS[result.forecast.grade]}`}>
                    {result.forecast.grade}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-brand-accent flex-shrink-0" />
                <div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.confidence')}</div>
                  <div className="text-xl font-bold">{result.forecast.confidence}%</div>
                </div>
              </div>
            </div>

            {/* Predicted metrics ranges */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">{t('creativePerformanceForecaster.predictedMetrics')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.predictedCTR')}</div>
                  <div className="text-sm font-medium">{formatRange(result.forecast.predictedCTR)}%</div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.mid')}: {result.forecast.predictedCTR.mid}%</div>
                </div>
                <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.predictedEngagement')}</div>
                  <div className="text-sm font-medium">{formatRange(result.forecast.predictedEngagement)}%</div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.mid')}: {result.forecast.predictedEngagement.mid}%</div>
                </div>
                <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.predictedConversion')}</div>
                  <div className="text-sm font-medium">{formatRange(result.forecast.predictedConversion)}%</div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.mid')}: {result.forecast.predictedConversion.mid}%</div>
                </div>
                <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.predictedReach')}</div>
                  <div className="text-sm font-medium">{formatRange(result.forecast.predictedReach)}K</div>
                  <div className="text-xs text-fg-muted">{t('creativePerformanceForecaster.mid')}: {result.forecast.predictedReach.mid}K</div>
                </div>
              </div>
            </div>

            {/* Risk assessment */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-warning" /> {t('creativePerformanceForecaster.riskAssessment')}
              </h2>
              <p className="text-sm text-fg-muted">{result.forecast.riskAssessment}</p>
            </div>

            {/* Key drivers */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-brand-accent" /> {t('creativePerformanceForecaster.keyDrivers')}
              </h2>
              <ul className="space-y-1.5">
                {result.forecast.keyDrivers.map((d, i) => (
                  <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-brand-accent flex-shrink-0">•</span> {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Optimization suggestions */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-warning" /> {t('creativePerformanceForecaster.optimizationSuggestions')}
              </h2>
              <ul className="space-y-1.5">
                {result.forecast.optimizationSuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="text-warning flex-shrink-0">•</span> {s}
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
