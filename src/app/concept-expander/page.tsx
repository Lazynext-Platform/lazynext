'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Eye,
  Palette,
  Megaphone,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ConceptExpanderResult,
  ExpandedConcept,
  ProductionDifficulty,
} from '@/lib/creative/concept-expander';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const DIFFICULTY_COLORS: Record<ProductionDifficulty, string> = {
  easy: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  hard: 'bg-danger/20 text-danger border-danger/30',
};

export default function ConceptExpanderPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [seedConcept, setSeedConcept] = useState('');
  const [platform, setPlatform] = useState<string>('tiktok');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [count, setCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConceptExpanderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const expand = useCallback(async () => {
    if (!seedConcept.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/concept-expander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedConcept,
          platform,
          productOrBrand,
          targetAudience: targetAudience || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('conceptExpander.error'));
      setResult(data.result as ConceptExpanderResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [seedConcept, platform, productOrBrand, targetAudience, count, t]);

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
          {t('conceptExpander.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('conceptExpander.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('conceptExpander.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('conceptExpander.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" /> {t('conceptExpander.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('conceptExpander.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="ceSeedConcept" className="block text-sm font-medium mb-1">
              {t('conceptExpander.seedConcept')}
            </label>
            <textarea
              id="ceSeedConcept"
              value={seedConcept}
              onChange={(e) => setSeedConcept(e.target.value)}
              placeholder="e.g., A before-and-after reveal showing the product transforming a routine"
              rows={3}
              maxLength={5000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="ceProduct" className="block text-sm font-medium mb-1">
              {t('conceptExpander.productOrBrand')}
            </label>
            <textarea
              id="ceProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('conceptExpander.platform')}</label>
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
              <label htmlFor="ceAudience" className="block text-sm font-medium mb-1">
                {t('conceptExpander.targetAudience')}
              </label>
              <input
                id="ceAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., women 25-40 interested in clean beauty (optional)"
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="ceCount" className="block text-sm font-medium mb-1">
                {t('conceptExpander.count')}
              </label>
              <input
                id="ceCount"
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min={3}
                max={8}
                className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={expand}
            disabled={loading || !seedConcept.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('conceptExpander.expanding') : `${t('conceptExpander.expand')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('conceptExpander.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('conceptExpander.expanding')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('conceptExpander.dryRunNotice')}
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
                {copied ? t('conceptExpander.copied') : t('conceptExpander.copy')}
              </button>
            </div>

            {/* Concept cards */}
            <div className="space-y-3">
              {result.concepts.map((concept: ExpandedConcept, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-fg-muted">#{i + 1}</span>
                    <span className="font-medium text-base">{concept.title}</span>
                    <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[concept.estimatedProductionDifficulty] || DIFFICULTY_COLORS.medium}`}>
                      {concept.estimatedProductionDifficulty}
                    </span>
                  </div>

                  <p className="text-sm text-fg-muted mb-3">{concept.description}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('conceptExpander.hook')}:</span>
                      <span className="font-medium">{concept.hook}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('conceptExpander.visualDirection')}:</span>
                      <span className="font-medium">{concept.visualDirection}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-fg-muted flex-shrink-0 mt-0.5" />
                      <span className="text-fg-muted">{t('conceptExpander.uniqueAngle')}:</span>
                      <span className="font-medium">{concept.uniqueAngle}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary">
                      {t('conceptExpander.tone')}: {concept.tone}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary">
                      {t('conceptExpander.format')}: {concept.format}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
