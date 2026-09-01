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
  ArrowRight,
  Mountain,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SentimentJourneyResult,
  SentimentBeat,
  SentimentTransition,
  PeakMoment,
  SentimentLabel,
} from '@/lib/creative/creative-sentiment-journey-mapper';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: 'bg-success/20 text-success border-success/30',
  negative: 'bg-danger/20 text-danger border-danger/30',
  neutral: 'bg-fg-muted/20 text-fg-muted border-border',
  excited: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  curious: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  fearful: 'bg-warning/20 text-warning border-warning/30',
  hopeful: 'bg-success/20 text-success border-success/30',
  surprised: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function intensityColor(intensity: number): string {
  if (intensity >= 75) return 'bg-success';
  if (intensity >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeSentimentJourneyMapperPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SentimentJourneyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-sentiment-journey-mapper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeSentimentJourneyMapper.error'));
      setResult(data.result as SentimentJourneyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, platform, t]);

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
          {t('creativeSentimentJourneyMapper.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('creativeSentimentJourneyMapper.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeSentimentJourneyMapper.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeSentimentJourneyMapper.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {t('creativeSentimentJourneyMapper.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeSentimentJourneyMapper.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="csjmContent" className="block text-sm font-medium mb-1">
              {t('creativeSentimentJourneyMapper.content')}
            </label>
            <textarea
              id="csjmContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('creativeSentimentJourneyMapper.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="csjmProduct" className="block text-sm font-medium mb-1">
              {t('creativeSentimentJourneyMapper.productOrBrand')}
            </label>
            <input
              id="csjmProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeSentimentJourneyMapper.platform')}</label>
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
            {loading ? t('creativeSentimentJourneyMapper.generating') : `${t('creativeSentimentJourneyMapper.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeSentimentJourneyMapper.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeSentimentJourneyMapper.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeSentimentJourneyMapper.dryRunNotice')}
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
                {copied ? t('creativeSentimentJourneyMapper.copied') : t('creativeSentimentJourneyMapper.copy')}
              </button>
            </div>

            {/* Emotional arc */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('creativeSentimentJourneyMapper.emotionalArc')}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                <span className="inline-flex items-center text-sm font-medium px-3 py-1 rounded-lg border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                  {result.journey.emotionalArc.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-fg-muted">{t('creativeSentimentJourneyMapper.effectiveness')}</span>
                  <span className={`text-sm font-bold ${result.journey.emotionalArc.effectiveness >= 75 ? 'text-success' : result.journey.emotionalArc.effectiveness >= 50 ? 'text-warning' : 'text-danger'}`}>
                    {result.journey.emotionalArc.effectiveness}/100
                  </span>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{result.journey.emotionalArc.description}</p>
            </div>

            {/* Sentiment beats timeline */}
            {result.journey.beats.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeSentimentJourneyMapper.beats')}</p>
                {result.journey.beats.map((beat: SentimentBeat, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-fg-muted">#{i + 1} · {beat.position}%</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[beat.sentiment] || SENTIMENT_COLORS.neutral}`}>
                          {beat.sentiment}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${beat.intensity >= 75 ? 'text-success' : beat.intensity >= 50 ? 'text-warning' : 'text-danger'}`}>
                        {beat.intensity}/100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityColor(beat.intensity)}`}
                        style={{ width: `${beat.intensity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{beat.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Transitions */}
            {result.journey.transitions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeSentimentJourneyMapper.transitions')}</p>
                {result.journey.transitions.map((tr: SentimentTransition, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[tr.fromSentiment] || SENTIMENT_COLORS.neutral}`}>
                          {tr.fromSentiment}
                        </span>
                        <ArrowRight className="w-3 h-3 text-fg-muted" />
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[tr.toSentiment] || SENTIMENT_COLORS.neutral}`}>
                          {tr.toSentiment}
                        </span>
                      </div>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">
                        {tr.transitionQuality}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">Beat {tr.fromBeat} → Beat {tr.toBeat}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Peak moments */}
            {result.journey.peakMoments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-brand-accent" /> {t('creativeSentimentJourneyMapper.peakMoments')}
                </p>
                {result.journey.peakMoments.map((peak: PeakMoment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-fg-muted">{peak.position}%</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SENTIMENT_COLORS[peak.sentiment] || SENTIMENT_COLORS.neutral}`}>
                          {peak.sentiment}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${peak.intensity >= 75 ? 'text-success' : peak.intensity >= 50 ? 'text-warning' : 'text-danger'}`}>
                        {peak.intensity}/100
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{peak.significance}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.journey.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeSentimentJourneyMapper.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.journey.recommendations.map((rec, i) => (
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
