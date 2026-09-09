'use client';

import { useState, useMemo } from 'react';
import {
  Factory, Calculator, FileText, Radio, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  GHGEmission, EmissionFactor, GHGReport, EmissionSource,
  GHGEmissionsManagementMetrics, GHGEmissionsManagementStats,
} from '@/lib/services/ghg-emissions-management-service';

type TabId = 'overview' | 'emissions' | 'factors' | 'reports' | 'sources';

interface GHGEmissionsManagementDashboardProps {
  organizationId: string;
  emissions: GHGEmission[];
  factors: EmissionFactor[];
  reports: GHGReport[];
  sources: EmissionSource[];
  metrics: GHGEmissionsManagementMetrics;
  stats: GHGEmissionsManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'approved', 'achieved', 'adopted', 'published', 'calculated', 'monitored', 'submitted'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'under_review', 'in_review', 'in_progress', 'evaluating', 'held', 'reviewed', 'estimated', 'reported'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'revoked', 'rejected', 'deprecated', 'archived', 'decommissioned', 'inactive'].includes(status)) return 'danger';
  return 'info';
};

export function GHGEmissionsManagementDashboard({
  emissions, factors, reports, sources, metrics, stats,
}: GHGEmissionsManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredEmissions = useMemo(() => {
    if (!search) return emissions;
    const q = search.toLowerCase();
    return emissions.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [emissions, search]);

  const filteredFactors = useMemo(() => {
    if (!search) return factors;
    const q = search.toLowerCase();
    return factors.filter(
      (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [factors, search]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const filteredSources = useMemo(() => {
    if (!search) return sources;
    const q = search.toLowerCase();
    return sources.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sources, search]);

  const tabs: { id: TabId; label: string; icon: typeof Factory }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'emissions', label: 'Emissions', icon: Factory },
    { id: 'factors', label: 'Factors', icon: Calculator },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'sources', label: 'Sources', icon: Radio },
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
              <div className="text-xs text-fg-tertiary">Calculated Emissions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.calculatedEmissions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Verified Emissions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.verifiedEmissions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Factors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeFactors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Submitted Reports</div>
              <div className="mt-1 text-2xl font-bold">{metrics.submittedReports}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Sources</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSources}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Emission Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEmissionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Emission Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEmissionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Report Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byReportStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'emissions' && (
        <div className="space-y-3">
          {filteredEmissions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Factory} title="No GHG emissions" description="GHG emissions will appear here." /></Card>
          ) : (
            filteredEmissions.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.scope || 'No scope'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.co2e > 0 && <Badge variant="default">{e.co2e} {e.unit}</Badge>}
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'factors' && (
        <div className="space-y-3">
          {filteredFactors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calculator} title="No emission factors" description="Emission factors will appear here." /></Card>
          ) : (
            filteredFactors.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · {f.source || 'No source'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.factor > 0 && <Badge variant="default">{f.factor} {f.unit}</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No GHG reports" description="GHG reports will appear here." /></Card>
          ) : (
            filteredReports.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.period || 'No period'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.totalEmissions > 0 && <Badge variant="default">{r.totalEmissions} {r.unit}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div className="space-y-3">
          {filteredSources.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Radio} title="No emission sources" description="Emission sources will appear here." /></Card>
          ) : (
            filteredSources.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.fuelType && <Badge variant="default">{s.fuelType}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
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
