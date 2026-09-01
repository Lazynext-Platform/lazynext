'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Music,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Volume2,
  AudioLines,
  Mic,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SoundDesignStrategistResult,
  SoundLayer,
  AudioCue,
} from '@/lib/creative/ad-creative-sound-design-strategist';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const LAYER_TYPE_COLORS: Record<string, string> = {
  music: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  sfx: 'bg-warning/20 text-warning border-warning/30',
  voiceover: 'bg-success/20 text-success border-success/30',
  ambient: 'bg-info/20 text-info border-info/30',
  foley: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  silence: 'bg-fg-muted/20 text-fg-muted border-border',
};

const IMPACT_COLORS: Record<string, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function volumeBarColor(volume: number): string {
  if (volume >= 70) return 'bg-success';
  if (volume >= 40) return 'bg-warning';
  if (volume > 0) return 'bg-brand-accent';
  return 'bg-fg-muted';
}

export default function AdCreativeSoundDesignStrategistPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SoundDesignStrategistResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !mood.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-sound-design-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          mood,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeSoundDesignStrategist.error'));
      setResult(data.result as SoundDesignStrategistResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, mood, platform, t]);

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
          {t('adCreativeSoundDesignStrategist.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6" /> {t('adCreativeSoundDesignStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSoundDesignStrategist.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeSoundDesignStrategist.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6" /> {t('adCreativeSoundDesignStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeSoundDesignStrategist.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acsdsProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeSoundDesignStrategist.productOrBrand')}
            </label>
            <input
              id="acsdsProduct"
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
            <label htmlFor="acsdsContent" className="block text-sm font-medium mb-1">
              {t('adCreativeSoundDesignStrategist.content')}
            </label>
            <textarea
              id="acsdsContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('common.phMessage')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acsdsMood" className="block text-sm font-medium mb-1">
              {t('adCreativeSoundDesignStrategist.mood')}
            </label>
            <input
              id="acsdsMood"
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g., energetic, calm, mysterious, playful, dramatic, uplifting..."
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeSoundDesignStrategist.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !mood.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeSoundDesignStrategist.generating') : `${t('adCreativeSoundDesignStrategist.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeSoundDesignStrategist.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeSoundDesignStrategist.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeSoundDesignStrategist.dryRunNotice')}
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
                {copied ? t('adCreativeSoundDesignStrategist.copied') : t('adCreativeSoundDesignStrategist.copy')}
              </button>
            </div>

            {/* Sound design score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('adCreativeSoundDesignStrategist.soundDesignScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.strategy.soundDesignScore)}`}>
                    {result.strategy.soundDesignScore}<span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Sound layers */}
            {result.strategy.layers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AudioLines className="w-4 h-4 text-brand-accent" /> {t('adCreativeSoundDesignStrategist.layers')}
                </p>
                {result.strategy.layers.map((layer: SoundLayer, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${LAYER_TYPE_COLORS[layer.type] || LAYER_TYPE_COLORS.music}`}>
                        {layer.type}
                      </span>
                      <span className="text-xs text-fg-muted">{layer.timing} · {layer.duration}</span>
                    </div>
                    <p className="text-xs text-fg">{layer.description}</p>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-fg-muted flex-shrink-0" />
                      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden flex-1">
                        <div
                          className={`h-full rounded-full ${volumeBarColor(layer.volume)}`}
                          style={{ width: `${layer.volume}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-fg-muted w-8 text-right">{layer.volume}%</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('adCreativeSoundDesignStrategist.purpose')}:</span> {layer.purpose}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Audio cues */}
            {result.strategy.cues.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-accent" /> {t('adCreativeSoundDesignStrategist.cues')}
                </p>
                {result.strategy.cues.map((cue: AudioCue, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg">{cue.type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{cue.timing}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[cue.emotionalImpact] || IMPACT_COLORS.medium}`}>
                          {cue.emotionalImpact}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{cue.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium">{t('adCreativeSoundDesignStrategist.transition')}:</span> {cue.transition}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Music strategy + Voiceover direction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-brand-accent" /> {t('adCreativeSoundDesignStrategist.musicStrategy')}
                </p>
                <div className="space-y-1.5 text-xs text-fg-muted">
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.genre')}:</span> {result.strategy.musicStrategy.genre}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.tempo')}:</span> {result.strategy.musicStrategy.tempo}</p>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.energy')}</span>
                      <span className={`font-bold ${scoreColor(result.strategy.musicStrategy.energy)}`}>{result.strategy.musicStrategy.energy}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${result.strategy.musicStrategy.energy >= 75 ? 'bg-success' : result.strategy.musicStrategy.energy >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${result.strategy.musicStrategy.energy}%` }}
                      />
                    </div>
                  </div>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.keyMoment')}:</span> {result.strategy.musicStrategy.keyMoment}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.fadeStrategy')}:</span> {result.strategy.musicStrategy.fadeStrategy}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Mic className="w-4 h-4 text-brand-accent" /> {t('adCreativeSoundDesignStrategist.voiceoverDirection')}
                </p>
                <div className="space-y-1.5 text-xs text-fg-muted">
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.tone')}:</span> {result.strategy.voiceoverDirection.tone}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.pace')}:</span> {result.strategy.voiceoverDirection.pace}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.emphasis')}:</span> {result.strategy.voiceoverDirection.emphasis}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.pauses')}:</span> {result.strategy.voiceoverDirection.pauses}</p>
                  <p><span className="font-medium text-fg">{t('adCreativeSoundDesignStrategist.personality')}:</span> {result.strategy.voiceoverDirection.personality}</p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeSoundDesignStrategist.recommendations')}</p>
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
