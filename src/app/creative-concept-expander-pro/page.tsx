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
  Network,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ConceptExpanderProResult,
  ConceptVariation,
  ConceptExtension,
  CrossPlatformAdaptation,
} from '@/lib/creative/creative-concept-expander-pro';

const CREDIT_COST = 5;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const DEPTHS = ['shallow', 'standard', 'deep'] as const;

export default function CreativeConceptExpanderProPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [concept, setConcept] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [expansionDepth, setExpansionDepth] = useState<string>('standard');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConceptExpanderProResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!concept.trim() || !productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-concept-expander-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept,
          productOrBrand,
          expansionDepth,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeConceptExpanderPro.error'));
      setResult(data.result as ConceptExpanderProResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [concept, productOrBrand, expansionDepth, platform, t]);

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
          {t('creativeConceptExpanderPro.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeConceptExpanderPro.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeConceptExpanderPro.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeConceptExpanderPro.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> {t('creativeConceptExpanderPro.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeConceptExpanderPro.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cepConcept" className="block text-sm font-medium mb-1">
              {t('creativeConceptExpanderPro.concept')}
            </label>
            <textarea
              id="cepConcept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder={t('creativeConceptExpanderPro.contentPh')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cepProduct" className="block text-sm font-medium mb-1">
              {t('creativeConceptExpanderPro.productOrBrand')}
            </label>
            <input
              id="cepProduct"
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
            <label className="block text-sm font-medium mb-2">{t('creativeConceptExpanderPro.expansionDepth')}</label>
            <div className="flex flex-wrap gap-2">
              {DEPTHS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExpansionDepth(d)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    expansionDepth === d
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeConceptExpanderPro.platform')}</label>
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
            disabled={loading || !concept.trim() || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeConceptExpanderPro.generating') : `${t('creativeConceptExpanderPro.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeConceptExpanderPro.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeConceptExpanderPro.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeConceptExpanderPro.dryRunNotice')}
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
                {copied ? t('creativeConceptExpanderPro.copied') : t('creativeConceptExpanderPro.copy')}
              </button>
            </div>

            {/* Core concept */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs font-medium text-fg-muted mb-1">{t('creativeConceptExpanderPro.coreConcept')}</p>
              <p className="text-sm font-medium">{result.expansion.coreConcept}</p>
            </div>

            {/* Ecosystem map */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-brand-accent" />
                <p className="text-sm font-medium">{t('creativeConceptExpanderPro.ecosystemMap')}</p>
              </div>
              <p className="text-sm text-fg-muted">{result.expansion.ecosystemMap}</p>
            </div>

            {/* Variations */}
            {result.expansion.variations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeConceptExpanderPro.variations')}</p>
                {result.expansion.variations.map((v: ConceptVariation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-semibold">{v.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">{v.format}</span>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-card text-fg-muted border-border">{v.platform}</span>
                      </div>
                    </div>
                    <p className="text-xs text-fg-muted">{v.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('creativeConceptExpanderPro.differentiationAngle')}:</span> {v.differentiationAngle}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Extensions */}
            {result.expansion.extensions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeConceptExpanderPro.extensions')}</p>
                {result.expansion.extensions.map((e: ConceptExtension, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">{e.type}</span>
                    <p className="text-xs text-fg-muted">{e.description}</p>
                    <p className="text-xs text-fg-muted"><span className="font-medium text-fg">{t('creativeConceptExpanderPro.application')}:</span> {e.application}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Cross-platform adaptations */}
            {result.expansion.crossPlatformAdaptations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{t('creativeConceptExpanderPro.crossPlatformAdaptations')}</p>
                {result.expansion.crossPlatformAdaptations.map((a: CrossPlatformAdaptation, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1.5">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">{a.platform}</span>
                    <p className="text-xs text-fg-muted">{a.adaptation}</p>
                    {a.keyChanges.length > 0 && (
                      <ul className="space-y-0.5">
                        {a.keyChanges.map((kc, j) => (
                          <li key={j} className="text-xs text-fg-muted flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {kc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Creative directions */}
            {result.expansion.creativeDirections.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeConceptExpanderPro.creativeDirections')}</p>
                <ul className="space-y-1.5">
                  {result.expansion.creativeDirections.map((dir, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" /> {dir}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.expansion.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('creativeConceptExpanderPro.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.expansion.recommendations.map((rec, i) => (
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
