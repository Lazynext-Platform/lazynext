'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  GitBranch,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Target,
  Zap,
  TrendingUp,
  Heart,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  TransformationArcDesignerResult,
  TransformationStage,
} from '@/lib/creative/creative-ad-transformation-arc-designer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

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

export default function CreativeAdTransformationArcDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TransformationArcDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-transformation-arc-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdTransformationArcDesigner.error'));
      setResult(data.result as TransformationArcDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, targetAudience, platform, t]);

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
          {t('creativeAdTransformationArcDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" />{' '}
            {t('creativeAdTransformationArcDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('creativeAdTransformationArcDesigner.signInPrompt')}
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
        {t('creativeAdTransformationArcDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" />{' '}
            {t('creativeAdTransformationArcDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('creativeAdTransformationArcDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ctadProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdTransformationArcDesigner.productOrBrand')}
            </label>
            <input
              id="ctadProduct"
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
            <label htmlFor="ctadContent" className="block text-sm font-medium mb-1">
              {t('creativeAdTransformationArcDesigner.content')}
            </label>
            <textarea
              id="ctadContent"
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
            <label htmlFor="ctadAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdTransformationArcDesigner.targetAudience')}
            </label>
            <input
              id="ctadAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 concerned about skin aging"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('creativeAdTransformationArcDesigner.platform')}
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
            disabled={loading || !content.trim() || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('creativeAdTransformationArcDesigner.generating')
              : `${t('creativeAdTransformationArcDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
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
            {t('creativeAdTransformationArcDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />{' '}
            {t('creativeAdTransformationArcDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div
                role="status"
                className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning"
              >
                {t('creativeAdTransformationArcDesigner.dryRunNotice')}
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
                  ? t('creativeAdTransformationArcDesigner.copied')
                  : t('creativeAdTransformationArcDesigner.copy')}
              </button>
            </div>

            {/* Arc card with type badge */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-8 h-8 text-brand-accent" />
                  <div>
                    <p className="text-xs font-medium text-fg-muted">
                      {t('creativeAdTransformationArcDesigner.arc')}
                    </p>
                    <p className="text-lg font-bold capitalize">
                      {result.strategy.arc.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-fg-muted mb-1">
                    {t('creativeAdTransformationArcDesigner.viewerIdentificationScore')}
                  </p>
                  <p
                    className={`text-3xl font-bold ${scoreColor(result.strategy.arc.viewerIdentificationScore)}`}
                  >
                    {result.strategy.arc.viewerIdentificationScore}
                    <span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>

              {/* Viewer identification score gauge */}
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${scoreBarColor(result.strategy.arc.viewerIdentificationScore)}`}
                    style={{ width: `${result.strategy.arc.viewerIdentificationScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Before state */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-warning" />{' '}
                {t('creativeAdTransformationArcDesigner.beforeState')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.arc.beforeState}</p>
            </div>

            {/* Catalyst */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-accent" />{' '}
                {t('creativeAdTransformationArcDesigner.catalyst')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.arc.catalyst}</p>
            </div>

            {/* Transformation stages with progress bars */}
            {result.strategy.arc.stages.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {t('creativeAdTransformationArcDesigner.stages')}
                </p>
                {result.strategy.arc.stages.map((stage: TransformationStage, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">
                        {i + 1}. {stage.name}
                      </span>
                      <span className={`text-sm font-bold ${scoreColor(stage.progressLevel)}`}>
                        {stage.progressLevel}/100
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreBarColor(stage.progressLevel)}`}
                        style={{ width: `${stage.progressLevel}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{stage.description}</p>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium text-brand-accent">Emotional shift:</span>{' '}
                      {stage.emotionalShift}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* After state */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />{' '}
                {t('creativeAdTransformationArcDesigner.afterState')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.arc.afterState}</p>
            </div>

            {/* Emotional journey */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Heart className="w-4 h-4 text-danger" />{' '}
                {t('creativeAdTransformationArcDesigner.emotionalJourney')}
              </p>
              <p className="text-sm text-fg-muted">{result.strategy.arc.emotionalJourney}</p>
            </div>

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">
                  {t('creativeAdTransformationArcDesigner.recommendations')}
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
