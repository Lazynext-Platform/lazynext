'use client';

import { useState, useMemo } from 'react';
import {
  Target, FileText, Crosshair, Activity, LayoutDashboard, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  KpiDefinition, KpiTarget, KpiMeasurement, KpiDashboard as KpiDashboardType,
  KpiMetrics, KpiStats,
} from '@/lib/services/kpi-service';

type TabId = 'overview' | 'definitions' | 'targets' | 'measurements' | 'dashboards';

interface KpiDashboardProps {
  organizationId: string;
  definitions: KpiDefinition[];
  targets: KpiTarget[];
  measurements: KpiMeasurement[];
  dashboards: KpiDashboardType[];
  metrics: KpiMetrics;
  stats: KpiStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'allowed', 'achieved'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'generated', 'presented', 'calculated', 'reviewed', 'recorded', 'detected', 'evaluating'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'denied', 'rejected', 'revoked', 'deprecated', 'archived', 'dismissed', 'error', 'disputed'].includes(status)) return 'danger';
  return 'info';
};

export function KpiDashboard({
  definitions, targets, measurements, dashboards, metrics, stats,
}: KpiDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredDefinitions = useMemo(() => {
    if (!search) return definitions;
    const q = search.toLowerCase();
    return definitions.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [definitions, search]);

  const filteredTargets = useMemo(() => {
    if (!search) return targets;
    const q = search.toLowerCase();
    return targets.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [targets, search]);

  const filteredMeasurements = useMemo(() => {
    if (!search) return measurements;
    const q = search.toLowerCase();
    return measurements.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [measurements, search]);

  const filteredDashboards = useMemo(() => {
    if (!search) return dashboards;
    const q = search.toLowerCase();
    return dashboards.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [dashboards, search]);

  const tabs: { id: TabId; label: string; icon: typeof Target }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'definitions', label: 'Definitions', icon: FileText },
    { id: 'targets', label: 'Targets', icon: Crosshair },
    { id: 'measurements', label: 'Measurements', icon: Activity },
    { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
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
              <div className="text-xs text-fg-tertiary">Active Definitions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeDefinitions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Targets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTargets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Recorded Measurements</div>
              <div className="mt-1 text-2xl font-bold">{metrics.recordedMeasurements}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Dashboards</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeDashboards}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Achieved Targets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.achievedTargets}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Definition Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDefinitionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Target Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTargetStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Measurement Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMeasurementStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Dashboard Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDashboardStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'definitions' && (
        <div className="space-y-3">
          {filteredDefinitions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No KPI definitions" description="KPI definitions will appear here." /></Card>
          ) : (
            filteredDefinitions.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.metric || 'No metric'} · {d.unit || 'No unit'} · {d.direction}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.target > 0 && <Badge variant="default">target: {d.target}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'targets' && (
        <div className="space-y-3">
          {filteredTargets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Crosshair} title="No KPI targets" description="KPI targets will appear here." /></Card>
          ) : (
            filteredTargets.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · target: {t.target} · progress: {t.progress}%</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.minimum > 0 && <Badge variant="default">min: {t.minimum}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'measurements' && (
        <div className="space-y-3">
          {filteredMeasurements.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Activity} title="No KPI measurements" description="KPI measurements will appear here." /></Card>
          ) : (
            filteredMeasurements.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · value: {m.value} · change: {m.change}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.measuredBy && <Badge variant="default">by {m.measuredBy}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'dashboards' && (
        <div className="space-y-3">
          {filteredDashboards.length === 0 ? (
            <Card className="p-8"><EmptyState icon={LayoutDashboard} title="No KPI dashboards" description="KPI dashboards will appear here." /></Card>
          ) : (
            filteredDashboards.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.kpis.length} KPIs · {d.refreshInterval || 'No refresh'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.shared && <Badge variant="default">shared</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
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
