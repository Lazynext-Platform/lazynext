'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Film,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Heart,
  Clock,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  StoryArcDesignerResult,
  StoryAct,
  EmotionalBeat,
  KeyMoment,
  StoryImpact,
} from '@/lib/creative/ad-creative-story-arc-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const EMOTIONS = [
  'joy',
  'surprise',
  'fear',
  'sadness',
  'anger',
  'trust',
  'anticipation',
  'disgust',
] as const;

const IMPACT_COLORS: Record<StoryImpact, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function intensityColor(intensity: number): string {
  if (intensity >= 75) return 'bg-danger';
  if (intensity >= 50) return 'bg-warning';
  return 'bg-success';
}

export default function AdCreativeStoryArcDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [coreMessage, setCoreMessage] = useState('');
  const [targetEmotion, setTargetEmotion] = useState<string>('joy');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StoryArcDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !coreMessage.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-story-arc-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          coreMessage,
          targetEmotion,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeStoryArcDesigner.error'));
      setResult(data.result as StoryArcDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, coreMessage, targetEmotion, platform, t]);

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
          {t('adCreativeStoryArcDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6" /> {t('adCreativeStoryArcDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeStoryArcDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeStoryArcDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6" /> {t('adCreativeStoryArcDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeStoryArcDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="asadProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeStoryArcDesigner.productOrBrand')}
            </label>
            <input
              id="asadProduct"
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
            <label htmlFor="asadMessage" className="block text-sm font-medium mb-1">
              {t('adCreativeStoryArcDesigner.coreMessage')}
            </label>
            <input
              id="asadMessage"
              type="text"
              value={coreMessage}
              onChange={(e) => setCoreMessage(e.target.value)}
              placeholder="e.g., Brighten your skin in just 7 days — risk-free"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeStoryArcDesigner.targetEmotion')}</label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setTargetEmotion(em)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    targetEmotion === em
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeStoryArcDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !coreMessage.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeStoryArcDesigner.generating') : `${t('adCreativeStoryArcDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeStoryArcDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeStoryArcDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeStoryArcDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeStoryArcDesigner.copied') : t('adCreativeStoryArcDesigner.copy')}
              </button>
            </div>

            {/* Story acts timeline */}
            {result.arc.acts.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4 text-brand-accent" /> {t('adCreativeStoryArcDesigner.acts')}
                </p>
                <ol className="space-y-3">
                  {result.arc.acts.map((act: StoryAct, i: number) => (
                    <li key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-medium">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mr-2">
                            {act.act}
                          </span>
                          {act.name}
                        </span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">
                          <Clock className="w-3 h-3 mr-1" /> {act.duration}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted">{act.description}</p>
                      <p className="text-xs text-fg-muted"><span className="font-medium text-brand-accent">{t('adCreativeStoryArcDesigner.acts')} purpose:</span> {act.purpose}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Emotional beats with intensity bars */}
            {result.arc.emotionalBeats.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-danger" /> {t('adCreativeStoryArcDesigner.emotionalBeats')}
                </p>
                {result.arc.emotionalBeats.map((beat: EmotionalBeat, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{beat.beat}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">{beat.emotion}</span>
                        <span className="text-xs font-bold">{beat.intensity}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityColor(beat.intensity)}`}
                        style={{ width: `${beat.intensity}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs text-fg-muted">{beat.description}</p>
                      <span className="inline-flex items-center text-xs text-fg-muted"><Clock className="w-3 h-3 mr-1" /> {beat.timing}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pacing guide */}
            {result.arc.pacingGuide && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" /> {t('adCreativeStoryArcDesigner.pacingGuide')}
                </p>
                <p className="text-xs text-fg-muted">{result.arc.pacingGuide}</p>
              </div>
            )}

            {/* Key moments with impact badges */}
            {result.arc.keyMoments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" /> {t('adCreativeStoryArcDesigner.keyMoments')}
                </p>
                {result.arc.keyMoments.map((km: KeyMoment, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{km.moment}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{km.type}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[km.impact] || IMPACT_COLORS.medium}`}>{km.impact}</span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{km.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.arc.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeStoryArcDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.arc.recommendations.map((rec, i) => (
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
