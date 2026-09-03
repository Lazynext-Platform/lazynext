'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  HeartPulse,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  EmotionalPivotDesignerResult,
  EmotionalPivot,
} from '@/lib/creative/ad-creative-emotional-pivot-designer';

const CREDIT_COST = 3;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const PIVOT_TYPE_COLORS: Record<string, string> = {
  joy_to_sadness: 'bg-info/20 text-info border-info/30',
  tension_to_relief: 'bg-success/20 text-success border-success/30',
  fear_to_hope: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  serious_to_playful: 'bg-warning/20 text-warning border-warning/30',
  calm_to_excitement: 'bg-danger/20 text-danger border-danger/30',
  nostalgia_to_aspiration: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  frustration_to_satisfaction: 'bg-success/20 text-success border-success/30',
  curiosity_to_revelation: 'bg-info/20 text-info border-info/30',
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

export default function AdCreativeEmotionalPivotDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EmotionalPivotDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-emotional-pivot-designer', {
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
      if (!res.ok) throw new Error(data.error || t('adCreativeEmotionalPivotDesigner.error'));
      setResult(data.result as EmotionalPivotDesignerResult);
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
        >
          {t('adCreativeEmotionalPivotDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-6 h-6" />{' '}
            {t('adCreativeEmotionalPivotDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativeEmotionalPivotDesigner.signInPrompt')}
          </p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg"
      >
        {t('adCreativeEmotionalPivotDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-6 h-6" />{' '}
            {t('adCreativeEmotionalPivotDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('adCreativeEmotionalPivotDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acepdProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionalPivotDesigner.productOrBrand')}
            </label>
            <input
              id="acepdProduct"
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
            <label htmlFor="acepdContent" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionalPivotDesigner.content')}
            </label>
            <textarea
              id="acepdContent"
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
            <label htmlFor="acepdAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeEmotionalPivotDesigner.targetAudience')}
            </label>
            <input
              id="acepdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('common.phAudience')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('adCreativeEmotionalPivotDesigner.platform')}
            </label>
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
            {loading
              ? t('adCreativeEmotionalPivotDesigner.generating')
              : `${t('adCreativeEmotionalPivotDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeEmotionalPivotDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />{' '}
            {t('adCreativeEmotionalPivotDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div
                role="status"
                className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning"
              >
                {t('adCreativeEmotionalPivotDesigner.dryRunNotice')}
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
                {copied
                  ? t('adCreativeEmotionalPivotDesigner.copied')
                  : t('adCreativeEmotionalPivotDesigner.copy')}
              </button>
            </div>

            {/* Pivot cards */}
            {result.strategy.pivots.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('adCreativeEmotionalPivotDesigner.pivots')}
                </p>
                {result.strategy.pivots.map((p: EmotionalPivot, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2"
                  >
                    {/* Type badge + timing */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${PIVOT_TYPE_COLORS[p.type] || 'bg-bg-tertiary text-fg-muted border-border'}`}
                      >
                        {p.type.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center text-xs text-fg-muted gap-1">
                        <Clock className="w-3 h-3" /> {p.timing}
                      </span>
                    </div>

                    {/* Before → After emotion flow */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-fg-muted">
                        {t('adCreativeEmotionalPivotDesigner.beforeEmotion')}:
                      </span>
                      <span className="text-sm font-medium text-fg">{p.beforeEmotion}</span>
                      <ArrowRight className="w-4 h-4 text-brand-accent" />
                      <span className="text-xs text-fg-muted">
                        {t('adCreativeEmotionalPivotDesigner.afterEmotion')}:
                      </span>
                      <span className="text-sm font-medium text-fg">{p.afterEmotion}</span>
                    </div>

                    {/* Transition method */}
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">
                        {t('adCreativeEmotionalPivotDesigner.transitionMethod')}:
                      </span>{' '}
                      {p.transitionMethod}
                    </p>

                    {/* Impact score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-fg-muted">
                          {t('adCreativeEmotionalPivotDesigner.impactScore')}
                        </span>
                        <span className={`text-xs font-bold ${scoreColor(p.impactScore)}`}>
                          {p.impactScore}/100
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBarColor(p.impactScore)}`}
                          style={{ width: `${p.impactScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Viewer effect */}
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-fg">
                        {t('adCreativeEmotionalPivotDesigner.viewerEffect')}:
                      </span>{' '}
                      {p.viewerEffect}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">
                  {t('adCreativeEmotionalPivotDesigner.recommendations')}
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
