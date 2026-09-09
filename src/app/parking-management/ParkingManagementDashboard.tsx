'use client';

import { useState, useMemo } from 'react';
import {
  CircleParking, SquareParking, IdCard, Share2, UserCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ParkingSpot, ParkingPermit, ParkingAllocation, VisitorParking,
  ParkingManagementMetrics, ParkingManagementStats,
} from '@/lib/services/parking-management-service';

type TabId = 'overview' | 'spots' | 'permits' | 'allocations' | 'visitorParking';

interface ParkingManagementDashboardProps {
  organizationId: string;
  spots: ParkingSpot[];
  permits: ParkingPermit[];
  allocations: ParkingAllocation[];
  visitorParking: VisitorParking[];
  metrics: ParkingManagementMetrics;
  stats: ParkingManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'approved', 'issued', 'renewed', 'checked_in', 'assigned'].includes(status)) return 'success';
  if (['pending', 'reserved', 'maintained'].includes(status)) return 'warning';
  if (['revoked', 'expired', 'offline', 'cancelled', 'released'].includes(status)) return 'danger';
  return 'info';
};

export function ParkingManagementDashboard({
  spots, permits, allocations, visitorParking, metrics, stats,
}: ParkingManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredSpots = useMemo(() => {
    if (!search) return spots;
    const q = search.toLowerCase();
    return spots.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [spots, search]);

  const filteredPermits = useMemo(() => {
    if (!search) return permits;
    const q = search.toLowerCase();
    return permits.filter(
      (p) => p.holderName.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [permits, search]);

  const filteredAllocations = useMemo(() => {
    if (!search) return allocations;
    const q = search.toLowerCase();
    return allocations.filter(
      (a) => a.assignee.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [allocations, search]);

  const filteredVisitorParking = useMemo(() => {
    if (!search) return visitorParking;
    const q = search.toLowerCase();
    return visitorParking.filter(
      (v) => v.visitorName.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [visitorParking, search]);

  const tabs: { id: TabId; label: string; icon: typeof CircleParking }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'spots', label: 'Spots', icon: SquareParking },
    { id: 'permits', label: 'Permits', icon: IdCard },
    { id: 'allocations', label: 'Allocations', icon: Share2 },
    { id: 'visitorParking', label: 'Visitor Parking', icon: UserCheck },
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
              <div className="text-xs text-fg-tertiary">Total Spots</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalSpots}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Spots</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableSpots}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Permits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePermits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Visitor Parking</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeVisitorParking}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Permits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingPermits}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Spot Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySpotType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Permit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPermitStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Spot Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySpotStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'spots' && (
        <div className="space-y-3">
          {filteredSpots.length === 0 ? (
            <Card className="p-8"><EmptyState icon={SquareParking} title="No spots" description="Parking spots will appear here." /></Card>
          ) : (
            filteredSpots.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.assignedTo && <Badge variant="default">{s.assignedTo}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'permits' && (
        <div className="space-y-3">
          {filteredPermits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={IdCard} title="No permits" description="Parking permits will appear here." /></Card>
          ) : (
            filteredPermits.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.holderName || 'Unknown holder'}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.vehiclePlate || 'No plate'}</div>
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

      {tab === 'allocations' && (
        <div className="space-y-3">
          {filteredAllocations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Share2} title="No allocations" description="Parking allocations will appear here." /></Card>
          ) : (
            filteredAllocations.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.assignee || 'Unknown assignee'}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.department || 'No department'}</div>
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

      {tab === 'visitorParking' && (
        <div className="space-y-3">
          {filteredVisitorParking.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserCheck} title="No visitor parking" description="Visitor parking records will appear here." /></Card>
          ) : (
            filteredVisitorParking.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.visitorName || 'Unknown visitor'}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.host || 'No host'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.expectedDuration && <Badge variant="default">{v.expectedDuration}</Badge>}
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
