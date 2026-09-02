'use client';

import { useState, useCallback } from 'react';
import { FlaskConical, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { TestResult, TestType, WinnerCriteria } from '@/lib/creative/testing-lab';

const TEST_TYPES: TestType[] = ['ab', 'abn', 'multivariate', 'split_url', 'sequential'];
const CRITERIA: WinnerCriteria[] = ['ctr', 'cvr', 'roas', 'cpa', 'revenue', 'engagement', 'custom'];

interface VariantInput {
  variantName: string;
  creativeId: string;
  description: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue: string;
  spend: string;
}

export function TestingLab() {
  const { t } = useI18n();
  const [testType, setTestType] = useState<TestType>('ab');
  const [criteria, setCriteria] = useState<WinnerCriteria>('ctr');
  const [confidence, setConfidence] = useState(95);
  const [variants, setVariants] = useState<VariantInput[]>([
    { variantName: 'Control', creativeId: '', description: '', impressions: '', clicks: '', conversions: '', revenue: '', spend: '' },
    { variantName: 'Variant B', creativeId: '', description: '', impressions: '', clicks: '', conversions: '', revenue: '', spend: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);

  const addVariant = () => setVariants((p) => [...p, { variantName: `Variant ${String.fromCharCode(65 + p.length)}`, creativeId: '', description: '', impressions: '', clicks: '', conversions: '', revenue: '', spend: '' }]);
  const removeVariant = (i: number) => setVariants((p) => p.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: keyof VariantInput, val: string) => setVariants((p) => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const analyze = useCallback(async () => {
    if (variants.length < 2) { setError(t('testingLab.minVariants')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const variantMetrics = variants.map((v, i) => ({ variantId: `v${i + 1}`, impressions: Number(v.impressions) || 0, clicks: Number(v.clicks) || 0, conversions: Number(v.conversions) || 0, revenue: Number(v.revenue) || 0, spend: Number(v.spend) || 0 }));
      const res = await fetch('/api/creative/testing-lab', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testConfig: { testType, winnerCriteria: criteria, confidenceThreshold: confidence, variants: variants.map((v, i) => ({ variantName: v.variantName || `Variant ${i + 1}`, creativeId: v.creativeId || undefined, description: v.description })) }, variantMetrics }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [variants, testType, criteria, confidence, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="w-5 h-5" /> {t('testingLab.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('testingLab.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label htmlFor="tl-type" className="block text-sm font-medium mb-1">{t('testingLab.testType')}</label><select id="tl-type" value={testType} onChange={(e) => setTestType(e.target.value as TestType)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>{TEST_TYPES.map((tt) => <option key={tt} value={tt}>{tt.replace(/_/g, ' ')}</option>)}</select></div>
          <div><label htmlFor="tl-crit" className="block text-sm font-medium mb-1">{t('testingLab.criteria')}</label><select id="tl-crit" value={criteria} onChange={(e) => setCriteria(e.target.value as WinnerCriteria)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>{CRITERIA.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label htmlFor="tl-conf" className="block text-sm font-medium mb-1">{t('testingLab.confidence')}: {confidence}%</label><input id="tl-conf" type="range" min={80} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full" disabled={loading} /></div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('testingLab.variants')}</label>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder={t('testingLab.phVariantName')} value={v.variantName} onChange={(e) => updateVariant(i, 'variantName', e.target.value)} className="flex-1 rounded border border-border bg-bg-secondary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  {variants.length > 2 && <button onClick={() => removeVariant(i)} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <input type="number" placeholder={t('testingLab.phImpr')} value={v.impressions} onChange={(e) => updateVariant(i, 'impressions', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('testingLab.phClicks')} value={v.clicks} onChange={(e) => updateVariant(i, 'clicks', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('testingLab.phConv')} value={v.conversions} onChange={(e) => updateVariant(i, 'conversions', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('testingLab.phRevenue')} value={v.revenue} onChange={(e) => updateVariant(i, 'revenue', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('testingLab.phSpend')} value={v.spend} onChange={(e) => updateVariant(i, 'spend', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                </div>
              </div>
            ))}
            <button onClick={addVariant} className="text-sm text-brand-accent hover:opacity-80 flex items-center gap-1"><Plus className="w-4 h-4" /> {t('testingLab.addVariant')}</button>
          </div>
        </div>

        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          {loading ? t('testingLab.analyzing') : `${t('testingLab.analyze')} (5 ${t('testingLab.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Impressions</div><div className="text-lg font-bold">{result.summary.totalImpressions.toLocaleString()}</div></div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Clicks</div><div className="text-lg font-bold">{result.summary.totalClicks.toLocaleString()}</div></div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Conversions</div><div className="text-lg font-bold">{result.summary.totalConversions}</div></div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">ROAS</div><div className="text-lg font-bold">{result.summary.overallRoas.toFixed(2)}x</div></div>
          </div>

          {/* Winner */}
          {result.winner.winnerVariantId && (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex items-center gap-2"><span className="text-success font-bold text-lg">{t('testingLab.winner')}: {result.winner.winnerVariantName}</span><span className="text-xs bg-success/20 px-2 py-0.5 rounded text-success">{result.winner.confidence}% {t('testingLab.confidence')}</span></div>
              <p className="text-sm mt-1">{result.winner.reasoning}</p>
              <p className="text-xs text-success mt-1">{result.winner.recommendedAction}</p>
            </div>
          )}

          {/* Variant Performance */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('testingLab.variantPerformance')}</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left"><th className="py-1">Variant</th><th>Impr</th><th>CTR</th><th>CVR</th><th>CPA</th><th>ROAS</th></tr></thead><tbody>{result.variants.map((v, i) => <tr key={i} className="border-t border-border"><td className="py-1 font-medium">{v.variantName}</td><td>{v.impressions.toLocaleString()}</td><td>{v.ctr.toFixed(2)}%</td><td>{v.cvr.toFixed(2)}%</td><td>${v.cpa.toFixed(2)}</td><td>{v.roas.toFixed(2)}x</td></tr>)}</tbody></table></div>
          </div>

          {/* Comparisons */}
          {result.comparisons.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('testingLab.comparisons')}</h3>
              <div className="space-y-2">
                {result.comparisons.map((c, i) => (
                  <div key={i} className="text-xs flex items-center gap-3 border-l-2 border-border pl-3">
                    <span className={`font-medium ${c.statisticalResult.significanceResult === 'significant' ? 'text-success' : c.statisticalResult.significanceResult === 'not_significant' ? 'text-warning' : 'text-fg-muted'}`}>{c.statisticalResult.significanceResult}</span>
                    <span>{c.variantA} vs {c.variantB}</span>
                    <span className="text-fg-muted">p={c.statisticalResult.pValue.toFixed(4)}</span>
                    <span className="text-fg-muted">{c.statisticalResult.confidenceLevel.toFixed(1)}% CI</span>
                    {c.bayesianResult && <span className="text-brand-accent">P(best)={c.bayesianResult.probabilityOfBeingBest.toFixed(1)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Reallocation */}
          {result.budgetReallocation.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('testingLab.budgetReallocation')}</h3>
              <div className="space-y-1">
                {result.budgetReallocation.map((b, i) => (
                  <div key={i} className="text-xs flex items-center gap-3"><span className="font-medium w-24">{b.variantName}</span><span className="text-fg-muted">{b.currentBudgetPercent}%</span><span className="text-fg-muted">→</span><span className="text-brand-accent">{b.recommendedBudgetPercent}%</span><span className="text-success">{b.expectedPerformanceGain > 0 ? '+' : ''}{b.expectedPerformanceGain.toFixed(1)}%</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('testingLab.recommendations')}</h3>
              <div className="space-y-2">{result.recommendations.map((r, i) => <div key={i} className="flex gap-3"><span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span><div className="flex-1"><p className="text-sm">{r.recommendation}</p><p className="text-xs text-success">{r.expectedImpact}</p></div></div>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
