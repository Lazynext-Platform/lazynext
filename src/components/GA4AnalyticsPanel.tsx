'use client';

import { useState, useCallback } from 'react';
import {
  BarChart3, Loader2, AlertCircle, Users, Eye, MousePointerClick,
  DollarSign, Activity, Globe, Heart, RefreshCw, TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface GA4Overview {
  propertyId: string;
  dateRange: { startDate: string; endDate: string };
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDurationSeconds: number;
  newUsers: number;
  screenPageViewsPerSession: number;
}

interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  conversions: number;
  bounceRate: number;
  revenue: number;
}

interface GA4Conversion {
  eventName: string;
  conversions: number;
  conversionRate: number;
  revenue: number;
  users: number;
}

interface GA4AudienceDemographic {
  dimension: string;
  value: string;
  users: number;
  sessions: number;
  revenue: number;
}

interface GA4RealtimeEvent {
  eventName: string;
  eventCount: number;
}

interface GA4RealtimeData {
  propertyId: string;
  timestamp: string;
  activeUsers: number;
  events: GA4RealtimeEvent[];
  screenPageViews: number;
}

interface GA4PendingCredentials {
  status: 'pending_credentials';
  message: string;
  propertyId: string;
  metric: string;
}

type Metric = 'overview' | 'traffic' | 'conversions' | 'audience' | 'realtime';

