'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, MousePointerClick,
  Eye, Target, Coins, Zap, AlertCircle, Loader2, Film, Megaphone,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackWidget } from '@/components/FeedbackWidget';

interface HubData {
  overview: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    totalRevenue: number;
    avgCtr: number;
    avgCvr: number;
    avgRoas: number;
    totalCreations: number;
    completedCreations: number;
    failedCreations: number;
    processingCreations: number;
    totalCreditsUsed: number;
    currentBalance: number;
    totalCampaigns: number;
    activeCampaigns: number;
  };
  perfByDay: Array<{ date: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number }>;
  creationsByDay: Array<{ date: string; count: number }>;
  byPlatform: Array<{ platform: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; roas: number }>;
  byTemplate: Array<{ template: string; count: number; credits: number }>;
  campaignsByPlatform: Record<string, number>;
  creditByReason: Array<{ reason: string; count: number; totalDelta: number }>;
  topCreatives: Array<{ creationId: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number; roas: number }>;
  creditUsage: { spent30d: number; granted30d: number; dailyAvgSpend: number; projectionDays: number | null };
  workflows: {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    runningRuns: number;
    byType: Array<{ type: string; count: number }>;
    avgDurationSec: number;
    perStage: Array<{ stage: string; total: number; completed: number; failed: number; successRate: number; totalCredits: number; avgDurationSec: number }>;
  };
}

function StatCard({ icon: Icon, label, value, sublabel, trend }: {
  icon: typeof Eye; label: string; value: string; sublabel?: string; trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-fg-muted">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-success ml-auto" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-danger ml-auto" />}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sublabel && <p className="text-xs text-fg-muted mt-1">{sublabel}</p>}
    </div>
  );
}

