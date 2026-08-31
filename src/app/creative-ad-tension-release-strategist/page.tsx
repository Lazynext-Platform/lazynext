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
  Waves,
  Heart,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  TensionReleaseResult,
  TensionCycle,
  ReleasePoint,
  CatharsisMoment,
  ReliefLevel,
} from '@/lib/creative/creative-ad-tension-release-strategist';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const RELIEF_COLORS: Record<ReliefLevel, string> = {
  partial: 'bg-warning/20 text-warning border-warning/30',
  full: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  cathartic: 'bg-success/20 text-success border-success/30',
};

function intensityColor(score: number): string {
  if (score >= 75) return 'text-danger';
  if (score >= 50) return 'text-warning';
  return 'text-brand-accent';
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-danger';
  if (score >= 50) return 'bg-warning';
  return 'bg-brand-accent';
}

export default function CreativeAdTensionReleaseStrategistPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TensionReleaseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-tension-release-strategist', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdTensionReleaseStrategist.error'));
      setResult(data.result as TensionReleaseResult);
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
          {t('creativeAdTensionReleaseStrategist.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('creativeAdTensionReleaseStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdTensionReleaseStrategist.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdTensionReleaseStrategist.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('creativeAdTensionReleaseStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdTensionReleaseStrategist.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="catrsProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdTensionReleaseStrategist.productOrBrand')}
            </label>
            <input
              id="catrsProduct"
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
            <label htmlFor="catrsContent" className="block text-sm font-medium mb-1">
              {t('creativeAdTensionReleaseStrategist.content')}
            </label>
            <textarea
              id="catrsContent"
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
            <label htmlFor="catrsAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdTensionReleaseStrategist.targetAudience')}
            </label>
            <input
              id="catrsAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 concerned about skin aging"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdTensionReleaseStrategist.platform')}</label>
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
            {loading ? t('creativeAdTensionReleaseStrategist.generating') : `${t('creativeAdTensionReleaseStrategist.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdTensionReleaseStrategist.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdTensionReleaseStrategist.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdTensionReleaseStrategist.dryRunNotice')}
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
                {copied ? t('creativeAdTensionReleaseStrategist.copied') : t('creativeAdTensionReleaseStrategist.copy')}
              </button>
            </div>

            {/* Rhythm score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdTensionReleaseStrategist.rhythmScore')}</p>
                  <p className={`text-3xl font-bold ${intensityColor(result.strategy.rhythmScore)}`}>{result.strategy.rhythmScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(result.strategy.rhythmScore)}`}
                  style={{ width: `${result.strategy.rhythmScore}%` }}
                />
              </div>
            </div>

            {/* Tension cycles */}
            {result.strategy.cycles.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Waves className="w-4 h-4 text-brand-accent" /> {t('creativeAdTensionReleaseStrategist.cycles')}
                </p>
                {result.strategy.cycles.map((c: TensionCycle, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium capitalize">{c.phase}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{c.duration}</span>
                        <span className={`text-sm font-bold ${intensityColor(c.intensity)}`}>{c.intensity}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(c.intensity)}`}
                        style={{ width: `${c.intensity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Buildup:</span> {c.buildup}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Peak:</span> {c.peak}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Release:</span> {c.release}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Release points */}
            {result.strategy.releasePoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('creativeAdTensionReleaseStrategist.releasePoints')}
                </p>
                {result.strategy.releasePoints.map((rp: ReleasePoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{rp.timing}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${RELIEF_COLORS[rp.reliefLevel] || RELIEF_COLORS.partial}`}>{rp.reliefLevel}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{rp.technique}:</span> {rp.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Catharsis moments */}
            {result.strategy.catharsisMoments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-danger" /> {t('creativeAdTensionReleaseStrategist.catharsisMoments')}
                </p>
                {result.strategy.catharsisMoments.map((cm: CatharsisMoment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{cm.timing}</span>
                      <span className={`text-sm font-bold ${intensityColor(cm.impact)}`}>{cm.impact}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(cm.impact)}`}
                        style={{ width: `${cm.impact}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Trigger:</span> {cm.trigger}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Release:</span> {cm.emotionalRelease}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdTensionReleaseStrategist.recommendations')}</p>
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
