'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  FlaskConical,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ABTestNameResult,
  TestVariantName,
  TestType,
} from '@/lib/creative/ad-ab-test-name-generator';

const CREDIT_COST = 2;

const TEST_TYPES: TestType[] = ['hook', 'headline', 'cta', 'visual', 'audience', 'timing', 'format'];

const CATEGORY_COLORS: Record<string, string> = {
  engagement: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  conversion: 'bg-success/20 text-success border-success/30',
  reach: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  retention: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  brand_awareness: 'bg-warning/20 text-warning border-warning/30',
};

export default function AdABTestNameGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [testType, setTestType] = useState<TestType>('hook');
  const [variantCount, setVariantCount] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ABTestNameResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-ab-test-name-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          testType,
          variantCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adABTestNameGenerator.error'));
      setResult(data.result as ABTestNameResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, testType, variantCount, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const lines = [
        `Test Series: ${result.testSeriesName}`,
        '',
        ...result.testNames.map(
          (tn) =>
            `${tn.variantLabel}: ${tn.testName}\n  Hypothesis: ${tn.hypothesis}\n  Category: ${tn.category}\n  Description: ${tn.description}`,
        ),
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
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
          {t('adABTestNameGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6" /> {t('adABTestNameGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adABTestNameGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adABTestNameGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6" /> {t('adABTestNameGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adABTestNameGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="abtgProduct" className="block text-sm font-medium mb-1">
              {t('adABTestNameGenerator.productOrBrand')}
            </label>
            <textarea
              id="abtgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adABTestNameGenerator.testType')}</label>
            <div className="flex flex-wrap gap-2">
              {TEST_TYPES.map((tt) => (
                <button
                  key={tt}
                  type="button"
                  onClick={() => setTestType(tt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    testType === tt
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {tt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="abtgCount" className="block text-sm font-medium mb-1">
              {t('adABTestNameGenerator.variantCount')}
            </label>
            <input
              id="abtgCount"
              type="number"
              value={variantCount}
              onChange={(e) => setVariantCount(Number(e.target.value))}
              min={2}
              max={6}
              className="w-full sm:w-40 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adABTestNameGenerator.generating') : `${t('adABTestNameGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adABTestNameGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adABTestNameGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adABTestNameGenerator.dryRunNotice')}
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
                {copied ? t('adABTestNameGenerator.copied') : t('adABTestNameGenerator.copy')}
              </button>
            </div>

            {/* Test series name */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <p className="text-xs text-fg-muted mb-1">{t('adABTestNameGenerator.testSeriesName')}</p>
              <p className="text-sm font-medium">{result.testSeriesName}</p>
            </div>

            {/* Test variant cards */}
            <div className="space-y-3">
              {result.testNames.map((tn: TestVariantName, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                      {tn.variantLabel}
                    </span>
                    <span className="text-sm font-medium">{tn.testName}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[tn.category] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {tn.category}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('adABTestNameGenerator.hypothesis')}:</span> {tn.hypothesis}
                  </p>
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">{t('adABTestNameGenerator.description')}:</span> {tn.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
