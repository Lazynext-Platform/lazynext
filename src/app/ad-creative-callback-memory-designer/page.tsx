'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Repeat,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  MapPin,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CallbackMemoryDesignerResult,
  CallbackElement,
  RewardType,
} from '@/lib/creative/ad-creative-callback-memory-designer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const REWARD_COLORS: Record<RewardType, string> = {
  subtle: 'bg-success/20 text-success border-success/30',
  moderate: 'bg-warning/20 text-warning border-warning/30',
  explicit: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function scoreBarColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function AdCreativeCallbackMemoryDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CallbackMemoryDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-callback-memory-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeCallbackMemoryDesigner.error'));
      setResult(data.result as CallbackMemoryDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, targetAudience, platform, t]);

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
          {t('adCreativeCallbackMemoryDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('adCreativeCallbackMemoryDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeCallbackMemoryDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeCallbackMemoryDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('adCreativeCallbackMemoryDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeCallbackMemoryDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="accmdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeCallbackMemoryDesigner.productOrBrand')}
            </label>
            <input
              id="accmdProduct"
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
            <label htmlFor="accmdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeCallbackMemoryDesigner.content')}
            </label>
            <textarea
              id="accmdContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Tired of dull skin? Our vitamin C serum brightens in just 7 days..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="accmdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeCallbackMemoryDesigner.targetAudience')}
            </label>
            <input
              id="accmdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeCallbackMemoryDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeCallbackMemoryDesigner.generating') : `${t('adCreativeCallbackMemoryDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeCallbackMemoryDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeCallbackMemoryDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeCallbackMemoryDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeCallbackMemoryDesigner.copied') : t('adCreativeCallbackMemoryDesigner.copy')}
              </button>
            </div>

            {/* Callback element cards */}
            {result.strategy.callbacks.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-brand-accent" /> {t('adCreativeCallbackMemoryDesigner.callbacks')}
                </p>
                {result.strategy.callbacks.map((cb: CallbackElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                        {cb.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${REWARD_COLORS[cb.rewardType] || REWARD_COLORS.moderate}`}>
                        {cb.rewardType}
                      </span>
                    </div>

                    {/* Recognition score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg-muted">{t('adCreativeCallbackMemoryDesigner.recognitionScore')}</span>
                        <span className={`text-xs font-bold ${scoreColor(cb.recognitionScore)}`}>{cb.recognitionScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-card overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBarColor(cb.recognitionScore)}`}
                          style={{ width: `${cb.recognitionScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Original moment */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg">{t('adCreativeCallbackMemoryDesigner.originalMoment')}</p>
                      <p className="text-xs text-fg-muted">{cb.originalMoment}</p>
                    </div>

                    {/* Callback reference */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg">{t('adCreativeCallbackMemoryDesigner.callbackReference')}</p>
                      <p className="text-xs text-fg-muted">{cb.callbackReference}</p>
                    </div>

                    {/* Payoff */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg">{t('adCreativeCallbackMemoryDesigner.payoff')}</p>
                      <p className="text-xs text-fg-muted">{cb.payoff}</p>
                    </div>

                    {/* Placement */}
                    <p className="text-xs text-fg-muted flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" />
                      <span><span className="font-medium text-fg">{t('adCreativeCallbackMemoryDesigner.placement')}:</span> {cb.placement}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('adCreativeCallbackMemoryDesigner.recommendations')}
                </p>
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
