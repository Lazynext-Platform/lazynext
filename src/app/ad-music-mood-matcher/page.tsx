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
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdMusicMoodMatcherResult,
  MusicRecommendation,
} from '@/lib/creative/ad-music-mood-matcher';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const MOODS = ['energetic', 'calm', 'inspirational', 'dramatic', 'playful', 'romantic', 'mysterious'] as const;

export default function AdMusicMoodMatcherPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [adMood, setAdMood] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [count, setCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdMusicMoodMatcherResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-music-mood-matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          adMood: adMood || undefined,
          duration,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adMusicMoodMatcher.error'));
      setResult(data.result as AdMusicMoodMatcherResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, adMood, duration, count, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = result.recommendations
        .map(
          (r) =>
            `${r.genre} / ${r.subGenre} — ${r.mood}, ${r.tempoBPM} BPM, energy ${r.energyLevel}/10\n` +
            `Instruments: ${r.instruments.join(', ')}\n` +
            `Best for: ${r.bestForScene}\nLicense: ${r.licenseType}`,
        )
        .join('\n\n');
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
          {t('adMusicMoodMatcher.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6" /> {t('adMusicMoodMatcher.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adMusicMoodMatcher.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adMusicMoodMatcher.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6" /> {t('adMusicMoodMatcher.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adMusicMoodMatcher.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ammProduct" className="block text-sm font-medium mb-1">
              {t('adMusicMoodMatcher.productOrBrand')}
            </label>
            <textarea
              id="ammProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adMusicMoodMatcher.platform')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('adMusicMoodMatcher.adMood')}</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAdMood(adMood === m ? '' : m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    adMood === m
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ammDuration" className="block text-sm font-medium mb-1">
                {t('adMusicMoodMatcher.duration')}
              </label>
              <input
                id="ammDuration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={5}
                max={120}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="ammCount" className="block text-sm font-medium mb-1">
                {t('adMusicMoodMatcher.count')}
              </label>
              <input
                id="ammCount"
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min={1}
                max={6}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adMusicMoodMatcher.generating') : `${t('adMusicMoodMatcher.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adMusicMoodMatcher.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adMusicMoodMatcher.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adMusicMoodMatcher.dryRunNotice')}
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
                {copied ? t('adMusicMoodMatcher.copied') : t('adMusicMoodMatcher.copy')}
              </button>
            </div>

            {/* Recommendation cards */}
            <div className="space-y-3">
              {result.recommendations.map((rec: MusicRecommendation, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-brand-accent flex-shrink-0" />
                      <span className="font-medium text-sm">{rec.genre}</span>
                      <span className="text-xs text-fg-muted">/ {rec.subGenre}</span>
                    </div>
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                      {rec.mood}
                    </span>
                  </div>

                  <p className="text-sm text-fg-muted">{rec.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" /> {rec.tempoBPM} BPM
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {t('adMusicMoodMatcher.energy')}: {rec.energyLevel}/10
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rec.instruments.map((inst, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-xs text-fg-muted"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-1 text-xs text-fg-muted">
                    <p><span className="font-medium text-fg">{t('adMusicMoodMatcher.bestForScene')}:</span> {rec.bestForScene}</p>
                    <p><span className="font-medium text-fg">{t('adMusicMoodMatcher.licenseType')}:</span> {rec.licenseType}</p>
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
