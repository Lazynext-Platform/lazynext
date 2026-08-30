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
  Hash,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  TrendSpotterResult,
  Trend,
  TrendMomentum,
} from '@/lib/creative/trend-spotter';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const MOMENTUM_COLORS: Record<TrendMomentum, string> = {
  rising: 'bg-success/20 text-success border-success/30',
  stable: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  declining: 'bg-danger/20 text-danger border-danger/30',
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function TrendSpotterPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrendSpotterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const spot = useCallback(async () => {
    if (!niche.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/trend-spotter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          platform,
          region: region || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('trendSpotter.error'));
      setResult(data.result as TrendSpotterResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [niche, platform, region, t]);

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
          {t('trendSpotter.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('trendSpotter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('trendSpotter.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('trendSpotter.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> {t('trendSpotter.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('trendSpotter.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="tsNiche" className="block text-sm font-medium mb-1">
              {t('trendSpotter.niche')}
            </label>
            <input
              id="tsNiche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., clean skincare, home fitness, plant-based cooking"
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('trendSpotter.platform')}</label>
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
            <label htmlFor="tsRegion" className="block text-sm font-medium mb-1">
              {t('trendSpotter.region')}
            </label>
            <input
              id="tsRegion"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., US, UK, Global (optional)"
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={spot}
            disabled={loading || !niche.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('trendSpotter.spotting') : `${t('trendSpotter.spot')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('trendSpotter.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('trendSpotter.spotting')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('trendSpotter.dryRunNotice')}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-brand-accent" />
                <h2 className="font-medium">{t('trendSpotter.summary')}</h2>
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
                {copied ? t('trendSpotter.copied') : t('trendSpotter.copy')}
              </button>
            </div>

            {/* Trends */}
            <div className="space-y-3">
              {result.trends.map((tr: Trend, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-card p-4"
                >
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                    <span className="font-medium flex-1">{tr.topic}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${MOMENTUM_COLORS[tr.momentum] || MOMENTUM_COLORS.stable}`}>
                      {tr.momentum}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                      <Hash className="w-3 h-3" /> {tr.hashtag}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[tr.platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {tr.platform}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                      {tr.volume}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                      <Clock className="w-3 h-3" /> {tr.timeToAct}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-fg-muted">
                    <Lightbulb className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" />
                    <span><span className="font-medium">{t('trendSpotter.suggestedAngle')}:</span> {tr.suggestedAngle}</span>
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
