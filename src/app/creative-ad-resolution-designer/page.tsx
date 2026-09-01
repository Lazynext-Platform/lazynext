'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Film,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Heart,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ResolutionDesignerResult,
  ResolutionStructure,
  EmotionalClosure,
  CTABridge,
} from '@/lib/creative/creative-ad-resolution-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-success';
  if (score >= 50) return 'bg-warning';
  return 'bg-danger';
}

export default function CreativeAdResolutionDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResolutionDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-resolution-designer', {
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
      if (!res.ok) throw new Error(data.error || t('creativeAdResolutionDesigner.error'));
      setResult(data.result as ResolutionDesignerResult);
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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('creativeAdResolutionDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6" /> {t('creativeAdResolutionDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdResolutionDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdResolutionDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6" /> {t('creativeAdResolutionDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdResolutionDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cardProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdResolutionDesigner.productOrBrand')}
            </label>
            <input
              id="cardProduct"
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
            <label htmlFor="cardContent" className="block text-sm font-medium mb-1">
              {t('creativeAdResolutionDesigner.content')}
            </label>
            <textarea
              id="cardContent"
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
            <label htmlFor="cardAudience" className="block text-sm font-medium mb-1">
              {t('creativeAdResolutionDesigner.targetAudience')}
            </label>
            <input
              id="cardAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and self-care"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeAdResolutionDesigner.platform')}</label>
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
            {loading ? t('creativeAdResolutionDesigner.generating') : `${t('creativeAdResolutionDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdResolutionDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdResolutionDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdResolutionDesigner.dryRunNotice')}
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
                {copied ? t('creativeAdResolutionDesigner.copied') : t('creativeAdResolutionDesigner.copy')}
              </button>
            </div>

            {/* Resolution structure */}
            {result.design.structure && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4 text-brand-accent" /> {t('creativeAdResolutionDesigner.structure')}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                    {result.design.structure.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-fg-muted">{result.design.structure.timing}</span>
                </div>
                <p className="text-xs text-fg-muted">{result.design.structure.description}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fg-muted">narrative completion</span>
                    <span className={`text-xs font-bold ${scoreColor(result.design.structure.narrativeCompletion)}`}>{result.design.structure.narrativeCompletion}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(result.design.structure.narrativeCompletion)}`}
                      style={{ width: `${result.design.structure.narrativeCompletion}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Emotional closure */}
            {result.design.closure && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-accent" /> {t('creativeAdResolutionDesigner.closure')}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                    {result.design.closure.primaryEmotion}
                  </span>
                  <span className="text-xs text-fg-muted">{result.design.closure.closureMethod}</span>
                </div>
                <p className="text-xs text-fg-muted">{result.design.closure.viewerFeeling}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fg-muted">emotional depth</span>
                    <span className={`text-xs font-bold ${scoreColor(result.design.closure.emotionalDepth)}`}>{result.design.closure.emotionalDepth}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(result.design.closure.emotionalDepth)}`}
                      style={{ width: `${result.design.closure.emotionalDepth}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CTA bridge */}
            {result.design.ctaBridge && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-accent" /> {t('creativeAdResolutionDesigner.ctaBridge')}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                    {result.design.ctaBridge.bridgeMethod}
                  </span>
                  <span className="text-xs text-fg-muted">{result.design.ctaBridge.ctaPlacement}</span>
                </div>
                <p className="text-xs text-fg-muted italic">&ldquo;{result.design.ctaBridge.transitionPhrase}&rdquo;</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fg-muted">naturalness</span>
                    <span className={`text-xs font-bold ${scoreColor(result.design.ctaBridge.naturalness)}`}>{result.design.ctaBridge.naturalness}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(result.design.ctaBridge.naturalness)}`}
                      style={{ width: `${result.design.ctaBridge.naturalness}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Score gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted">{t('creativeAdResolutionDesigner.satisfactionScore')}</p>
                <p className={`text-3xl font-bold ${scoreColor(result.design.satisfactionScore)}`}>{result.design.satisfactionScore}<span className="text-sm text-fg-muted">/100</span></p>
                <div className="mt-2 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(result.design.satisfactionScore)}`}
                    style={{ width: `${result.design.satisfactionScore}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-xs font-medium text-fg-muted">{t('creativeAdResolutionDesigner.memorabilityScore')}</p>
                <p className={`text-3xl font-bold ${scoreColor(result.design.memorabilityScore)}`}>{result.design.memorabilityScore}<span className="text-sm text-fg-muted">/100</span></p>
                <div className="mt-2 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(result.design.memorabilityScore)}`}
                    style={{ width: `${result.design.memorabilityScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.design.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('creativeAdResolutionDesigner.recommendations')}
                </p>
                <ul className="space-y-1.5">
                  {result.design.recommendations.map((rec, i) => (
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
