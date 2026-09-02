'use client';

import { useState, useCallback } from 'react';
import { Workflow, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { CampaignOrchestrationResult, CampaignState } from '@/lib/creative/campaign-orchestrator';

export function CampaignOrchestrator() {
  const { t } = useI18n();
  const [campaignName, setCampaignName] = useState('');
  const [goal, setGoal] = useState('sales_boost');
  const [productDescription, setProductDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [budget, setBudget] = useState(5000);
  const [autonomyLevel, setAutonomyLevel] = useState('semi_autonomous');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CampaignOrchestrationResult | null>(null);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);

  const startCampaign = useCallback(async () => {
    if (!campaignName.trim()) { setError(t('campaignOrchestrator.nameRequired')); return; }
    if (!productDescription.trim()) { setError(t('campaignOrchestrator.productRequired')); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/creative/campaign-orchestrator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName, goal, productDescription, targetMarket, budget, autonomyLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
      setCampaignState(data.result.campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaignName, goal, productDescription, targetMarket, budget, autonomyLevel, t]);

  const advancePhase = useCallback(async () => {
    if (!campaignState) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/campaign-orchestrator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName, goal, productDescription, existingState: campaignState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
      setCampaignState(data.result.campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaignState, campaignName, goal, productDescription]);

  const phaseColor = (phase: string) => {
    if (phase === 'completed') return 'text-success';
    if (phase === 'paused') return 'text-warning';
    return 'text-brand-accent';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Workflow className="w-5 h-5" /> {t('campaignOrchestrator.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('campaignOrchestrator.subtitle')}</p>
      </div>

      {!campaignState && (
        <div className="space-y-3">
          <div>
            <label htmlFor="co-name" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.campaignName')}</label>
            <input id="co-name" type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('campaignOrchestrator.campaignName')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-goal" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.goal')}</label>
              <select id="co-goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('campaignOrchestrator.goal')}>
                <option value="brand_awareness">Brand Awareness</option>
                <option value="product_launch">Product Launch</option>
                <option value="sales_boost">Sales Boost</option>
                <option value="retargeting">Retargeting</option>
                <option value="market_expansion">Market Expansion</option>
                <option value="customer_acquisition">Customer Acquisition</option>
                <option value="engagement">Engagement</option>
                <option value="seasonal_promotion">Seasonal Promotion</option>
              </select>
            </div>
            <div>
              <label htmlFor="co-autonomy" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.autonomy')}</label>
              <select id="co-autonomy" value={autonomyLevel} onChange={(e) => setAutonomyLevel(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('campaignOrchestrator.autonomy')}>
                <option value="manual">Manual</option>
                <option value="semi_autonomous">Semi-autonomous</option>
                <option value="fully_autonomous">Fully autonomous</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="co-product" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.productDescription')}</label>
            <textarea id="co-product" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('campaignOrchestrator.productDescription')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-market" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.targetMarket')}</label>
              <input id="co-market" type="text" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('campaignOrchestrator.targetMarket')} />
            </div>
            <div>
              <label htmlFor="co-budget" className="block text-sm font-medium mb-1">{t('campaignOrchestrator.budget')}</label>
              <input id="co-budget" type="number" min={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('campaignOrchestrator.budget')} />
            </div>
          </div>
        </div>
      )}

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {!campaignState && (
        <button onClick={startCampaign} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('campaignOrchestrator.start')}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Workflow className="w-4 h-4" />}
          {loading ? t('campaignOrchestrator.starting') : t('campaignOrchestrator.start')} <span className="text-xs opacity-75">({t('campaignOrchestrator.credits')}: 10)</span>
        </button>
      )}

      {campaignState && (
        <div className="space-y-4" role="status">
          {/* Phase Tracker */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold">{t('campaignOrchestrator.currentPhase')}</span>
              <span className={`text-sm font-bold capitalize ${phaseColor(campaignState.currentPhase)}`}>{campaignState.currentPhase.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {campaignState.phaseHistory.map((ph, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="rounded bg-bg-primary px-2 py-0.5 capitalize">{ph.phase.replace(/_/g, ' ')}</span>
                  {i < campaignState.phaseHistory.length - 1 && <ChevronRight className="w-3 h-3 text-fg-muted" />}
                </span>
              ))}
            </div>
          </div>

          {/* Goal & KPIs */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('campaignOrchestrator.goalKpis')}</h3>
            <p className="text-xs text-fg-muted mb-1">{t('campaignOrchestrator.primaryKpi')}: <span className="font-medium text-fg-primary">{campaignState.goal.primaryKpi}</span></p>
            <div className="flex flex-wrap gap-2 text-xs">
              {campaignState.goal.targetMetrics.map((m, i) => (
                <span key={i} className="rounded bg-bg-primary px-2 py-0.5">{m.metric}: {m.target}</span>
              ))}
            </div>
          </div>

          {/* Concepts */}
          {campaignState.concepts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('campaignOrchestrator.concepts')} ({campaignState.concepts.length})</h3>
              {campaignState.concepts.map((concept, i) => (
                <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">{concept.name}</span>
                    <span className="text-xs rounded bg-bg-primary px-2 py-0.5 capitalize">{concept.approvalStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{concept.angle}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                    <span>{t('perf.ctrLabel')} {concept.estimatedCtr}%</span>
                    <span>CVR: {concept.estimatedCvr}%</span>
                    <span>{t('campaignOrchestrator.cost')} ${concept.estimatedCost}</span>
                    <span>{t('campaignOrchestrator.reach')} {concept.estimatedReach.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-fg-muted">{t('campaignOrchestrator.platforms')}: {concept.platforms.join(', ')}</p>
                </div>
              ))}
            </div>
          )}

          {/* Budget */}
          {campaignState.budget && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('campaignOrchestrator.budgetAllocation')}</h3>
              <p className="text-xs text-fg-muted mb-2">{t('campaignOrchestrator.totalBudget')}: ${campaignState.budget.totalBudget} | {t('campaignOrchestrator.dailyPacing')}: ${campaignState.budget.dailyPacing}/day</p>
              {campaignState.budget.allocation.map((a, i) => (
                <div key={i} className="text-xs flex items-center justify-between mb-1">
                  <span className="capitalize">{a.platform}: ${a.amount} ({a.percentage}%)</span>
                  <span className="text-fg-muted">{a.rationale}</span>
                </div>
              ))}
            </div>
          )}

          {/* Next Actions */}
          {campaignState.nextActions.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('campaignOrchestrator.nextActions')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{campaignState.nextActions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </div>
          )}

          {/* Advance Button */}
          {campaignState.currentPhase !== 'completed' && (
            <button onClick={advancePhase} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('campaignOrchestrator.advance')}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {loading ? t('campaignOrchestrator.advancing') : t('campaignOrchestrator.advance')} <span className="text-xs opacity-75">({t('campaignOrchestrator.credits')}: 10)</span>
            </button>
          )}

          {result?.phaseTransition && (
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-xs text-fg-muted">
              {t('campaignOrchestrator.transitionedFrom')} <span className="capitalize">{result.phaseTransition.from.replace(/_/g, ' ')}</span> {t('campaignOrchestrator.to')} <span className="capitalize">{result.phaseTransition.to.replace(/_/g, ' ')}</span>
            </div>
          )}

          {result?.insights && result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2">{t('campaignOrchestrator.insights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.insights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
