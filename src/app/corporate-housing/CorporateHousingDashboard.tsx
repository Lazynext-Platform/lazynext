'use client';

import { useState, useMemo } from 'react';
import {
  Home, Calendar, Wrench, Users, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  HousingProperty, HousingBooking, HousingMaintenance, HousingTenant,
  CorporateHousingMetrics, CorporateHousingStats,
} from '@/lib/services/corporate-housing-service';

type TabId = 'overview' | 'properties' | 'bookings' | 'maintenance' | 'tenants';

interface CorporateHousingDashboardProps {
  organizationId: string;
  properties: HousingProperty[];
  bookings: HousingBooking[];
  maintenance: HousingMaintenance[];
  tenants: HousingTenant[];
  metrics: CorporateHousingMetrics;
  stats: CorporateHousingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'checked_out', 'active', 'available'].includes(status)) return 'success';
  if (['requested', 'approved', 'scheduled', 'in_progress', 'occupied', 'reserved', 'cleaning', 'pending'].includes(status)) return 'warning';
  if (['cancelled', 'overdue', 'no_show', 'off_market', 'under_maintenance', 'inactive'].includes(status)) return 'danger';
  return 'info';
};

export function CorporateHousingDashboard({
  properties, bookings, maintenance, tenants, metrics, stats,
}: CorporateHousingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name || id;

  const filteredProperties = useMemo(() => {
    if (!search) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [properties, search]);

  const filteredBookings = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) => b.tenantName.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [bookings, search]);

  const filteredMaintenance = useMemo(() => {
    if (!search) return maintenance;
    const q = search.toLowerCase();
    return maintenance.filter(
      (m) => m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q) || m.assignedTo.toLowerCase().includes(q),
    );
  }, [maintenance, search]);

  const filteredTenants = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'tenants', label: 'Tenants', icon: Users },
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
              <div className="text-xs text-fg-tertiary">Available Properties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableProperties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Occupied Properties</div>
              <div className="mt-1 text-2xl font-bold">{metrics.occupiedProperties}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Bookings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeBookings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Maintenance</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingMaintenance}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Tenants</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTenants}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Property Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPropertyType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Property Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPropertyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Booking Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byBookingStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'properties' && (
        <div className="space-y-3">
          {filteredProperties.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Home} title="No properties" description="Housing properties will appear here." /></Card>
          ) : (
            filteredProperties.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.city || 'No city'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.monthlyRate > 0 && <Badge variant="default">${p.monthlyRate.toLocaleString()}/mo</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calendar} title="No bookings" description="Housing bookings will appear here." /></Card>
          ) : (
            filteredBookings.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.tenantName}</div>
                    <div className="text-sm text-fg-secondary">{propertyName(b.propertyId)} · {b.type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.rate > 0 && <Badge variant="default">${b.rate.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Wrench} title="No maintenance" description="Maintenance requests will appear here." /></Card>
          ) : (
            filteredMaintenance.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{propertyName(m.propertyId)} · {m.assignedTo || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.cost > 0 && <Badge variant="default">${m.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tenants' && (
        <div className="space-y-3">
          {filteredTenants.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No tenants" description="Housing tenants will appear here." /></Card>
          ) : (
            filteredTenants.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
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
