'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  BatteryLow,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Activity,
  AlertTriangle,
  ListChecks,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CreativeFatigueDetectorResult,
  FatigueFactor,
  FatigueLevel,
  FatigueRecommendation,
  RefreshUrgency,
} from '@/lib/creative/creative-fatigue-detector';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const LEVEL_COLORS: Record<FatigueLevel, string> = {
  none: 'bg-success/20 text-success border-success/30',
  mild: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  moderate: 'bg-warning/20 text-warning border-warning/30',
  severe: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-danger/20 text-danger border-danger/30',
};

const RECOMMENDATION_COLORS: Record<FatigueRecommendation, string> = {
  refresh: 'bg-danger/20 text-danger border-danger/30',
  monitor: 'bg-warning/20 text-warning border-warning/30',
  keep: 'bg-success/20 text-success border-success/30',
};

const URGENCY_COLORS: Record<RefreshUrgency, string> = {
  immediate: 'bg-danger/20 text-danger border-danger/30',
  'within-week': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'within-month': 'bg-warning/20 text-warning border-warning/30',
  'no-rush': 'bg-success/20 text-success border-success/30',
};

function scoreColor(s: number): string {
  if (s >= 80) return 'text-danger';
  if (s >= 60) return 'text-orange-400';
  if (s >= 40) return 'text-warning';
  if (s >= 20) return 'text-brand-accent';
  return 'text-success';
}

export default function CreativeFatigueDetectorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [creativeDescription, setCreativeDescription] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [daysRunning, setDaysRunning] = useState<string>('');
  const [currentCTR, setCurrentCTR] = useState<string>('');
  const [previousCTR, setPreviousCTR] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreativeFatigueDetectorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const detect = useCallback(async () => {
    if (!creativeDescription.trim() || !daysRunning || !currentCTR || !impressions) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-fatigue-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeDescription,
          platform,
          daysRunning: Number(daysRunning),
          currentCTR: Number(currentCTR),
          previousCTR: previousCTR ? Number(previousCTR) : undefined,
          impressions: Number(impressions),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeFatigueDetector.error'));
      setResult(data.result as CreativeFatigueDetectorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [creativeDescription, platform, daysRunning, currentCTR, previousCTR, impressions, t]);

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
          {t('creativeFatigueDetector.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BatteryLow className="w-6 h-6" /> {t('creativeFatigueDetector.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFatigueDetector.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeFatigueDetector.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BatteryLow className="w-6 h-6" /> {t('creativeFatigueDetector.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeFatigueDetector.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cfdDescription" className="block text-sm font-medium mb-1">
              {t('creativeFatigueDetector.creativeDescription')}
            </label>
            <textarea
              id="cfdDescription"
              value={creativeDescription}
              onChange={(e) => setCreativeDescription(e.target.value)}
              placeholder="e.g., UGC-style TikTok ad showing a skincare routine with a curiosity hook"
              rows={3}
              maxLength={5000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeFatigueDetector.platform')}</label>
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
              <label htmlFor="cfdDays" className="block text-sm font-medium mb-1">
                {t('creativeFatigueDetector.daysRunning')}
              </label>
              <input
                id="cfdDays"
                type="number"
                value={daysRunning}
                onChange={(e) => setDaysRunning(e.target.value)}
                placeholder="e.g., 12"
                min="1"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="cfdImpressions" className="block text-sm font-medium mb-1">
                {t('creativeFatigueDetector.impressions')}
              </label>
              <input
                id="cfdImpressions"
                type="number"
                value={impressions}
                onChange={(e) => setImpressions(e.target.value)}
                placeholder="e.g., 150000"
                min="1"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfdCurrentCTR" className="block text-sm font-medium mb-1">
                {t('creativeFatigueDetector.currentCTR')}
              </label>
              <input
                id="cfdCurrentCTR"
                type="number"
                value={currentCTR}
                onChange={(e) => setCurrentCTR(e.target.value)}
                placeholder="e.g., 1.2"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="cfdPreviousCTR" className="block text-sm font-medium mb-1">
                {t('creativeFatigueDetector.previousCTR')}
              </label>
              <input
                id="cfdPreviousCTR"
                type="number"
                value={previousCTR}
                onChange={(e) => setPreviousCTR(e.target.value)}
                placeholder="e.g., 2.5 (optional)"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={detect}
            disabled={loading || !creativeDescription.trim() || !daysRunning || !currentCTR || !impressions}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeFatigueDetector.detecting') : `${t('creativeFatigueDetector.detect')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeFatigueDetector.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeFatigueDetector.detecting')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeFatigueDetector.dryRunNotice')}
              </div>
            )}

            {/* Fatigue score + level */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Gauge className="w-5 h-5 text-brand-accent" />
                <h2 className="font-medium">{t('creativeFatigueDetector.fatigueScore')}</h2>
                <span className={`ml-auto text-2xl font-bold ${scoreColor(result.fatigueScore)}`}>{result.fatigueScore}/100</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${LEVEL_COLORS[result.fatigueLevel]}`}>
                  <Activity className="w-3 h-3" /> {result.fatigueLevel}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${RECOMMENDATION_COLORS[result.recommendation]}`}>
                  <AlertTriangle className="w-3 h-3" /> {t('creativeFatigueDetector.recommendation')}: {result.recommendation}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCY_COLORS[result.estimatedRefreshUrgency]}`}>
                  {t('creativeFatigueDetector.estimatedRefreshUrgency')}: {result.estimatedRefreshUrgency}
                </span>
              </div>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('creativeFatigueDetector.copied') : t('creativeFatigueDetector.copy')}
              </button>
            </div>

            {/* Factors */}
            {result.factors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-fg-muted" /> {t('creativeFatigueDetector.factors')}
                </h3>
                <div className="space-y-2">
                  {result.factors.map((f: FatigueFactor, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-card p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className={`ml-auto text-sm font-bold ${scoreColor(f.impact)}`}>{f.impact}</span>
                      </div>
                      <p className="text-xs text-fg-muted">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested actions */}
            {result.suggestedActions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-fg-muted" /> {t('creativeFatigueDetector.suggestedActions')}
                </h3>
                <ul className="space-y-1.5">
                  {result.suggestedActions.map((action, i) => (
                    <li key={i} className="rounded-lg border border-border bg-bg-card p-3 text-sm flex items-start gap-2">
                      <span className="text-brand-accent mt-0.5">→</span>
                      <span>{action}</span>
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
