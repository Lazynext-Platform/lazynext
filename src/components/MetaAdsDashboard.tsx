'use client';

import { useState, useCallback, useEffect } from 'react';
import { BarChart3, Loader2, AlertCircle, DollarSign, TrendingUp, Users, Eye } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

interface CampaignReport {
  campaignId: string;
  platform: string;
  summary: CampaignMetrics;
  demographics: Array<{ age: string; gender: string; impressions: number; clicks: number; conversions: number }>;
  placements: Array<{ placement: string; impressions: number; clicks: number; spend: number }>;
  creativeBreakdown: Array<{ creativeId: string; impressions: number; clicks: number; ctr: number; conversions: number }>;
  timeSeries: Array<{ date: string; impressions: number; clicks: number; spend: number; conversions: number }>;
  recommendations: string[];
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budgetDaily: number;
  currency: string;
}

export function MetaAdsDashboard() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetUpdating, setBudgetUpdating] = useState(false);
  const [budgetMsg, setBudgetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ads/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCampaigns(data.campaigns || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const loadReport = useCallback(async (id: string) => {
    if (!id) return;
    setReportLoading(true);
    setReportError('');
    setReport(null);
    try {
      const res = await fetch(`/api/ads/report?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReport(data.report);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  }, []);

  const updateBudget = useCallback(async () => {
    if (!selectedId || !budgetInput) return;
    const budget = parseFloat(budgetInput);
    if (isNaN(budget) || budget <= 0) return;
    setBudgetUpdating(true);
    setBudgetMsg(null);
    try {
      const res = await fetch('/api/ads/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, budgetDaily: budget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setBudgetMsg({ type: 'success', text: t('metaAds.budgetUpdated') });
      setCampaigns((prev) => prev.map((c) => c.id === selectedId ? { ...c, budgetDaily: budget } : c));
    } catch (e) {
      setBudgetMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBudgetUpdating(false);
    }
  }, [selectedId, budgetInput, t]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (loading) {
    return <div className="flex items-center gap-2 text-fg-muted"><Loader2 className="w-4 h-4 animate-spin" /> {t('metaAds.loadingReport')}</div>;
  }
  if (error) {
    return <div role="alert" className="text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>;
  }
  if (campaigns.length === 0) {
    return <div className="text-fg-muted text-sm">{t('metaAds.noCampaigns')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {t('metaAds.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('metaAds.description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); setBudgetInput(String(c.budgetDaily)); loadReport(c.id); }}
            className={`rounded-lg border px-3 py-1.5 text-sm ${selectedId === c.id ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-border hover:bg-bg-secondary'}`}
          >
            {c.name} <span className="text-xs opacity-60">({c.platform})</span>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('metaAds.budget')}</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                aria-label={t('metaAds.currentBudget')}
                className="w-32 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                min="0"
                step="0.01"
              />
              <button
                onClick={updateBudget}
                disabled={budgetUpdating}
                className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {budgetUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('metaAds.updateBudget')}
              </button>
            </div>
            {budgetMsg && (
              <div role={budgetMsg.type === 'success' ? 'status' : 'alert'} className={`text-sm ${budgetMsg.type === 'success' ? 'text-success' : 'text-danger'}`}>
                {budgetMsg.text}
              </div>
            )}
          </div>

          {reportLoading && <div className="flex items-center gap-2 text-fg-muted"><Loader2 className="w-4 h-4 animate-spin" /> {t('metaAds.loadingReport')}</div>}
          {reportError && <div role="alert" className="text-danger text-sm">{reportError}</div>}

          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard icon={Eye} label={t('metaAds.impressions')} value={fmt(report.summary.impressions)} />
                <MetricCard icon={TrendingUp} label={t('metaAds.clicks')} value={fmt(report.summary.clicks)} />
                <MetricCard icon={DollarSign} label={t('metaAds.spend')} value={fmt(report.summary.spend)} />
                <MetricCard icon={BarChart3} label={t('metaAds.roas')} value={fmt(report.summary.roas)} />
              </div>

              {report.demographics.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> {t('metaAds.demographics')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr><th className="text-left py-1">{t('metaAds.age')}</th><th className="text-left py-1">{t('metaAds.gender')}</th><th className="text-right py-1">{t('metaAds.impressions')}</th><th className="text-right py-1">{t('metaAds.clicks')}</th></tr></thead>
                      <tbody>
                        {report.demographics.map((d, i) => (
                          <tr key={i} className="border-t border-border"><td className="py-1">{d.age}</td><td>{d.gender}</td><td className="text-right">{fmt(d.impressions)}</td><td className="text-right">{fmt(d.clicks)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {report.placements.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2">{t('metaAds.placements')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr><th className="text-left py-1">{t('metaAds.placement')}</th><th className="text-right py-1">{t('metaAds.impressions')}</th><th className="text-right py-1">{t('metaAds.spend')}</th></tr></thead>
                      <tbody>
                        {report.placements.map((p, i) => (
                          <tr key={i} className="border-t border-border"><td className="py-1">{p.placement}</td><td className="text-right">{fmt(p.impressions)}</td><td className="text-right">{fmt(p.spend)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {report.recommendations.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2">{t('metaAds.recommendations')}</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-fg-muted"><Icon className="w-3 h-3" /> {label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
