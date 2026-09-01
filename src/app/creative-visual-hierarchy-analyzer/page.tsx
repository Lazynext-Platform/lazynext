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
  Scale,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  HierarchyAnalyzerResult,
  VisualElement,
  AttentionFlowStep,
  FocalPoint,
} from '@/lib/creative/creative-visual-hierarchy-analyzer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const CONTENT_TYPES = ['video-script', 'image-ad', 'carousel', 'story', 'text-ad'] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function priorityColor(priority: number): string {
  if (priority <= 3) return 'bg-success';
  if (priority <= 6) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeVisualHierarchyAnalyzerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [layoutDescription, setLayoutDescription] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [contentType, setContentType] = useState<string>('text-ad');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HierarchyAnalyzerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!layoutDescription.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-visual-hierarchy-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutDescription,
          productOrBrand,
          contentType,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeVisualHierarchyAnalyzer.error'));
      setResult(data.result as HierarchyAnalyzerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [layoutDescription, productOrBrand, contentType, platform, t]);

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
          {t('creativeVisualHierarchyAnalyzer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeVisualHierarchyAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeVisualHierarchyAnalyzer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeVisualHierarchyAnalyzer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeVisualHierarchyAnalyzer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeVisualHierarchyAnalyzer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cvhaLayout" className="block text-sm font-medium mb-1">
              {t('creativeVisualHierarchyAnalyzer.layoutDescription')}
            </label>
            <textarea
              id="cvhaLayout"
              value={layoutDescription}
              onChange={(e) => setLayoutDescription(e.target.value)}
              placeholder={t('creativeVisualHierarchyAnalyzer.contentPh')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cvhaProduct" className="block text-sm font-medium mb-1">
              {t('creativeVisualHierarchyAnalyzer.productOrBrand')}
            </label>
            <input
              id="cvhaProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeVisualHierarchyAnalyzer.contentType')}</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setContentType(ct)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    contentType === ct
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeVisualHierarchyAnalyzer.platform')}</label>
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
            disabled={loading || !layoutDescription.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeVisualHierarchyAnalyzer.generating') : `${t('creativeVisualHierarchyAnalyzer.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeVisualHierarchyAnalyzer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeVisualHierarchyAnalyzer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeVisualHierarchyAnalyzer.dryRunNotice')}
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
                {copied ? t('creativeVisualHierarchyAnalyzer.copied') : t('creativeVisualHierarchyAnalyzer.copy')}
              </button>
            </div>

            {/* Overall score */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-brand-accent" />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeVisualHierarchyAnalyzer.overallScore')}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.analysis.overallScore)}`}>{result.analysis.overallScore}<span className="text-sm text-fg-muted">/100</span></p>
                </div>
              </div>
            </div>

            {/* Visual elements */}
            {result.analysis.elements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-accent" /> {t('creativeVisualHierarchyAnalyzer.visualElements')}
                </p>
                {result.analysis.elements.map((el: VisualElement, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{el.element.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">P{el.priority}</span>
                        <span className={`text-sm font-bold ${scoreColor(el.effectiveness)}`}>{el.effectiveness}/100</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${priorityColor(el.priority)}`}
                        style={{ width: `${el.attentionWeight}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">
                      <span className="font-medium">{el.role}</span> · attention {el.attentionWeight}% · effectiveness {el.effectiveness}/100
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Attention flow */}
            {result.analysis.attentionFlow.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-accent" /> {t('creativeVisualHierarchyAnalyzer.attentionFlow')}
                </p>
                {result.analysis.attentionFlow.map((step: AttentionFlowStep, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary p-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold flex-shrink-0">{step.step}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{step.element.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-fg-muted">{step.direction} · {step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Focal points */}
            {result.analysis.focalPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-accent" /> {t('creativeVisualHierarchyAnalyzer.focalPoints')}
                </p>
                {result.analysis.focalPoints.map((fp: FocalPoint, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium">{fp.element.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-bold ${scoreColor(fp.strength)}`}>{fp.strength}/100</span>
                    </div>
                    <p className="text-xs text-fg-muted">{fp.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Balance assessment */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Scale className="w-4 h-4 text-brand-accent" /> {t('creativeVisualHierarchyAnalyzer.balance')}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${scoreColor(result.analysis.balance.score)}`}>{result.analysis.balance.score}<span className="text-sm text-fg-muted">/100</span></span>
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">{result.analysis.balance.symmetry}</span>
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">{result.analysis.balance.weight}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{result.analysis.balance.notes}</p>
            </div>

            {/* Recommendations */}
            {result.analysis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeVisualHierarchyAnalyzer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.analysis.recommendations.map((rec, i) => (
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
