'use client';

import { useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Plus, Trash2, Play, Download,
  LineChart as LineChartIcon, Sparkles, Database, FileText, LayoutDashboard,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types (mirrors of the service types, kept local to avoid server import) ──

interface KPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  history: { date: string; value: number }[];
}
interface Widget {
  id: string;
  type: string;
  title: string;
  dataSource: string;
}
interface DashboardData {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  widgets: Widget[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
interface ReportData {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  sections: { id: string; title: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
interface DashboardStats {
  totalDashboards: number;
  totalReports: number;
  totalWidgets: number;
  dataSources: number;
}
interface TrendPoint {
  date: string;
  value: number;
}
interface ForecastResult {
  historical: TrendPoint[];
  forecast: TrendPoint[];
  confidence: { lower: number[]; upper: number[] };
  method: string;
}

const DATA_SOURCES = [
  'tasks', 'goals', 'projects', 'events', 'agents', 'finance', 'sales', 'support',
] as const;
const TREND_METRICS = [
  'tasks_completed', 'goals_progress', 'agent_executions',
  'projects_active', 'revenue', 'tickets_resolved',
] as const;
const GRANULARITIES = ['day', 'week', 'month'] as const;

const trendIcon = {
  up: <TrendingUp className="h-4 w-4 text-success" />,
  down: <TrendingDown className="h-4 w-4 text-fg-danger" />,
  flat: <Minus className="h-4 w-4 text-fg-secondary" />,
};

const trendVariant: Record<string, 'success' | 'danger' | 'default'> = {
  up: 'success', down: 'danger', flat: 'default',
};

export function AnalyticsDashboard({
  organizationId,
  kpis,
  dashboards,
  reports,
  stats,
}: {
  organizationId: string;
  kpis: KPI[];
  dashboards: DashboardData[];
  reports: ReportData[];
  stats: DashboardStats;
}) {
  const [selectedMetric, setSelectedMetric] = useState<string>('tasks_completed');
  const [selectedGranularity, setSelectedGranularity] = useState<string>('day');
  const [trendData, setTrendData] = useState<TrendPoint[] | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResult | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Query builder state
  const [qbDataSource, setQbDataSource] = useState<string>('tasks');
  const [qbGroupBy, setQbGroupBy] = useState<string>('');
  const [qbAggregation, setQbAggregation] = useState<string>('count');
  const [qbAggField, setQbAggField] = useState<string>('');
  const [qbFilterField, setQbFilterField] = useState<string>('');
  const [qbFilterValue, setQbFilterValue] = useState<string>('');
  const [queryResult, setQueryResult] = useState<{ rows: Record<string, unknown>[]; summary: Record<string, number> } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  async function loadTrend() {
    setLoadingTrend(true);
    setTrendData(null);
    try {
      const params = new URLSearchParams({
        organizationId,
        metric: selectedMetric,
        granularity: selectedGranularity,
      });
      const res = await fetch(`/api/analytics/trends?${params}`);
      const data = await res.json();
      if (data.points) setTrendData(data.points);
    } finally {
      setLoadingTrend(false);
    }
  }

  async function loadForecast() {
    setLoadingForecast(true);
    setForecastData(null);
    try {
      const params = new URLSearchParams({
        organizationId,
        metric: selectedMetric,
        periods: '14',
        granularity: selectedGranularity,
      });
      const res = await fetch(`/api/analytics/forecast?${params}`);
      const data = await res.json();
      if (data.forecast) setForecastData(data.forecast);
    } finally {
      setLoadingForecast(false);
    }
  }

  async function runQuery() {
    setLoadingQuery(true);
    setQueryResult(null);
    try {
      const aggregations = qbAggregation !== 'count' && qbAggField
        ? [{ field: qbAggField, type: qbAggregation, alias: `${qbAggregation}_${qbAggField}` }]
        : qbAggregation === 'count'
          ? [{ field: '*', type: 'count' as const, alias: 'count' }]
          : [];
      const filters = qbFilterField && qbFilterValue
        ? [{ field: qbFilterField, operator: 'eq' as const, value: qbFilterValue }]
        : [];
      const res = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          query: {
            dataSource: qbDataSource,
            filters: filters.length > 0 ? filters : undefined,
            groupBy: qbGroupBy || undefined,
            aggregations: aggregations.length > 0 ? aggregations : undefined,
            limit: 100,
          },
        }),
      });
      const data = await res.json();
      if (data.result) {
        setQueryResult({ rows: data.result.rows, summary: data.result.summary });
      }
    } finally {
      setLoadingQuery(false);
    }
  }

