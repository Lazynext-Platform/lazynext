'use client';

import { useState, useMemo } from 'react';
import {
  Shield, FileText, Users, UserCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EstateTrust, EstateWill, EstateBeneficiary, EstateExecutor,
  EstatePlanningMetrics, EstatePlanningStats,
} from '@/lib/services/estate-planning-service';

type TabId = 'overview' | 'trusts' | 'wills' | 'beneficiaries' | 'executors';

interface EstatePlanningDashboardProps {
  organizationId: string;
  trusts: EstateTrust[];
  wills: EstateWill[];
  beneficiaries: EstateBeneficiary[];
  executors: EstateExecutor[];
  metrics: EstatePlanningMetrics;
  stats: EstatePlanningStats;
}

const trustStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (['draft', 'pending_funding'].includes(status)) return 'warning';
  if (['terminated', 'suspended'].includes(status)) return 'danger';
  return 'info';
};

const willStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['executed', 'probated'].includes(status)) return 'success';
  if (['draft', 'amended'].includes(status)) return 'warning';
  if (['revoked', 'contested'].includes(status)) return 'danger';
  return 'info';
};

const beneficiaryStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (['minor', 'incapacitated'].includes(status)) return 'warning';
  if (['deceased', 'disclaimed', 'removed'].includes(status)) return 'danger';
  return 'info';
};

const executorStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'compensated'].includes(status)) return 'success';
  if (status === 'appointed') return 'warning';
  if (['declined', 'removed', 'resigned'].includes(status)) return 'danger';
  return 'info';
};

export function EstatePlanningDashboard({
  trusts, wills, beneficiaries, executors, metrics, stats,
}: EstatePlanningDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredTrusts = useMemo(() => {
    if (!search) return trusts;
    const q = search.toLowerCase();
    return trusts.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [trusts, search]);

  const filteredWills = useMemo(() => {
    if (!search) return wills;
    const q = search.toLowerCase();
    return wills.filter(
      (w) => w.title.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.status.toLowerCase().includes(q),
    );
  }, [wills, search]);

  const filteredBeneficiaries = useMemo(() => {
    if (!search) return beneficiaries;
    const q = search.toLowerCase();
    return beneficiaries.filter(
      (b) => b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [beneficiaries, search]);

  const filteredExecutors = useMemo(() => {
    if (!search) return executors;
    const q = search.toLowerCase();
    return executors.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [executors, search]);

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trusts', label: 'Trusts', icon: Shield },
    { id: 'wills', label: 'Wills', icon: FileText },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: Users },
    { id: 'executors', label: 'Executors', icon: UserCheck },
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
              <div className="text-xs text-fg-tertiary">Active Trusts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTrusts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Executed Wills</div>
              <div className="mt-1 text-2xl font-bold">{metrics.executedWills}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Beneficiaries</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeBeneficiaries}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Executors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeExecutors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Trust Value</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalTrustValue.toLocaleString()}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Trust Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTrustType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Will Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byWillStatus).map(([status, count]) => (
                <Badge key={status} variant={willStatusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Beneficiary Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byBeneficiaryType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Executor Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byExecutorStatus).map(([status, count]) => (
                <Badge key={status} variant={executorStatusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'trusts' && (
        <div className="space-y-3">
          {filteredTrusts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Shield} title="No trusts" description="Estate trusts will appear here." /></Card>
          ) : (
            filteredTrusts.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.trustee || 'No trustee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.value > 0 && <Badge variant="default">${t.value.toLocaleString()}</Badge>}
                    <Badge variant={trustStatusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'wills' && (
        <div className="space-y-3">
          {filteredWills.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No wills" description="Estate wills will appear here." /></Card>
          ) : (
            filteredWills.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-sm text-fg-secondary">{w.type.replace('_', ' ')} · {w.testator || 'Unknown testator'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.notarized && <Badge variant="default">Notarized</Badge>}
                    <Badge variant={willStatusVariant(w.status)}>{w.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'beneficiaries' && (
        <div className="space-y-3">
          {filteredBeneficiaries.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No beneficiaries" description="Estate beneficiaries will appear here." /></Card>
          ) : (
            filteredBeneficiaries.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-sm text-fg-secondary">{b.type.replace('_', ' ')} · {b.relationship || 'No relationship'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.sharePercentage > 0 && <Badge variant="default">{b.sharePercentage}%</Badge>}
                    <Badge variant={beneficiaryStatusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'executors' && (
        <div className="space-y-3">
          {filteredExecutors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserCheck} title="No executors" description="Estate executors will appear here." /></Card>
          ) : (
            filteredExecutors.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.relationship || 'No relationship'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.compensation && <Badge variant="default">{e.compensation}</Badge>}
                    <Badge variant={executorStatusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
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
