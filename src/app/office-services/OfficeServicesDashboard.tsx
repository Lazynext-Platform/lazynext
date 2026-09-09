'use client';

import { useState, useMemo } from 'react';
import {
  Briefcase, Wrench, Mail, Printer, Package, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  OfficeRequest, MailRecord, PrintJob, SupplyOrder,
  OfficeServicesMetrics, OfficeServicesStats,
} from '@/lib/services/office-services-service';

type TabId = 'overview' | 'requests' | 'mail' | 'print' | 'supplies';

interface OfficeServicesDashboardProps {
  organizationId: string;
  requests: OfficeRequest[];
  mail: MailRecord[];
  printJobs: PrintJob[];
  supplies: SupplyOrder[];
  metrics: OfficeServicesMetrics;
  stats: OfficeServicesStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'delivered', 'received', 'distributed'].includes(status)) return 'success';
  if (['submitted', 'assigned', 'in_progress', 'queued', 'printing', 'sorted', 'requested', 'approved', 'ordered', 'on_hold', 'held', 'reprinted'].includes(status)) return 'warning';
  if (['cancelled', 'failed', 'lost', 'returned'].includes(status)) return 'danger';
  return 'info';
};

const priorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'urgent') return 'danger';
  return 'default';
};

export function OfficeServicesDashboard({
  requests, mail, printJobs, supplies, metrics, stats,
}: OfficeServicesDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [requests, search]);

  const filteredMail = useMemo(() => {
    if (!search) return mail;
    const q = search.toLowerCase();
    return mail.filter(
      (m) => m.sender.toLowerCase().includes(q) || m.recipient.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [mail, search]);

  const filteredPrintJobs = useMemo(() => {
    if (!search) return printJobs;
    const q = search.toLowerCase();
    return printJobs.filter(
      (p) => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [printJobs, search]);

  const filteredSupplies = useMemo(() => {
    if (!search) return supplies;
    const q = search.toLowerCase();
    return supplies.filter(
      (s) => s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q) || s.supplier.toLowerCase().includes(q),
    );
  }, [supplies, search]);

  const tabs: { id: TabId; label: string; icon: typeof Briefcase }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'requests', label: 'Requests', icon: Wrench },
    { id: 'mail', label: 'Mail', icon: Mail },
    { id: 'print', label: 'Print', icon: Printer },
    { id: 'supplies', label: 'Supplies', icon: Package },
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
              <div className="text-xs text-fg-tertiary">Open Requests</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Urgent Requests</div>
              <div className="mt-1 text-2xl font-bold">{metrics.urgentRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Mail</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingMail}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Queued Print Jobs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.queuedPrintJobs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Supply Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingSupplyOrders}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Request Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRequestType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Request Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRequestStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Mail Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMailStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Print Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPrintStatus).map(([status, count]) => (
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

      {tab === 'requests' && (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No requests" description="Office requests will appear here." /></Card>
          ) : (
            filteredRequests.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.requestedBy || 'Unassigned'} · {r.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
                    {r.cost > 0 && <Badge variant="default">${r.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'mail' && (
        <div className="space-y-3">
          {filteredMail.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Mail} title="No mail" description="Mail records will appear here." /></Card>
          ) : (
            filteredMail.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.subject || '(No subject)'}</div>
                    <div className="text-sm text-fg-secondary">{m.type.replace('_', ' ')} · {m.sender || 'Unknown'} → {m.recipient || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.trackingNumber && <Badge variant="default">{m.trackingNumber}</Badge>}
                    {m.postage > 0 && <Badge variant="default">${m.postage.toFixed(2)}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'print' && (
        <div className="space-y-3">
          {filteredPrintJobs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Printer} title="No print jobs" description="Print jobs will appear here." /></Card>
          ) : (
            filteredPrintJobs.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.copies} copies · {p.requestedBy || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.color && <Badge variant="info">Color</Badge>}
                    {p.doubleSided && <Badge variant="info">Double-sided</Badge>}
                    {p.cost > 0 && <Badge variant="default">${p.cost.toFixed(2)}</Badge>}
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
            <Card className="p-8"><EmptyState icon={Package} title="No supplies" description="Supply orders will appear here." /></Card>
          ) : (
            filteredSupplies.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{s.supplier || 'No supplier'} · {s.items.length} items · {s.requestedBy || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.totalCost > 0 && <Badge variant="default">${s.totalCost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
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
