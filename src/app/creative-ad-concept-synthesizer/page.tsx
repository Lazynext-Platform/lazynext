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
  Compass,
  Target,
  ListChecks,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  SynthesizerResult,
  SynthesizedElement,
} from '@/lib/creative/creative-ad-concept-synthesizer';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function priorityColor(priority: number): string {
  if (priority >= 8) return 'text-success';
  if (priority >= 5) return 'text-warning';
  return 'text-fg-muted';
}

export default function CreativeAdConceptSynthesizerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [concepts, setConcepts] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SynthesizerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!concepts.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-ad-concept-synthesizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepts,
          productOrBrand,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeAdConceptSynthesizer.error'));
      setResult(data.result as SynthesizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [concepts, productOrBrand, platform, t]);

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
          {t('creativeAdConceptSynthesizer.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeAdConceptSynthesizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdConceptSynthesizer.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeAdConceptSynthesizer.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeAdConceptSynthesizer.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeAdConceptSynthesizer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cacsConcepts" className="block text-sm font-medium mb-1">
              {t('creativeAdConceptSynthesizer.concepts')}
            </label>
            <textarea
              id="cacsConcepts"
              value={concepts}
              onChange={(e) => setConcepts(e.target.value)}
              placeholder={t('creativeAdConceptSynthesizer.conceptsPlaceholder')}
              rows={6}
              maxLength={20000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
            <p className="text-xs text-fg-muted mt-1">{t('creativeAdConceptSynthesizer.conceptsHint')}</p>
          </div>

          <div>
            <label htmlFor="cacsProduct" className="block text-sm font-medium mb-1">
              {t('creativeAdConceptSynthesizer.productOrBrand')}
            </label>
            <input
              id="cacsProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeAdConceptSynthesizer.platform')}</label>
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
                {t('creativeAdConceptSynthesizer.anyPlatform')}
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
            disabled={loading || !concepts.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeAdConceptSynthesizer.generating') : `${t('creativeAdConceptSynthesizer.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeAdConceptSynthesizer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeAdConceptSynthesizer.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeAdConceptSynthesizer.dryRunNotice')}
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
                {copied ? t('creativeAdConceptSynthesizer.copied') : t('creativeAdConceptSynthesizer.copy')}
              </button>
            </div>

            {/* Unified theme */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs font-medium text-fg-muted mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> {t('creativeAdConceptSynthesizer.unifiedTheme')}
              </p>
              <p className="text-sm text-fg">{result.synthesis.unifiedTheme}</p>
            </div>

            {/* Merged elements */}
            {result.synthesis.mergedElements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent" /> {t('creativeAdConceptSynthesizer.mergedElements')}
                </p>
                {result.synthesis.mergedElements.map((el: SynthesizedElement, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-2">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium flex-1">{el.element}</span>
                      <span className={`text-sm font-bold ${priorityColor(el.priority)}`}>{el.priority}/10</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{el.role}</span>
                      <div className="flex flex-wrap gap-1">
                        {el.sourceConcepts.map((src, j) => (
                          <span key={j} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/20">{src}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Creative direction */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-accent" /> {t('creativeAdConceptSynthesizer.creativeDirection')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdConceptSynthesizer.style')}</p>
                  <p className="text-sm text-fg">{result.synthesis.creativeDirection.style}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdConceptSynthesizer.tone')}</p>
                  <p className="text-sm text-fg">{result.synthesis.creativeDirection.tone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdConceptSynthesizer.visualApproach')}</p>
                  <p className="text-sm text-fg">{result.synthesis.creativeDirection.visualApproach}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-muted">{t('creativeAdConceptSynthesizer.narrativeArc')}</p>
                  <p className="text-sm text-fg">{result.synthesis.creativeDirection.narrativeArc}</p>
                </div>
              </div>
            </div>

            {/* Differentiation */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs font-medium text-fg-muted mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> {t('creativeAdConceptSynthesizer.differentiation')}
              </p>
              <p className="text-sm text-fg">{result.synthesis.differentiation}</p>
            </div>

            {/* Execution guidelines */}
            {result.synthesis.executionGuidelines.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-brand-accent" /> {t('creativeAdConceptSynthesizer.executionGuidelines')}
                </p>
                <ul className="space-y-1.5">
                  {result.synthesis.executionGuidelines.map((g, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.synthesis.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeAdConceptSynthesizer.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.synthesis.recommendations.map((rec, i) => (
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
