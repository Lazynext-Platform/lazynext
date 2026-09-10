'use client';

import { useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Gauge,
  CheckCircle2,
  XCircle,
  Database,
  Zap,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

interface AlertSummary {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  recentTriggers: number;
  activeCount: number;
  criticalCount: number;
  warningCount: number;
  resolvedCount: number;
}

interface SLOSummary {
  total: number;
  met: number;
  breached: number;
  active: number;
  paused: number;
  avgErrorBudgetUsed: number;
}

interface TraceStats {
  total: number;
  avgDurationMs: number;
  errorRate: number;
  errorCount: number;
  slowTraces: number;
  slowThresholdMs: number;
}

interface RetentionSummary {
  total: number;
  enabled: number;
  byDataType: Record<string, number>;
  lastRunAt: string | null;
}

interface AlertRecord {
  id: string;
  name: string;
  severity: string;
  status: string;
  metricName: string | null;
  triggerCount: number;
  lastTriggeredAt: string | null;
  acknowledgedBy: string | null;
}

interface SLORecord {
  id: string;
  name: string;
  metricName: string;
  target: number;
  targetPercentile: number;
  windowDays: number;
  status: string;
  errorBudget: number;
  errorBudgetUsed: number;
}

interface TraceRecord {
  id: string;
  traceId: string;
  rootSpanName: string;
  status: string;
  durationMs: number;
  spanCount: number;
  startedAt: string;
}

interface ObservabilityDashboardProps {
  alertSummary: AlertSummary;
  sloSummary: SLOSummary;
  traceStats: TraceStats;
  retentionSummary: RetentionSummary;
  recentAlerts: AlertRecord[];
  slos: SLORecord[];
  recentTraces: TraceRecord[];
  metricNames: string[];
}

const severityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  info: 'info',
  warning: 'warning',
  error: 'danger',
  critical: 'danger',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'danger',
  resolved: 'success',
  suppressed: 'default',
  pending: 'warning',
};

const sloStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  met: 'success',
  breached: 'danger',
  active: 'info',
  paused: 'default',
};

const traceStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  ok: 'success',
  error: 'danger',
  timeout: 'warning',
};

