'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Waves,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  EmotionSequencerResult,
  EmotionBeat,
  EmotionalPeak,
  TransitionStrategy,
} from '@/lib/creative/ad-creative-emotion-sequencer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function intensityBarColor(intensity: number): string {
  if (intensity >= 75) return 'bg-success';
  if (intensity >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function AdCreativeEmotionSequencerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [desiredJourney, setDesiredJourney] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EmotionSequencerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !desiredJourney.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-emotion-sequencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          desiredJourney,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeEmotionSequencer.error'));
      setResult(data.result as EmotionSequencerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, desiredJourney, platform, t]);

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
          {t('adCreativeEmotionSequencer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Waves className="w-6 h-6" /> {t('adCreativeEmotionSequencer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeEmotionSequencer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeEmotionSequencer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Waves className="w-6 h-6" /> {t('adCreativeEmotionSequencer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeEmotionSequencer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acesProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionSequencer.productOrBrand')}
            </label>
            <input
              id="acesProduct"
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
            <label htmlFor="acesContent" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionSequencer.content')}
            </label>
            <textarea
              id="acesContent"
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
            <label htmlFor="acesJourney" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionSequencer.desiredJourney')}
            </label>
            <input
              id="acesJourney"
              type="text"
              value={desiredJourney}
              onChange={(e) => setDesiredJourney(e.target.value)}
              placeholder="e.g., curiosity → surprise → joy → trust"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeEmotionSequencer.platform')}</label>
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !desiredJourney.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeEmotionSequencer.generating') : `${t('adCreativeEmotionSequencer.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeEmotionSequencer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeEmotionSequencer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeEmotionSequencer.dryRunNotice')}
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
                {copied ? t('adCreativeEmotionSequencer.copied') : t('adCreativeEmotionSequencer.copy')}
              </button>
            </div>

            {/* Resonance score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeEmotionSequencer.resonanceScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.analysis.resonanceScore)}`}>{result.analysis.resonanceScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${intensityBarColor(result.analysis.resonanceScore)}`}
                  style={{ width: `${result.analysis.resonanceScore}%` }}
                />
              </div>
            </div>

            {/* Emotion sequence timeline */}
            {result.analysis.sequence.beats.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Waves className="w-4 h-4 text-brand-accent" /> {t('adCreativeEmotionSequencer.sequence')}
                </p>
                <div className="space-y-3">
                  {result.analysis.sequence.beats.map((beat: EmotionBeat, i: number) => (
                    <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">{i + 1}</span>
                          <span className="text-sm font-medium capitalize">{beat.emotion}</span>
                          <span className="text-xs text-fg-muted">{beat.timing}</span>
                        </div>
                        <span className={`text-sm font-bold ${scoreColor(beat.intensity)}`}>{beat.intensity}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                        <div
                          className={`h-full rounded-full ${intensityBarColor(beat.intensity)}`}
                          style={{ width: `${beat.intensity}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Trigger:</span> {beat.trigger}</p>
                        <p className="text-xs text-fg-muted"><span className="font-medium text-fg">Duration:</span> {beat.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs font-medium text-fg-muted mb-1">Arc</p>
                    <p className="text-xs text-fg">{result.analysis.sequence.arc}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-fg-muted mb-1">Climax</p>
                    <p className="text-xs text-fg">{result.analysis.sequence.climax}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-fg-muted mb-1">Resolution</p>
                    <p className="text-xs text-fg">{result.analysis.sequence.resolution}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Emotional peaks */}
            {result.analysis.peaks.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-accent" /> {t('adCreativeEmotionSequencer.peaks')}
                </p>
                {result.analysis.peaks.map((peak: EmotionalPeak, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{peak.emotion}</span>
                        <span className="text-xs text-fg-muted">{peak.timing}</span>
                      </div>
                      <span className={`text-sm font-bold ${scoreColor(peak.intensity)}`}>{peak.intensity}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityBarColor(peak.intensity)}`}
                        style={{ width: `${peak.intensity}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{peak.buildup}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Transition strategies */}
            {result.analysis.transitions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-accent" /> {t('adCreativeEmotionSequencer.transitions')}
                </p>
                {result.analysis.transitions.map((tr: TransitionStrategy, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium capitalize">{tr.from}</span>
                      <ArrowRight className="w-3 h-3 text-fg-muted" />
                      <span className="text-xs font-medium capitalize">{tr.to}</span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg text-fg-muted border-border">{tr.technique}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{tr.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeEmotionSequencer.recommendations')}</p>
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
