'use client';

import { useState, useMemo } from 'react';
import {
  Truck, Car, Route, UserCog, MapPin, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  FleetVehicle, TransportRoute, DriverAssignment, TransportTrip,
  TransportationManagementMetrics, TransportationManagementStats,
} from '@/lib/services/transportation-management-service';

type TabId = 'overview' | 'vehicles' | 'routes' | 'assignments' | 'trips';

interface TransportationManagementDashboardProps {
  organizationId: string;
  vehicles: FleetVehicle[];
  routes: TransportRoute[];
  assignments: DriverAssignment[];
  trips: TransportTrip[];
  metrics: TransportationManagementMetrics;
  stats: TransportationManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'assigned', 'completed', 'scheduled'].includes(status)) return 'success';
  if (['maintained', 'in_progress', 'suspended'].includes(status)) return 'warning';
  if (['retired', 'decommissioned', 'offline', 'cancelled', 'no_show', 'deactivated'].includes(status)) return 'danger';
  return 'info';
};

export function TransportationManagementDashboard({
  vehicles, routes, assignments, trips, metrics, stats,
}: TransportationManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredVehicles = useMemo(() => {
    if (!search) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const filteredRoutes = useMemo(() => {
    if (!search) return routes;
    const q = search.toLowerCase();
    return routes.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [routes, search]);

  const filteredAssignments = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) => a.driverName.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assignments, search]);

  const filteredTrips = useMemo(() => {
    if (!search) return trips;
    const q = search.toLowerCase();
    return trips.filter(
      (t) => t.driverName.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [trips, search]);

  const tabs: { id: TabId; label: string; icon: typeof Truck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'assignments', label: 'Assignments', icon: UserCog },
    { id: 'trips', label: 'Trips', icon: MapPin },
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
              <div className="text-xs text-fg-tertiary">Active Vehicles</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeVehicles}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Routes</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeRoutes}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Assignments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssignments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Scheduled Trips</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledTrips}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Trips</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedTrips}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Vehicle Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVehicleType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Trip Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTripStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Vehicle Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byVehicleStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="space-y-3">
          {filteredVehicles.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Car} title="No vehicles" description="Fleet vehicles will appear here." /></Card>
          ) : (
            filteredVehicles.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.plateNumber || 'No plate'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.capacity > 0 && <Badge variant="default">{v.capacity} seats</Badge>}
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={Route} title="No routes" description="Transport routes will appear here." /></Card>
          ) : (
            filteredRoutes.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.origin || 'No origin'} → {r.destination || 'No destination'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.distance > 0 && <Badge variant="default">{r.distance} mi</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={UserCog} title="No assignments" description="Driver assignments will appear here." /></Card>
          ) : (
            filteredAssignments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.driverName || 'Unknown driver'}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.driverLicense || 'No license'}</div>
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

      {tab === 'trips' && (
        <div className="space-y-3">
          {filteredTrips.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MapPin} title="No trips" description="Transport trips will appear here." /></Card>
          ) : (
            filteredTrips.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.driverName || 'Unknown driver'}</div>
                    <div className="text-sm text-fg-secondary">{t.type.replace('_', ' ')} · {t.origin || 'No origin'} → {t.destination || 'No destination'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.passengerCount > 0 && <Badge variant="default">{t.passengerCount} pax</Badge>}
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
