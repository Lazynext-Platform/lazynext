'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search, Loader2, AlertCircle, DollarSign, TrendingUp,
  Eye, Smartphone, Monitor, Tablet, KeyRound, ShieldCheck,
} from 'lucide-react';
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

interface SearchTermBreakdown {
  searchTerm: string;
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

interface KeywordBreakdown {
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  avgCpc: number;
}

interface AdGroupBreakdown {
  adGroupId: string;
  adGroupName: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

interface DeviceBreakdown {
  device: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
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
  searchTerms?: SearchTermBreakdown[];
  keywords?: KeywordBreakdown[];
  adGroups?: AdGroupBreakdown[];
  deviceBreakdown?: DeviceBreakdown[];
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budgetDaily: number;
  currency: string;
}

const deviceIcon = (device: string) => {
  switch (device) {
    case 'mobile': return Smartphone;
    case 'desktop': return Monitor;
    case 'tablet': return Tablet;
    default: return Monitor;
  }
};

export function GoogleAdsDashboard() {
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
  const [dryRun, setDryRun] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ads/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Filter to Google campaigns only.
      const google = (data.campaigns || []).filter((c: Campaign) => c.platform === 'google');
      setCampaigns(google);
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
      const res = await fetch(`/api/ads/google-report?campaignId=${encodeURIComponent(id)}&dryRun=${dryRun ? 'true' : 'false'}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReport(data.report);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  }, [dryRun]);

  const updateBudget = useCallback(async () => {
    if (!selectedId || !budgetInput) return;
    const budget = parseFloat(budgetInput);
    if (isNaN(budget) || budget <= 0) return;
    setBudgetUpdating(true);
    setBudgetMsg(null);
    try {
      const res = await fetch('/api/ads/google-budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedId, budgetDaily: budget, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setBudgetMsg({ type: 'success', text: t('googleAds.budgetUpdated') });
      setCampaigns((prev) => prev.map((c) => c.id === selectedId ? { ...c, budgetDaily: budget } : c));
    } catch (e) {
      setBudgetMsg({ type: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBudgetUpdating(false);
    }
  }, [selectedId, budgetInput, dryRun, t]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-fg-muted" role="status" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {t('googleAds.loadingReport')}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="text-danger flex items-center gap-2">
        <AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}
      </div>
    );
  }
  if (campaigns.length === 0) {
    return <div className="text-fg-muted text-sm">{t('googleAds.noCampaigns')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" aria-hidden="true" />
          {t('googleAds.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('googleAds.description')}</p>
      </div>

      {/* Dry-run safety indicator */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-fg">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            aria-label={t('googleAds.dryRunToggle')}
          />
          {t('googleAds.dryRun')}
        </label>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${dryRun ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}
          role="status"
        >
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          {dryRun ? t('googleAds.dryRunBadge') : t('googleAds.liveBadge')}
        </span>
      </div>

      {/* Campaign list with status badges */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('googleAds.campaignListLabel')}>
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelectedId(c.id); setBudgetInput(String(c.budgetDaily)); loadReport(c.id); }}
            aria-pressed={selectedId === c.id}
            className={`rounded-lg border px-3 py-1.5 text-sm ${selectedId === c.id ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-border hover:bg-bg-secondary'}`}
          >
            {c.name}
            <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${statusBadge(c.status)}`}>
              {c.status}
            </span>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="space-y-4">
          {/* Budget control */}
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" aria-hidden="true" /> {t('googleAds.budget')}
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                aria-label={t('googleAds.currentBudget')}
                className="w-32 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                min="0"
                step="0.01"
              />
              <button
                onClick={updateBudget}
                disabled={budgetUpdating}
                className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                aria-label={t('googleAds.updateBudget')}
              >
                {budgetUpdating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : t('googleAds.updateBudget')}
              </button>
            </div>
            {budgetMsg && (
              <div
                role={budgetMsg.type === 'success' ? 'status' : 'alert'}
                aria-live="polite"
                className={`text-sm ${budgetMsg.type === 'success' ? 'text-success' : 'text-danger'}`}
              >
                {budgetMsg.text}
              </div>
            )}
          </div>

          {reportLoading && (
            <div className="flex items-center gap-2 text-fg-muted" role="status" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {t('googleAds.loadingReport')}
            </div>
          )}
          {reportError && <div role="alert" className="text-danger text-sm">{reportError}</div>}

          {report && (
            <div className="space-y-4">
              {/* Summary metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard icon={Eye} label={t('googleAds.impressions')} value={fmt(report.summary.impressions)} />
                <MetricCard icon={TrendingUp} label={t('googleAds.clicks')} value={fmt(report.summary.clicks)} />
                <MetricCard icon={DollarSign} label={t('googleAds.spend')} value={fmtMoney(report.summary.spend)} />
                <MetricCard icon={Search} label={t('googleAds.roas')} value={fmt(report.summary.roas)} />
              </div>

              {/* Search terms */}
              {report.searchTerms && report.searchTerms.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" aria-hidden="true" /> {t('googleAds.searchTerms')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('googleAds.searchTerms')}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="text-left py-1">{t('googleAds.searchTerm')}</th>
                          <th scope="col" className="text-left py-1">{t('googleAds.keyword')}</th>
                          <th scope="col" className="text-left py-1">{t('googleAds.matchType')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.impressions')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.clicks')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.conversions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.searchTerms.map((s, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="py-1">{s.searchTerm}</td>
                            <td>{s.keyword}</td>
                            <td>{s.matchType}</td>
                            <td className="text-right">{fmt(s.impressions)}</td>
                            <td className="text-right">{fmt(s.clicks)}</td>
                            <td className="text-right">{fmt(s.conversions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {report.keywords && report.keywords.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" aria-hidden="true" /> {t('googleAds.keywords')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('googleAds.keywords')}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="text-left py-1">{t('googleAds.keyword')}</th>
                          <th scope="col" className="text-left py-1">{t('googleAds.matchType')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.impressions')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.clicks')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.ctr')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.conversions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.keywords.map((k, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="py-1">{k.keyword}</td>
                            <td>{k.matchType}</td>
                            <td className="text-right">{fmt(k.impressions)}</td>
                            <td className="text-right">{fmt(k.clicks)}</td>
                            <td className="text-right">{fmt(k.ctr)}%</td>
                            <td className="text-right">{fmt(k.conversions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ad groups */}
              {report.adGroups && report.adGroups.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2">{t('googleAds.adGroups')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('googleAds.adGroups')}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="text-left py-1">{t('googleAds.adGroupName')}</th>
                          <th scope="col" className="text-left py-1">{t('googleAds.status')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.impressions')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.clicks')}</th>
                          <th scope="col" className="text-right py-1">{t('googleAds.conversions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.adGroups.map((g) => (
                          <tr key={g.adGroupId} className="border-t border-border">
                            <td className="py-1">{g.adGroupName}</td>
                            <td><span className={`text-xs ${statusBadge(g.status)}`}>{g.status}</span></td>
                            <td className="text-right">{fmt(g.impressions)}</td>
                            <td className="text-right">{fmt(g.clicks)}</td>
                            <td className="text-right">{fmt(g.conversions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Device breakdown */}
              {report.deviceBreakdown && report.deviceBreakdown.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2">{t('googleAds.deviceBreakdown')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {report.deviceBreakdown.map((d) => {
                      const Icon = deviceIcon(d.device);
                      return (
                        <div key={d.device} className="rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="w-4 h-4" aria-hidden="true" /> {d.device}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-fg-muted">
                            <span>{t('googleAds.impressions')}</span><span className="text-right text-fg">{fmt(d.impressions)}</span>
                            <span>{t('googleAds.clicks')}</span><span className="text-right text-fg">{fmt(d.clicks)}</span>
                            <span>{t('googleAds.ctr')}</span><span className="text-right text-fg">{fmt(d.ctr)}%</span>
                            <span>{t('googleAds.conversions')}</span><span className="text-right text-fg">{fmt(d.conversions)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div className="rounded-lg border border-border bg-bg-card p-4">
                  <h3 className="font-medium mb-2">{t('googleAds.recommendations')}</h3>
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

function statusBadge(status: string): string {
  switch (status) {
    case 'active': return 'bg-success/10 text-success';
    case 'paused': return 'bg-warning/10 text-warning';
    case 'draft': return 'bg-fg-faint/10 text-fg-faint';
    case 'pending_approval': return 'bg-warning/10 text-warning';
    default: return 'bg-fg/10 text-fg';
  }
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-fg-muted">
        <Icon className="w-3 h-3" aria-hidden="true" /> {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
