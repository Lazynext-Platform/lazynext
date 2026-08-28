'use client';

import { useState, useCallback } from 'react';
import { FileSearch, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { BriefIntelligenceResult, BriefType } from '@/lib/creative/brief-intelligence';

const BRIEF_TYPES: BriefType[] = ['product_launch', 'brand_awareness', 'conversion', 'retargeting', 'seasonal', 'comparison', 'storytelling'];

export function BriefIntelligence() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [competitorInfo, setCompetitorInfo] = useState('');
  const [briefType, setBriefType] = useState<BriefType>('product_launch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BriefIntelligenceResult | null>(null);

  const analyze = useCallback(async () => {
    if (!productName.trim()) { setError(t('briefIntelligence.productNameRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/brief-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, productDescription, productUrl, competitorInfo, briefType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productName, productDescription, productUrl, competitorInfo, briefType, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileSearch className="w-5 h-5" /> {t('briefIntelligence.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('briefIntelligence.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="bi-product" className="block text-sm font-medium mb-1">{t('briefIntelligence.productName')}</label>
          <input id="bi-product" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>
        <div>
          <label htmlFor="bi-desc" className="block text-sm font-medium mb-1">{t('briefIntelligence.productDescription')}</label>
          <textarea id="bi-desc" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>
        <div>
          <label htmlFor="bi-url" className="block text-sm font-medium mb-1">{t('briefIntelligence.productUrl')}</label>
          <input id="bi-url" type="text" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>
        <div>
          <label htmlFor="bi-comp" className="block text-sm font-medium mb-1">{t('briefIntelligence.competitorInfo')}</label>
          <textarea id="bi-comp" value={competitorInfo} onChange={(e) => setCompetitorInfo(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>
        <div>
          <label htmlFor="bi-type" className="block text-sm font-medium mb-1">{t('briefIntelligence.briefType')}</label>
          <select id="bi-type" value={briefType} onChange={(e) => setBriefType(e.target.value as BriefType)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
            {BRIEF_TYPES.map((bt) => <option key={bt} value={bt}>{bt.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
          {loading ? t('briefIntelligence.analyzing') : `${t('briefIntelligence.analyze')} (6 ${t('briefIntelligence.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Positioning */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-2">{t('briefIntelligence.positioning')}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-fg-muted">Product:</span> {result.positioning.productName}</div>
              <div><span className="text-fg-muted">Category:</span> {result.positioning.category}</div>
              <div><span className="text-fg-muted">Price:</span> <span className="capitalize">{result.positioning.pricePositioning}</span></div>
              <div><span className="text-fg-muted">Stage:</span> <span className="capitalize">{result.positioning.lifecycleStage}</span></div>
            </div>
            <p className="text-sm mt-2">{result.positioning.positioningStatement}</p>
            <p className="text-xs text-fg-muted mt-1">{t('briefIntelligence.targetMarket')}: {result.positioning.targetMarket}</p>
          </div>

          {/* USPs */}
          {result.usps.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('briefIntelligence.usps')}</h3>
              <div className="space-y-2">
                {result.usps.map((u, i) => (
                  <div key={i} className="text-sm border-l-2 border-brand-accent pl-3">
                    <div className="flex items-center gap-2"><span className="text-xs uppercase font-medium text-brand-accent">{u.category}</span></div>
                    <p className="font-medium">{u.statement}</p>
                    <p className="text-xs text-fg-muted">{u.evidence}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span>Strength: {u.strength}/10</span>
                      <span>Resonance: {u.audienceResonance}/10</span>
                      <span>Diff: {u.competitiveDifferentiation}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitive Advantages */}
          {result.competitiveAdvantages.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('briefIntelligence.competitiveAdvantages')}</h3>
              <div className="space-y-2">
                {result.competitiveAdvantages.map((a, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center gap-2"><span className="text-xs uppercase font-medium text-brand-accent">{a.type.replace(/_/g, ' ')}</span><span className={`text-xs ${a.impactLevel === 'high' ? 'text-danger' : a.impactLevel === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{a.impactLevel}</span></div>
                    <p>{a.description}</p>
                    <p className="text-xs text-fg-muted">Sustainability: {a.sustainability}/10</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brief Score */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('briefIntelligence.briefScore')}</h3>
            <div className="text-center mb-3">
              <div className={`text-4xl font-bold ${result.briefScore.overall >= 70 ? 'text-success' : result.briefScore.overall >= 50 ? 'text-warning' : 'text-danger'}`}>{result.briefScore.overall}</div>
              <div className="text-xs text-fg-muted">{t('briefIntelligence.overallScore')}</div>
            </div>
            <div className="space-y-1">
              {result.briefScore.dimensions.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-28 capitalize">{d.dimension.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-bg-secondary rounded-full h-2"><div className={`rounded-full h-2 ${d.score >= 70 ? 'bg-success' : d.score >= 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${d.score}%` }} /></div>
                  <span className="w-8 text-right">{d.score}</span>
                </div>
              ))}
            </div>
            {result.briefScore.strengths.length > 0 && <div className="mt-3 text-xs"><span className="font-medium text-success">{t('briefIntelligence.strengths')}:</span> {result.briefScore.strengths.join(', ')}</div>}
            {result.briefScore.weaknesses.length > 0 && <div className="text-xs"><span className="font-medium text-warning">{t('briefIntelligence.weaknesses')}:</span> {result.briefScore.weaknesses.join(', ')}</div>}
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.recommendedAngles.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.angles')}</h4><ul className="text-xs space-y-0.5">{result.recommendedAngles.map((a, i) => <li key={i}>• {a}</li>)}</ul></div>}
            {result.recommendedHooks.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.hooks')}</h4><ul className="text-xs space-y-0.5">{result.recommendedHooks.map((h, i) => <li key={i}>• {h}</li>)}</ul></div>}
            {result.recommendedTones.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.tones')}</h4><ul className="text-xs space-y-0.5">{result.recommendedTones.map((to, i) => <li key={i}>• {to}</li>)}</ul></div>}
            {result.keyMessages.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.keyMessages')}</h4><ul className="text-xs space-y-0.5">{result.keyMessages.map((m, i) => <li key={i}>• {m}</li>)}</ul></div>}
            {result.audiencePainPoints.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.painPoints')}</h4><ul className="text-xs space-y-0.5">{result.audiencePainPoints.map((p, i) => <li key={i}>• {p}</li>)}</ul></div>}
            {result.emotionalTriggers.length > 0 && <div className="rounded-lg border border-border bg-bg-card p-3"><h4 className="text-sm font-medium mb-1">{t('briefIntelligence.emotionalTriggers')}</h4><ul className="text-xs space-y-0.5">{result.emotionalTriggers.map((e, i) => <li key={i}>• {e}</li>)}</ul></div>}
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('briefIntelligence.insights')}</h3>
              <div className="space-y-2">
                {result.insights.map((ins, i) => (
                  <div key={i} className="text-sm border-l-2 border-brand-accent pl-3">
                    <span className="text-xs uppercase font-medium text-brand-accent">{ins.type}</span>
                    <p className="font-medium">{ins.title}</p>
                    <p className="text-xs text-fg-muted">{ins.description}</p>
                    <p className="text-xs text-success">{ins.actionableRecommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
