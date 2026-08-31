'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdThumbnailGeneratorResult,
  ThumbnailConcept,
  TextPosition,
  ThumbnailStyle,
} from '@/lib/creative/ad-thumbnail-generator';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const STYLES: ThumbnailStyle[] = ['bold', 'minimal', 'playful', 'dramatic', 'lifestyle'];

const POSITION_COLORS: Record<TextPosition, string> = {
  top: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  center: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  bottom: 'bg-success/20 text-success border-success/30',
};

export default function AdThumbnailGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoTopic, setVideoTopic] = useState('');
  const [style, setStyle] = useState<ThumbnailStyle | ''>('');
  const [count, setCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdThumbnailGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    if (!videoTitle.trim() && !videoTopic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-thumbnail-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          videoTitle: videoTitle || undefined,
          videoTopic: videoTopic || undefined,
          style: style || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adThumbnailGenerator.error'));
      setResult(data.result as AdThumbnailGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, videoTitle, videoTopic, style, count, t]);

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
          {t('adThumbnailGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="w-6 h-6" /> {t('adThumbnailGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adThumbnailGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adThumbnailGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="w-6 h-6" /> {t('adThumbnailGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adThumbnailGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="atgProduct" className="block text-sm font-medium mb-1">
              {t('adThumbnailGenerator.productOrBrand')}
            </label>
            <textarea
              id="atgProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adThumbnailGenerator.platform')}</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="atgVideoTitle" className="block text-sm font-medium mb-1">
                {t('adThumbnailGenerator.videoTitle')}
              </label>
              <input
                id="atgVideoTitle"
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., 5 skincare mistakes you're making"
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="atgVideoTopic" className="block text-sm font-medium mb-1">
                {t('adThumbnailGenerator.videoTopic')}
              </label>
              <input
                id="atgVideoTopic"
                type="text"
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                placeholder="e.g., vitamin C serum benefits"
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adThumbnailGenerator.style')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStyle('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  style === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                {t('adThumbnailGenerator.anyStyle')}
              </button>
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    style === s
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="atgCount" className="block text-sm font-medium mb-1">
              {t('adThumbnailGenerator.count')}
            </label>
            <input
              id="atgCount"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={6}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || (!videoTitle.trim() && !videoTopic.trim())}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adThumbnailGenerator.generating') : `${t('adThumbnailGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adThumbnailGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adThumbnailGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adThumbnailGenerator.dryRunNotice')}
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
                {copied ? t('adThumbnailGenerator.copied') : t('adThumbnailGenerator.copy')}
              </button>
            </div>

            {/* Thumbnail concept cards */}
            <div className="space-y-3">
              {result.thumbnails.map((thumb: ThumbnailConcept, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className="font-medium text-base">{thumb.title}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${POSITION_COLORS[thumb.textPosition] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {thumb.textPosition}
                    </span>
                  </div>

                  {/* Color scheme preview */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: thumb.colorScheme.primary }} aria-label={thumb.colorScheme.primary} />
                      <span className="text-xs text-fg-muted font-mono">{thumb.colorScheme.primary}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: thumb.colorScheme.secondary }} aria-label={thumb.colorScheme.secondary} />
                      <span className="text-xs text-fg-muted font-mono">{thumb.colorScheme.secondary}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: thumb.colorScheme.background }} aria-label={thumb.colorScheme.background} />
                      <span className="text-xs text-fg-muted font-mono">{thumb.colorScheme.background}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-fg-muted">{t('adThumbnailGenerator.visualDescription')}:</span>{' '}
                      <span className="font-medium">{thumb.visualDescription}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <span className="text-fg-muted">{t('adThumbnailGenerator.textOverlay')}:</span>{' '}
                        <span className="font-medium">{thumb.textOverlay}</span>
                      </div>
                      <div>
                        <span className="text-fg-muted">{t('adThumbnailGenerator.fontStyle')}:</span>{' '}
                        <span className="font-medium">{thumb.fontStyle}</span>
                      </div>
                      <div>
                        <span className="text-fg-muted">{t('adThumbnailGenerator.emotion')}:</span>{' '}
                        <span className="font-medium">{thumb.emotion}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                      <span className="text-fg-muted">{t('adThumbnailGenerator.predictedCTR')}:</span>{' '}
                      <span className="font-medium text-success">{thumb.predictedCTR}%</span>
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
