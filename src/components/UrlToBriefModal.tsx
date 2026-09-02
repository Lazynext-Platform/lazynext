'use client';

import { useState, useCallback } from 'react';
import { Link2, X, Loader2, AlertCircle, Package, Lightbulb, Target } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface ProductPageExtraction {
  productName: string;
  brandName?: string;
  description: string;
  features: string[];
  benefits: string[];
  audience: string;
  price?: string;
  category?: string;
  positioning: string;
  painPoints: string[];
  usps: string[];
}

interface UrlToBriefResult {
  extraction: ProductPageExtraction;
  brief: Record<string, unknown>;
  suggestedAngles: string[];
  suggestedHooks: string[];
  suggestedCtas: string[];
  visualDirection: string;
  toneRecommendation: string;
}

interface UrlToBriefModalProps {
  open: boolean;
  onClose: () => void;
  onApply?: (brief: Record<string, unknown>) => void;
}

export function UrlToBriefModal({ open, onClose, onApply }: UrlToBriefModalProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UrlToBriefResult | null>(null);

  const generate = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/url-to-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('urlToBrief.title')}
        className="bg-bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {t('urlToBrief.title')}
          </h2>
          <button onClick={onClose} aria-label={t('urlToBrief.close')} className="text-fg-muted hover:text-fg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-fg-muted">{t('urlToBrief.subtitle')}</p>

        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && generate()}
            placeholder={t('urlToBrief.urlPlaceholder')}
            aria-label={t('urlToBrief.urlLabel')}
            className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
          <button
            onClick={generate}
            disabled={loading || !url.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {loading ? t('urlToBrief.generating') : t('urlToBrief.generate')}
          </button>
        </div>
        <p className="text-xs text-fg-muted">{t('urlToBrief.credits')}: 5</p>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto" aria-label="Dismiss">✕</button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2"><Package className="w-4 h-4" /> {t('urlToBrief.productName')}</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">{t('urlToBrief.productName')}:</span> {result.extraction.productName}</p>
                {result.extraction.brandName && <p><span className="font-medium">{t('urlToBrief.brandName')}:</span> {result.extraction.brandName}</p>}
                <p><span className="font-medium">{t('urlToBrief.description')}:</span> {result.extraction.description}</p>
                {result.extraction.price && <p><span className="font-medium">{t('urlToBrief.price')}:</span> {result.extraction.price}</p>}
                {result.extraction.category && <p><span className="font-medium">{t('urlToBrief.category')}:</span> {result.extraction.category}</p>}
                <p><span className="font-medium">{t('urlToBrief.audience')}:</span> {result.extraction.audience}</p>
                <p><span className="font-medium">{t('urlToBrief.positioning')}:</span> {result.extraction.positioning}</p>
                {result.extraction.features.length > 0 && (
                  <div><span className="font-medium">{t('urlToBrief.features')}:</span>
                    <ul className="list-disc list-inside ml-2">{result.extraction.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {result.extraction.benefits.length > 0 && (
                  <div><span className="font-medium">{t('urlToBrief.benefits')}:</span>
                    <ul className="list-disc list-inside ml-2">{result.extraction.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  </div>
                )}
                {result.extraction.painPoints.length > 0 && (
                  <div><span className="font-medium">{t('urlToBrief.painPoints')}:</span>
                    <ul className="list-disc list-inside ml-2">{result.extraction.painPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {result.extraction.usps.length > 0 && (
                  <div><span className="font-medium">{t('urlToBrief.usps')}:</span>
                    <ul className="list-disc list-inside ml-2">{result.extraction.usps.map((u, i) => <li key={i}>{u}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2"><Lightbulb className="w-4 h-4" /> {t('urlToBrief.suggestedAngles')}</h3>
              <div className="flex flex-wrap gap-2">
                {result.suggestedAngles.map((a, i) => <span key={i} className="px-2 py-1 rounded-full bg-bg-secondary text-xs">{a}</span>)}
              </div>
              <h4 className="text-sm font-medium mt-2">{t('urlToBrief.suggestedHooks')}</h4>
              <div className="flex flex-wrap gap-2">
                {result.suggestedHooks.map((h, i) => <span key={i} className="px-2 py-1 rounded-full bg-bg-secondary text-xs">{h}</span>)}
              </div>
              <h4 className="text-sm font-medium mt-2">{t('urlToBrief.suggestedCtas')}</h4>
              <div className="flex flex-wrap gap-2">
                {result.suggestedCtas.map((c, i) => <span key={i} className="px-2 py-1 rounded-full bg-bg-secondary text-xs">{c}</span>)}
              </div>
              <p className="text-sm mt-2"><span className="font-medium">{t('urlToBrief.visualDirection')}:</span> {result.visualDirection}</p>
              <p className="text-sm"><span className="font-medium">{t('urlToBrief.toneRecommendation')}:</span> {result.toneRecommendation}</p>
            </div>

            <button
              onClick={() => { if (onApply) onApply(result.brief); onClose(); }}
              className="w-full rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" />
              {t('urlToBrief.useInStudio')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
