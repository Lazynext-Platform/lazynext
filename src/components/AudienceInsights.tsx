'use client';

import { useState, useCallback } from 'react';
import { Users2, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { AudienceInsightsResult } from '@/lib/creative/audience-insights';

export function AudienceInsights() {
  const { t } = useI18n();
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [existingData, setExistingData] = useState('');
  const [competitorData, setCompetitorData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudienceInsightsResult | null>(null);

  const analyze = useCallback(async () => {
    if (!productDescription.trim()) { setError(t('audienceInsights.productRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/audience-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription, productCategory, targetMarket, existingCustomerData: existingData, competitorAudience: competitorData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productDescription, productCategory, targetMarket, existingData, competitorData, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users2 className="w-5 h-5" /> {t('audienceInsights.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('audienceInsights.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="ai-product" className="block text-sm font-medium mb-1">{t('audienceInsights.productDescription')}</label>
          <textarea id="ai-product" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('audienceInsights.productDescription')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-category" className="block text-sm font-medium mb-1">{t('audienceInsights.productCategory')}</label>
            <input id="ai-category" type="text" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('audienceInsights.productCategory')} />
          </div>
          <div>
            <label htmlFor="ai-market" className="block text-sm font-medium mb-1">{t('audienceInsights.targetMarket')}</label>
            <input id="ai-market" type="text" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('audienceInsights.targetMarket')} />
          </div>
        </div>
        <div>
          <label htmlFor="ai-existing" className="block text-sm font-medium mb-1">{t('audienceInsights.existingData')}</label>
          <textarea id="ai-existing" value={existingData} onChange={(e) => setExistingData(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('audienceInsights.existingData')} />
        </div>
        <div>
          <label htmlFor="ai-competitor" className="block text-sm font-medium mb-1">{t('audienceInsights.competitorData')}</label>
          <textarea id="ai-competitor" value={competitorData} onChange={(e) => setCompetitorData(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('audienceInsights.competitorData')} />
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('audienceInsights.analyze')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />}
        {loading ? t('audienceInsights.analyzing') : t('audienceInsights.analyze')} <span className="text-xs opacity-75">({t('audienceInsights.credits')}: 7)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Summary scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center">
              <p className="text-xs text-fg-muted">{t('audienceInsights.audienceFit')}</p>
              <p className="text-2xl font-bold text-brand-accent">{result.audienceFitScore}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center">
              <p className="text-xs text-fg-muted">{t('audienceInsights.lookalikePotential')}</p>
              <p className="text-2xl font-bold text-brand-accent">{result.lookalikePotential}</p>
            </div>
          </div>

          {/* Segments */}
          {result.segments.map((seg, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold">{seg.name}</span>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{seg.segment.replace(/_/g, ' ')}</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5">{seg.size}%</span>
                  <span className="rounded bg-bg-primary px-2 py-0.5">Intent: {seg.purchaseIntentScore}</span>
                </div>
              </div>
              <p className="text-xs text-fg-muted">Age: {seg.demographics.ageRange} | Income: {seg.demographics.incomeLevel} | Locations: {seg.demographics.topLocations.join(', ')}</p>
              {seg.topInterests.length > 0 && <p className="text-xs text-fg-muted">Interests: {seg.topInterests.map((i) => `${i.category} (${i.affinityScore})`).join(', ')}</p>}
              {seg.bestMessagingAngles.length > 0 && <p className="text-xs text-fg-muted">Angles: {seg.bestMessagingAngles.join(', ')}</p>}
              <p className="text-xs text-fg-muted">Est. CPA: ${seg.estimatedCpa} | Est. CTR: {seg.estimatedCtr}%</p>
            </div>
          ))}

          {/* Overlap Matrix */}
          {result.overlapMatrix.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('audienceInsights.overlapMatrix')}</h3>
              <div className="space-y-1 text-xs text-fg-muted">
                {result.overlapMatrix.map((o, i) => (
                  <p key={i}>{o.segmentA} ↔ {o.segmentB}: {o.overlap}%</p>
                ))}
              </div>
            </div>
          )}

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('audienceInsights.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('audienceInsights.recommendations')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.recommendations.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
