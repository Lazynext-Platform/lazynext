'use client';

import { useState, useMemo } from 'react';
import {
  Printer, FileText, Package, Wrench, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PrintJob, Printer as PrinterType, PrintSupply, PrintMaintenance,
  PrintServicesMetrics, PrintServicesStats,
} from '@/lib/services/print-services-service';

type TabId = 'overview' | 'jobs' | 'printers' | 'supplies' | 'maintenance';

interface PrintServicesDashboardProps {
  organizationId: string;
  jobs: PrintJob[];
  printers: PrinterType[];
  supplies: PrintSupply[];
  maintenance: PrintMaintenance[];
  metrics: PrintServicesMetrics;
  stats: PrintServicesStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'active', 'received', 'in_stock'].includes(status)) return 'success';
  if (['submitted', 'processing', 'scheduled', 'in_progress', 'low', 'reordered', 'maintained'].includes(status)) return 'warning';
  if (['cancelled', 'failed', 'decommissioned', 'offline', 'error', 'out', 'depleted'].includes(status)) return 'danger';
  return 'info';
};

export function PrintServicesDashboard({
  jobs, printers, supplies, maintenance, metrics, stats,
}: PrintServicesDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredJobs = useMemo(() => {
    if (!search) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) => j.requester.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || j.status.toLowerCase().includes(q),
    );
  }, [jobs, search]);

  const filteredPrinters = useMemo(() => {
    if (!search) return printers;
    const q = search.toLowerCase();
    return printers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [printers, search]);

  const filteredSupplies = useMemo(() => {
    if (!search) return supplies;
    const q = search.toLowerCase();
    return supplies.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [supplies, search]);

  const filteredMaintenance = useMemo(() => {
    if (!search) return maintenance;
    const q = search.toLowerCase();
    return maintenance.filter(
      (m) => m.technician.toLowerCase().includes(q) || m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [maintenance, search]);

  const tabs: { id: TabId; label: string; icon: typeof Printer }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'jobs', label: 'Jobs', icon: FileText },
    { id: 'printers', label: 'Printers', icon: Printer },
    { id: 'supplies', label: 'Supplies', icon: Package },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
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
              <div className="text-xs text-fg-tertiary">Active Printers</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePrinters}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Jobs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingJobs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Jobs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedJobs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Low Supplies</div>
              <div className="mt-1 text-2xl font-bold">{metrics.lowSupplies}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Maintenance</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingMaintenance}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Job Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byJobType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Job Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byJobStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Supply Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySupplyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No jobs" description="Print jobs will appear here." /></Card>
          ) : (
            filteredJobs.map((j) => (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{j.requester || 'Unknown requester'}</div>
                    <div className="text-sm text-fg-secondary">{j.type.replace('_', ' ')} · {j.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.copies > 0 && <Badge variant="default">{j.copies} copies</Badge>}
                    <Badge variant={statusVariant(j.status)}>{j.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'printers' && (
        <div className="space-y-3">
          {filteredPrinters.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Printer} title="No printers" description="Printers will appear here." /></Card>
          ) : (
            filteredPrinters.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.colorCapable && <Badge variant="default">Color</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'supplies' && (
        <div className="space-y-3">
          {filteredSupplies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No supplies" description="Print supplies will appear here." /></Card>
          ) : (
            filteredSupplies.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.supplier || 'No supplier'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.quantity > 0 && <Badge variant="default">{s.quantity} {s.unit}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-3">
          {filteredMaintenance.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No maintenance" description="Maintenance records will appear here." /></Card>
          ) : (
            filteredMaintenance.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{m.technician || 'No technician'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.cost > 0 && <Badge variant="default">${m.cost}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
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