function formatDuration(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

export function ObservabilityDashboard({
  alertSummary,
  sloSummary,
  traceStats,
  retentionSummary,
  recentAlerts,
  slos,
  recentTraces,
  metricNames,
}: ObservabilityDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>(metricNames[0] || '');
  const [series, setSeries] = useState<{ timestamp: string; avg: number; min: number; max: number; count: number }[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const fetchSeries = useCallback(async (metric: string) => {
    if (!metric) return;
    setLoadingSeries(true);
    try {
      const endTime = new Date();
      const startTime = new Date(Date.now() - 60 * 60 * 1000); // last 1h
      const res = await fetch(
        `/api/telemetry/timeseries?metricName=${encodeURIComponent(metric)}&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}&interval=5m`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setSeries(data.series || []);
    } catch {
      // ignore
    } finally {
      setLoadingSeries(false);
    }
  }, []);

  const handleAcknowledge = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      window.location.reload();
    } catch {
      // ignore
    }
  }, []);

  const handleResolve = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
      window.location.reload();
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Alert Summary
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <AlertTriangle className="h-3 w-3" /> Active
            </div>
            <div className="text-2xl font-semibold text-danger">{alertSummary.activeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <XCircle className="h-3 w-3" /> Critical
            </div>
            <div className="text-2xl font-semibold text-danger">{alertSummary.criticalCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <AlertTriangle className="h-3 w-3" /> Warning
            </div>
            <div className="text-2xl font-semibold text-warning">{alertSummary.warningCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <CheckCircle2 className="h-3 w-3" /> Resolved
            </div>
            <div className="text-2xl font-semibold text-success">{alertSummary.resolvedCount}</div>
          </Card>
        </div>
      </section>

      {/* SLO Summary */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Gauge className="h-5 w-5" /> SLO Summary
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <CheckCircle2 className="h-3 w-3" /> Met
            </div>
            <div className="text-2xl font-semibold text-success">{sloSummary.met}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <XCircle className="h-3 w-3" /> Breached
            </div>
            <div className="text-2xl font-semibold text-danger">{sloSummary.breached}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <Activity className="h-3 w-3" /> Active
            </div>
            <div className="text-2xl font-semibold text-info">{sloSummary.active}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <TrendingUp className="h-3 w-3" /> Avg Budget Used
            </div>
            <div className="text-2xl font-semibold">{formatPercent(sloSummary.avgErrorBudgetUsed)}</div>
          </Card>
        </div>
      </section>

      {/* Recent Alerts */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Recent Alerts
        </h2>
        {recentAlerts.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={AlertTriangle} title="No alerts" description="No alerts have been recorded yet." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between gap-4 border-b border-border-primary last:border-0 pb-3 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{alert.name}</span>
                      <Badge variant={severityVariant[alert.severity] || 'default'} className="text-xs">{alert.severity}</Badge>
                      <Badge variant={statusVariant[alert.status] || 'default'} className="text-xs">{alert.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-secondary">
                      {alert.metricName && <span>metric: {alert.metricName}</span>}
                      <span>triggers: {alert.triggerCount}</span>
                      <span>last: {formatDate(alert.lastTriggeredAt)}</span>
                      {alert.acknowledgedBy && <span>ack: {alert.acknowledgedBy.slice(0, 8)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {alert.status === 'active' && !alert.acknowledgedBy && (
                      <Button size="sm" variant="secondary" onClick={() => handleAcknowledge(alert.id)}>Ack</Button>
                    )}
                    {alert.status !== 'resolved' && (
                      <Button size="sm" onClick={() => handleResolve(alert.id)}>Resolve</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* SLO List with error budget progress bars */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Gauge className="h-5 w-5" /> SLOs
        </h2>
        {slos.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Gauge} title="No SLOs" description="No SLOs have been defined yet." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-4">
              {slos.map((slo) => (
                <div key={slo.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{slo.name}</span>
                      <Badge variant={sloStatusVariant[slo.status] || 'default'} className="text-xs">{slo.status}</Badge>
                    </div>
                    <span className="text-xs text-fg-secondary shrink-0">
                      p{slo.targetPercentile} ≤ {slo.target}ms · {slo.windowDays}d
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full ${slo.errorBudgetUsed >= 1 ? 'bg-danger' : slo.errorBudgetUsed >= 0.75 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${Math.min(100, slo.errorBudgetUsed * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-fg-secondary w-20 text-right">{formatPercent(slo.errorBudgetUsed)} used</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Trace Stats */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Trace Stats
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <Activity className="h-3 w-3" /> Total
            </div>
            <div className="text-2xl font-semibold">{traceStats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <Clock className="h-3 w-3" /> Avg Duration
            </div>
            <div className="text-2xl font-semibold">{formatDuration(traceStats.avgDurationMs)}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <XCircle className="h-3 w-3" /> Error Rate
            </div>
            <div className="text-2xl font-semibold text-danger">{formatPercent(traceStats.errorRate)}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
              <Clock className="h-3 w-3" /> Slow Traces
            </div>
            <div className="text-2xl font-semibold text-warning">{traceStats.slowTraces}</div>
          </Card>
        </div>
      </section>

      {/* Recent Traces */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Recent Traces
        </h2>
        {recentTraces.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Zap} title="No traces" description="No traces have been recorded yet." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-3">
              {recentTraces.map((trace) => (
                <div key={trace.id} className="flex items-center justify-between gap-4 border-b border-border-primary last:border-0 pb-3 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{trace.rootSpanName}</span>
                      <Badge variant={traceStatusVariant[trace.status] || 'default'} className="text-xs">{trace.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-secondary">
                      <span className="font-mono">{trace.traceId.slice(0, 12)}</span>
                      <span>{trace.spanCount} spans</span>
                      <span>{formatDate(trace.startedAt)}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatDuration(trace.durationMs)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Retention Policies Summary */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Database className="h-5 w-5" /> Retention Policies
        </h2>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-fg-secondary mb-1">Total Policies</p>
              <p className="text-xl font-semibold">{retentionSummary.total}</p>
            </div>
            <div>
              <p className="text-xs text-fg-secondary mb-1">Enabled</p>
              <p className="text-xl font-semibold text-success">{retentionSummary.enabled}</p>
            </div>
            <div>
              <p className="text-xs text-fg-secondary mb-1">Last Run</p>
              <p className="text-sm font-semibold">{formatDate(retentionSummary.lastRunAt)}</p>
            </div>
          </div>
          {Object.keys(retentionSummary.byDataType).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(retentionSummary.byDataType).map(([dataType, count]) => (
                <Badge key={dataType} variant="default" className="text-xs">{dataType}: {count}</Badge>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Telemetry Time-Series Chart Placeholder */}
      <section>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Telemetry Time Series
        </h2>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-lg border border-border-primary bg-surface px-3 py-1.5 text-sm"
            >
              {metricNames.length === 0 && <option value="">No metrics</option>}
              {metricNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => fetchSeries(selectedMetric)} disabled={!selectedMetric || loadingSeries}>
              {loadingSeries ? 'Loading…' : 'Load'}
            </Button>
          </div>
          {series.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px] border border-border-primary border-dashed rounded-lg">
              <p className="text-sm text-fg-secondary">
                {selectedMetric ? 'Click "Load" to fetch time-series data' : 'Select a metric to view its time series'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end gap-1 h-[200px] border-b border-border-primary">
                {series.map((bucket) => {
                  const maxAvg = Math.max(...series.map((s) => s.avg), 1);
                  const height = (bucket.avg / maxAvg) * 100;
                  return (
                    <div
                      key={bucket.timestamp}
                      className="flex-1 bg-accent-primary rounded-t"
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`${new Date(bucket.timestamp).toLocaleTimeString()}: ${formatDuration(bucket.avg)} (${bucket.count} pts)`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-fg-secondary">
                <span>{series.length > 0 ? new Date(series[0].timestamp).toLocaleTimeString() : ''}</span>
                <span>{series.length > 0 ? new Date(series[series.length - 1].timestamp).toLocaleTimeString() : ''}</span>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
