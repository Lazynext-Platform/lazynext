'use client';

import { useState, useCallback } from 'react';
import { Activity, Loader2, AlertCircle, Plus, X, BatteryLow, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { FatigueReport, FatigueAnalysis, FatigueLevel } from '@/lib/creative/fatigue-detector';

const LEVEL_COLORS: Record<FatigueLevel, string> = {
  healthy: 'text-success', early_warning: 'text-warning', fatigued: 'text-warning', critical: 'text-danger', unknown: 'text-fg-muted',
};
const LEVEL_BG: Record<FatigueLevel, string> = {
  healthy: 'bg-success/10 border-success/30', early_warning: 'bg-warning/10 border-warning/30', fatigued: 'bg-warning/10 border-warning/30', critical: 'bg-danger/10 border-danger/30', unknown: 'bg-bg-secondary border-border',
};

interface CreativeInput {
  creativeId: string;
  creativeName: string;
  platform: string;
  currentFrequency: string;
  currentCtr: string;
  currentCvr: string;
  currentEngagementRate: string;
  currentRoas: string;
  currentCpm: string;
  daysRunning: string;
  totalImpressions: string;
  totalSpend: string;
}

export function FatigueDetector() {
  const { t } = useI18n();
  const [creatives, setCreatives] = useState<CreativeInput[]>([{ creativeId: 'c1', creativeName: '', platform: 'meta', currentFrequency: '', currentCtr: '', currentCvr: '', currentEngagementRate: '', currentRoas: '', currentCpm: '', daysRunning: '', totalImpressions: '', totalSpend: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FatigueReport | null>(null);

  const addCreative = () => setCreatives((prev) => [...prev, { creativeId: `c${prev.length + 1}`, creativeName: '', platform: 'meta', currentFrequency: '', currentCtr: '', currentCvr: '', currentEngagementRate: '', currentRoas: '', currentCpm: '', daysRunning: '', totalImpressions: '', totalSpend: '' }]);
  const removeCreative = (i: number) => setCreatives((prev) => prev.filter((_, idx) => idx !== i));
  const updateCreative = (i: number, field: keyof CreativeInput, val: string) => setCreatives((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const analyze = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const metrics = creatives.map((c) => ({
        creativeId: c.creativeId,
        creativeName: c.creativeName || `Creative ${c.creativeId}`,
        platform: c.platform,
        currentFrequency: Number(c.currentFrequency) || 0,
        currentCtr: Number(c.currentCtr) || 0,
        currentCvr: Number(c.currentCvr) || 0,
        currentEngagementRate: Number(c.currentEngagementRate) || 0,
        currentRoas: Number(c.currentRoas) || 0,
        currentCpm: Number(c.currentCpm) || 0,
        historicalData: [],
        daysRunning: Number(c.daysRunning) || 0,
        totalImpressions: Number(c.totalImpressions) || 0,
        totalSpend: Number(c.totalSpend) || 0,
      }));
      const res = await fetch('/api/creative/fatigue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatives: metrics }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [creatives]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> {t('fatigue.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('fatigue.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t('fatigue.creatives')}</label>
          <div className="space-y-3">
            {creatives.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder={t('fatigue.phCreativeName')} value={c.creativeName} onChange={(e) => updateCreative(i, 'creativeName', e.target.value)} className="flex-1 rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <select value={c.platform} onChange={(e) => updateCreative(i, 'platform', e.target.value)} className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                    <option value="meta">Meta</option><option value="google">Google</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option>
                  </select>
                  {creatives.length > 1 && <button onClick={() => removeCreative(i)} className="text-fg-muted hover:text-danger"><X className="w-4 h-4" /></button>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <input type="number" placeholder={t('fatigue.phFreq')} value={c.currentFrequency} onChange={(e) => updateCreative(i, 'currentFrequency', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phCtr')} value={c.currentCtr} onChange={(e) => updateCreative(i, 'currentCtr', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phCvr')} value={c.currentCvr} onChange={(e) => updateCreative(i, 'currentCvr', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phEng')} value={c.currentEngagementRate} onChange={(e) => updateCreative(i, 'currentEngagementRate', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phRoas')} value={c.currentRoas} onChange={(e) => updateCreative(i, 'currentRoas', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phCpm')} value={c.currentCpm} onChange={(e) => updateCreative(i, 'currentCpm', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder={t('fatigue.phDaysRunning')} value={c.daysRunning} onChange={(e) => updateCreative(i, 'daysRunning', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phTotalImpressions')} value={c.totalImpressions} onChange={(e) => updateCreative(i, 'totalImpressions', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                  <input type="number" placeholder={t('fatigue.phTotalSpend')} value={c.totalSpend} onChange={(e) => updateCreative(i, 'totalSpend', e.target.value)} className="rounded border border-border bg-bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
                </div>
              </div>
            ))}
            <button onClick={addCreative} className="text-sm text-brand-accent hover:opacity-80 flex items-center gap-1"><Plus className="w-4 h-4" /> {t('fatigue.addCreative')}</button>
          </div>
        </div>

        <button onClick={analyze} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          {loading ? t('fatigue.analyzing') : `${t('fatigue.analyze')} (5 ${t('fatigue.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center col-span-2">
              <div className="text-xs text-fg-muted">{t('fatigue.portfolioHealth')}</div>
              <div className={`text-3xl font-bold ${result.portfolioHealthScore >= 70 ? 'text-success' : result.portfolioHealthScore >= 40 ? 'text-warning' : 'text-danger'}`}>{result.portfolioHealthScore}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Healthy</div><div className="text-lg font-bold text-success">{result.healthyCount}</div></div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Warning</div><div className="text-lg font-bold text-warning">{result.warningCount}</div></div>
            <div className="rounded-lg border border-border bg-bg-card p-3 text-center"><div className="text-xs text-fg-muted">Critical</div><div className="text-lg font-bold text-danger">{result.criticalCount}</div></div>
          </div>

          {result.analyses.map((a, i) => (
            <div key={i} className={`rounded-lg border p-4 ${LEVEL_BG[a.fatigueLevel]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{a.creativeName} <span className="text-xs text-fg-muted">({a.platform})</span></span>
                <span className={`text-xs uppercase font-medium ${LEVEL_COLORS[a.fatigueLevel]}`}>{a.fatigueLevel.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-bg-secondary rounded-full h-2"><div className={`rounded-full h-2 ${a.fatigueLevel === 'critical' ? 'bg-danger' : a.fatigueLevel === 'fatigued' ? 'bg-warning' : a.fatigueLevel === 'early_warning' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${a.fatigueScore}%` }} /></div>
                <span className="text-xs text-fg-muted w-8 text-right">{a.fatigueScore}</span>
              </div>
              <p className="text-xs text-fg-muted mb-2">{a.recommendation}</p>
              {a.activeSignals.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs font-medium">{t('fatigue.activeSignals')}:</p>
                  {a.activeSignals.map((s, j) => (
                    <div key={j} className="text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-warning" />
                      <span>{s.signal.replace(/_/g, ' ')}: {s.description}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div><span className="text-fg-muted">{t('fatigue.refreshUrgency')}:</span> {a.refreshUrgency.replace(/_/g, ' ')}</div>
                <div><span className="text-fg-muted">{t('fatigue.daysUntilRefresh')}:</span> {a.daysUntilRefresh}</div>
                <div><span className="text-fg-muted">{t('fatigue.perfLoss')}:</span> {a.estimatedPerformanceLoss}%</div>
              </div>
              {a.refreshSuggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">{t('fatigue.suggestions')}:</p>
                  {a.refreshSuggestions.map((s, j) => (
                    <div key={j} className="text-xs flex gap-2">
                      <span className={`font-medium ${s.priority === 'high' ? 'text-danger' : s.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{s.type.replace(/_/g, ' ')}</span>
                      <span className="flex-1">{s.description}</span>
                      <span className="text-success">{s.expectedImpact}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {result.rotationSchedule.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Clock className="w-4 h-4" /> {t('fatigue.rotationSchedule')}</h3>
              <div className="space-y-1">
                {result.rotationSchedule.map((r, i) => (
                  <div key={i} className="text-xs flex items-center gap-3">
                    <span className={`font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.action}</span>
                    <span className="flex-1">{r.creativeName}</span>
                    <span className="text-fg-muted">{new Date(r.scheduledDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('fatigue.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span>
                    <div className="flex-1"><p className="text-sm">{r.recommendation}</p><p className="text-xs text-success">{r.expectedImpact}</p><p className="text-xs text-fg-muted">{r.timeframe}</p></div>
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
