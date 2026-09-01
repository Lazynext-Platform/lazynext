'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Newspaper,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Type,
  TrendingUp,
  Anchor,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdHeadlineGeneratorResult,
  AdHeadline,
  HookType,
  PredictedImpact,
} from '@/lib/creative/ad-headline-generator';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const COUNTS = [1, 2, 3, 5, 8, 10] as const;

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  facebook: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const HOOK_COLORS: Record<HookType, string> = {
  curiosity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  urgency: 'bg-red-500/20 text-red-400 border-red-500/30',
  social_proof: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  benefit: 'bg-success/20 text-success border-success/30',
  question: 'bg-warning/20 text-warning border-warning/30',
};

const IMPACT_COLORS: Record<PredictedImpact, string> = {
  high: 'text-success',
  medium: 'text-brand-accent',
  low: 'text-fg-muted',
};

function fitColor(fit: string): string {
  const lower = fit.toLowerCase();
  if (lower.includes('excel')) return 'text-success';
  if (lower.includes('good')) return 'text-brand-accent';
  if (lower.includes('fair')) return 'text-warning';
  return 'text-fg-muted';
}

export default function AdHeadlineGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [count, setCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdHeadlineGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-headline-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          targetAudience: targetAudience || undefined,
          tone: tone || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adHeadlineGenerator.error'));
      setResult(data.result as AdHeadlineGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, targetAudience, tone, count, t]);

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
          {t('adHeadlineGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6" /> {t('adHeadlineGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adHeadlineGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adHeadlineGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6" /> {t('adHeadlineGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adHeadlineGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ahgProduct" className="block text-sm font-medium mb-1">
              {t('adHeadlineGenerator.productOrBrand')}
            </label>
            <textarea
              id="ahgProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adHeadlineGenerator.platform')}</label>
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
              <label htmlFor="ahgAudience" className="block text-sm font-medium mb-1">
                {t('adHeadlineGenerator.targetAudience')}
              </label>
              <input
                id="ahgAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., women 25-40 interested in clean beauty (optional)"
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="ahgTone" className="block text-sm font-medium mb-1">
                {t('adHeadlineGenerator.tone')}
              </label>
              <input
                id="ahgTone"
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g., playful, bold, luxurious (optional)"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adHeadlineGenerator.count')}</label>
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

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adHeadlineGenerator.generating') : `${t('adHeadlineGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adHeadlineGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adHeadlineGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adHeadlineGenerator.dryRunNotice')}
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
                {copied ? t('adHeadlineGenerator.copied') : t('adHeadlineGenerator.copy')}
              </button>
            </div>

            {/* Headlines */}
            <div className="space-y-3">
              {result.headlines.map((h: AdHeadline, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg-card p-4"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs text-fg-muted mt-0.5">#{i + 1}</span>
                    <p className="text-sm flex-1 font-medium">{h.text}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${HOOK_COLORS[h.hookType]}`}>
                      <Anchor className="w-3 h-3" /> {h.hookType}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('adHeadlineGenerator.predictedImpact')}:</span>
                      <span className={`font-medium ${IMPACT_COLORS[h.predictedImpact]}`}>{h.predictedImpact}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Type className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-fg-muted">{t('adHeadlineGenerator.characterCount')}:</span>
                      <span>{h.characterCount}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[platform] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {platform}
                    </span>
                    <span className={`font-medium ${fitColor(h.platformFit)}`}>{h.platformFit}</span>
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
