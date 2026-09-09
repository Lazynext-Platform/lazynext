'use client';

import { useState, useMemo } from 'react';
import {
  Zap, Gauge, ClipboardList, Target, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EnergyMeter, EnergyReading, EfficiencyTarget, EnergyTariff,
  EnergyManagementMetrics, EnergyManagementStats,
} from '@/lib/services/energy-management-service';

type TabId = 'overview' | 'meters' | 'readings' | 'targets' | 'tariffs';

interface EnergyManagementDashboardProps {
  organizationId: string;
  meters: EnergyMeter[];
  readings: EnergyReading[];
  targets: EfficiencyTarget[];
  tariffs: EnergyTariff[];
  metrics: EnergyManagementMetrics;
  stats: EnergyManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'achieved', 'approved', 'renewed'].includes(status)) return 'success';
  if (['pending', 'submitted', 'set', 'calibrating', 'planned', 'under_review'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'decommissioned', 'missed', 'failed', 'suspended', 'offline', 'flagged'].includes(status)) return 'danger';
  return 'info';
};

export function EnergyManagementDashboard({
  meters, readings, targets, tariffs, metrics, stats,
}: EnergyManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredMeters = useMemo(() => {
    if (!search) return meters;
    const q = search.toLowerCase();
    return meters.filter(
      (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [meters, search]);

  const filteredReadings = useMemo(() => {
    if (!search) return readings;
    const q = search.toLowerCase();
    return readings.filter(
      (r) => r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [readings, search]);

  const filteredTargets = useMemo(() => {
    if (!search) return targets;
    const q = search.toLowerCase();
    return targets.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [targets, search]);

  const filteredTariffs = useMemo(() => {
    if (!search) return tariffs;
    const q = search.toLowerCase();
    return tariffs.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [tariffs, search]);

  const tabs: { id: TabId; label: string; icon: typeof Zap }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meters', label: 'Meters', icon: Gauge },
    { id: 'readings', label: 'Readings', icon: ClipboardList },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'tariffs', label: 'Tariffs', icon: Zap },
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
              <div className="text-xs text-fg-tertiary">Active Meters</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeMeters}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Readings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingReadings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Targets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTargets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Tariffs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTariffs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Consumption</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalConsumption}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Meter Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMeterType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Reading Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReadingStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
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
        </div>
      )}

      {tab === 'meters' && (
        <div className="space-y-3">
          {filteredMeters.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gauge} title="No meters" description="Energy meters will appear here." /></Card>
          ) : (
            filteredMeters.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · {m.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.capacity > 0 && <Badge variant="default">{m.capacity} {m.unit}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'readings' && (
        <div className="space-y-3">
          {filteredReadings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No readings" description="Energy readings will appear here." /></Card>
          ) : (
            filteredReadings.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{r.description || 'No description'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.value > 0 && <Badge variant="default">{r.value} {r.unit}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Target} title="No targets" description="Efficiency targets will appear here." /></Card>
          ) : (
            filteredTargets.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.targetValue} {t.unit}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.progress > 0 && <Badge variant="default">{t.progress}%</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tariffs' && (
        <div className="space-y-3">
          {filteredTariffs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Zap} title="No tariffs" description="Energy tariffs will appear here." /></Card>
          ) : (
            filteredTariffs.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.provider || 'No provider'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.rate > 0 && <Badge variant="default">${t.rate}/{t.unit}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
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
