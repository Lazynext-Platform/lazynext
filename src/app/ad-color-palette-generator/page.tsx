'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Palette,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdColorPaletteGeneratorResult,
  ColorPalette,
  PaletteEmotion,
} from '@/lib/creative/ad-color-palette-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const EMOTIONS: PaletteEmotion[] = ['energetic', 'calm', 'luxury', 'trust', 'playful', 'urgent'];

const EMOTION_COLORS: Record<PaletteEmotion, string> = {
  energetic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  calm: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  luxury: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  trust: 'bg-green-500/20 text-green-400 border-green-500/30',
  playful: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdColorPaletteGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [emotion, setEmotion] = useState<PaletteEmotion | ''>('');
  const [brandColor, setBrandColor] = useState('');
  const [count, setCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdColorPaletteGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-color-palette-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          emotion: emotion || undefined,
          brandColor: brandColor || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adColorPaletteGenerator.error'));
      setResult(data.result as AdColorPaletteGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, emotion, brandColor, count, t]);

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
          {t('adColorPaletteGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" /> {t('adColorPaletteGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adColorPaletteGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adColorPaletteGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" /> {t('adColorPaletteGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adColorPaletteGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acpgProduct" className="block text-sm font-medium mb-1">
              {t('adColorPaletteGenerator.productOrBrand')}
            </label>
            <textarea
              id="acpgProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adColorPaletteGenerator.platform')}</label>
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
            <label className="block text-sm font-medium mb-2">{t('adColorPaletteGenerator.emotion')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEmotion('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  emotion === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                {t('adColorPaletteGenerator.anyEmotion')}
              </button>
              {EMOTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmotion(em)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    emotion === em
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acpgBrandColor" className="block text-sm font-medium mb-1">
                {t('adColorPaletteGenerator.brandColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="acpgBrandColor"
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="e.g., #1a1a1a (optional)"
                  maxLength={7}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  disabled={loading}
                />
                {brandColor && /^#[0-9a-fA-F]{3,6}$/.test(brandColor) && (
                  <div
                    className="w-9 h-9 rounded-lg border border-border flex-shrink-0"
                    style={{ backgroundColor: brandColor }}
                    aria-label={t('adColorPaletteGenerator.brandColorPreview')}
                  />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="acpgCount" className="block text-sm font-medium mb-1">
                {t('adColorPaletteGenerator.count')}
              </label>
              <input
                id="acpgCount"
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min={1}
                max={5}
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
            {loading ? t('adColorPaletteGenerator.generating') : `${t('adColorPaletteGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adColorPaletteGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adColorPaletteGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adColorPaletteGenerator.dryRunNotice')}
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
                {copied ? t('adColorPaletteGenerator.copied') : t('adColorPaletteGenerator.copy')}
              </button>
            </div>

            {/* Palette cards */}
            <div className="space-y-3">
              {result.palettes.map((palette: ColorPalette, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className="font-medium text-base">{palette.name}</span>
                    <span className={`ml-auto inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${EMOTION_COLORS[palette.emotion as PaletteEmotion] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {palette.emotion}
                    </span>
                  </div>

                  {/* Color swatches */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {palette.colors.map((color, j) => (
                      <div key={j} className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded-lg border border-border"
                          style={{ backgroundColor: color }}
                          aria-label={color}
                        />
                        <span className="text-xs text-fg-muted font-mono">{color}</span>
                      </div>
                    ))}
                  </div>

                  {/* Role labels */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs mb-3">
                    {[
                      { label: t('adColorPaletteGenerator.primary'), value: palette.primary },
                      { label: t('adColorPaletteGenerator.secondary'), value: palette.secondary },
                      { label: t('adColorPaletteGenerator.accent'), value: palette.accent },
                      { label: t('adColorPaletteGenerator.background'), value: palette.background },
                      { label: t('adColorPaletteGenerator.text'), value: palette.text },
                    ].map((role, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded border border-border flex-shrink-0"
                          style={{ backgroundColor: role.value }}
                        />
                        <div className="min-w-0">
                          <div className="text-fg-muted truncate">{role.label}</div>
                          <div className="font-mono truncate">{role.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-fg-muted">{t('adColorPaletteGenerator.platformFit')}:</span>{' '}
                      <span className="font-medium">{palette.platformFit}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted">{t('adColorPaletteGenerator.psychology')}:</span>{' '}
                      <span className="font-medium">{palette.psychology}</span>
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
