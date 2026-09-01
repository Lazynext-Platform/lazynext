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
  Music,
  Zap,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  RhythmPacingOptimizerResult,
  RhythmPattern,
  PacingSegment,
  BeatDrop,
  TempoChange,
  BeatImpact,
} from '@/lib/creative/ad-creative-rhythm-pacing-optimizer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const IMPACT_COLORS: Record<BeatImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function energyColor(energy: number): string {
  if (energy >= 75) return 'bg-success';
  if (energy >= 50) return 'bg-warning';
  return 'bg-danger';
}

function energyTextColor(energy: number): string {
  if (energy >= 75) return 'text-success';
  if (energy >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdCreativeRhythmPacingOptimizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RhythmPacingOptimizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-rhythm-pacing-optimizer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativeRhythmPacingOptimizer.error'));
      setResult(data.result as RhythmPacingOptimizerResult);
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
          {t('adCreativeRhythmPacingOptimizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeRhythmPacingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeRhythmPacingOptimizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeRhythmPacingOptimizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('adCreativeRhythmPacingOptimizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeRhythmPacingOptimizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acrpoProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeRhythmPacingOptimizer.productOrBrand')}
            </label>
            <input
              id="acrpoProduct"
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
            <label htmlFor="acrpoContent" className="block text-sm font-medium mb-1">
              {t('adCreativeRhythmPacingOptimizer.content')}
            </label>
            <textarea
              id="acrpoContent"
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
            <label htmlFor="acrpoAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeRhythmPacingOptimizer.targetAudience')}
            </label>
            <input
              id="acrpoAudience"
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
            <label className="block text-sm font-medium mb-2">{t('adCreativeRhythmPacingOptimizer.platform')}</label>
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
            {loading ? t('adCreativeRhythmPacingOptimizer.generating') : `${t('adCreativeRhythmPacingOptimizer.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeRhythmPacingOptimizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeRhythmPacingOptimizer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeRhythmPacingOptimizer.dryRunNotice')}
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
                {copied ? t('adCreativeRhythmPacingOptimizer.copied') : t('adCreativeRhythmPacingOptimizer.copy')}
              </button>
            </div>

            {/* Rhythm score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeRhythmPacingOptimizer.rhythmScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.optimization.rhythmScore)}`}>
                    {result.optimization.rhythmScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Rhythm patterns */}
            {result.optimization.patterns.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-brand-accent" /> {t('adCreativeRhythmPacingOptimizer.patterns')}
                </p>
                {result.optimization.patterns.map((p: RhythmPattern, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{p.bpm} BPM</span>
                        <span className={`text-xs font-bold ${energyTextColor(p.energy)}`}>{p.energy}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-card overflow-hidden">
                      <div
                        className={`h-full rounded-full ${energyColor(p.energy)}`}
                        style={{ width: `${p.energy}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{p.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeRhythmPacingOptimizer.duration')}:</span> {p.duration}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pacing segments timeline */}
            {result.optimization.segments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adCreativeRhythmPacingOptimizer.segments')}
                </p>
                {result.optimization.segments.map((s: PacingSegment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{s.startTime} → {s.endTime}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{s.tempo}</span>
                        <span className={`text-xs font-bold ${energyTextColor(s.energy)}`}>{s.energy}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-card overflow-hidden">
                      <div
                        className={`h-full rounded-full ${energyColor(s.energy)}`}
                        style={{ width: `${s.energy}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{s.purpose}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Beat drops */}
            {result.optimization.beatDrops.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('adCreativeRhythmPacingOptimizer.beatDrops')}
                </p>
                {result.optimization.beatDrops.map((b: BeatDrop, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{b.timing}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[b.impact] || IMPACT_COLORS.medium}`}>{b.impact}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeRhythmPacingOptimizer.buildup')}:</span> {b.buildup}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeRhythmPacingOptimizer.drop')}:</span> {b.drop}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tempo changes flow */}
            {result.optimization.tempoChanges.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-accent" /> {t('adCreativeRhythmPacingOptimizer.tempoChanges')}
                </p>
                {result.optimization.tempoChanges.map((tc: TempoChange, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{tc.fromTempo} → {tc.toTempo}</span>
                      <span className="text-xs text-fg-muted">{tc.timing}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('adCreativeRhythmPacingOptimizer.transition')}:</span> {tc.transition}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('common.resultLabels.reason')}:</span> {tc.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.optimization.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeRhythmPacingOptimizer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.optimization.recommendations.map((rec, i) => (
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
