'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  PenLine,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Hash,
  Type,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdCaptionGeneratorResult,
  AdCaption,
} from '@/lib/creative/ad-caption-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const COUNTS = [1, 2, 3, 4, 5] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function fitColor(fit: string): string {
  const lower = fit.toLowerCase();
  if (lower.includes('excel')) return 'text-success';
  if (lower.includes('good')) return 'text-brand-accent';
  if (lower.includes('fair')) return 'text-warning';
  return 'text-fg-muted';
}

export default function AdCaptionGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [tone, setTone] = useState('');
  const [count, setCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdCaptionGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-caption-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          tone: tone || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCaptionGenerator.error'));
      setResult(data.result as AdCaptionGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, tone, count, t]);

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
          {t('adCaptionGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine className="w-6 h-6" /> {t('adCaptionGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCaptionGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCaptionGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine className="w-6 h-6" /> {t('adCaptionGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCaptionGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acProduct" className="block text-sm font-medium mb-1">
              {t('adCaptionGenerator.productOrBrand')}
            </label>
            <textarea
              id="acProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adCaptionGenerator.platform')}</label>
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
              <label htmlFor="acTone" className="block text-sm font-medium mb-1">
                {t('adCaptionGenerator.tone')}
              </label>
              <input
                id="acTone"
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g., playful, bold, luxurious (optional)"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('adCaptionGenerator.count')}</label>
              <div className="flex flex-wrap gap-2">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      count === c
                        ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                    }`}
                    disabled={loading}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCaptionGenerator.generating') : `${t('adCaptionGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCaptionGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCaptionGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCaptionGenerator.dryRunNotice')}
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
                {copied ? t('adCaptionGenerator.copied') : t('adCaptionGenerator.copy')}
              </button>
            </div>

            {/* Captions */}
            <div className="space-y-3">
              {result.captions.map((cap: AdCaption, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-card p-4"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                    <p className="text-sm flex-1">{cap.text}</p>
                  </div>

                  {cap.emojis.length > 0 && (
                    <div className="mb-2 text-lg leading-none">
                      {cap.emojis.join(' ')}
                    </div>
                  )}

                  {cap.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {cap.hashtags.map((h, j) => (
                        <span key={j} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary text-brand-accent">
                          <Hash className="w-3 h-3" /> {h.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-fg-muted">{t('adCaptionGenerator.cta')}:</span>
                      <span className="font-medium">{cap.cta}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Type className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('adCaptionGenerator.characterCount')}:</span>
                      <span>{cap.characterCount}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {platform}
                    </span>
                    <span className={`font-medium ${fitColor(cap.platformFit)}`}>{cap.platformFit}</span>
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
