'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Timer,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Activity,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HookTimingOptimizerResult,
  EngagementPrediction,
  RetentionRisk,
} from '@/lib/creative/ad-creative-hook-timing-optimizer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const HOOK_TYPES = [
  'question',
  'statistic',
  'story',
  'shock',
  'curiosity',
  'bold_claim',
  'problem',
  'transformation',
] as const;

const RISK_COLORS: Record<RetentionRisk, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
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

export default function AdCreativeHookTimingOptimizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [hookType, setHookType] = useState<string>('curiosity');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HookTimingOptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-hook-timing-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          hookType,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeHookTimingOptimizer.error'));
      setResult(data.result as HookTimingOptimizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, hookType, platform, t]);

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
          {t('adCreativeHookTimingOptimizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="w-6 h-6" /> {t('adCreativeHookTimingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeHookTimingOptimizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeHookTimingOptimizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="w-6 h-6" /> {t('adCreativeHookTimingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeHookTimingOptimizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ahtoContent" className="block text-sm font-medium mb-1">
              {t('adCreativeHookTimingOptimizer.content')}
            </label>
            <textarea
              id="ahtoContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Did you know 90% of people quit their fitness goals by February? Here's how to stay in the 10%..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="ahtoProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeHookTimingOptimizer.productOrBrand')}
            </label>
            <input
              id="ahtoProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC fitness app selling a habit-tracking subscription"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeHookTimingOptimizer.hookType')}</label>
            <div className="flex flex-wrap gap-2">
              {HOOK_TYPES.map((ht) => (
                <button
                  key={ht}
                  type="button"
                  onClick={() => setHookType(ht)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    hookType === ht
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {ht.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeHookTimingOptimizer.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeHookTimingOptimizer.generating') : `${t('adCreativeHookTimingOptimizer.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeHookTimingOptimizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeHookTimingOptimizer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeHookTimingOptimizer.dryRunNotice')}
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
                {copied ? t('adCreativeHookTimingOptimizer.copied') : t('adCreativeHookTimingOptimizer.copy')}
              </button>
            </div>

            {/* Optimal placement + effectiveness score */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Timer className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('adCreativeHookTimingOptimizer.optimalPlacement')}</p>
                    <p className="text-base font-medium">{result.timing.optimalPlacement}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-fg-muted mb-1">{t('adCreativeHookTimingOptimizer.effectivenessScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.timing.effectivenessScore)}`}>
                    {result.timing.effectivenessScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBar(result.timing.effectivenessScore)}`}
                  style={{ width: `${result.timing.effectivenessScore}%` }}
                />
              </div>
            </div>

            {/* Timing analysis */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-accent" /> {t('adCreativeHookTimingOptimizer.timingAnalysis')}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-medium text-fg-muted">Retention risk</span>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${RISK_COLORS[result.timing.timingAnalysis.retentionRisk] || RISK_COLORS.medium}`}>
                  {result.timing.timingAnalysis.retentionRisk}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-fg-muted">
                <p><span className="font-medium text-fg">Current placement:</span> {result.timing.timingAnalysis.currentPlacement}</p>
                <p><span className="font-medium text-fg">Optimal window:</span> {result.timing.timingAnalysis.optimalWindow}</p>
                <p><span className="font-medium text-fg">Attention curve:</span> {result.timing.timingAnalysis.attentionCurve}</p>
                <p><span className="font-medium text-fg">Reasoning:</span> {result.timing.timingAnalysis.reasoning}</p>
              </div>
            </div>

            {/* Engagement predictions chart */}
            {result.timing.engagementPredictions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adCreativeHookTimingOptimizer.engagementPredictions')}
                </p>
                {result.timing.engagementPredictions.map((p: EngagementPrediction, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{p.timestamp}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${scoreColor(p.predictedEngagement)}`}>
                          {t('adCreativeHookTimingOptimizer.effectivenessScore').split(' ')[0]}: {p.predictedEngagement}
                        </span>
                        <span className={`text-xs font-bold ${scoreColor(p.audienceRetention)}`}>
                          Retention: {p.audienceRetention}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(p.predictedEngagement)}`}
                          style={{ width: `${p.predictedEngagement}%` }}
                        />
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(p.audienceRetention)}`}
                          style={{ width: `${p.audienceRetention}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{p.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.timing.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> {t('adCreativeHookTimingOptimizer.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.timing.recommendations.map((rec, i) => (
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