const PRESETS: Array<{ id: string; label: string; days: number }> = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
];

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GA4AnalyticsPanel() {
  const { t } = useI18n();
  const [propertyId, setPropertyId] = useState('properties/123456789');
  const [preset, setPreset] = useState('7d');
  const [metric, setMetric] = useState<Metric>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const [overview, setOverview] = useState<GA4Overview | null>(null);
  const [traffic, setTraffic] = useState<GA4TrafficSource[] | null>(null);
  const [conversions, setConversions] = useState<{ totalConversions: number; totalRevenue: number; overallConversionRate: number; items: GA4Conversion[] } | null>(null);
  const [audience, setAudience] = useState<{ demographics: GA4AudienceDemographic[]; interests: GA4AudienceDemographic[]; geo: GA4AudienceDemographic[] } | null>(null);
  const [realtime, setRealtime] = useState<GA4RealtimeData | null>(null);

  const dateRange = useCallback(() => {
    const p = PRESETS.find((x) => x.id === preset) || PRESETS[0];
    return { startDate: dateNDaysAgo(p.days), endDate: today() };
  }, [preset]);

  const fetchMetric = useCallback(async (m: Metric) => {
    setLoading(true);
    setError('');
    setPending(false);
    try {
      const res = await fetch('/api/analytics/ga4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, dateRange: dateRange(), metric: m }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const payload = data.data;
      if (payload && (payload as GA4PendingCredentials).status === 'pending_credentials') {
        setPending(true);
        // Clear stale data so the pending state is unambiguous.
        setOverview(null); setTraffic(null); setConversions(null); setAudience(null); setRealtime(null);
        return;
      }
      switch (m) {
        case 'overview': setOverview(payload as GA4Overview); break;
        case 'traffic': setTraffic((payload as { sources: GA4TrafficSource[] }).sources); break;
        case 'conversions': {
          const p = payload as { totalConversions: number; totalRevenue: number; overallConversionRate: number; conversions: GA4Conversion[] };
          setConversions({ totalConversions: p.totalConversions, totalRevenue: p.totalRevenue, overallConversionRate: p.overallConversionRate, items: p.conversions });
          break;
        }
        case 'audience': {
          const p = payload as { demographics: GA4AudienceDemographic[]; interests: GA4AudienceDemographic[]; geo: GA4AudienceDemographic[] };
          setAudience({ demographics: p.demographics, interests: p.interests, geo: p.geo });
          break;
        }
        case 'realtime': setRealtime(payload as GA4RealtimeData); break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [propertyId, dateRange]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" aria-hidden="true" />
          {t('ga4.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('ga4.description')}</p>
      </div>

      {/* Controls: property id, date range, metric selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-fg-muted" htmlFor="ga4-property">{t('ga4.propertyId')}</label>
          <input
            id="ga4-property"
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
        <div>
          <span className="text-xs font-medium text-fg-muted" id="ga4-range-label">{t('ga4.dateRange')}</span>
          <div className="mt-1 flex gap-1" role="group" aria-labelledby="ga4-range-label">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                aria-pressed={preset === p.id}
                className={`rounded-lg border px-3 py-1.5 text-sm ${preset === p.id ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-border hover:bg-bg-secondary'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-fg-muted" htmlFor="ga4-metric">{t('ga4.metric')}</label>
          <select
            id="ga4-metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="overview">{t('ga4.metricOverview')}</option>
            <option value="traffic">{t('ga4.metricTraffic')}</option>
            <option value="conversions">{t('ga4.metricConversions')}</option>
            <option value="audience">{t('ga4.metricAudience')}</option>
            <option value="realtime">{t('ga4.metricRealtime')}</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => fetchMetric(metric)}
        disabled={loading || !propertyId}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
        aria-label={t('ga4.fetch')}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
        {t('ga4.fetch')}
      </button>

      {error && (
        <div role="alert" className="text-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}
        </div>
      )}

      {pending && (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          {t('ga4.pendingCredentials')}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-fg-muted" role="status" aria-live="polite">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {t('ga4.loading')}
        </div>
      )}

      {!loading && !pending && (
        <div className="space-y-4">
          {/* Overview */}
          {metric === 'overview' && overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={MousePointerClick} label={t('ga4.sessions')} value={fmt(overview.sessions)} />
              <MetricCard icon={Users} label={t('ga4.users')} value={fmt(overview.users)} />
              <MetricCard icon={Eye} label={t('ga4.pageviews')} value={fmt(overview.pageviews)} />
              <MetricCard icon={Activity} label={t('ga4.bounceRate')} value={`${fmt(overview.bounceRate)}%`} />
              <MetricCard icon={Users} label={t('ga4.newUsers')} value={fmt(overview.newUsers)} />
              <MetricCard icon={Eye} label={t('ga4.pagesPerSession')} value={fmt(overview.screenPageViewsPerSession)} />
              <MetricCard icon={Activity} label={t('ga4.avgSessionDuration')} value={fmtDuration(overview.avgSessionDurationSeconds)} />
            </div>
          )}

          {/* Traffic sources */}
          {metric === 'traffic' && traffic && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" aria-hidden="true" /> {t('ga4.trafficSources')}
              </h3>
              {traffic.length === 0 ? (
                <p className="text-sm text-fg-muted">{t('ga4.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t('ga4.trafficSources')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="text-left py-1">{t('ga4.source')}</th>
                        <th scope="col" className="text-left py-1">{t('ga4.medium')}</th>
                        <th scope="col" className="text-right py-1">{t('ga4.sessions')}</th>
                        <th scope="col" className="text-right py-1">{t('ga4.users')}</th>
                        <th scope="col" className="text-right py-1">{t('ga4.conversions')}</th>
                        <th scope="col" className="text-right py-1">{t('ga4.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traffic.map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-1">{s.source}</td>
                          <td>{s.medium}</td>
                          <td className="text-right">{fmt(s.sessions)}</td>
                          <td className="text-right">{fmt(s.users)}</td>
                          <td className="text-right">{fmt(s.conversions)}</td>
                          <td className="text-right">{fmtMoney(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Conversions */}
          {metric === 'conversions' && conversions && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <MetricCard icon={Activity} label={t('ga4.totalConversions')} value={fmt(conversions.totalConversions)} />
                <MetricCard icon={DollarSign} label={t('ga4.totalRevenue')} value={fmtMoney(conversions.totalRevenue)} />
                <MetricCard icon={TrendingUp} label={t('ga4.conversionRate')} value={`${fmt(conversions.overallConversionRate)}%`} />
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium mb-2">{t('ga4.conversionEvents')}</h3>
                {conversions.items.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t('ga4.noData')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('ga4.conversionEvents')}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="text-left py-1">{t('ga4.event')}</th>
                          <th scope="col" className="text-right py-1">{t('ga4.conversions')}</th>
                          <th scope="col" className="text-right py-1">{t('ga4.conversionRate')}</th>
                          <th scope="col" className="text-right py-1">{t('ga4.revenue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversions.items.map((c, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="py-1">{c.eventName}</td>
                            <td className="text-right">{fmt(c.conversions)}</td>
                            <td className="text-right">{fmt(c.conversionRate)}%</td>
                            <td className="text-right">{fmtMoney(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audience */}
          {metric === 'audience' && audience && (
            <div className="space-y-3">
              <AudienceTable title={t('ga4.demographics')} icon={Users} rows={audience.demographics} t={t} />
              <AudienceTable title={t('ga4.interests')} icon={Heart} rows={audience.interests} t={t} />
              <AudienceTable title={t('ga4.geo')} icon={Globe} rows={audience.geo} t={t} />
            </div>
          )}

          {/* Realtime */}
          {metric === 'realtime' && realtime && (
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-success animate-pulse" aria-hidden="true" /> {t('ga4.realtime')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={Users} label={t('ga4.activeUsers')} value={fmt(realtime.activeUsers)} />
                <MetricCard icon={Eye} label={t('ga4.screenPageViews')} value={fmt(realtime.screenPageViews)} />
              </div>
              {realtime.events.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t('ga4.realtimeEvents')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="text-left py-1">{t('ga4.event')}</th>
                        <th scope="col" className="text-right py-1">{t('ga4.eventCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realtime.events.map((e, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-1">{e.eventName}</td>
                          <td className="text-right">{fmt(e.eventCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AudienceTable({
  title, icon: Icon, rows, t,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: GA4AudienceDemographic[];
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4" aria-hidden="true" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('ga4.noData')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left py-1">{t('ga4.value')}</th>
                <th scope="col" className="text-right py-1">{t('ga4.users')}</th>
                <th scope="col" className="text-right py-1">{t('ga4.sessions')}</th>
                <th scope="col" className="text-right py-1">{t('ga4.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1">{r.value}</td>
                  <td className="text-right">{r.users.toLocaleString()}</td>
                  <td className="text-right">{r.sessions.toLocaleString()}</td>
                  <td className="text-right">${r.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
