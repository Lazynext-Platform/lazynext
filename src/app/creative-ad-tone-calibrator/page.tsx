'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Gauge,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ToneCalibratorResult,
  ToneDimension,
  ToneAdjustment,
  WordReplacement,
} from '@/lib/creative/creative-ad-tone-calibrator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const TONES = [
  'professional',
  'casual',
  'playful',
  'authoritative',
  'empathetic',
  'urgent',
  'inspirational',
  'humorous',
] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function gapColor(gap: number): string {
  if (Math.abs(gap) < 15) return 'bg-success';
  if (Math.abs(gap) < 30) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdToneCalibratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [desiredTone, setDesiredTone] = useState<string>('professional');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ToneCalibratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-tone-calibrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          desiredTone,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdToneCalibrator.error'));
      setResult(data.result as ToneCalibratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, desiredTone, platform, t]);

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
          {t('creativeAdToneCalibrator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6" /> {t('creativeAdToneCalibrator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdToneCalibrator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdToneCalibrator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6" /> {t('creativeAdToneCalibrator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdToneCalibrator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="catcContent" className="block text-sm font-medium mb-1">
              {t('creativeAdToneCalibrator.content')}
            </label>
            <textarea
              id="catcContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('creativeAdToneCalibrator.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="catcProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdToneCalibrator.productOrBrand')}
            </label>
            <input
              id="catcProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeAdToneCalibrator.desiredTone')}</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setDesiredTone(tone)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    desiredTone === tone
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdToneCalibrator.platform')}</label>
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
            {loading ? t('creativeAdToneCalibrator.calibrating') : `${t('creativeAdToneCalibrator.calibrate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdToneCalibrator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdToneCalibrator.calibrating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdToneCalibrator.dryRunNotice')}
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
                {copied ? t('creativeAdToneCalibrator.copied') : t('creativeAdToneCalibrator.copy')}
              </button>
            </div>

            {/* Alignment score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdToneCalibrator.alignmentScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.calibration.alignmentScore)}`}>
                    {result.calibration.alignmentScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdToneCalibrator.desiredToneLabel')}</p>
                  <p className="text-sm font-medium capitalize">{result.calibration.desiredTone}</p>
                </div>
              </div>
            </div>

            {/* Current tone dimensions with gap bars */}
            {result.calibration.currentTone.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeAdToneCalibrator.currentTone')}</p>
                {result.calibration.currentTone.map((d: ToneDimension, i: number) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium capitalize">{d.dimension}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-fg-muted">{d.currentScore}</span>
                        <ArrowRight className="w-3 h-3 text-fg-muted" />
                        <span className="font-bold text-brand-accent">{d.desiredScore}</span>
                        <span className={`px-1.5 py-0.5 rounded-full border text-xs ${d.gap >= 0 ? 'text-warning border-warning/30 bg-warning/10' : 'text-success border-success/30 bg-success/10'}`}>
                          {d.gap > 0 ? '+' : ''}{d.gap}
                        </span>
                      </div>
                    </div>
                    {/* Gap bar: shows current vs desired */}
                    <div className="relative h-2 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className="absolute h-full rounded-full bg-fg-muted/40"
                        style={{ width: `${Math.min(100, Math.max(0, d.currentScore))}%` }}
                      />
                      <div
                        className={`absolute h-full rounded-full ${gapColor(d.gap)} opacity-70`}
                        style={{ width: `${Math.min(100, Math.max(0, d.desiredScore))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tone adjustments */}
            {result.calibration.toneAdjustments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-accent" /> {t('creativeAdToneCalibrator.toneAdjustments')}
                </p>
                {result.calibration.toneAdjustments.map((adj: ToneAdjustment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium capitalize">{adj.area}</span>
                      <span className={`text-xs font-bold ${scoreColor(adj.impact)}`}>{adj.impact}/100</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('creativeAdToneCalibrator.current')}:</span> {adj.current}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('creativeAdToneCalibrator.suggested')}:</span> {adj.suggested}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Word replacements table */}
            {result.calibration.wordReplacements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeAdToneCalibrator.wordReplacements')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-fg-muted border-b border-border">
                        <th className="py-1.5 pr-3 font-medium">{t('creativeAdToneCalibrator.original')}</th>
                        <th className="py-1.5 pr-3 font-medium">{t('creativeAdToneCalibrator.replacement')}</th>
                        <th className="py-1.5 font-medium">{t('creativeAdToneCalibrator.reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.calibration.wordReplacements.map((w: WordReplacement, i: number) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-3 text-danger">{w.original}</td>
                          <td className="py-1.5 pr-3 text-success font-medium">{w.replacement}</td>
                          <td className="py-1.5 text-fg-muted">{w.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calibrated content box */}
            {result.calibration.calibratedContent && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium">{t('creativeAdToneCalibrator.calibratedContent')}</p>
                <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm whitespace-pre-wrap">
                  {result.calibration.calibratedContent}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.calibration.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeAdToneCalibrator.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.calibration.recommendations.map((rec, i) => (
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
