'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck, FileText, Wind, Trash2, ClipboardList, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EnvPermit, EmissionRecord, WasteRecord, EnvReport,
  EnvironmentalComplianceMetrics, EnvironmentalComplianceStats,
} from '@/lib/services/environmental-compliance-service';

type TabId = 'overview' | 'permits' | 'emissions' | 'wastes' | 'reports';

interface EnvironmentalComplianceDashboardProps {
  organizationId: string;
  permits: EnvPermit[];
  emissions: EmissionRecord[];
  wastes: WasteRecord[];
  reports: EnvReport[];
  metrics: EnvironmentalComplianceMetrics;
  stats: EnvironmentalComplianceStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'approved', 'achieved', 'adopted', 'published', 'recycled', 'measured'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_review', 'in_progress', 'evaluating', 'held', 'reviewed', 'estimated', 'reported', 'generated', 'stored', 'transported', 'treated'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'revoked', 'rejected', 'deprecated', 'archived', 'decommissioned', 'inactive', 'disposed'].includes(status)) return 'danger';
  return 'info';
};

export function EnvironmentalComplianceDashboard({
  permits, emissions, wastes, reports, metrics, stats,
}: EnvironmentalComplianceDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredPermits = useMemo(() => {
    if (!search) return permits;
    const q = search.toLowerCase();
    return permits.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [permits, search]);

  const filteredEmissions = useMemo(() => {
    if (!search) return emissions;
    const q = search.toLowerCase();
    return emissions.filter(
      (e) => e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    );
  }, [emissions, search]);

  const filteredWastes = useMemo(() => {
    if (!search) return wastes;
    const q = search.toLowerCase();
    return wastes.filter(
      (w) => w.type.toLowerCase().includes(q) || w.status.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
    );
  }, [wastes, search]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const tabs: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'permits', label: 'Permits', icon: ShieldCheck },
    { id: 'emissions', label: 'Emissions', icon: Wind },
    { id: 'wastes', label: 'Wastes', icon: Trash2 },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
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
              <div className="text-xs text-fg-tertiary">Active Permits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePermits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Expiring Permits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.expiringPermits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Emissions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalEmissions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Recycled Waste</div>
              <div className="mt-1 text-2xl font-bold">{metrics.recycledWaste}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Compliance Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.complianceRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Permit Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPermitType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Permit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPermitStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Waste Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byWasteStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'permits' && (
        <div className="space-y-3">
          {filteredPermits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShieldCheck} title="No permits" description="Environmental permits will appear here." /></Card>
          ) : (
            filteredPermits.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.permitNumber || 'No permit number'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.issuingAuthority && <Badge variant="default">{p.issuingAuthority}</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'emissions' && (
        <div className="space-y-3">
          {filteredEmissions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wind} title="No emissions records" description="Emissions records will appear here." /></Card>
          ) : (
            filteredEmissions.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{e.scope} · {e.facility || 'No facility'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.amount > 0 && <Badge variant="default">{e.amount} {e.unit}</Badge>}
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'wastes' && (
        <div className="space-y-3">
          {filteredWastes.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Trash2} title="No waste records" description="Waste tracking records will appear here." /></Card>
          ) : (
            filteredWastes.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{w.disposalMethod.replace('_', ' ') || 'No disposal method'} · {w.contractor || 'No contractor'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.amount > 0 && <Badge variant="default">{w.amount} {w.unit}</Badge>}
                    <Badge variant={statusVariant(w.status)}>{w.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No compliance reports" description="Compliance reports will appear here." /></Card>
          ) : (
            filteredReports.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.period || 'No period'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.author && <Badge variant="default">{r.author}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
