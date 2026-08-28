'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { ForecastResult, ForecastHorizon, ForecastMetric } from '@/lib/creative/forecasting';

const HORIZONS: ForecastHorizon[] = ['7d', '14d', '30d', '60d', '90d'];
const METRICS: ForecastMetric[] = ['impressions', 'clicks', 'ctr', 'conversions', 'cvr', 'roas', 'cpa', 'revenue', 'spend', 'engagement'];

export function Forecasting() {
  const { t } = useI18n();
  const [creativeDescription, setCreativeDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [budget, setBudget] = useState('');
  const [horizon, setHorizon] = useState<ForecastHorizon>('30d');
  const [primaryMetric, setPrimaryMetric] = useState<ForecastMetric>('roas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ForecastResult | null>(null);

  const analyze = useCallback(async () => {
    if (!creativeDescription.trim()) { setError(t('forecasting.creativeRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/forecasting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeDescription, productName, targetAudience, platform,
          budget: budget ? Number(budget) : undefined, horizon, primaryMetric,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [creativeDescription, productName, targetAudience, platform, budget, horizon, primaryMetric, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> {t('forecasting.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('forecasting.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="fc-desc" className="block text-sm font-medium mb-1">{t('forecasting.creativeDescription')}</label>
          <textarea id="fc-desc" value={creativeDescription} onChange={(e) => setCreativeDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="fc-product" className="block text-sm font-medium mb-1">{t('forecasting.productName')}</label><input id="fc-product" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>
          <div><label htmlFor="fc-aud" className="block text-sm font-medium mb-1">{t('forecasting.targetAudience')}</label><input id="fc-aud" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label htmlFor="fc-platform" className="block text-sm font-medium mb-1">Platform</label><select id="fc-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}><option value="meta">Meta</option><option value="google">Google</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option></select></div>
          <div><label htmlFor="fc-budget" className="block text-sm font-medium mb-1">Budget</label><input id="fc-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} /></div>
          <div><label htmlFor="fc-horizon" className="block text-sm font-medium mb-1">{t('forecasting.horizon')}</label><select id="fc-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value as ForecastHorizon)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>{HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}</select></div>
          <div><label htmlFor="fc-metric" className="block text-sm font-medium mb-1">{t('forecasting.metric')}</label><select id="fc-metric" value={primaryMetric} onChange={(e) => setPrimaryMetric(e.target.value as ForecastMetric)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>{METRICS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          {loading ? t('forecasting.analyzing') : `${t('forecasting.analyze')} (7 ${t('forecasting.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Audience Fit */}
          {result.audienceFitScores.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('forecasting.audienceFit')}</h3>
              <div className="text-center mb-3"><div className={`text-3xl font-bold ${result.overallAudienceFit >= 70 ? 'text-success' : result.overallAudienceFit >= 40 ? 'text-warning' : 'text-danger'}`}>{result.overallAudienceFit}</div><div className="text-xs text-fg-muted">{t('forecasting.overallFit')}</div></div>
              <div className="space-y-1">
                {result.audienceFitScores.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-32 capitalize">{f.factor.replace(/_/g, ' ')}</span>
                    <div className="flex-1 bg-bg-secondary rounded-full h-2"><div className={`rounded-full h-2 ${f.score >= 70 ? 'bg-success' : f.score >= 40 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${f.score}%` }} /></div>
                    <span className="w-8 text-right">{f.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenarios */}
          {result.scenarios.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('forecasting.scenarios')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.scenarios.map((s, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${s.scenario === result.recommendedScenario ? 'border-brand-accent bg-brand-accent/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium capitalize">{s.scenario.replace(/_/g, ' ')}</span><span className="text-xs text-fg-muted">{s.probability}%</span></div>
                    {s.scenario === result.recommendedScenario && <span className="text-xs text-brand-accent">{t('forecasting.recommended')}</span>}
                    <div className="text-xs space-y-0.5 mt-1">
                      <div>Impressions: {s.totalPredicted.impressions.toLocaleString()}</div>
                      <div>Clicks: {s.totalPredicted.clicks.toLocaleString()}</div>
                      <div>Conversions: {s.totalPredicted.conversions}</div>
                      <div>Revenue: ${s.totalPredicted.revenue.toLocaleString()}</div>
                      <div>ROAS: {s.totalPredicted.roas.toFixed(2)}x</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Projections */}
          {result.budgetProjections.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('forecasting.budgetProjections')}</h3>
              <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left"><th className="py-1">Budget</th><th>Impressions</th><th>Clicks</th><th>Conv.</th><th>ROAS</th><th>CPA</th><th>Efficiency</th></tr></thead><tbody>{result.budgetProjections.map((b, i) => <tr key={i} className="border-t border-border"><td className="py-1 font-medium">${b.budgetAmount.toLocaleString()}</td><td>{b.projectedImpressions.toLocaleString()}</td><td>{b.projectedClicks.toLocaleString()}</td><td>{b.projectedConversions}</td><td>{b.projectedRoas.toFixed(2)}x</td><td>${b.projectedCpa.toFixed(2)}</td><td>{b.efficiency}%</td></tr>)}</tbody></table></div>
              <div className="mt-3 p-2 rounded bg-brand-accent/10 border border-brand-accent/30 text-sm"><span className="font-medium">{t('forecasting.optimalBudget')}:</span> ${result.optimalBudget.amount.toLocaleString()} — {t('forecasting.projectedRoas')} {result.optimalBudget.projectedRoas.toFixed(2)}x<p className="text-xs text-fg-muted mt-1">{result.optimalBudget.reasoning}</p></div>
            </div>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('forecasting.insights')}</h3>
              <div className="space-y-2">
                {result.insights.map((ins, i) => (
                  <div key={i} className="text-sm border-l-2 border-brand-accent pl-3">
                    <div className="flex items-center gap-2"><span className="text-xs uppercase font-medium text-brand-accent">{ins.type.replace(/_/g, ' ')}</span><span className={`text-xs ${ins.confidence === 'very_high' ? 'text-success' : ins.confidence === 'high' ? 'text-success' : ins.confidence === 'medium' ? 'text-warning' : 'text-danger'}`}>{ins.confidence}</span></div>
                    <p className="font-medium">{ins.title}</p>
                    <p className="text-xs text-fg-muted">{ins.description}</p>
                    <p className="text-xs text-success">{ins.actionableRecommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('forecasting.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3"><span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span><div className="flex-1"><p className="text-sm">{r.recommendation}</p><p className="text-xs text-success">{r.expectedImpact}</p><p className="text-xs text-fg-muted">{r.timeframe}</p></div></div>
                ))}
              </div>
            </div>
          )}

          {/* Model Accuracy */}
          <div className="text-xs text-fg-muted text-center">{t('forecasting.modelAccuracy')}: {result.modelAccuracy}%</div>
        </div>
      )}
    </div>
  );
}
