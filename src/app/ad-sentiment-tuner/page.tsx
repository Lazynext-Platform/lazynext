'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Smile,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SentimentTunerResult,
  TargetSentiment,
} from '@/lib/creative/ad-sentiment-tuner';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SENTIMENTS: TargetSentiment[] = [
  'positive',
  'neutral',
  'urgent',
  'playful',
  'authoritative',
  'empathetic',
];

const SENTIMENT_COLORS: Record<TargetSentiment, string> = {
  positive: 'bg-success/20 text-success border-success/30',
  neutral: 'bg-bg-secondary text-fg-muted border-border',
  urgent: 'bg-danger/20 text-danger border-danger/30',
  playful: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  authoritative: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  empathetic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function AdSentimentTunerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetSentiment, setTargetSentiment] = useState<TargetSentiment>('positive');
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SentimentTunerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const tune = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-sentiment-tuner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          targetSentiment,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adSentimentTuner.error'));
      setResult(data.result as SentimentTunerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, targetSentiment, platform, t]);

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
          {t('adSentimentTuner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="w-6 h-6" /> {t('adSentimentTuner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adSentimentTuner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adSentimentTuner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="w-6 h-6" /> {t('adSentimentTuner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adSentimentTuner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="astContent" className="block text-sm font-medium mb-1">
              {t('adSentimentTuner.content')}
            </label>
            <textarea
              id="astContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Our new product helps you save time and get more done."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="astProduct" className="block text-sm font-medium mb-1">
              {t('adSentimentTuner.productOrBrand')}
            </label>
            <input
              id="astProduct"
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
            <label className="block text-sm font-medium mb-2">{t('adSentimentTuner.targetSentiment')}</label>
            <div className="flex flex-wrap gap-2">
              {SENTIMENTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetSentiment(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    targetSentiment === s
                      ? SENTIMENT_COLORS[s]
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
            <label className="block text-sm font-medium mb-2">{t('adSentimentTuner.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform(undefined)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === undefined
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
            onClick={tune}
            disabled={loading || !content.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adSentimentTuner.tuning') : `${t('adSentimentTuner.tune')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adSentimentTuner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adSentimentTuner.tuning')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adSentimentTuner.dryRunNotice')}
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
                {copied ? t('adSentimentTuner.copied') : t('adSentimentTuner.copy')}
              </button>
            </div>

            {/* Tuned content */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="text-xs text-fg-muted mb-1">{t('adSentimentTuner.tunedContent')}</div>
              <p className="text-sm">{result.tuning.tunedContent}</p>
            </div>

            {/* Sentiment scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('adSentimentTuner.beforeSentiment')}</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{result.tuning.beforeSentiment.score}</span>
                  <span className="text-xs text-fg-muted">{result.tuning.beforeSentiment.label}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-fg-muted" />
                <span className={`ml-2 text-sm font-medium ${result.tuning.sentimentShift >= 0 ? 'text-success' : 'text-danger'}`}>
                  {result.tuning.sentimentShift >= 0 ? '+' : ''}{result.tuning.sentimentShift}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-3">
                <div className="text-xs text-fg-muted mb-1">{t('adSentimentTuner.afterSentiment')}</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{result.tuning.afterSentiment.score}</span>
                  <span className="text-xs text-fg-muted">{result.tuning.afterSentiment.label}</span>
                </div>
              </div>
            </div>

            {/* Audience alignment */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brand-accent" />
                <span className="text-sm font-medium">{t('adSentimentTuner.audienceAlignment')}</span>
                <span className="ml-auto text-lg font-bold">{result.tuning.audienceAlignment}/10</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div
                  className="bg-brand-accent rounded-full h-2 transition-all"
                  style={{ width: `${(result.tuning.audienceAlignment / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Tone adjustments */}
            {result.tuning.toneAdjustments.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('adSentimentTuner.toneAdjustments')}</div>
                <ul className="space-y-1">
                  {result.tuning.toneAdjustments.map((adj, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {adj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Word changes */}
            {result.tuning.wordChanges.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('adSentimentTuner.wordChanges')}</div>
                <div className="space-y-2">
                  {result.tuning.wordChanges.map((wc, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="px-2 py-0.5 rounded bg-danger/10 text-danger line-through">{wc.original}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="px-2 py-0.5 rounded bg-success/10 text-success">{wc.replacement}</span>
                      <span className="text-xs text-fg-muted">{wc.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.tuning.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="text-sm font-medium mb-2">{t('adSentimentTuner.recommendations')}</div>
                <ul className="space-y-1">
                  {result.tuning.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" /> {rec}
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
