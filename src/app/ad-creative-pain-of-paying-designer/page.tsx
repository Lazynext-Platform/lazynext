'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  FileText,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PainOfPayingDesignerResult,
  PainOfPayingStrategy,
} from '@/lib/creative/ad-creative-pain-of-paying-designer';

const CREDIT_COST = 3;

const TYPE_COLORS: Record<string, string> = {
  installment: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  trial: 'bg-success/20 text-success border-success/30',
  bundle: 'bg-warning/20 text-warning border-warning/30',
  subscription: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  risk_reversal: 'bg-danger/20 text-danger border-danger/30',
};

export default function AdCreativePainOfPayingDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [price, setPrice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [paymentFrictionPoints, setPaymentFrictionPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PainOfPayingDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !price.trim() || !targetAudience.trim() || !paymentFrictionPoints.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-pain-of-paying-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          price,
          targetAudience,
          paymentFrictionPoints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('painOfPayingDesigner.error'));
      setResult(data.result as PainOfPayingDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, price, targetAudience, paymentFrictionPoints, t]);

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
          {t('painOfPayingDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('painOfPayingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('painOfPayingDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('painOfPayingDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> {t('painOfPayingDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            {t('painOfPayingDesigner.subtitle')}
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acppdProduct" className="block text-sm font-medium mb-1">
              {t('painOfPayingDesigner.productOrBrand')}
            </label>
            <input
              id="acppdProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('painOfPayingDesigner.productOrBrandPh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acppdPrice" className="block text-sm font-medium mb-1">
              {t('painOfPayingDesigner.price')}
            </label>
            <input
              id="acppdPrice"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('painOfPayingDesigner.pricePh')}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acppdAudience" className="block text-sm font-medium mb-1">
              {t('painOfPayingDesigner.targetAudience')}
            </label>
            <input
              id="acppdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('painOfPayingDesigner.targetAudiencePh')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acppdFriction" className="block text-sm font-medium mb-1">
              {t('painOfPayingDesigner.paymentFrictionPoints')}
            </label>
            <textarea
              id="acppdFriction"
              value={paymentFrictionPoints}
              onChange={(e) => setPaymentFrictionPoints(e.target.value)}
              placeholder={t('painOfPayingDesigner.paymentFrictionPh')}
              rows={4}
              maxLength={4000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !price.trim() || !targetAudience.trim() || !paymentFrictionPoints.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('painOfPayingDesigner.generating') : `${t('painOfPayingDesigner.generate')} (${CREDIT_COST})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('painOfPayingDesigner.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('painOfPayingDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('painOfPayingDesigner.dryRunNotice')}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('painOfPayingDesigner.copied') : t('painOfPayingDesigner.copy')}
              </button>
            </div>

            {/* Best Strategy */}
            {result.bestStrategy && (
              <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="text-sm text-fg">
                  {t('painOfPayingDesigner.bestStrategy')} <span className="font-medium">{result.bestStrategy.replace(/_/g, ' ')}</span>
                </span>
              </div>
            )}

            {/* Strategies */}
            {result.strategies.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Shield className="w-4 h-4 text-brand-accent" /> {t('painOfPayingDesigner.smootherPathway')}
                </p>
                {result.strategies.map((strategy: PainOfPayingStrategy, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[strategy.type] || 'bg-bg-secondary text-fg-muted border-border'}`}>
                      {strategy.type.replace(/_/g, ' ')}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('common.resultLabels.description')}</p>
                      <p className="text-sm text-fg">{strategy.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('painOfPayingDesigner.copy')}</p>
                      <p className="text-sm text-fg">{strategy.copy}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">{t('common.resultLabels.psychologicalPrinciple')}</p>
                      <p className="text-sm text-fg">{strategy.psychologicalPrinciple}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ad Copy */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-warning" /> {t('common.resultLabels.adCopy')}
              </p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">{t('common.resultLabels.headline')}</p>
                <p className="text-sm text-fg">{result.adCopy.headline}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">{t('common.resultLabels.body')}</p>
                <p className="text-sm text-fg">{result.adCopy.body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">{t('common.resultLabels.cta')}</p>
                <p className="text-sm text-fg">{result.adCopy.cta}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
