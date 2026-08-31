'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Users,
  Activity,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdTimingOptimizerResult,
  OptimalSlot,
  AudienceActivity,
} from '@/lib/creative/ad-timing-optimizer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const ACTIVITY_COLORS: Record<AudienceActivity, string> = {
  high: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-fg-muted/20 text-fg-muted border-border',
};

function scoreColor(s: number): string {
  if (s >= 80) return 'text-success';
  if (s >= 65) return 'text-brand-accent';
  if (s >= 45) return 'text-warning';
  return 'text-danger';
}

export default function AdTimingOptimizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [platform, setPlatform] = useState<string>('tiktok');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [productCategory, setProductCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdTimingOptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const optimize = useCallback(async () => {
    if (!audienceDescription.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-timing-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          audienceDescription,
          timezone: timezone || undefined,
          productCategory: productCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adTimingOptimizer.error'));
      setResult(data.result as AdTimingOptimizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [platform, audienceDescription, timezone, productCategory, t]);

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
          {t('adTimingOptimizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" /> {t('adTimingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adTimingOptimizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adTimingOptimizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" /> {t('adTimingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adTimingOptimizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('adTimingOptimizer.platform')}</label>
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
            <label htmlFor="atoAudience" className="block text-sm font-medium mb-1">
              {t('adTimingOptimizer.audienceDescription')}
            </label>
            <textarea
              id="atoAudience"
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              placeholder="e.g., Gen Z college students in the US who follow fitness influencers"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="atoTimezone" className="block text-sm font-medium mb-1">
                {t('adTimingOptimizer.timezone')}
              </label>
              <input
                id="atoTimezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g., America/New_York (optional, default UTC)"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="atoCategory" className="block text-sm font-medium mb-1">
                {t('adTimingOptimizer.productCategory')}
              </label>
              <input
                id="atoCategory"
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g., fitness apparel (optional)"
                maxLength={200}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={optimize}
            disabled={loading || !audienceDescription.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adTimingOptimizer.optimizing') : `${t('adTimingOptimizer.optimize')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adTimingOptimizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adTimingOptimizer.optimizing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adTimingOptimizer.dryRunNotice')}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-5 h-5 text-brand-accent" />
                <h2 className="font-medium">{t('adTimingOptimizer.summary')}</h2>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                  {result.timezone}
                </span>
              </div>
              <p className="text-sm text-fg-muted">{result.summary}</p>
            </div>

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adTimingOptimizer.copied') : t('adTimingOptimizer.copy')}
              </button>
            </div>

            {/* Optimal slots */}
            <div className="space-y-3">
              {result.optimalSlots.map((slot: OptimalSlot, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-card p-4"
                >
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Calendar className="w-4 h-4 text-brand-accent" /> {slot.dayOfWeek}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
                      <Clock className="w-3.5 h-3.5" /> {slot.timeRange}
                    </span>
                    <span className={`ml-auto text-lg font-bold ${scoreColor(slot.confidenceScore)}`}>{slot.confidenceScore}</span>
                  </div>

                  <p className="text-sm text-fg-muted mb-3">{slot.reason}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('adTimingOptimizer.expectedReach')}:</span>
                      <span className="font-medium">{slot.expectedReach}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${ACTIVITY_COLORS[slot.audienceActivity]}`}>
                      <Activity className="w-3 h-3" /> {t('adTimingOptimizer.audienceActivity')}: {slot.audienceActivity}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('adTimingOptimizer.confidenceScore')}:</span>
                      <span className={scoreColor(slot.confidenceScore)}>{slot.confidenceScore}/100</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
