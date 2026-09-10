'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Store, FileText, MapPin, DollarSign, CheckCircle,
  Search, BarChart3, AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  Franchisee, FranchiseAgreement, FranchiseTerritory,
  FranchiseRoyalty, FranchiseCompliance, FranchiseMetrics, FranchiseStats,
} from '@/lib/services/franchise-service';

type TabId = 'overview' | 'franchisees' | 'agreements' | 'territories' | 'royalties' | 'compliance';

interface FranchiseDashboardProps {
  organizationId: string;
  franchisees: Franchisee[];
  agreements: FranchiseAgreement[];
  territories: FranchiseTerritory[];
  royalties: FranchiseRoyalty[];
  compliance: FranchiseCompliance[];
  metrics: FranchiseMetrics;
  stats: FranchiseStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'paid', 'pass', 'closed', 'resolved', 'assigned', 'signed', 'renewed'].includes(status)) return 'success';
  if (['prospect', 'pending', 'draft', 'reserved', 'partial', 'in_progress', 'warning'].includes(status)) return 'warning';
  if (['terminated', 'expired', 'overdue', 'fail', 'suspended', 'delinquent', 'bankruptcy'].includes(status)) return 'danger';
  if (['available', 'waived', 'retired', 'inactive'].includes(status)) return 'default';
  return 'info';
};

export function FranchiseDashboard({
  franchisees, agreements, territories, royalties, compliance, metrics, stats,
}: FranchiseDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const franchiseeName = useCallback(
    (id: string) => franchisees.find((f) => f.id === id)?.name || id,
    [franchisees],
  );

  const filteredFranchisees = useMemo(() => {
    if (!search) return franchisees;
    const q = search.toLowerCase();
    return franchisees.filter(
      (f) => f.name.toLowerCase().includes(q) || f.status.toLowerCase().includes(q) || f.location.toLowerCase().includes(q),
    );
  }, [franchisees, search]);

  const filteredAgreements = useMemo(() => {
    if (!search) return agreements;
    const q = search.toLowerCase();
    return agreements.filter(
      (a) => a.agreementNumber.toLowerCase().includes(q) || franchiseeName(a.franchiseeId).toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [agreements, search, franchiseeName]);

  const filteredTerritories = useMemo(() => {
    if (!search) return territories;
    const q = search.toLowerCase();
    return territories.filter(
      (t) => t.name.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [territories, search]);

  const filteredRoyalties = useMemo(() => {
    if (!search) return royalties;
    const q = search.toLowerCase();
    return royalties.filter(
      (r) => franchiseeName(r.franchiseeId).toLowerCase().includes(q) || r.period.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [royalties, search, franchiseeName]);

  const filteredCompliance = useMemo(() => {
    if (!search) return compliance;
    const q = search.toLowerCase();
    return compliance.filter(
      (c) => franchiseeName(c.franchiseeId).toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.result.toLowerCase().includes(q),
    );
  }, [compliance, search, franchiseeName]);

  const tabs: { id: TabId; label: string; icon: typeof Store }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'franchisees', label: 'Franchisees', icon: Store },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'territories', label: 'Territories', icon: MapPin },
    { id: 'royalties', label: 'Royalties', icon: DollarSign },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
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

      {/* Search */}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Franchisees</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeFranchisees}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Royalties</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalRoyalties.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Compliance Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.complianceRate}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Avg Revenue</div>
              <div className="mt-1 text-2xl font-bold">${metrics.avgRevenuePerFranchisee.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Territory Util.</div>
              <div className="mt-1 text-2xl font-bold">{metrics.territoryUtilization}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Compliance</div>
              <div className="mt-1 text-2xl font-bold">{stats.openComplianceCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Franchisee Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFranchiseeStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Royalty Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRoyaltyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'franchisees' && (
        <div className="space-y-3">
          {filteredFranchisees.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Store} title="No franchisees" description="Franchisees will appear here." /></Card>
          ) : (
            filteredFranchisees.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-sm text-fg-secondary">{f.location} · {f.franchiseType.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(f.status)}>{f.status}</Badge>
                    <Badge variant={statusVariant(f.financialStatus)}>{f.financialStatus.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={FileText} title="No agreements" description="Agreements will appear here." /></Card>
          ) : (
            filteredAgreements.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.agreementNumber}</div>
                    <div className="text-sm text-fg-secondary">{franchiseeName(a.franchiseeId)} · {a.type.replace('_', ' ')}</div>
                  </div>
                  <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'territories' && (
        <div className="space-y-3">
          {filteredTerritories.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MapPin} title="No territories" description="Territories will appear here." /></Card>
          ) : (
            filteredTerritories.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">Pop: {t.population.toLocaleString()} · {t.existingLocations} locations</div>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
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
                    <div className="font-medium">{franchiseeName(r.franchiseeId)} — {r.period}</div>
                    <div className="text-sm text-fg-secondary">Sales: ${r.grossSales.toLocaleString()} · Royalty: ${r.royaltyAmount.toLocaleString()}</div>
                  </div>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="space-y-3">
          {filteredCompliance.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No compliance checks" description="Compliance checks will appear here." /></Card>
          ) : (
            filteredCompliance.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{franchiseeName(c.franchiseeId)} — {c.type}</div>
                    <div className="text-sm text-fg-secondary">{c.checker} · {new Date(c.checkDate).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(c.result)}>{c.result}</Badge>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
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
