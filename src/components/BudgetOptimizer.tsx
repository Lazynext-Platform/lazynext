'use client';

import { useState, useCallback } from 'react';
import { Wallet, Loader2, AlertCircle, Plus, X, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { OptimizationResult, PlatformPerformance, Platform, OptimizationGoal, PacingStrategy } from '@/lib/creative/budget-optimizer';

const PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'youtube', 'instagram', 'facebook'];
const GOALS: OptimizationGoal[] = ['maximize_roas', 'maximize_reach', 'maximize_conversions', 'minimize_cpa', 'balance_spend'];
const PACING: PacingStrategy[] = ['even', 'front_loaded', 'back_loaded', 'accelerated', 'conservative'];

const GOAL_LABELS: Record<OptimizationGoal, string> = {
  maximize_roas: 'Maximize ROAS', maximize_reach: 'Maximize Reach', maximize_conversions: 'Maximize Conversions', minimize_cpa: 'Minimize CPA', balance_spend: 'Balance Spend',
};
const PACING_LABELS: Record<PacingStrategy, string> = {
  even: 'Even', front_loaded: 'Front-Loaded', back_loaded: 'Back-Loaded', accelerated: 'Accelerated', conservative: 'Conservative',
};

interface PlatformRow {
  platform: Platform;
  spend: string; impressions: string; clicks: string; conversions: string; revenue: string;
  trend: 'improving' | 'stable' | 'declining';
}