  async function exportQuery() {
    if (!queryResult) return;
    if (exportFormat === 'csv') {
      const headers = queryResult.rows.length > 0 ? Object.keys(queryResult.rows[0]) : [];
      const lines = [headers.join(',')];
      for (const row of queryResult.rows) {
        lines.push(headers.map((h) => String(row[h] ?? '')).join(','));
      }
      setExportData(lines.join('\n'));
    } else {
      setExportData(JSON.stringify(queryResult, null, 2));
    }
  }

  function downloadExport(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteDashboard(id: string) {
    if (!confirm('Delete this dashboard?')) return;
    await fetch(`/api/analytics/dashboards/${id}`, { method: 'DELETE' });
    window.location.reload();
  }

  async function deleteReport(id: string) {
    if (!confirm('Delete this report?')) return;
    await fetch(`/api/analytics/reports/${id}`, { method: 'DELETE' });
    window.location.reload();
  }

  async function runReport(id: string) {
    await fetch(`/api/analytics/reports/${id}/run`, { method: 'POST' });
    alert('Report run initiated. Check exports for results.');
  }

  async function exportReport(id: string, format: 'json' | 'csv' | 'markdown') {
    const res = await fetch(`/api/analytics/reports/${id}/export?format=${format}`);
    const text = await res.text();
    downloadExport(text, `report-${id}.${format === 'markdown' ? 'md' : format}`, 'text/plain');
  }

  async function exportDashboard(id: string, format: 'json' | 'csv') {
    const res = await fetch(`/api/analytics/dashboards/${id}/export?format=${format}`);
    const text = await res.text();
    downloadExport(text, `dashboard-${id}.${format}`, format === 'csv' ? 'text/csv' : 'application/json');
  }

  const topKpis = kpis.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">KPI Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topKpis.map((kpi) => (
            <Card key={kpi.name} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-fg-secondary">{kpi.name}</span>
                <Badge variant={trendVariant[kpi.trend]} className="text-xs">
                  {trendIcon[kpi.trend]}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {kpi.unit === 'percent' ? `${kpi.value}%` : kpi.value.toLocaleString()}
              </div>
              <div className="text-xs text-fg-secondary mt-1">
                Target: {kpi.unit === 'percent' ? `${kpi.target}%` : kpi.target.toLocaleString()}
              </div>
            </Card>
          ))}
          {topKpis.length === 0 && (
            <Card className="p-4 col-span-full">
              <div className="text-sm text-fg-secondary">No KPI data available.</div>
            </Card>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Dashboards</div>
          <div className="text-2xl font-bold">{stats.totalDashboards}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Reports</div>
          <div className="text-2xl font-bold">{stats.totalReports}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Widgets</div>
          <div className="text-2xl font-bold">{stats.totalWidgets}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Data Sources</div>
          <div className="text-2xl font-bold">{stats.dataSources}</div>
        </Card>
      </div>

      {/* Trend Chart + Forecast Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <LineChartIcon className="h-4 w-4 text-accent-primary" />
            <h3 className="heading-display text-sm">Trend Chart</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-bg-primary"
            >
              {TREND_METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={selectedGranularity}
              onChange={(e) => setSelectedGranularity(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-bg-primary"
            >
              {GRANULARITIES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <Button variant="primary" onClick={loadTrend} disabled={loadingTrend} className="text-xs">
              Load Trend
            </Button>
          </div>
          <div className="h-48 border rounded bg-fg-muted/5 overflow-y-auto p-2">
            {trendData && trendData.length > 0 ? (
              <div className="space-y-1">
                {trendData.map((p) => (
                  <div key={p.date} className="flex justify-between text-xs">
                    <span className="text-fg-secondary">{p.date}</span>
                    <span className="font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-fg-secondary">
                {loadingTrend ? 'Loading…' : 'Select a metric and load trend data'}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            <h3 className="heading-display text-sm">Forecast Panel</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <Button variant="primary" onClick={loadForecast} disabled={loadingForecast} className="text-xs">
              Generate Forecast (14 periods)
            </Button>
          </div>
          <div className="h-48 border rounded bg-fg-muted/5 overflow-y-auto p-2">
            {forecastData ? (
              <div className="space-y-2">
                <div className="text-xs text-fg-secondary">Method: {forecastData.method}</div>
                <div className="text-xs font-medium mb-1">Forecasted points:</div>
                {forecastData.forecast.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-fg-secondary">{p.date}</span>
                    <span className="font-medium">
                      {p.value}
                      {forecastData.confidence.lower[i] !== undefined && (
                        <span className="text-fg-secondary ml-1">
                          ({forecastData.confidence.lower[i]}–{forecastData.confidence.upper[i]})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-fg-secondary">
                {loadingForecast ? 'Loading…' : 'Generate a predictive forecast'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Custom Dashboards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Custom Dashboards</h2>
            <Badge variant="default" className="text-xs">{dashboards.length}</Badge>
          </div>
          <Button variant="primary" onClick={() => window.location.reload()} className="text-xs">
            <Plus className="h-4 w-4" /> New Dashboard
          </Button>
        </div>
        {dashboards.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No custom dashboards yet.</div></Card>
        ) : (
          <div className="space-y-2">
            {dashboards.map((d) => (
              <Card key={d.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{d.name}</span>
                  <Badge variant="info" className="text-xs">{d.widgets.length} widgets</Badge>
                  {d.description && <span className="text-xs text-fg-secondary">{d.description}</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="text-xs" onClick={() => exportDashboard(d.id, 'csv')}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => exportDashboard(d.id, 'json')}>
                    <Download className="h-3 w-3" /> JSON
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => deleteDashboard(d.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Reports</h2>
            <Badge variant="default" className="text-xs">{reports.length}</Badge>
          </div>
          <Button variant="primary" onClick={() => window.location.reload()} className="text-xs">
            <Plus className="h-4 w-4" /> New Report
          </Button>
        </div>
        {reports.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No reports yet.</div></Card>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="info" className="text-xs">{r.sections.length} sections</Badge>
                  {r.description && <span className="text-xs text-fg-secondary">{r.description}</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="text-xs" onClick={() => runReport(r.id)}>
                    <Play className="h-3 w-3" /> Run
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => exportReport(r.id, 'csv')}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => exportReport(r.id, 'json')}>
                    <Download className="h-3 w-3" /> JSON
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => exportReport(r.id, 'markdown')}>
                    <Download className="h-3 w-3" /> MD
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => deleteReport(r.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Query Builder */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">Query Builder</h2>
        </div>
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Data Source</label>
              <select
                value={qbDataSource}
                onChange={(e) => setQbDataSource(e.target.value)}
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              >
                {DATA_SOURCES.map((ds) => <option key={ds} value={ds}>{ds}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Group By</label>
              <input
                value={qbGroupBy}
                onChange={(e) => setQbGroupBy(e.target.value)}
                placeholder="e.g. status"
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Aggregation</label>
              <select
                value={qbAggregation}
                onChange={(e) => setQbAggregation(e.target.value)}
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              >
                <option value="count">count</option>
                <option value="sum">sum</option>
                <option value="avg">avg</option>
                <option value="min">min</option>
                <option value="max">max</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Aggregation Field</label>
              <input
                value={qbAggField}
                onChange={(e) => setQbAggField(e.target.value)}
                placeholder="e.g. value"
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Filter Field</label>
              <input
                value={qbFilterField}
                onChange={(e) => setQbFilterField(e.target.value)}
                placeholder="e.g. status"
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary block mb-1">Filter Value</label>
              <input
                value={qbFilterValue}
                onChange={(e) => setQbFilterValue(e.target.value)}
                placeholder="e.g. done"
                className="text-xs border rounded px-2 py-1 w-full bg-bg-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={runQuery} disabled={loadingQuery} className="text-xs">
              Run Query
            </Button>
          </div>
          {queryResult && (
            <div className="space-y-2">
              <div className="text-xs text-fg-secondary">
                Summary: {Object.entries(queryResult.summary).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
              <div className="overflow-x-auto border rounded max-h-64">
                <table className="text-xs w-full">
                  <thead className="bg-fg-muted/10 sticky top-0">
                    <tr>
                      {queryResult.rows.length > 0 &&
                        Object.keys(queryResult.rows[0]).map((col) => (
                          <th key={col} className="text-left p-2 font-medium">{col}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="p-2">{String(val ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                {(['csv', 'json'] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={exportFormat === fmt ? 'primary' : 'secondary'}
                    onClick={() => setExportFormat(fmt)}
                    className="text-xs"
                  >
                    {fmt.toUpperCase()}
                  </Button>
                ))}
                <Button variant="primary" onClick={exportQuery} disabled={!queryResult} className="text-xs">
                  <Download className="h-3 w-3" /> Export
                </Button>
              </div>
              {exportData && (
                <Button variant="ghost" className="text-xs" onClick={() => downloadExport(exportData, `query-export.${exportFormat}`, exportFormat === 'csv' ? 'text/csv' : 'application/json')}>
                  Download File
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
