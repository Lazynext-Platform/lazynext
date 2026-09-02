'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Layers,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Eye,
  Target,
  GitBranch,
  Gauge,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  VisualHierarchyStrategistResult,
  HierarchyLayer,
  AttentionWeight,
  FocalPoint,
  Priority,
} from '@/lib/creative/creative-ad-visual-hierarchy-strategist';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const LAYER_TYPE_COLORS: Record<string, string> = {
  primary: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  secondary: 'bg-brand-accent/15 text-brand-accent border-brand-accent/25',
  tertiary: 'bg-bg-secondary text-fg-muted border-border',
  background: 'bg-bg-secondary text-fg-muted border-border',
  accent: 'bg-warning/20 text-warning border-warning/30',
  overlay: 'bg-success/20 text-success border-success/30',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-bg-secondary text-fg-muted border-border',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function CreativeAdVisualHierarchyStrategistPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [visualElements, setVisualElements] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VisualHierarchyStrategistResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !visualElements.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-visual-hierarchy-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          visualElements,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdVisualHierarchyStrategist.error'));
      setResult(data.result as VisualHierarchyStrategistResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, visualElements, platform, t]);

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
          {t('creativeAdVisualHierarchyStrategist.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeAdVisualHierarchyStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('creativeAdVisualHierarchyStrategist.signInPrompt')}
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
        {t('creativeAdVisualHierarchyStrategist.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeAdVisualHierarchyStrategist.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('creativeAdVisualHierarchyStrategist.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cavhsProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdVisualHierarchyStrategist.productOrBrand')}
            </label>
            <input
              id="cavhsProduct"
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
            <label htmlFor="cavhsContent" className="block text-sm font-medium mb-1">
              {t('creativeAdVisualHierarchyStrategist.content')}
            </label>
            <textarea
              id="cavhsContent"
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
            <label htmlFor="cavhsElements" className="block text-sm font-medium mb-1">
              {t('creativeAdVisualHierarchyStrategist.visualElements')}
            </label>
            <input
              id="cavhsElements"
              type="text"
              value={visualElements}
              onChange={(e) => setVisualElements(e.target.value)}
              placeholder={t('creativeAdVisualHierarchyStrategist.elementsPh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('creativeAdVisualHierarchyStrategist.platform')}
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !visualElements.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('creativeAdVisualHierarchyStrategist.generating')
              : `${t('creativeAdVisualHierarchyStrategist.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
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
            {t('creativeAdVisualHierarchyStrategist.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" />{' '}
            {t('creativeAdVisualHierarchyStrategist.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div
                role="status"
                className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning"
              >
                {t('creativeAdVisualHierarchyStrategist.dryRunNotice')}
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
                  ? t('creativeAdVisualHierarchyStrategist.copied')
                  : t('creativeAdVisualHierarchyStrategist.copy')}
              </button>
            </div>

            {/* Hierarchy score gauge */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">
                    {t('creativeAdVisualHierarchyStrategist.hierarchyScore')}
                  </p>
                  <p className={`text-3xl font-bold ${scoreColor(result.strategy.hierarchyScore)}`}>
                    {result.strategy.hierarchyScore}
                    <span className="text-sm text-fg-muted">/100</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Hierarchy layers */}
            {result.strategy.layers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent" />{' '}
                  {t('creativeAdVisualHierarchyStrategist.layers')}
                </p>
                {result.strategy.layers.map((layer: HierarchyLayer, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{layer.element}</span>
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                          LAYER_TYPE_COLORS[layer.type] || LAYER_TYPE_COLORS.tertiary
                        }`}
                      >
                        {layer.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-fg-muted">
                      <span>{t('creativeAdVisualHierarchyStrategist.position')}: {layer.position}</span>
                      <span>{t('creativeAdVisualHierarchyStrategist.size')}: {layer.size}</span>
                      <span>z-index: {layer.z_index}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{layer.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Attention weights */}
            {result.strategy.attentionWeights.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-accent" />{' '}
                  {t('creativeAdVisualHierarchyStrategist.attentionWeights')}
                </p>
                {result.strategy.attentionWeights.map((w: AttentionWeight, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{w.element}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${scoreColor(w.weight)}`}>{w.weight}%</span>
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                            PRIORITY_COLORS[w.priority] || PRIORITY_COLORS.medium
                          }`}
                        >
                          {w.priority}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          w.weight >= 75 ? 'bg-success' : w.weight >= 50 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${w.weight}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{w.reasoning}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Focal points */}
            {result.strategy.focalPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-accent" />{' '}
                  {t('creativeAdVisualHierarchyStrategist.focalPoints')}
                </p>
                {result.strategy.focalPoints.map((fp: FocalPoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{fp.element}</span>
                      <span className="text-xs text-fg-muted">{fp.position}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-fg-muted">
                      <span>{t('creativeAdVisualHierarchyStrategist.method')}: {fp.attractionMethod}</span>
                      <span>{t('creativeAdVisualHierarchyStrategist.retention')}: {fp.retentionTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Visual flow */}
            {result.strategy.visualFlow && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-brand-accent" />{' '}
                  {t('creativeAdVisualHierarchyStrategist.visualFlow')}
                </p>
                <p className="text-xs text-fg-muted">
                  <span className="font-medium text-fg">{t('creativeAdVisualHierarchyStrategist.direction')}:</span>{' '}
                  {result.strategy.visualFlow.direction}
                </p>
                {result.strategy.visualFlow.path.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1.5">
                    {result.strategy.visualFlow.path.map((p, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                          {p}
                        </span>
                        {i < result.strategy.visualFlow.path.length - 1 && (
                          <span className="text-fg-muted text-xs">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {result.strategy.visualFlow.anchors.length > 0 && (
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('creativeAdVisualHierarchyStrategist.anchors')}:</span>{' '}
                    {result.strategy.visualFlow.anchors.join(', ')}
                  </p>
                )}
                <p className="text-xs text-fg-muted">{result.strategy.visualFlow.description}</p>
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">
                  {t('creativeAdVisualHierarchyStrategist.recommendations')}
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