export function BudgetOptimizer() {
  const { t } = useI18n();
  const [totalBudget, setTotalBudget] = useState('');
  const [goal, setGoal] = useState<OptimizationGoal>('maximize_roas');
  const [pacing, setPacing] = useState<PacingStrategy>('even');
  const [frequency, setFrequency] = useState('weekly');
  const [rows, setRows] = useState<PlatformRow[]>([{ platform: 'meta', spend: '', impressions: '', clicks: '', conversions: '', revenue: '', trend: 'stable' }]);
  const [minSpend, setMinSpend] = useState('');
  const [maxSpend, setMaxSpend] = useState('');
  const [locks, setLocks] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const addRow = () => setRows((prev) => [...prev, { platform: 'google', spend: '', impressions: '', clicks: '', conversions: '', revenue: '', trend: 'stable' }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PlatformRow, val: string) => setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const toggleLock = (p: Platform) => setLocks((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const optimize = useCallback(async () => {
    if (!totalBudget || rows.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const platformPerformance: PlatformPerformance[] = rows.map((r) => {
        const spend = Number(r.spend) || 0;
        const impressions = Number(r.impressions) || 0;
        const clicks = Number(r.clicks) || 0;
        const conversions = Number(r.conversions) || 0;
        const revenue = Number(r.revenue) || 0;
        return {
          platform: r.platform, spend, impressions, clicks, conversions, revenue,
          roas: spend > 0 ? revenue / spend : 0,
          cpa: conversions > 0 ? spend / conversions : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
          frequency: 1,
          trend: r.trend,
        };
      });
      const res = await fetch('/api/creative/budget-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalBudget: Number(totalBudget), goal, platformPerformance, pacingStrategy: pacing,
          reallocationFrequency: frequency,
          constraints: {
            minSpendPerPlatform: minSpend ? Number(minSpend) : undefined,
            maxSpendPerPlatform: maxSpend ? Number(maxSpend) : undefined,
            platformLocks: locks.length > 0 ? locks : undefined,
          },
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
  }, [totalBudget, goal, pacing, frequency, rows, minSpend, maxSpend, locks]);

  const trendIcon = (trend: string) => trend === 'improving' ? <TrendingUp className="w-3 h-3 text-success" /> : trend === 'declining' ? <TrendingDown className="w-3 h-3 text-danger" /> : <Minus className="w-3 h-3 text-fg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="w-5 h-5" /> {t('budgetOptimizer.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('budgetOptimizer.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium mb-1">{t('budgetOptimizer.totalBudget')}</label>
            <input id="budget" type="number" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="goal" className="block text-sm font-medium mb-1">{t('budgetOptimizer.goal')}</label>
            <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value as OptimizationGoal)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              {GOALS.map((g) => <option key={g} value={g}>{GOAL_LABELS[g]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pacing" className="block text-sm font-medium mb-1">{t('budgetOptimizer.pacing')}</label>
            <select id="pacing" value={pacing} onChange={(e) => setPacing(e.target.value as PacingStrategy)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              {PACING.map((p) => <option key={p} value={p}>{PACING_LABELS[p]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('budgetOptimizer.platformPerformance')}</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end">
                <select value={r.platform} onChange={(e) => updateRow(i, 'platform', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" placeholder={t('budgetOptimizer.phSpend')} value={r.spend} onChange={(e) => updateRow(i, 'spend', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                <input type="number" placeholder={t('budgetOptimizer.phImpr')} value={r.impressions} onChange={(e) => updateRow(i, 'impressions', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                <input type="number" placeholder={t('budgetOptimizer.phClicks')} value={r.clicks} onChange={(e) => updateRow(i, 'clicks', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                <input type="number" placeholder={t('budgetOptimizer.phConv')} value={r.conversions} onChange={(e) => updateRow(i, 'conversions', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                <input type="number" placeholder={t('budgetOptimizer.phRev')} value={r.revenue} onChange={(e) => updateRow(i, 'revenue', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                <div className="flex gap-1">
                  <select value={r.trend} onChange={(e) => updateRow(i, 'trend', e.target.value)} className="rounded-lg border border-border bg-bg-card px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                    <option value="improving">↑</option><option value="stable">→</option><option value="declining">↓</option>
                  </select>
                  {rows.length > 1 && <button onClick={() => removeRow(i)} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <button onClick={addRow} className="text-sm text-brand-accent hover:opacity-80 flex items-center gap-1"><Plus className="w-4 h-4" /> {t('budgetOptimizer.addPlatform')}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="minSpend" className="block text-sm font-medium mb-1">{t('budgetOptimizer.minSpend')}</label>
            <input id="minSpend" type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
          <div>
            <label htmlFor="maxSpend" className="block text-sm font-medium mb-1">{t('budgetOptimizer.maxSpend')}</label>
            <input id="maxSpend" type="number" value={maxSpend} onChange={(e) => setMaxSpend(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('budgetOptimizer.locks')}</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={locks.includes(p)} onChange={() => toggleLock(p)} disabled={loading} /> {p}
              </label>
            ))}
          </div>
        </div>

        <button onClick={optimize} disabled={loading || !totalBudget} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          {loading ? t('budgetOptimizer.optimizing') : `${t('budgetOptimizer.optimize')} (6 ${t('budgetOptimizer.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('budgetOptimizer.projectedRoas')}</div>
              <div className="text-lg font-bold text-success">{result.projectedMetrics.totalRoas}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('budgetOptimizer.projectedConv')}</div>
              <div className="text-lg font-bold">{result.projectedMetrics.totalConversions}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('budgetOptimizer.projectedRev')}</div>
              <div className="text-lg font-bold">${result.projectedMetrics.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('budgetOptimizer.improvement')}</div>
              <div className={`text-lg font-bold ${result.projectedMetrics.improvementPercent >= 0 ? 'text-success' : 'text-danger'}`}>{result.projectedMetrics.improvementPercent >= 0 ? '+' : ''}{result.projectedMetrics.improvementPercent}%</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center">
              <div className="text-xs text-fg-muted">{t('budgetOptimizer.projectedCpa')}</div>
              <div className="text-lg font-bold">${result.projectedMetrics.totalCpa}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('budgetOptimizer.allocations')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="text-left py-1">Platform</th><th className="text-right py-1">Current</th><th className="text-right py-1">Recommended</th><th className="text-right py-1">Change</th><th className="text-right py-1">Proj. ROAS</th><th className="text-right py-1">Proj. Conv.</th><th className="text-right py-1">Confidence</th>
                </tr></thead>
                <tbody>
                  {result.allocations.map((a, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1 font-medium">{a.platform}</td>
                      <td className="text-right py-1">${a.currentSpend.toLocaleString()}</td>
                      <td className="text-right py-1 font-medium">${a.recommendedSpend.toLocaleString()}</td>
                      <td className={`text-right py-1 ${a.change >= 0 ? 'text-success' : 'text-danger'}`}>{a.change >= 0 ? '+' : ''}${a.change.toLocaleString()} ({a.changePercent >= 0 ? '+' : ''}{a.changePercent}%)</td>
                      <td className="text-right py-1">{a.projectedRoas}</td>
                      <td className="text-right py-1">{a.projectedConversions}</td>
                      <td className="text-right py-1 text-fg-muted">{a.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 space-y-1">
              {result.allocations.map((a, i) => <p key={i} className="text-xs text-fg-muted"><span className="font-medium">{a.platform}:</span> {a.reasoning}</p>)}
            </div>
          </div>

          {result.pacingSchedule.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('budgetOptimizer.pacingSchedule')}</h3>
              <div className="space-y-1">
                {result.pacingSchedule.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-20">{p.period}</span>
                    <div className="flex-1 bg-bg-secondary rounded-full h-2"><div className="bg-brand-accent rounded-full h-2" style={{ width: `${p.percentOfBudget}%` }} /></div>
                    <span className="text-xs text-fg-muted w-24 text-right">${p.spend.toLocaleString()} ({p.percentOfBudget}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.reallocationPlan.triggers.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('budgetOptimizer.reallocation')}</h3>
              <p className="text-xs text-fg-muted mb-2">{t('budgetOptimizer.frequency')}: {result.reallocationPlan.frequency} | {t('budgetOptimizer.nextReview')}: {new Date(result.reallocationPlan.nextReviewDate).toLocaleDateString()}</p>
              <div className="space-y-1">
                {result.reallocationPlan.triggers.map((tr, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium">{tr.condition}</span> → <span className="text-fg-muted">{tr.action}</span> <span className="text-fg-muted">(threshold: {tr.threshold})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.insights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('budgetOptimizer.insights')}</h3>
              <div className="space-y-2">
                {result.insights.map((ins, i) => (
                  <div key={i} className="border-l-2 pl-3" style={{ borderColor: 'var(--brand-accent)' }}>
                    <span className={`text-xs uppercase font-medium ${ins.type === 'overperforming' || ins.type === 'opportunity' ? 'text-success' : ins.type === 'underperforming' || ins.type === 'risk' ? 'text-danger' : 'text-warning'}`}>{ins.type}</span>
                    <span className="text-xs text-fg-muted"> ({ins.platform})</span>
                    <p className="text-sm">{ins.description}</p>
                    <p className="text-xs text-fg-muted">{ins.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('budgetOptimizer.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span>
                    <div className="flex-1">
                      <p className="text-sm">{r.recommendation}</p>
                      <p className="text-xs text-success">{r.expectedImpact}</p>
                      <p className="text-xs text-fg-muted">{r.timeframe}</p>
                    </div>
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
