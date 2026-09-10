'use client';

import { useState, useMemo } from 'react';
import {
  Trash2, Recycle, FileText, Store, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  WasteStream, RecyclingProgram, WasteDisposal, WasteVendor,
  WasteManagementMetrics, WasteManagementStats,
} from '@/lib/services/waste-management-service';

type TabId = 'overview' | 'streams' | 'programs' | 'disposals' | 'vendors';

interface WasteManagementDashboardProps {
  organizationId: string;
  streams: WasteStream[];
  programs: RecyclingProgram[];
  disposals: WasteDisposal[];
  vendors: WasteVendor[];
  metrics: WasteManagementMetrics;
  stats: WasteManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended'].includes(status)) return 'danger';
  return 'info';
};

export function WasteManagementDashboard({
  streams, programs, disposals, vendors, metrics, stats,
}: WasteManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredStreams = useMemo(() => {
    if (!search) return streams;
    const q = search.toLowerCase();
    return streams.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [streams, search]);

  const filteredPrograms = useMemo(() => {
    if (!search) return programs;
    const q = search.toLowerCase();
    return programs.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [programs, search]);

  const filteredDisposals = useMemo(() => {
    if (!search) return disposals;
    const q = search.toLowerCase();
    return disposals.filter(
      (d) => d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [disposals, search]);

  const filteredVendors = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const tabs: { id: TabId; label: string; icon: typeof Trash2 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'streams', label: 'Streams', icon: Trash2 },
    { id: 'programs', label: 'Programs', icon: Recycle },
    { id: 'disposals', label: 'Disposals', icon: FileText },
    { id: 'vendors', label: 'Vendors', icon: Store },
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
              <div className="text-xs text-fg-tertiary">Active Streams</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeStreams}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Programs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePrograms}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Disposals</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingDisposals}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Vendors</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeVendors}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Recycled Volume</div>
              <div className="mt-1 text-2xl font-bold">{metrics.recycledVolume}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Stream Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStreamType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Program Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProgramStatus).map(([status, count]) => (
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
        </div>
      )}

      {tab === 'streams' && (
        <div className="space-y-3">
          {filteredStreams.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Trash2} title="No waste streams" description="Waste streams will appear here." /></Card>
          ) : (
            filteredStreams.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.source || 'No source'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.volume > 0 && <Badge variant="default">{s.volume} {s.unit}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'programs' && (
        <div className="space-y-3">
          {filteredPrograms.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Recycle} title="No recycling programs" description="Recycling programs will appear here." /></Card>
          ) : (
            filteredPrograms.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.coordinator || 'No coordinator'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.participants > 0 && <Badge variant="default">{p.participants} participants</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={FileText} title="No disposals" description="Waste disposal records will appear here." /></Card>
          ) : (
            filteredDisposals.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{d.description || 'No description'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.cost > 0 && <Badge variant="default">${d.cost}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'vendors' && (
        <div className="space-y-3">
          {filteredVendors.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Store} title="No vendors" description="Waste vendors will appear here." /></Card>
          ) : (
            filteredVendors.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.certification || 'No certification'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.rating > 0 && <Badge variant="default">{v.rating}★</Badge>}
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
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
