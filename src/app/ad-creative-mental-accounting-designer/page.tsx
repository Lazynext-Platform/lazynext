'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Calculator,
  FileText,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  MentalAccountingDesignerResult,
  MentalAccountingReframe,
} from '@/lib/creative/ad-creative-mental-accounting-designer';

const CREDIT_COST = 3;

const TYPE_COLORS: Record<string, string> = {
  cost_per_use: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  daily_equivalent: 'bg-success/20 text-success border-success/30',
  category_comparison: 'bg-warning/20 text-warning border-warning/30',
  subscription_equivalent: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdCreativeMentalAccountingDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [price, setPrice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MentalAccountingDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !price.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-mental-accounting-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          price,
          targetAudience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('mentalAccountingDesigner.error'));
      setResult(data.result as MentalAccountingDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, price, targetAudience, t]);

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
          {t('mentalAccountingDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('mentalAccountingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('mentalAccountingDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('mentalAccountingDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('mentalAccountingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('mentalAccountingDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acmadProduct" className="block text-sm font-medium mb-1">
              {t('mentalAccountingDesigner.productOrBrand')}
            </label>
            <input
              id="acmadProduct"
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
            <label htmlFor="acmadPrice" className="block text-sm font-medium mb-1">
              Price
            </label>
            <input
              id="acmadPrice"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., $49"
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acmadAudience" className="block text-sm font-medium mb-1">
              {t('mentalAccountingDesigner.targetAudience')}
            </label>
            <input
              id="acmadAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !price.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('mentalAccountingDesigner.generating') : `${t('mentalAccountingDesigner.generate')} (${CREDIT_COST})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('mentalAccountingDesigner.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('mentalAccountingDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('mentalAccountingDesigner.dryRunNotice')}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('mentalAccountingDesigner.copied') : t('mentalAccountingDesigner.copy')}
              </button>
            </div>

            {/* Best Reframe */}
            {result.bestReframe && (
              <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="text-sm text-fg">
                  Best reframe: <span className="font-medium">{result.bestReframe.replace(/_/g, ' ')}</span>
                </span>
              </div>
            )}

            {/* Reframes */}
            {result.reframes.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Calculator className="w-4 h-4 text-brand-accent" /> {t('mentalAccountingDesigner.reframePathway')}
                </p>
                {result.reframes.map((reframe: MentalAccountingReframe, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[reframe.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {reframe.type.replace(/_/g, ' ')}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">Frame</p>
                      <p className="text-sm text-fg">{reframe.frame}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">Calculation</p>
                      <p className="text-sm text-fg font-mono">{reframe.calculation}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">Psychological Effect</p>
                      <p className="text-sm text-fg">{reframe.psychologicalEffect}</p>
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
                <p className="text-xs font-medium text-fg-muted mb-0.5">Headline</p>
                <p className="text-sm text-fg">{result.adCopy.headline}</p>
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
          </div>
        )}
      </main>
    </div>
  );
}
