'use client';

import { useState, useMemo } from 'react';
import {
  Package, UserCheck, TrendingDown, ClipboardCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  AssetItem, AssetAssignment, DepreciationRecord, AssetAudit,
  AssetTrackingMetrics, AssetTrackingStats,
} from '@/lib/services/asset-tracking-service';

type TabId = 'overview' | 'assets' | 'assignments' | 'depreciation' | 'audits';

interface AssetTrackingDashboardProps {
  organizationId: string;
  workspaceId: string;
  assets: AssetItem[];
  assignments: AssetAssignment[];
  depreciations: DepreciationRecord[];
  audits: AssetAudit[];
  metrics: AssetTrackingMetrics;
  stats: AssetTrackingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'verified', 'returned', 'available', 'excellent'].includes(status)) return 'success';
  if (['active', 'assigned', 'in_progress', 'planned', 'good', 'in_repair'].includes(status)) return 'warning';
  if (['retired', 'lost', 'disposed', 'cancelled', 'damaged', 'poor', 'suspended'].includes(status)) return 'danger';
  return 'info';
};

const conditionVariant = (condition: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (condition === 'excellent') return 'success';
  if (condition === 'good') return 'info';
  if (condition === 'fair') return 'warning';
  if (condition === 'poor' || condition === 'damaged') return 'danger';
  return 'default';
};

export function AssetTrackingDashboard({
  assets, assignments, depreciations, audits, metrics, stats,
}: AssetTrackingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const assetName = useMemo(() => {
    const map = new Map(assets.map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) || id;
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const filteredAssignments = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) => a.assignedToName.toLowerCase().includes(q) || a.assignedTo.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || assetName(a.assetId).toLowerCase().includes(q),
    );
  }, [assignments, search, assetName]);

  const filteredDepreciations = useMemo(() => {
    if (!search) return depreciations;
    const q = search.toLowerCase();
    return depreciations.filter(
      (d) => d.method.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || assetName(d.assetId).toLowerCase().includes(q),
    );
  }, [depreciations, search, assetName]);

  const filteredAudits = useMemo(() => {
    if (!search) return audits;
    const q = search.toLowerCase();
    return audits.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.auditor.toLowerCase().includes(q),
    );
  }, [audits, search]);

  const tabs: { id: TabId; label: string; icon: typeof Package }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'assignments', label: 'Assignments', icon: UserCheck },
    { id: 'depreciation', label: 'Depreciation', icon: TrendingDown },
    { id: 'audits', label: 'Audits', icon: ClipboardCheck },
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
              <div className="text-xs text-fg-tertiary">Total Assets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Assigned</div>
              <div className="mt-1 text-2xl font-bold">{metrics.assignedAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Value</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Audits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedAudits}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Category Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetCategory).map(([cat, count]) => (
                <Badge key={cat} variant="info">{cat.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Condition Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetCondition).map(([cond, count]) => (
                <Badge key={cond} variant={conditionVariant(cond)}>{cond.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Audit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAuditStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'assets' && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No assets" description="Tracked assets will appear here." /></Card>
          ) : (
            filteredAssets.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.category.replace('_', ' ')} · {a.assetTag || 'No tag'} · {a.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.currentValue > 0 && <Badge variant="default">${a.currentValue.toLocaleString()}</Badge>}
                    <Badge variant={conditionVariant(a.condition)}>{a.condition.replace('_', ' ')}</Badge>
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-3">
          {filteredAssignments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserCheck} title="No assignments" description="Asset assignments will appear here." /></Card>
          ) : (
            filteredAssignments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.assignedToName}</div>
                    <div className="text-sm text-fg-secondary">{assetName(a.assetId)} · {a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : 'No date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'depreciation' && (
        <div className="space-y-3">
          {filteredDepreciations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={TrendingDown} title="No depreciation records" description="Depreciation records will appear here." /></Card>
          ) : (
            filteredDepreciations.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{assetName(d.assetId)}</div>
                    <div className="text-sm text-fg-secondary">{d.method.replace('_', ' ')} · Accumulated: ${d.accumulatedDepreciation.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.currentValue > 0 && <Badge variant="default">${d.currentValue.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'audits' && (
        <div className="space-y-3">
          {filteredAudits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardCheck} title="No audits" description="Asset audits will appear here." /></Card>
          ) : (
            filteredAudits.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.auditor || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
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
