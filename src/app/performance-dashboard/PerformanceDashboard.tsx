'use client';

import {
  Gauge,
  Zap,
  Clock,
  TrendingUp,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

// ── Types (mirror the service output) ──

interface IndexInfo {
  fields: string[];
  unique: boolean;
}

interface ModelIndexInfo {
  model: string;
  indexes: IndexInfo[];
  foreignKeys: string[];
  missingIndexFks: string[];
}

interface IndexReport {
  modelsWithIndexes: ModelIndexInfo[];
  modelsWithoutIndexes: string[];
  modelsNeedingIndexes: ModelIndexInfo[];
  totalModels: number;
  totalIndexes: number;
  generatedAt: string;
}

interface ApiHealthResult {
  endpoint: string;
  status: number;
  responseTimeMs: number;
  ok: boolean;
  error?: string;
}

interface ApiHealthSummary {
  endpoints: ApiHealthResult[];
  allHealthy: boolean;
  checkedAt: string;
}

interface SlowQueryRecord {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  timestamp: Date;
  dimensions: Record<string, unknown>;
}

interface CacheStats {
  active: boolean;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface PerformanceRecommendation {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
}

interface PerformanceDashboardProps {
  indexReport: IndexReport;
  apiHealth: ApiHealthSummary;
  slowQueries: SlowQueryRecord[];
  cacheStats: CacheStats;
  recommendations: PerformanceRecommendation[];
}

const severityVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export function PerformanceDashboard({
  indexReport,
  apiHealth,
  slowQueries,
  cacheStats,
  recommendations,
}: PerformanceDashboardProps) {
  const indexedCount = indexReport.modelsWithIndexes.length;
  const missingCount = indexReport.modelsNeedingIndexes.length;
  const noIndexCount = indexReport.modelsWithoutIndexes.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Gauge className="h-7 w-7 text-fg-muted" />
        <div>
          <h1 className="heading-display text-2xl">Performance Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Database index audit, API health, slow queries, cache stats, and recommendations.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Database}
          label="Total Models"
          value={indexReport.totalModels}
          sub={`${indexReport.totalIndexes} indexes`}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Indexed Models"
          value={indexedCount}
          color="text-success"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Missing Indexes"
          value={missingCount}
          color={missingCount > 0 ? 'text-danger' : 'text-success'}
        />
        <SummaryCard
          icon={Activity}
          label="API Health"
          value={apiHealth.allHealthy ? 'Healthy' : 'Issues'}
          color={apiHealth.allHealthy ? 'text-success' : 'text-warning'}
        />
      </div>

      {/* Index Report */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-fg-muted" />
          <h2 className="text-lg font-bold text-fg">Database Index Report</h2>
        </div>

        {missingCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-secondary">
              {missingCount} model(s) have foreign keys without a corresponding index:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-fg-muted">
                    <th className="py-2 pr-4 font-semibold">Model</th>
                    <th className="py-2 pr-4 font-semibold">Missing FK Indexes</th>
                  </tr>
                </thead>
                <tbody>
                  {indexReport.modelsNeedingIndexes.map((m) => (
                    <tr key={m.model} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-fg">{m.model}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {m.missingIndexFks.map((fk) => (
                            <Badge key={fk} variant="danger">{fk}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            All foreign keys have corresponding indexes.
          </p>
        )}

        {noIndexCount > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-fg-muted cursor-pointer hover:text-fg">
              {noIndexCount} model(s) with no indexes (no foreign keys)
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {indexReport.modelsWithoutIndexes.map((m) => (
                <Badge key={m} variant="default">{m}</Badge>
              ))}
            </div>
          </details>
        )}
      </Card>

      {/* API Health */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-fg-muted" />
          <h2 className="text-lg font-bold text-fg">API Health</h2>
          <Badge variant={apiHealth.allHealthy ? 'success' : 'warning'} className="ml-auto">
            {apiHealth.allHealthy ? 'All Healthy' : 'Issues Detected'}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-fg-muted">
                <th className="py-2 pr-4 font-semibold">Endpoint</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 font-semibold">Response Time</th>
                <th className="py-2 pr-4 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {apiHealth.endpoints.map((e) => (
                <tr key={e.endpoint} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-fg">{e.endpoint}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={e.ok ? 'success' : 'danger'}>{e.status || 'ERR'}</Badge>
                  </td>
                  <td className="py-2 pr-4 text-fg-secondary">
                    {e.responseTimeMs}ms
                    {e.responseTimeMs > 1000 && (
                      <span className="ml-2 text-warning">slow</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-fg-secondary">
                    {e.ok ? (
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> OK
                      </span>
                    ) : (
                      <span className="text-danger flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> {e.error || 'Failed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slow Queries */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-fg-muted" />
          <h2 className="text-lg font-bold text-fg">Slow Queries</h2>
        </div>
        {slowQueries.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No slow queries recorded"
            description="Query metrics will appear here once recorded via recordQueryMetric()."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <th className="py-2 pr-4 font-semibold">Query</th>
                  <th className="py-2 pr-4 font-semibold">Duration</th>
                  <th className="py-2 pr-4 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((q) => (
                  <tr key={q.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-fg">{q.name}</td>
                    <td className="py-2 pr-4">
                      <span className={q.value > 1000 ? 'text-danger font-semibold' : 'text-fg-secondary'}>
                        {q.value}ms
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-fg-muted">
                      {new Date(q.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cache Stats */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-fg-muted" />
          <h2 className="text-lg font-bold text-fg">Cache Stats</h2>
          <Badge variant={cacheStats.active ? 'info' : 'default'} className="ml-auto">
            {cacheStats.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Size" value={cacheStats.size} />
          <StatBox label="Hits" value={cacheStats.hits} color="text-success" />
          <StatBox label="Misses" value={cacheStats.misses} color="text-warning" />
          <StatBox
            label="Hit Rate"
            value={`${(cacheStats.hitRate * 100).toFixed(1)}%`}
            color={cacheStats.hitRate >= 0.7 ? 'text-success' : 'text-warning'}
          />
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-fg-muted" />
          <h2 className="text-lg font-bold text-fg">Recommendations</h2>
        </div>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-bg p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={severityVariant[r.severity] || 'default'}>
                  {r.severity}
                </Badge>
                <span className="text-xs text-fg-muted">{r.category}</span>
                <span className="text-sm font-semibold text-fg">{r.title}</span>
              </div>
              <p className="text-sm text-fg-secondary">{r.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-fg-muted" />
        <p className="text-xs text-fg-faint">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color || 'text-fg'}`}>{value}</p>
      {sub && <p className="text-xs text-fg-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <p className="text-xs text-fg-faint mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-fg'}`}>{value}</p>
    </div>
  );
}
