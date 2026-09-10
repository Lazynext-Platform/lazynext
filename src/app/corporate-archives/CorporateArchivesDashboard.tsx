'use client';

import { useState, useMemo } from 'react';
import {
  Archive, FolderOpen, Key, Scan, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ArchiveRecord, ArchiveCollection, ArchiveAccess, ArchiveDigitization,
  CorporateArchivesMetrics, CorporateArchivesStats,
} from '@/lib/services/corporate-archives-service';

type TabId = 'overview' | 'records' | 'collections' | 'access' | 'digitization';

interface CorporateArchivesDashboardProps {
  organizationId: string;
  records: ArchiveRecord[];
  collections: ArchiveCollection[];
  access: ArchiveAccess[];
  digitization: ArchiveDigitization[];
  metrics: CorporateArchivesMetrics;
  stats: CorporateArchivesStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'approved', 'fulfilled', 'closed'].includes(status)) return 'success';
  if (['active', 'open', 'planned', 'in_progress', 'processing', 'requested', 'pending_review', 'quality_check'].includes(status)) return 'warning';
  if (['destroyed', 'denied', 'failed', 'expired', 'revoked', 'restricted', 'deprecated', 'transferred'].includes(status)) return 'danger';
  return 'info';
};

export function CorporateArchivesDashboard({
  records, collections, access, digitization, metrics, stats,
}: CorporateArchivesDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredRecords = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [records, search]);

  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [collections, search]);

  const filteredAccess = useMemo(() => {
    if (!search) return access;
    const q = search.toLowerCase();
    return access.filter(
      (a) => a.requester.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [access, search]);

  const filteredDigitization = useMemo(() => {
    if (!search) return digitization;
    const q = search.toLowerCase();
    return digitization.filter(
      (d) => d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || d.assignedTo.toLowerCase().includes(q),
    );
  }, [digitization, search]);

  const tabs: { id: TabId; label: string; icon: typeof Archive }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'records', label: 'Records', icon: Archive },
    { id: 'collections', label: 'Collections', icon: FolderOpen },
    { id: 'access', label: 'Access', icon: Key },
    { id: 'digitization', label: 'Digitization', icon: Scan },
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
              <div className="text-xs text-fg-tertiary">Active Records</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRecords}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Archived Records</div>
              <div className="mt-1 text-2xl font-bold">{metrics.archivedRecords}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Collections</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openCollections}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Access</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingAccessRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">In Progress Digitization</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inProgressDigitization}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Record Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRecordType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Record Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRecordStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Collection Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCollectionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Access Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAccessStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Digitization Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDigitizationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'records' && (
        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Archive} title="No records" description="Archive records will appear here." /></Card>
          ) : (
            filteredRecords.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.restricted && <Badge variant="danger">Restricted</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'collections' && (
        <div className="space-y-3">
          {filteredCollections.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FolderOpen} title="No collections" description="Archive collections will appear here." /></Card>
          ) : (
            filteredCollections.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.curator || 'No curator'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.extent && <Badge variant="default">{c.extent}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'access' && (
        <div className="space-y-3">
          {filteredAccess.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Key} title="No access requests" description="Access requests will appear here." /></Card>
          ) : (
            filteredAccess.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.requester}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.purpose || 'No purpose'}</div>
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

      {tab === 'digitization' && (
        <div className="space-y-3">
          {filteredDigitization.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Scan} title="No digitization projects" description="Digitization projects will appear here." /></Card>
          ) : (
            filteredDigitization.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{d.assignedTo || 'Unassigned'} · {d.priority} priority</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.qualityScore > 0 && <Badge variant="default">Q:{d.qualityScore}</Badge>}
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
