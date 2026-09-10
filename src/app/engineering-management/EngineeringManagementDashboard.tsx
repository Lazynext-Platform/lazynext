'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Code, GitBranch, Gauge, Heart, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EngineeringMetric, SprintReport, CodeQuality, TeamHealth,
  EngineeringManagementMetrics, EngineeringManagementStats,
  SprintStatus, QualityStatus, HealthStatus, HealthCategory,
} from '@/lib/services/engineering-management-service';

type TabId = 'overview' | 'metrics' | 'sprints' | 'quality' | 'health';

interface EngineeringManagementDashboardProps {
  organizationId: string;
  metrics: EngineeringMetric[];
  sprints: SprintReport[];
  qualities: CodeQuality[];
  healths: TeamHealth[];
  metricsSummary: EngineeringManagementMetrics;
  stats: EngineeringManagementStats;
}

const sprintStatusVariant = (status: SprintStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'active') return 'info';
  if (status === 'planned') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
};

const qualityStatusVariant = (status: QualityStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'good' || status === 'improving') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'critical' || status === 'declining') return 'danger';
  return 'default';
};

const healthStatusVariant = (status: HealthStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'healthy' || status === 'improving') return 'success';
  if (status === 'at_risk') return 'warning';
  if (status === 'critical') return 'danger';
  return 'default';
};

export function EngineeringManagementDashboard({
  metrics, sprints, qualities, healths, metricsSummary, stats,
}: EngineeringManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredMetrics = useMemo(() => {
    if (!search) return metrics;
    const q = search.toLowerCase();
    return metrics.filter(
      (m) => m.type.toLowerCase().includes(q) || m.team.toLowerCase().includes(q) || m.project.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q),
    );
  }, [metrics, search]);

  const filteredSprints = useMemo(() => {
    if (!search) return sprints;
    const q = search.toLowerCase();
    return sprints.filter(
      (s) => s.name.toLowerCase().includes(q) || s.team.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sprints, search]);

  const filteredQualities = useMemo(() => {
    if (!search) return qualities;
    const q = search.toLowerCase();
    return qualities.filter(
      (q2) => q2.type.toLowerCase().includes(q) || q2.status.toLowerCase().includes(q) || q2.project.toLowerCase().includes(q),
    );
  }, [qualities, search]);

  const filteredHealths = useMemo(() => {
    if (!search) return healths;
    const q = search.toLowerCase();
    return healths.filter(
      (h) => h.category.toLowerCase().includes(q) || h.status.toLowerCase().includes(q) || h.team.toLowerCase().includes(q),
    );
  }, [healths, search]);

  const formatCategory = useCallback((cat: HealthCategory) => cat.replace('_', ' '), []);
  const formatStatus = useCallback((s: string) => s.replace('_', ' '), []);

  const tabs: { id: TabId; label: string; icon: typeof Code }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'metrics', label: 'Metrics', icon: Gauge },
    { id: 'sprints', label: 'Sprints', icon: GitBranch },
    { id: 'quality', label: 'Code Quality', icon: Code },
    { id: 'health', label: 'Team Health', icon: Heart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Avg Velocity</div>
              <div className="mt-1 text-2xl font-bold">{metricsSummary.averageVelocity}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Deploy Frequency</div>
              <div className="mt-1 text-2xl font-bold">{metricsSummary.deploymentFrequency}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Code Coverage</div>
              <div className="mt-1 text-2xl font-bold">{metricsSummary.codeCoverage}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">MTTR</div>
              <div className="mt-1 text-2xl font-bold">{metricsSummary.mttr}h</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Sprints</div>
              <div className="mt-1 text-2xl font-bold">{metricsSummary.activeSprints}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Metric Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMetricType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Sprint Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySprintStatus).map(([status, count]) => (
                <Badge key={status} variant="default">{formatStatus(status)}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Code Quality Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byQualityStatus).map(([status, count]) => (
                <Badge key={status} variant="default">{formatStatus(status)}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Team Health Summary</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metricsSummary.healthSummary).map(([status, count]) => (
                <Badge key={status} variant="default">{formatStatus(status)}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-3">
          {filteredMetrics.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gauge} title="No metrics" description="Engineering metrics will appear here." /></Card>
          ) : (
            filteredMetrics.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{m.team || 'All teams'} · {m.project || 'All projects'} · {m.period || 'No period'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{m.value} {m.unit}</Badge>
                    {m.target !== null && <Badge variant="default">target: {m.target}</Badge>}
                    <Badge variant="info">{m.trend}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sprints' && (
        <div className="space-y-3">
          {filteredSprints.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GitBranch} title="No sprints" description="Sprint reports will appear here." /></Card>
          ) : (
            filteredSprints.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.team} · {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'} → {s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.plannedPoints > 0 && <Badge variant="default">{s.completedPoints}/{s.plannedPoints} pts</Badge>}
                    <Badge variant={sprintStatusVariant(s.status)}>{formatStatus(s.status)}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'quality' && (
        <div className="space-y-3">
          {filteredQualities.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Code} title="No quality reports" description="Code quality reports will appear here." /></Card>
          ) : (
            filteredQualities.map((q) => (
              <Card key={q.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{q.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{q.project || 'All projects'} · {q.measuredBy || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{q.score}</Badge>
                    {q.target !== null && <Badge variant="default">target: {q.target}</Badge>}
                    <Badge variant={qualityStatusVariant(q.status)}>{formatStatus(q.status)}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-3">
          {filteredHealths.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Heart} title="No health reports" description="Team health reports will appear here." /></Card>
          ) : (
            filteredHealths.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{formatCategory(h.category)}</div>
                    <div className="text-sm text-fg-secondary">{h.team || 'All teams'} · {h.measuredDate ? new Date(h.measuredDate).toLocaleDateString() : 'No date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{h.score}</Badge>
                    <Badge variant={healthStatusVariant(h.status)}>{formatStatus(h.status)}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
