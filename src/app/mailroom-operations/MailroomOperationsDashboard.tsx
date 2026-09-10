'use client';

import { useState, useMemo } from 'react';
import {
  Mail, Route, Truck, DollarSign, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  MailroomItem, MailroomRoute, MailroomDelivery, MailroomPostage,
  MailroomOperationsMetrics, MailroomOperationsStats,
} from '@/lib/services/mailroom-operations-service';

type TabId = 'overview' | 'items' | 'routes' | 'deliveries' | 'postage';

interface MailroomOperationsDashboardProps {
  organizationId: string;
  items: MailroomItem[];
  routes: MailroomRoute[];
  deliveries: MailroomDelivery[];
  postage: MailroomPostage[];
  metrics: MailroomOperationsMetrics;
  stats: MailroomOperationsStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['delivered', 'completed', 'paid', 'active'].includes(status)) return 'success';
  if (['received', 'sorted', 'routed', 'planned', 'pending', 'out_for_delivery', 'scheduled'].includes(status)) return 'warning';
  if (['failed', 'lost', 'destroyed', 'cancelled', 'delayed', 'disputed', 'returned'].includes(status)) return 'danger';
  return 'info';
};

export function MailroomOperationsDashboard({
  items, routes, deliveries, postage, metrics, stats,
}: MailroomOperationsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.trackingNumber.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q) || i.sender.toLowerCase().includes(q) || i.recipient.toLowerCase().includes(q),
    );
  }, [items, search]);

  const filteredRoutes = useMemo(() => {
    if (!search) return routes;
    const q = search.toLowerCase();
    return routes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.carrier.toLowerCase().includes(q),
    );
  }, [routes, search]);

  const filteredDeliveries = useMemo(() => {
    if (!search) return deliveries;
    const q = search.toLowerCase();
    return deliveries.filter(
      (d) => d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || d.recipient.toLowerCase().includes(q) || d.address.toLowerCase().includes(q),
    );
  }, [deliveries, search]);

  const filteredPostage = useMemo(() => {
    if (!search) return postage;
    const q = search.toLowerCase();
    return postage.filter(
      (p) => p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.meterNumber.toLowerCase().includes(q),
    );
  }, [postage, search]);

  const tabs: { id: TabId; label: string; icon: typeof Mail }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'items', label: 'Items', icon: Mail },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'postage', label: 'Postage', icon: DollarSign },
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
              <div className="text-xs text-fg-tertiary">Pending Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">In Transit</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inTransitDeliveries}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Routes</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRoutes}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Postage</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingPostage}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delivered Today</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deliveredToday}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Item Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byItemType).map(([type, count]) => (
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
            <h3 className="mb-4 text-sm font-semibold">Route Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRouteStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Delivery Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDeliveryStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Postage Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPostageStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Mail} title="No mail items" description="Mail items will appear here." /></Card>
          ) : (
            filteredItems.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.trackingNumber || 'No tracking'}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.sender || 'Unknown'} → {i.recipient || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.weight > 0 && <Badge variant="default">{i.weight}oz</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'routes' && (
        <div className="space-y-3">
          {filteredRoutes.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Route} title="No routes" description="Mail routes will appear here." /></Card>
          ) : (
            filteredRoutes.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.carrier || 'No carrier'} · {r.origin} → {r.destination}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.stops > 0 && <Badge variant="default">{r.stops} stops</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Truck} title="No deliveries" description="Deliveries will appear here." /></Card>
          ) : (
            filteredDeliveries.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.type.replace('_', ' ')} delivery</div>
                    <div className="text-sm text-fg-secondary">{d.recipient || 'Unknown'} · {d.address || 'No address'}{d.signatureRequired ? ' · Signature required' : ''}</div>
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

      {tab === 'postage' && (
        <div className="space-y-3">
          {filteredPostage.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No postage" description="Postage records will appear here." /></Card>
          ) : (
            filteredPostage.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.type.replace('_', ' ')} · {p.currency} {p.amount.toFixed(2)}</div>
                    <div className="text-sm text-fg-secondary">{p.description || 'No description'}{p.meterNumber ? ` · Meter: ${p.meterNumber}` : ''}{p.permitNumber ? ` · Permit: ${p.permitNumber}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
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
