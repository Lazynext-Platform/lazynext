'use client';

import { useState, useMemo } from 'react';
import {
  Users, AlertCircle, FileText, Gavel, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  LaborUnion, LaborGrievance, LaborContract, LaborDispute,
  LaborRelationsMetrics, LaborRelationsStats,
} from '@/lib/services/labor-relations-service';

type TabId = 'overview' | 'unions' | 'grievances' | 'contracts' | 'disputes';

interface LaborRelationsDashboardProps {
  organizationId: string;
  unions: LaborUnion[];
  grievances: LaborGrievance[];
  contracts: LaborContract[];
  disputes: LaborDispute[];
  metrics: LaborRelationsMetrics;
  stats: LaborRelationsStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'resolved', 'ratified', 'verified', 'approved'].includes(status)) return 'success';
  if (['pending_certification', 'filed', 'under_review', 'investigated', 'mediated', 'arbitrated', 'draft', 'negotiating', 'renegotiating', 'open', 'mediation', 'arbitration'].includes(status)) return 'warning';
  if (['decertified', 'dismissed', 'expired', 'terminated', 'escalated', 'closed', 'critical'].includes(status)) return 'danger';
  return 'info';
};

const priorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'critical') return 'danger';
  return 'default';
};

export function LaborRelationsDashboard({
  unions, grievances, contracts, disputes, metrics, stats,
}: LaborRelationsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const unionName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return unions.find((u) => u.id === id)?.name || id;
  };

  const contractTitle = (id: string | null) => {
    if (!id) return 'Unassigned';
    return contracts.find((c) => c.id === id)?.title || id;
  };

  const filteredUnions = useMemo(() => {
    if (!search) return unions;
    const q = search.toLowerCase();
    return unions.filter(
      (u) => u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q) || u.status.toLowerCase().includes(q),
    );
  }, [unions, search]);

  const filteredGrievances = useMemo(() => {
    if (!search) return grievances;
    const q = search.toLowerCase();
    return grievances.filter(
      (g) => g.title.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [grievances, search]);

  const filteredContracts = useMemo(() => {
    if (!search) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(
      (c) => c.title.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [contracts, search]);

  const filteredDisputes = useMemo(() => {
    if (!search) return disputes;
    const q = search.toLowerCase();
    return disputes.filter(
      (d) => d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [disputes, search]);

  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'unions', label: 'Unions', icon: Users },
    { id: 'grievances', label: 'Grievances', icon: AlertCircle },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'disputes', label: 'Disputes', icon: Gavel },
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
              <div className="text-xs text-fg-tertiary">Active Unions</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeUnions}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Grievances</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openGrievances}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Critical Grievances</div>
              <div className="mt-1 text-2xl font-bold">{metrics.criticalGrievances}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Contracts</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeContracts}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Disputes</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openDisputes}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Union Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byUnionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Grievance Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGrievanceStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Grievance Priority Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGrievancePriority).map(([priority, count]) => (
                <Badge key={priority} variant={priorityVariant(priority)}>{priority}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Contract Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byContractStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Dispute Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDisputeStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'unions' && (
        <div className="space-y-3">
          {filteredUnions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No unions" description="Labor unions will appear here." /></Card>
          ) : (
            filteredUnions.map((u) => (
              <Card key={u.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-fg-secondary">{u.type.replace('_', ' ')} · {u.localNumber || 'No local'} · {u.memberCount} members</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.affiliate && <Badge variant="default">{u.affiliate}</Badge>}
                    <Badge variant={statusVariant(u.status)}>{u.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'grievances' && (
        <div className="space-y-3">
          {filteredGrievances.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertCircle} title="No grievances" description="Labor grievances will appear here." /></Card>
          ) : (
            filteredGrievances.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-fg-secondary">{g.type.replace('_', ' ')} · {unionName(g.unionId)} · {g.filedBy || 'Anonymous'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(g.priority)}>{g.priority}</Badge>
                    <Badge variant={statusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'contracts' && (
        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No contracts" description="Labor contracts will appear here." /></Card>
          ) : (
            filteredContracts.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {unionName(c.unionId)} · {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'No end date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-3">
          {filteredDisputes.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gavel} title="No disputes" description="Labor disputes will appear here." /></Card>
          ) : (
            filteredDisputes.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {unionName(d.unionId)} · {contractTitle(d.contractId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(d.priority)}>{d.priority}</Badge>
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
