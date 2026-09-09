'use client';

import { useState, useMemo } from 'react';
import {
  FileText, Clock, Archive, Gavel, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  RecordsSchedule, RecordsItem, RecordsDisposal, RecordsLegalHold,
  RecordsManagementMetrics, RecordsManagementStats,
} from '@/lib/services/records-management-service';

type TabId = 'overview' | 'schedules' | 'items' | 'disposals' | 'legalHolds';

interface RecordsManagementDashboardProps {
  organizationId: string;
  schedules: RecordsSchedule[];
  items: RecordsItem[];
  disposals: RecordsDisposal[];
  legalHolds: RecordsLegalHold[];
  metrics: RecordsManagementMetrics;
  stats: RecordsManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'verified', 'executed', 'completed', 'released'].includes(status)) return 'success';
  if (['draft', 'scheduled', 'approved', 'under_review', 'pending_review', 'on_hold'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'disposed', 'superseded', 'archived', 'postponed', 'transferred'].includes(status)) return 'danger';
  return 'info';
};

export function RecordsManagementDashboard({
  schedules, items, disposals, legalHolds, metrics, stats,
}: RecordsManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredSchedules = useMemo(() => {
    if (!search) return schedules;
    const q = search.toLowerCase();
    return schedules.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [schedules, search]);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q),
    );
  }, [items, search]);

  const filteredDisposals = useMemo(() => {
    if (!search) return disposals;
    const q = search.toLowerCase();
    return disposals.filter(
      (d) => d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || d.itemId.toLowerCase().includes(q),
    );
  }, [disposals, search]);

  const filteredLegalHolds = useMemo(() => {
    if (!search) return legalHolds;
    const q = search.toLowerCase();
    return legalHolds.filter(
      (h) => h.title.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.status.toLowerCase().includes(q),
    );
  }, [legalHolds, search]);

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'schedules', label: 'Schedules', icon: FileText },
    { id: 'items', label: 'Items', icon: Clock },
    { id: 'disposals', label: 'Disposals', icon: Archive },
    { id: 'legalHolds', label: 'Legal Holds', icon: Gavel },
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
              <div className="text-xs text-fg-tertiary">Active Schedules</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSchedules}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Archived Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.archivedItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Disposals</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingDisposals}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Holds</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeHolds}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Schedule Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byScheduleType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Item Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byItemStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Disposal Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDisposalStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Legal Hold Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byHoldStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No schedules" description="Records retention schedules will appear here." /></Card>
          ) : (
            filteredSchedules.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.retentionYears > 0 && <Badge variant="default">{s.retentionYears}y</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Clock} title="No items" description="Records items will appear here." /></Card>
          ) : (
            filteredItems.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.restricted && <Badge variant="danger">Restricted</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'disposals' && (
        <div className="space-y-3">
          {filteredDisposals.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Archive} title="No disposals" description="Records disposal actions will appear here." /></Card>
          ) : (
            filteredDisposals.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">Item: {d.itemId} · {d.method || 'No method'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.scheduledDate && <Badge variant="default">{new Date(d.scheduledDate).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'legalHolds' && (
        <div className="space-y-3">
          {filteredLegalHolds.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gavel} title="No legal holds" description="Legal holds will appear here." /></Card>
          ) : (
            filteredLegalHolds.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.title}</div>
                    <div className="text-sm text-fg-secondary">{h.type.replace('_', ' ')} · {h.issuedBy || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.matterNumber && <Badge variant="default">{h.matterNumber}</Badge>}
                    <Badge variant={statusVariant(h.status)}>{h.status.replace('_', ' ')}</Badge>
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