function MiniBarChart({ data, max, color }: { data: Array<{ label: string; value: number }>; max: number; color: string }) {
  const { t } = useI18n();
  if (data.length === 0) return <p className="text-sm text-fg-muted py-4">{t('analyticsHub.noData')}</p>;
  return (
    <div className="space-y-1.5">
      {data.slice(0, 10).map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-fg-muted w-24 truncate">{d.label}</span>
          <div className="flex-1 h-5 bg-hover rounded relative overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, background: color }}
            />
          </div>
          <span className="text-xs font-medium w-16 text-right">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-12 flex items-center text-xs text-fg-muted">Not enough data</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AnalyticsHubPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/hub');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError(t('analyticsHub.error'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (session?.user) loadData();
    else setLoading(false);
  }, [session, loadData]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" aria-hidden="true" /> {t('analyticsHub.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('analyticsHub.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  const hasData = data && (data.overview.totalImpressions > 0 || data.overview.totalCreations > 0 || data.overview.totalCampaigns > 0);

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" aria-hidden="true" /> {t('analyticsHub.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('analyticsHub.subtitle')}</p>
        </header>

        {loading && (
          <div className="grid place-items-center py-20" aria-busy="true" aria-label={t('analyticsHub.loading')}>
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 flex items-center gap-2 text-danger">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
            <button onClick={() => loadData()} className="ml-auto text-xs underline">
              {t('analyticsHub.retry')}
            </button>
          </div>
        )}

        {/* Empty state for new users */}
        {data && !loading && !error && !hasData && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-fg-muted mb-3" aria-hidden="true" />
            <p className="text-sm text-fg-muted">{t('analyticsHub.noDataYet')}</p>
            <p className="text-xs text-fg-muted mt-1">{t('analyticsHub.noDataHint')}</p>
          </div>
        )}

        {data && !loading && !error && hasData && (
          <>
            {/* Overview KPIs */}
            <section>
              <h2 className="text-lg font-bold mb-4">{t('analyticsHub.overview')}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard icon={Eye} label={t('analyticsHub.impressions')} value={(data.overview.totalImpressions || 0).toLocaleString()} />
                <StatCard icon={MousePointerClick} label={t('analyticsHub.clicks')} value={(data.overview.totalClicks || 0).toLocaleString()} sublabel={`CTR ${(data.overview.avgCtr || 0).toFixed(2)}%`} />
                <StatCard icon={Target} label={t('analyticsHub.conversions')} value={(data.overview.totalConversions || 0).toLocaleString()} sublabel={`CVR ${(data.overview.avgCvr || 0).toFixed(2)}%`} />
                <StatCard icon={DollarSign} label={t('analyticsHub.spend')} value={`$${(data.overview.totalSpend || 0).toFixed(2)}`} />
                <StatCard icon={TrendingUp} label={t('analyticsHub.revenue')} value={`$${(data.overview.totalRevenue || 0).toFixed(2)}`} sublabel={`ROAS ${(data.overview.avgRoas || 0).toFixed(2)}x`} trend={(data.overview.avgRoas || 0) >= 1 ? 'up' : 'down'} />
                <StatCard icon={Film} label={t('analyticsHub.creations')} value={(data.overview.totalCreations || 0).toLocaleString()} sublabel={`${data.overview.completedCreations || 0} ${t('analyticsHub.completed')}`} />
                <StatCard icon={Coins} label={t('analyticsHub.creditsBalance')} value={(data.overview.currentBalance || 0).toLocaleString()} sublabel={`${data.overview.totalCreditsUsed || 0} ${t('analyticsHub.used')}`} />
                <StatCard icon={Megaphone} label={t('analyticsHub.campaigns')} value={(data.overview.totalCampaigns || 0).toLocaleString()} sublabel={`${data.overview.activeCampaigns || 0} ${t('analyticsHub.active')}`} />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Performance trend */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.revenueTrend')}</h2>
                <Sparkline data={data.perfByDay.map(d => d.revenue)} color="var(--color-brand-accent)" />
                <div className="flex justify-between text-xs text-fg-muted mt-2">
                  <span>{data.perfByDay[0]?.date || '—'}</span>
                  <span>{data.perfByDay[data.perfByDay.length - 1]?.date || '—'}</span>
                </div>
              </section>

              {/* Creation trend */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.creationTrend')}</h2>
                <Sparkline data={data.creationsByDay.map(d => d.count)} color="var(--color-success)" />
                <div className="flex justify-between text-xs text-fg-muted mt-2">
                  <span>{data.creationsByDay[0]?.date || '—'}</span>
                  <span>{data.creationsByDay[data.creationsByDay.length - 1]?.date || '—'}</span>
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* By platform */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.byPlatform')}</h2>
                <MiniBarChart
                  data={data.byPlatform.map(p => ({ label: p.platform, value: p.impressions }))}
                  max={Math.max(...data.byPlatform.map(p => p.impressions), 1)}
                  color="var(--color-brand-accent)"
                />
              </section>

              {/* By template */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.byTemplate')}</h2>
                <MiniBarChart
                  data={data.byTemplate.map(p => ({ label: p.template, value: p.count }))}
                  max={Math.max(...data.byTemplate.map(p => p.count), 1)}
                  color="var(--color-success)"
                />
              </section>

              {/* Credit usage by reason */}
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.creditUsage')}</h2>
                <MiniBarChart
                  data={data.creditByReason.filter(r => r.totalDelta < 0).map(r => ({ label: r.reason, value: Math.abs(r.totalDelta) }))}
                  max={Math.max(...data.creditByReason.filter(r => r.totalDelta < 0).map(r => Math.abs(r.totalDelta)), 1)}
                  color="var(--color-warning)"
                />
              </section>
            </div>

            {/* Top creatives */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">{t('analyticsHub.topCreatives')}</h2>
              {data.topCreatives.length === 0 ? (
                <p className="text-sm text-fg-muted py-4">{t('analyticsHub.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t('analyticsHub.topCreatives')}</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-fg-muted">
                        <th scope="col" className="py-2 pr-4">{t('analyticsHub.creative')}</th>
                        <th scope="col" className="py-2 pr-4 text-right">{t('analyticsHub.impressions')}</th>
                        <th scope="col" className="py-2 pr-4 text-right">{t('analyticsHub.clicks')}</th>
                        <th scope="col" className="py-2 pr-4 text-right">{t('analyticsHub.conversions')}</th>
                        <th scope="col" className="py-2 pr-4 text-right">{t('analyticsHub.spend')}</th>
                        <th scope="col" className="py-2 text-right">{t('analyticsHub.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCreatives.map((c) => (
                        <tr key={c.creationId} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs truncate max-w-32">{c.creationId.length > 12 ? c.creationId.slice(0, 12) + '…' : c.creationId}</td>
                          <td className="py-2 pr-4 text-right">{(c.impressions || 0).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">{(c.clicks || 0).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">{(c.conversions || 0).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">${(c.spend || 0).toFixed(2)}</td>
                          <td className="py-2 text-right font-medium text-success">${(c.revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Credit projection */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" aria-hidden="true" /> {t('analyticsHub.creditProjection')}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-fg-muted">{t('analyticsHub.spent30d')}</p>
                  <p className="text-xl font-bold">{(data.creditUsage.spent30d || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-fg-muted">{t('analyticsHub.dailyAvg')}</p>
                  <p className="text-xl font-bold">{(data.creditUsage.dailyAvgSpend || 0).toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-fg-muted">{t('analyticsHub.daysRemaining')}</p>
                  <p className="text-xl font-bold">
                    {data.creditUsage.projectionDays !== null && Number.isFinite(data.creditUsage.projectionDays) && data.creditUsage.projectionDays >= 0
                      ? data.creditUsage.projectionDays
                      : '∞'}
                  </p>
                </div>
              </div>
            </section>

            {/* Workflow stats */}
            {data.workflows && data.workflows.totalRuns > 0 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Film className="w-4 h-4" aria-hidden="true" /> {t('analyticsHub.workflowStats')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-fg-muted">{t('analyticsHub.totalRuns')}</p>
                    <p className="text-xl font-bold">{(data.workflows.totalRuns || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted">{t('analyticsHub.completedRuns')}</p>
                    <p className="text-xl font-bold text-success">{(data.workflows.completedRuns || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted">{t('analyticsHub.failedRuns')}</p>
                    <p className="text-xl font-bold text-danger">{(data.workflows.failedRuns || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted">{t('analyticsHub.avgDuration')}</p>
                    <p className="text-xl font-bold">{data.workflows.avgDurationSec > 0 ? `${Math.floor(data.workflows.avgDurationSec / 60)}m ${data.workflows.avgDurationSec % 60}s` : '—'}</p>
                  </div>
                </div>
                {data.workflows.byType.length > 0 && (
                  <div>
                    <p className="text-xs text-fg-muted mb-2">{t('analyticsHub.runsByType')}</p>
                    <MiniBarChart
                      data={data.workflows.byType.map(r => ({ label: r.type, value: r.count }))}
                      max={Math.max(...data.workflows.byType.map(r => r.count), 1)}
                      color="var(--color-brand-accent)"
                    />
                  </div>
                )}
                {data.workflows.perStage && data.workflows.perStage.length > 0 && (
                  <div>
                    <p className="text-xs text-fg-muted mb-2">{t('analyticsHub.perStageBreakdown')}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <caption className="sr-only">{t('analyticsHub.perStageBreakdown')}</caption>
                        <thead>
                          <tr className="border-b border-border text-left text-fg-muted">
                            <th scope="col" className="py-1 pr-3">{t('analyticsHub.stage')}</th>
                            <th scope="col" className="py-1 pr-3 text-right">{t('analyticsHub.total')}</th>
                            <th scope="col" className="py-1 pr-3 text-right">{t('analyticsHub.successRate')}</th>
                            <th scope="col" className="py-1 pr-3 text-right">{t('analyticsHub.credits')}</th>
                            <th scope="col" className="py-1 text-right">{t('analyticsHub.avgDuration')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.workflows.perStage.map(s => (
                            <tr key={s.stage} className="border-b border-border last:border-0">
                              <td className="py-1 pr-3 font-medium">{s.stage}</td>
                              <td className="py-1 pr-3 text-right">{s.total}</td>
                              <td className="py-1 pr-3 text-right">
                                <span className={s.successRate >= 80 ? 'text-success' : s.successRate >= 50 ? 'text-warning' : 'text-danger'}>
                                  {s.successRate}%
                                </span>
                              </td>
                              <td className="py-1 pr-3 text-right">{s.totalCredits}</td>
                              <td className="py-1 text-right">{s.avgDurationSec > 0 ? `${s.avgDurationSec}s` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <FeedbackWidget feature="analytics-hub" />
    </div>
  );
}
