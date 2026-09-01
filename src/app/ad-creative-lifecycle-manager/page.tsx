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
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  LifecycleResult,
  LifecyclePhase,
  LifecycleStage,
  StageHealth,
  RefreshRecommendation,
} from '@/lib/creative/ad-creative-lifecycle-manager';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const STAGES: LifecycleStage[] = ['launch', 'growth', 'maturity', 'decline', 'retirement'];

const STAGE_COLORS: Record<LifecycleStage, string> = {
  launch: 'bg-success/20 text-success border-success/30',
  growth: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  maturity: 'bg-warning/20 text-warning border-warning/30',
  decline: 'bg-danger/20 text-danger border-danger/30',
  retirement: 'bg-danger/30 text-danger border-danger/40',
};

const HEALTH_COLORS: Record<StageHealth, string> = {
  healthy: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  critical: 'bg-danger/20 text-danger border-danger/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdCreativeLifecycleManagerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [creativeDescription, setCreativeDescription] = useState('');
  const [currentStage, setCurrentStage] = useState<string>('launch');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LifecycleResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !creativeDescription.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-lifecycle-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          creativeDescription,
          currentStage,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeLifecycleManager.error'));
      setResult(data.result as LifecycleResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, creativeDescription, currentStage, platform, t]);

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
          {t('adCreativeLifecycleManager.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeLifecycleManager.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeLifecycleManager.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeLifecycleManager.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeLifecycleManager.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeLifecycleManager.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aclmProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeLifecycleManager.productOrBrand')}
            </label>
            <input
              id="aclmProduct"
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
            <label htmlFor="aclmCreative" className="block text-sm font-medium mb-1">
              {t('adCreativeLifecycleManager.creativeDescription')}
            </label>
            <textarea
              id="aclmCreative"
              value={creativeDescription}
              onChange={(e) => setCreativeDescription(e.target.value)}
              placeholder="e.g., A 15s UGC-style video showing a before/after transformation with a strong hook and clear CTA..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeLifecycleManager.currentStage')}</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCurrentStage(st)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    currentStage === st
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeLifecycleManager.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !creativeDescription.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeLifecycleManager.generating') : `${t('adCreativeLifecycleManager.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeLifecycleManager.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeLifecycleManager.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeLifecycleManager.dryRunNotice')}
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
                {copied ? t('adCreativeLifecycleManager.copied') : t('adCreativeLifecycleManager.copy')}
              </button>
            </div>

            {/* Current stage */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeLifecycleManager.currentStageLabel')}</p>
                  <span className={`inline-flex items-center text-lg font-bold px-3 py-1 rounded-lg border ${STAGE_COLORS[result.lifecycle.currentStage] || STAGE_COLORS.launch}`}>
                    {result.lifecycle.currentStage}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage analysis timeline */}
            {result.lifecycle.stageAnalysis.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('adCreativeLifecycleManager.stageAnalysis')}</p>
                <div className="space-y-2">
                  {result.lifecycle.stageAnalysis.map((phase: LifecyclePhase, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STAGE_COLORS[phase.stage] || STAGE_COLORS.launch}`}>
                            {phase.stage}
                          </span>
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${HEALTH_COLORS[phase.health] || HEALTH_COLORS.healthy}`}>
                            {phase.health}
                          </span>
                          <span className="inline-flex items-center text-xs font-medium text-fg-muted gap-1">
                            <Clock className="w-3 h-3" /> {phase.estimatedDuration}d
                          </span>
                        </div>
                      </div>
                      {Object.keys(phase.metrics).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(phase.metrics).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-bg-card border border-border text-fg-muted">
                              <span className="font-medium text-fg">{k}</span>: {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-fg-muted">{phase.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh recommendations */}
            {result.lifecycle.refreshRecommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-accent" /> {t('adCreativeLifecycleManager.refreshRecommendations')}
                </p>
                {result.lifecycle.refreshRecommendations.map((rec: RefreshRecommendation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{rec.type.replace(/_/g, ' ')}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium}`}>{rec.priority}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{rec.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('adCreativeLifecycleManager.refreshRecommendations')}:</span> {rec.timing}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Performance prediction */}
            {result.lifecycle.performancePrediction && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adCreativeLifecycleManager.performancePrediction')}
                </p>
                <p className="text-sm text-fg-muted">{result.lifecycle.performancePrediction}</p>
              </div>
            )}

            {/* Retirement signals */}
            {result.lifecycle.retirementSignals.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> {t('adCreativeLifecycleManager.retirementSignals')}
                </p>
                <ul className="space-y-1.5">
                  {result.lifecycle.retirementSignals.map((sig, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 text-danger flex-shrink-0 mt-0.5" /> {sig}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.lifecycle.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeLifecycleManager.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.lifecycle.recommendations.map((rec, i) => (
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
