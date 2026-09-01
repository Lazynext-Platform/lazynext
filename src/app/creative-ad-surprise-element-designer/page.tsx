'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Gift,
  Eye,
  Clock,
  Smile,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SurpriseElementDesignerResult,
  SurpriseElement,
} from '@/lib/creative/creative-ad-surprise-element-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const SURPRISE_TYPE_COLORS: Record<string, string> = {
  unexpected_twist: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  hidden_detail: 'bg-info/20 text-info border-info/30',
  sudden_reveal: 'bg-warning/20 text-warning border-warning/30',
  role_reversal: 'bg-success/20 text-success border-success/30',
  genre_shift: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  breaking_fourth_wall: 'bg-danger/20 text-danger border-danger/30',
  unexpected_character: 'bg-info/20 text-info border-info/30',
  surprise_collaboration: 'bg-success/20 text-success border-success/30',
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

export default function CreativeAdSurpriseElementDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SurpriseElementDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-surprise-element-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdSurpriseElementDesigner.error'));
      setResult(data.result as SurpriseElementDesignerResult);
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
          {t('creativeAdSurpriseElementDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" /> {t('creativeAdSurpriseElementDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdSurpriseElementDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdSurpriseElementDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6" /> {t('creativeAdSurpriseElementDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdSurpriseElementDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="casedProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdSurpriseElementDesigner.productOrBrand')}
            </label>
            <input
              id="casedProduct"
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
            <label htmlFor="casedContent" className="block text-sm font-medium mb-1">
              {t('creativeAdSurpriseElementDesigner.content')}
            </label>
            <textarea
              id="casedContent"
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
            <label htmlFor="casedAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdSurpriseElementDesigner.targetAudience')}
            </label>
            <input
              id="casedAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Gen Z skincare enthusiasts aged 18-24"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdSurpriseElementDesigner.platform')}</label>
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
            {loading ? t('creativeAdSurpriseElementDesigner.generating') : `${t('creativeAdSurpriseElementDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdSurpriseElementDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdSurpriseElementDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdSurpriseElementDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdSurpriseElementDesigner.copied') : t('creativeAdSurpriseElementDesigner.copy')}
              </button>
            </div>

            {/* Surprise elements */}
            {result.strategy.elements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-brand-accent" /> {t('creativeAdSurpriseElementDesigner.elements')}
                </p>
                {result.strategy.elements.map((el: SurpriseElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-3">
                    {/* Type badge + delight score */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SURPRISE_TYPE_COLORS[el.type] || SURPRISE_TYPE_COLORS.unexpected_twist}`}>
                        {el.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-fg-muted">{t('creativeAdSurpriseElementDesigner.delightScore')}</span>
                        <span className={`text-sm font-bold ${scoreColor(el.delightScore)}`}>{el.delightScore}/100</span>
                      </div>
                    </div>

                    {/* Delight score bar */}
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreBarColor(el.delightScore)}`}
                        style={{ width: `${el.delightScore}%` }}
                      />
                    </div>

                    {/* Setup */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-brand-accent" /> {t('creativeAdSurpriseElementDesigner.setup')}
                      </p>
                      <p className="text-xs text-fg-muted">{el.setup}</p>
                    </div>

                    {/* Reveal */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-brand-accent" /> {t('creativeAdSurpriseElementDesigner.reveal')}
                      </p>
                      <p className="text-xs text-fg-muted">{el.reveal}</p>
                    </div>

                    {/* Execution guide */}
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-fg">{t('creativeAdSurpriseElementDesigner.executionGuide')}</p>
                      <p className="text-xs text-fg-muted">{el.executionGuide}</p>
                    </div>

                    {/* Viewer reaction + timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-fg flex items-center gap-1.5">
                          <Smile className="w-3 h-3 text-success" /> {t('creativeAdSurpriseElementDesigner.viewerReaction')}
                        </p>
                        <p className="text-xs text-fg-muted">{el.viewerReaction}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-fg flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-fg-muted" /> {t('creativeAdSurpriseElementDesigner.timing')}
                        </p>
                        <p className="text-xs text-fg-muted">{el.timing}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdSurpriseElementDesigner.recommendations')}</p>
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
