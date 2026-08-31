'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Hash,
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
  AdHashtagGeneratorResult,
  HashtagSuggestion,
  HashtagType,
  CompetitionLevel,
} from '@/lib/creative/ad-hashtag-generator';

const CREDIT_COST = 2;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const TYPE_COLORS: Record<HashtagType, string> = {
  branded: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  trending: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  niche: 'bg-success/20 text-success border-success/30',
  community: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  campaign: 'bg-warning/20 text-warning border-warning/30',
};

const COMPETITION_COLORS: Record<CompetitionLevel, string> = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdHashtagGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [niche, setNiche] = useState('');
  const [count, setCount] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdHashtagGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-hashtag-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          platform,
          niche: niche || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adHashtagGenerator.error'));
      setResult(data.result as AdHashtagGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, platform, niche, count, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = result.hashtags.map((h) => `#${h.tag}`).join(' ');
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
          {t('adHashtagGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="w-6 h-6" /> {t('adHashtagGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adHashtagGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adHashtagGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="w-6 h-6" /> {t('adHashtagGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adHashtagGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ahgProduct" className="block text-sm font-medium mb-1">
              {t('adHashtagGenerator.productOrBrand')}
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
            <label className="block text-sm font-medium mb-2">{t('adHashtagGenerator.platform')}</label>
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
              <label htmlFor="ahgNiche" className="block text-sm font-medium mb-1">
                {t('adHashtagGenerator.niche')}
              </label>
              <input
                id="ahgNiche"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., skincare, fitness, tech gadgets"
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="ahgCount" className="block text-sm font-medium mb-1">
                {t('adHashtagGenerator.count')}
              </label>
              <input
                id="ahgCount"
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min={5}
                max={30}
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
            {loading ? t('adHashtagGenerator.generating') : `${t('adHashtagGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adHashtagGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adHashtagGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adHashtagGenerator.dryRunNotice')}
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
                {copied ? t('adHashtagGenerator.copied') : t('adHashtagGenerator.copy')}
              </button>
            </div>

            {/* Hashtag list */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {result.hashtags.map((tag: HashtagSuggestion, i: number) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      tag.recommended
                        ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30'
                        : 'bg-bg-secondary text-fg-muted border-border'
                    }`}
                  >
                    #{tag.tag}
                    {tag.recommended && <Check className="w-3 h-3" />}
                  </span>
                ))}
              </div>

              {/* Detailed hashtag cards */}
              <div className="space-y-2">
                {result.hashtags.map((tag: HashtagSuggestion, i: number) => (
                  <div key={i} className="flex items-center gap-3 flex-wrap rounded-lg border border-border bg-bg-secondary px-3 py-2">
                    <span className="font-medium text-sm">#{tag.tag}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[tag.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {tag.type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                      <TrendingUp className="w-3 h-3" /> {tag.estimatedReach}
                    </span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${COMPETITION_COLORS[tag.competition] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {tag.competition}
                    </span>
                    {tag.recommended && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <Check className="w-3 h-3" /> {t('adHashtagGenerator.recommended')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
