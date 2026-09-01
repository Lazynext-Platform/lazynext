'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Activity,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingDown,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  BurnoutDetectorResult,
  FatigueIndicator,
  DeclinePrediction,
  RefreshRecommendation,
  BurnoutLevel,
  RefreshPriority,
} from '@/lib/creative/ad-creative-burnout-detector';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const BURNOUT_LEVEL_COLORS: Record<BurnoutLevel, string> = {
  healthy: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  elevated: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  critical: 'bg-danger/20 text-danger border-danger/30',
};

const PRIORITY_COLORS: Record<RefreshPriority, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function riskColor(score: number): string {
  if (score >= 75) return 'text-danger';
  if (score >= 50) return 'text-brand-accent';
  if (score >= 25) return 'text-warning';
  return 'text-success';
}

function riskBarColor(score: number): string {
  if (score >= 75) return 'bg-danger';
  if (score >= 50) return 'bg-brand-accent';
  if (score >= 25) return 'bg-warning';
  return 'bg-success';
}

export default function AdCreativeBurnoutDetectorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [daysRunning, setDaysRunning] = useState<string>('14');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BurnoutDetectorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    const days = Number(daysRunning);
    if (!Number.isFinite(days) || days < 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-burnout-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          daysRunning: days,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeBurnoutDetector.error'));
      setResult(data.result as BurnoutDetectorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, daysRunning, platform, t]);

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
          {t('adCreativeBurnoutDetector.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeBurnoutDetector.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeBurnoutDetector.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeBurnoutDetector.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeBurnoutDetector.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeBurnoutDetector.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acbContent" className="block text-sm font-medium mb-1">
              {t('adCreativeBurnoutDetector.content')}
            </label>
            <textarea
              id="acbContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('common.phMessage')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acbProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeBurnoutDetector.productOrBrand')}
            </label>
            <input
              id="acbProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acbDays" className="block text-sm font-medium mb-1">
              {t('adCreativeBurnoutDetector.daysRunning')}
            </label>
            <input
              id="acbDays"
              type="number"
              min={0}
              max={365}
              value={daysRunning}
              onChange={(e) => setDaysRunning(e.target.value)}
              placeholder={t('adCreativeBurnoutDetector.numberPh')}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeBurnoutDetector.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !daysRunning.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeBurnoutDetector.generating') : `${t('adCreativeBurnoutDetector.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeBurnoutDetector.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeBurnoutDetector.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeBurnoutDetector.dryRunNotice')}
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
                {copied ? t('adCreativeBurnoutDetector.copied') : t('adCreativeBurnoutDetector.copy')}
              </button>
            </div>

            {/* Burnout level + risk score */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeBurnoutDetector.riskScore')}</p>
                    <p className={`text-3xl font-bold ${riskColor(result.analysis.riskScore)}`}>{result.analysis.riskScore}<span className="text-sm text-fg-muted">/100</span></p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeBurnoutDetector.burnoutLevel')}</p>
                  <span className={`inline-flex items-center text-sm font-bold px-4 py-1.5 rounded-lg border capitalize ${BURNOUT_LEVEL_COLORS[result.analysis.burnoutLevel] || BURNOUT_LEVEL_COLORS.healthy}`}>
                    {result.analysis.burnoutLevel}
                  </span>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskBarColor(result.analysis.riskScore)}`}
                  style={{ width: `${result.analysis.riskScore}%` }}
                />
              </div>
            </div>

            {/* Fatigue indicators */}
            {result.analysis.fatigueIndicators.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeBurnoutDetector.fatigueIndicators')}</p>
                {result.analysis.fatigueIndicators.map((f: FatigueIndicator, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {f.detected ? <AlertCircle className="w-3.5 h-3.5 text-warning" /> : <Check className="w-3.5 h-3.5 text-success" />}
                        {f.indicator.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${riskColor(f.severity)}`}>{f.severity}/100</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${f.detected ? 'bg-warning/20 text-warning border-warning/30' : 'bg-success/20 text-success border-success/30'}`}>
                          {f.detected ? 'detected' : 'clear'}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${riskBarColor(f.severity)}`}
                        style={{ width: `${f.severity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{f.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Decline predictions */}
            {result.analysis.declinePredictions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-danger" /> {t('adCreativeBurnoutDetector.declinePredictions')}
                </p>
                {result.analysis.declinePredictions.map((d: DeclinePrediction, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{d.metric.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-danger">-{d.predictedDecline}%</span>
                    </div>
                    <p className="text-xs text-fg-muted">Trend: {d.currentTrend} · Timeframe: {d.timeframe}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh recommendations */}
            {result.analysis.refreshRecommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-accent" /> {t('adCreativeBurnoutDetector.refreshRecommendations')}
                </p>
                {result.analysis.refreshRecommendations.map((r: RefreshRecommendation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{r.type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-success">+{r.expectedLift}%</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium}`}>{r.priority}</span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{r.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Optimal refresh timing */}
            {result.analysis.optimalRefreshTiming && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-brand-accent" /> {t('adCreativeBurnoutDetector.optimalRefreshTiming')}
                </p>
                <p className="text-sm text-fg-muted">{result.analysis.optimalRefreshTiming}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeBurnoutDetector.recommendations')}</p>
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
