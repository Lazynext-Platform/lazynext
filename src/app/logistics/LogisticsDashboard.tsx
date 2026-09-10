'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Truck, Building2, MapPin, Package, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  LogisticsShipment, LogisticsCarrier, LogisticsRoute, FreightRecord,
  LogisticsMetrics, LogisticsStats,
} from '@/lib/services/logistics-service';

type TabId = 'overview' | 'shipments' | 'carriers' | 'routes' | 'freight';

interface LogisticsDashboardProps {
  organizationId: string;
  shipments: LogisticsShipment[];
  carriers: LogisticsCarrier[];
  routes: LogisticsRoute[];
  freights: FreightRecord[];
  metrics: LogisticsMetrics;
  stats: LogisticsStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['delivered', 'active', 'unloaded', 'verified'].includes(status)) return 'success';
  if (['draft', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'pending', 'loaded', 'preferred', 'scheduled', 'planned'].includes(status)) return 'warning';
  if (['cancelled', 'exception', 'delayed', 'blocked', 'damaged', 'lost', 'discontinued'].includes(status)) return 'danger';
  return 'info';
};

export function LogisticsDashboard({
  shipments, carriers, routes, freights, metrics, stats,
}: LogisticsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const carrierName = useCallback(
    (id: string | null) => (id ? carriers.find((c) => c.id === id)?.name || id : 'Unassigned'),
    [carriers],
  );

  const filteredShipments = useMemo(() => {
    if (!search) return shipments;
    const q = search.toLowerCase();
    return shipments.filter(
      (s) => s.trackingNumber.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q),
    );
  }, [shipments, search]);

  const filteredCarriers = useMemo(() => {
    if (!search) return carriers;
    const q = search.toLowerCase();
    return carriers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [carriers, search]);

  const filteredRoutes = useMemo(() => {
    if (!search) return routes;
    const q = search.toLowerCase();
    return routes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.origin.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q),
    );
  }, [routes, search]);

  const filteredFreights = useMemo(() => {
    if (!search) return freights;
    const q = search.toLowerCase();
    return freights.filter(
      (f) => f.description.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.status.toLowerCase().includes(q),
    );
  }, [freights, search]);

  const tabs: { id: TabId; label: string; icon: typeof Truck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'shipments', label: 'Shipments', icon: Truck },
    { id: 'carriers', label: 'Carriers', icon: Building2 },
    { id: 'routes', label: 'Routes', icon: MapPin },
    { id: 'freight', label: 'Freight', icon: Package },
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
              <div className="text-xs text-fg-tertiary">Active Shipments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeShipments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delivered Shipments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.deliveredShipments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">In Transit</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inTransitShipments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Delayed</div>
              <div className="mt-1 text-2xl font-bold">{metrics.delayedShipments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Carriers</div>
              <div className="mt-1 text-2xl font-bold">{metrics.carrierCount}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Shipment Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byShipmentType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Shipment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byShipmentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Carrier Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCarrierType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Freight Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byFreightStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'shipments' && (
        <div className="space-y-3">
          {filteredShipments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Truck} title="No shipments" description="Shipments will appear here." /></Card>
          ) : (
            filteredShipments.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.trackingNumber || 'Untitled shipment'}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.origin} → {s.destination} · {carrierName(s.carrierId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.weight > 0 && <Badge variant="default">{s.weight}kg</Badge>}
                    {s.cost > 0 && <Badge variant="default">${s.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'carriers' && (
        <div className="space-y-3">
          {filteredCarriers.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Building2} title="No carriers" description="Carriers will appear here." /></Card>
          ) : (
            filteredCarriers.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.contact || 'No contact'} · {c.email || 'No email'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.rating > 0 && <Badge variant="default">★ {c.rating}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={MapPin} title="No routes" description="Routes will appear here." /></Card>
          ) : (
            filteredRoutes.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.origin} → {r.destination} · {carrierName(r.carrierId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.distance > 0 && <Badge variant="default">{r.distance}km</Badge>}
                    {r.cost > 0 && <Badge variant="default">${r.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'freight' && (
        <div className="space-y-3">
          {filteredFreights.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No freight records" description="Freight records will appear here." /></Card>
          ) : (
            filteredFreights.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.description || 'Untitled freight'}</div>
                    <div className="text-sm text-fg-secondary">{f.type.replace('_', ' ')} · {f.units} units · {f.volume}m³</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.weight > 0 && <Badge variant="default">{f.weight}kg</Badge>}
                    <Badge variant={statusVariant(f.status)}>{f.status.replace('_', ' ')}</Badge>
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
