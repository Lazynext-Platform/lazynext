'use client';

import { useState, useMemo } from 'react';
import {
  Store, FileText, DollarSign, GraduationCap,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  FranchiseUnit, FranchiseAgreement, FranchiseRoyalty, FranchiseTraining,
  FranchiseDevelopmentMetrics, FranchiseDevelopmentStats,
} from '@/lib/services/franchise-development-service';

type TabId = 'overview' | 'units' | 'agreements' | 'royalties' | 'training';

interface FranchiseDevelopmentDashboardProps {
  organizationId: string;
  units: FranchiseUnit[];
  agreements: FranchiseAgreement[];
  royalties: FranchiseRoyalty[];
  training: FranchiseTraining[];
  metrics: FranchiseDevelopmentMetrics;
  stats: FranchiseDevelopmentStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'executed', 'paid', 'completed', 'approved'].includes(status)) return 'success';
  if (['prospective', 'draft', 'pending', 'accrued', 'billed', 'scheduled', 'in_progress', 'renewed'].includes(status)) return 'warning';
  if (['terminated', 'suspended', 'overdue', 'disputed', 'cancelled', 'expired'].includes(status)) return 'danger';
  return 'info';
};

export function FranchiseDevelopmentDashboard({
  units, agreements, royalties, training, metrics, stats,
}: FranchiseDevelopmentDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const unitName = (id: string) => units.find((u) => u.id === id)?.name || id;

  const filteredUnits = useMemo(() => {
    if (!search) return units;
    const q = search.toLowerCase();
    return units.filter(
      (u) => u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q) || u.status.toLowerCase().includes(q),
    );
  }, [units, search]);

  const filteredAgreements = useMemo(() => {
    if (!search) return agreements;
    const q = search.toLowerCase();
    return agreements.filter(
      (a) => a.franchiseeName.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [agreements, search]);

  const filteredRoyalties = useMemo(() => {
    if (!search) return royalties;
    const q = search.toLowerCase();
    return royalties.filter(
      (r) => r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.period.toLowerCase().includes(q),
    );
  }, [royalties, search]);

  const filteredTraining = useMemo(() => {
    if (!search) return training;
    const q = search.toLowerCase();
    return training.filter(
      (t) => t.franchiseeName.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [training, search]);

  const tabs: { id: TabId; label: string; icon: typeof Store }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'units', label: 'Units', icon: Store },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'royalties', label: 'Royalties', icon: DollarSign },
    { id: 'training', label: 'Training', icon: GraduationCap },
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
              <div className="text-xs text-fg-tertiary">Active Units</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeUnits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Executed Agreements</div>
              <div className="mt-1 text-2xl font-bold">{metrics.executedAgreements}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Royalties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingRoyalties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Royalties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueRoyalties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Scheduled Training</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledTraining}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Unit Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byUnitType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Unit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byUnitStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Agreement Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAgreementStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Royalty Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRoyaltyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Training Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTrainingStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'units' && (
        <div className="space-y-3">
          {filteredUnits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Store} title="No franchise units" description="Franchise units will appear here." /></Card>
          ) : (
            filteredUnits.map((u) => (
              <Card key={u.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-fg-secondary">{u.type.replace('_', ' ')} · {u.franchiseeName || 'Unassigned'} · {u.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.initialFee > 0 && <Badge variant="default">${u.initialFee.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(u.status)}>{u.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'agreements' && (
        <div className="space-y-3">
          {filteredAgreements.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No agreements" description="Franchise agreements will appear here." /></Card>
          ) : (
            filteredAgreements.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.franchiseeName}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {unitName(a.unitId)} · {a.royaltyRate}% royalty</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.initialFee > 0 && <Badge variant="default">${a.initialFee.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'royalties' && (
        <div className="space-y-3">
          {filteredRoyalties.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No royalties" description="Royalty records will appear here." /></Card>
          ) : (
            filteredRoyalties.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.type.replace('_', ' ')} · {r.period || 'No period'}</div>
                    <div className="text-sm text-fg-secondary">{unitName(r.unitId)} · {r.currency} {r.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.dueDate && <Badge variant="default">Due: {new Date(r.dueDate).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="space-y-3">
          {filteredTraining.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GraduationCap} title="No training" description="Training programs will appear here." /></Card>
          ) : (
            filteredTraining.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.type.replace('_', ' ')} · {t.franchiseeName}</div>
                    <div className="text-sm text-fg-secondary">{unitName(t.unitId)} · {t.trainer || 'No trainer'} · {t.attendees.length} attendees</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.scheduledDate && <Badge variant="default">{new Date(t.scheduledDate).toLocaleDateString()}</Badge>}
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
