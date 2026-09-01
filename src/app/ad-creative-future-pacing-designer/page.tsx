'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Eye,
  FileText,
  Brain,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  FuturePacingDesignerResult,
  FutureScenario,
} from '@/lib/creative/ad-creative-future-pacing-designer';

const CREDIT_COST = 4;

export default function AdCreativeFuturePacingDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FuturePacingDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim() || !desiredOutcome.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-future-pacing-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          desiredOutcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('futurePacingDesigner.error'));
      setResult(data.result as FuturePacingDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, desiredOutcome, t]);

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
          {t('futurePacingDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('futurePacingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('futurePacingDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('futurePacingDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('futurePacingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('futurePacingDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acfpdProduct" className="block text-sm font-medium mb-1">
              {t('futurePacingDesigner.productOrBrand')}
            </label>
            <input
              id="acfpdProduct"
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
            <label htmlFor="acfpdAudience" className="block text-sm font-medium mb-1">
              {t('futurePacingDesigner.targetAudience')}
            </label>
            <input
              id="acfpdAudience"
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
            <label htmlFor="acfpdOutcome" className="block text-sm font-medium mb-1">
              Desired Outcome
            </label>
            <input
              id="acfpdOutcome"
              type="text"
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              placeholder="e.g., Brighter, more even skin tone within 2 weeks"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim() || !desiredOutcome.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('futurePacingDesigner.generating') : `${t('futurePacingDesigner.generate')} (${CREDIT_COST})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('futurePacingDesigner.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('futurePacingDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('futurePacingDesigner.dryRunNotice')}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('futurePacingDesigner.copied') : t('futurePacingDesigner.copy')}
              </button>
            </div>

            {/* Future Scenarios */}
            {result.futureScenarios.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4 text-brand-accent" /> {t('futurePacingDesigner.pacingPathway')}
                </p>
                {result.futureScenarios.map((scenario: FutureScenario, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                      {scenario.timeframe}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('futurePacingDesigner.futureScenario')}</p>
                      <p className="text-sm text-fg">{scenario.scenario}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('futurePacingDesigner.sensoryDetails')}</p>
                      <p className="text-sm text-fg">{scenario.sensoryDetails}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('futurePacingDesigner.emotionalOutcome')}</p>
                      <p className="text-sm text-fg">{scenario.emotionalPayoff}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ad Copy */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-warning" /> Ad Copy
              </p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Hook</p>
                <p className="text-sm text-fg">{result.adCopy.hook}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Body</p>
                <p className="text-sm text-fg">{result.adCopy.body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">CTA</p>
                <p className="text-sm text-fg">{result.adCopy.cta}</p>
              </div>
            </div>

            {/* Visualization Prompt */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <Brain className="w-4 h-4 text-success" /> Visualization Prompt
              </p>
              <p className="text-sm text-fg">{result.visualizationPrompt}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
