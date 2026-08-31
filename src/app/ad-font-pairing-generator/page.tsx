'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Type,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdFontPairingGeneratorResult,
  FontPairing,
  FontMood,
} from '@/lib/creative/ad-font-pairing-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const MOODS: FontMood[] = ['modern', 'classic', 'playful', 'luxury', 'bold', 'minimal'];

const MOOD_COLORS: Record<string, string> = {
  modern: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  classic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  playful: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  luxury: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  bold: 'bg-red-500/20 text-red-400 border-red-500/30',
  minimal: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function AdFontPairingGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [mood, setMood] = useState<FontMood | ''>('');
  const [count, setCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdFontPairingGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-font-pairing-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          mood: mood || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adFontPairingGenerator.error'));
      setResult(data.result as AdFontPairingGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, mood, count, t]);

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
          {t('adFontPairingGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Type className="w-6 h-6" /> {t('adFontPairingGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adFontPairingGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adFontPairingGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Type className="w-6 h-6" /> {t('adFontPairingGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adFontPairingGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="afpgProduct" className="block text-sm font-medium mb-1">
              {t('adFontPairingGenerator.productOrBrand')}
            </label>
            <textarea
              id="afpgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adFontPairingGenerator.platform')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('adFontPairingGenerator.mood')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMood('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  mood === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                {t('adFontPairingGenerator.anyMood')}
              </button>
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mood === m
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

          <div>
            <label htmlFor="afpgCount" className="block text-sm font-medium mb-1">
              {t('adFontPairingGenerator.count')}
            </label>
            <input
              id="afpgCount"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={5}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adFontPairingGenerator.generating') : `${t('adFontPairingGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adFontPairingGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adFontPairingGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adFontPairingGenerator.dryRunNotice')}
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
                {copied ? t('adFontPairingGenerator.copied') : t('adFontPairingGenerator.copy')}
              </button>
            </div>

            {/* Pairing cards */}
            <div className="space-y-3">
              {result.pairings.map((pairing: FontPairing, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className="font-medium text-base">{pairing.name}</span>
                    <span className={`ml-auto inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${MOOD_COLORS[pairing.mood] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {pairing.mood}
                    </span>
                  </div>

                  {/* Font preview */}
                  <div className="rounded-lg bg-bg-secondary p-3 mb-3 space-y-1">
                    <div className="text-lg font-bold truncate" style={{ fontFamily: 'sans-serif' }}>
                      {pairing.headingFont}
                    </div>
                    <div className="text-sm truncate" style={{ fontFamily: 'sans-serif' }}>
                      {pairing.bodyFont}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-fg-muted">{t('adFontPairingGenerator.headingFont')}:</span>{' '}
                      <span className="font-medium">{pairing.headingFont}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t('adFontPairingGenerator.bodyFont')}:</span>{' '}
                      <span className="font-medium">{pairing.bodyFont}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t('adFontPairingGenerator.styleDescription')}:</span>{' '}
                      <span className="font-medium">{pairing.styleDescription}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-fg-muted">{t('adFontPairingGenerator.readabilityScore')}:</span>{' '}
                      <span className="font-medium text-brand-accent">{pairing.readabilityScore}/100</span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t('adFontPairingGenerator.platformFit')}:</span>{' '}
                      <span className="font-medium">{pairing.platformFit.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t('adFontPairingGenerator.useCase')}:</span>{' '}
                      <span className="font-medium">{pairing.useCase}</span>
                    </div>
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
