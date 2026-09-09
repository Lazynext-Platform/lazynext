'use client';

import { useState, useMemo } from 'react';
import {
  Wind, Radio, ClipboardList, SlidersHorizontal, Bell, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  AirSensor, AirReading, AirThreshold, AirAlert,
  AirQualityManagementMetrics, AirQualityManagementStats,
} from '@/lib/services/air-quality-management-service';

type TabId = 'overview' | 'sensors' | 'readings' | 'thresholds' | 'alerts';

interface AirQualityManagementDashboardProps {
  organizationId: string;
  sensors: AirSensor[];
  readings: AirReading[];
  thresholds: AirThreshold[];
  alerts: AirAlert[];
  metrics: AirQualityManagementMetrics;
  stats: AirQualityManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'verified', 'resolved', 'closed'].includes(status)) return 'success';
  if (['pending', 'submitted', 'calibrating', 'acknowledged'].includes(status)) return 'warning';
  if (['decommissioned', 'offline', 'flagged', 'escalated', 'breach', 'critical'].includes(status)) return 'danger';
  return 'info';
};

export function AirQualityManagementDashboard({
  sensors, readings, thresholds, alerts, metrics, stats,
}: AirQualityManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredSensors = useMemo(() => {
    if (!search) return sensors;
    const q = search.toLowerCase();
    return sensors.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sensors, search]);

  const filteredReadings = useMemo(() => {
    if (!search) return readings;
    const q = search.toLowerCase();
    return readings.filter(
      (r) => r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.parameter.toLowerCase().includes(q),
    );
  }, [readings, search]);

  const filteredThresholds = useMemo(() => {
    if (!search) return thresholds;
    const q = search.toLowerCase();
    return thresholds.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [thresholds, search]);

  const filteredAlerts = useMemo(() => {
    if (!search) return alerts;
    const q = search.toLowerCase();
    return alerts.filter(
      (a) => a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    );
  }, [alerts, search]);

  const tabs: { id: TabId; label: string; icon: typeof Wind }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sensors', label: 'Sensors', icon: Radio },
    { id: 'readings', label: 'Readings', icon: ClipboardList },
    { id: 'thresholds', label: 'Thresholds', icon: SlidersHorizontal },
    { id: 'alerts', label: 'Alerts', icon: Bell },
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
              <div className="text-xs text-fg-tertiary">Active Sensors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSensors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Readings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingReadings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Thresholds</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeThresholds}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Alerts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAlerts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Critical Alerts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.criticalAlerts}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Sensor Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySensorType).map(([type, count]) => (
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
            <h3 className="mb-4 text-sm font-semibold">Alert Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAlertStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'sensors' && (
        <div className="space-y-3">
          {filteredSensors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Radio} title="No sensors" description="Air quality sensors will appear here." /></Card>
          ) : (
            filteredSensors.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.zone && <Badge variant="default">{s.zone}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No readings" description="Air quality readings will appear here." /></Card>
          ) : (
            filteredReadings.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{r.parameter || 'No parameter'}</div>
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

      {tab === 'thresholds' && (
        <div className="space-y-3">
          {filteredThresholds.length === 0 ? (
            <Card className="p-8"><EmptyState icon={SlidersHorizontal} title="No thresholds" description="Air quality thresholds will appear here." /></Card>
          ) : (
            filteredThresholds.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.parameter || 'No parameter'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.maxValue > 0 && <Badge variant="default">Max {t.maxValue} {t.unit}</Badge>}
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Bell} title="No alerts" description="Air quality alerts will appear here." /></Card>
          ) : (
            filteredAlerts.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{a.description || 'No description'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.severity && <Badge variant={statusVariant(a.severity)}>{a.severity}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
