'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Building, FileText, Wrench, LayoutGrid, BarChart3,
  Search, ShieldCheck, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type FacilityType = 'office' | 'warehouse' | 'retail' | 'manufacturing' | 'other';
type AreaUnit = 'sqft' | 'sqm';
type LeaseStatus = 'active' | 'expired' | 'terminated' | 'pending';
type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
type MaintenanceCategory = 'electrical' | 'plumbing' | 'hvac' | 'structural' | 'cleaning' | 'security' | 'other';
type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface Facility {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  address: string;
  type: FacilityType;
  floors: number;
  totalArea: number;
  areaUnit: AreaUnit;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Lease {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  landlord: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  status: LeaseStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MaintenanceRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  requestedBy: string;
  assignedTo: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SpaceAllocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  floor: number;
  area: number;
  assignedTo: string;
  department: string;
  purpose: string;
  startDate: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OccupancyReport {
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    totalArea: number;
    allocatedArea: number;
    occupancyRate: number;
  }>;
  totalArea: number;
  totalAllocatedArea: number;
  overallOccupancyRate: number;
}

interface FacilityCosts {
  totalRent: number;
  totalMaintenanceCost: number;
  totalCost: number;
  byFacility: Record<string, { rent: number; maintenance: number }>;
}

interface FacilitiesStats {
  facilityCount: number;
  activeFacilityCount: number;
  leaseCount: number;
  activeLeaseCount: number;
  expiringLeaseCount: number;
  maintenanceRequestCount: number;
  openMaintenanceCount: number;
  spaceAllocationCount: number;
  totalArea: number;
  allocatedArea: number;
  occupancyRate: number;
}

interface FacilitiesDashboardProps {
  organizationId: string;
  facilities: Facility[];
  leases: Lease[];
  maintenance: MaintenanceRequest[];
  spaces: SpaceAllocation[];
  occupancy: OccupancyReport;
  costs: FacilityCosts;
  stats: FacilitiesStats;
}

// ── Helpers ──

const facilityTypeVariant: Record<FacilityType, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  office: 'info',
  warehouse: 'accent',
  retail: 'success',
  manufacturing: 'warning',
  other: 'default',
};

const leaseStatusVariant: Record<LeaseStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  expired: 'warning',
  terminated: 'danger',
  pending: 'info',
};

const maintenancePriorityVariant: Record<MaintenancePriority, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const maintenanceStatusVariant: Record<MaintenanceStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  assigned: 'info',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'danger',
};

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

export function FacilitiesDashboard({
  organizationId: _organizationId,
  facilities,
  leases,
  maintenance,
  spaces,
  occupancy,
  costs,
  stats,
}: FacilitiesDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'facilities' | 'leases' | 'maintenance' | 'spaces'>('overview');
  const [search, setSearch] = useState('');

  const facilityName = useCallback(
    (id: string) => facilities.find((f) => f.id === id)?.name || id,
    [facilities],
  );

  const filteredFacilities = useMemo(() => {
    if (!search) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) => f.name.toLowerCase().includes(q) || f.address.toLowerCase().includes(q) || f.type.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  const filteredLeases = useMemo(() => {
    if (!search) return leases;
    const q = search.toLowerCase();
    return leases.filter(
      (l) => l.landlord.toLowerCase().includes(q) || facilityName(l.facilityId).toLowerCase().includes(q),
    );
  }, [leases, search, facilityName]);

  const filteredMaintenance = useMemo(() => {
    if (!search) return maintenance;
    const q = search.toLowerCase();
    return maintenance.filter(
      (m) => m.title.toLowerCase().includes(q) || m.requestedBy.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
    );
  }, [maintenance, search]);

  const filteredSpaces = useMemo(() => {
    if (!search) return spaces;
    const q = search.toLowerCase();
    return spaces.filter(
      (s) => s.assignedTo.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.purpose.toLowerCase().includes(q),
    );
  }, [spaces, search]);

  const tabs: { id: typeof tab; label: string; icon: typeof Building }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'facilities', label: 'Facilities', icon: Building },
    { id: 'leases', label: 'Leases', icon: FileText },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'spaces', label: 'Space Allocation', icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Facilities</span>
          </div>
          <p className="text-2xl font-semibold">{stats.facilityCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeFacilityCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Leases</span>
          </div>
          <p className="text-2xl font-semibold">{stats.leaseCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeLeaseCount} active · {stats.expiringLeaseCount} expiring</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Maintenance</span>
          </div>
          <p className="text-2xl font-semibold">{stats.maintenanceRequestCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openMaintenanceCount} open</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Occupancy</span>
          </div>
          <p className="text-2xl font-semibold">{stats.occupancyRate}%</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.allocatedArea} / {stats.totalArea} {facilities[0]?.areaUnit || 'sqft'}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Occupancy Report</h2>
              </div>
              {occupancy.facilities.length === 0 ? (
                <p className="text-sm text-fg-secondary">No facilities to report.</p>
              ) : (
                <div className="space-y-3">
                  {occupancy.facilities.map((f) => (
                    <div key={f.facilityId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{f.facilityName}</span>
                        <span className="text-fg-secondary">{f.occupancyRate}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-alt">
                        <div
                          className="h-2 rounded-full bg-accent-primary"
                          style={{ width: `${Math.min(f.occupancyRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-fg-secondary">
                        <span>{f.allocatedArea} allocated</span>
                        <span>{f.totalArea} total</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 text-sm">
                    <div className="flex justify-between font-medium">
                      <span>Overall</span>
                      <span>{occupancy.overallOccupancyRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Facility Costs</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total Rent (monthly)</span>
                  <span className="font-medium">{formatCurrency(costs.totalRent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Maintenance Costs</span>
                  <span className="font-medium">{formatCurrency(costs.totalMaintenanceCost)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(costs.totalCost)}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Open Maintenance Requests</h3>
            {maintenance.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length === 0 ? (
              <p className="text-sm text-fg-secondary">No open maintenance requests.</p>
            ) : (
              <div className="space-y-2">
                {maintenance.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-fg-secondary">{facilityName(m.facilityId)} · {m.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={maintenancePriorityVariant[m.priority]}>{m.priority}</Badge>
                      <Badge variant={maintenanceStatusVariant[m.status]}>{m.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'facilities' && (
        <div className="space-y-4">
          {filteredFacilities.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Building}
                title="No facilities"
                description="Create a facility to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFacilities.map((facility) => (
                <Card key={facility.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{facility.name}</h3>
                      <p className="text-xs text-fg-secondary">{facility.address || 'No address'}</p>
                    </div>
                    <Badge variant={facilityTypeVariant[facility.type]}>{facility.type}</Badge>
                  </div>
                  {facility.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{facility.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Floors</span>
                      <span className="font-medium">{facility.floors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Total area</span>
                      <span className="font-medium">{facility.totalArea} {facility.areaUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Status</span>
                      <span className="font-medium">{facility.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leases' && (
        <div className="space-y-4">
          {filteredLeases.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No leases"
                description="Create a lease agreement to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Facility</th>
                    <th className="p-3 font-medium">Landlord</th>
                    <th className="p-3 font-medium">Start</th>
                    <th className="p-3 font-medium">End</th>
                    <th className="p-3 font-medium">Monthly Rent</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.map((lease) => (
                    <tr key={lease.id} className="border-b last:border-0">
                      <td className="p-3">{facilityName(lease.facilityId)}</td>
                      <td className="p-3">{lease.landlord}</td>
                      <td className="p-3">{formatDate(lease.startDate)}</td>
                      <td className="p-3">{formatDate(lease.endDate)}</td>
                      <td className="p-3 font-medium">{formatCurrency(lease.monthlyRent)}</td>
                      <td className="p-3">
                        <Badge variant={leaseStatusVariant[lease.status]}>{lease.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-4">
          {filteredMaintenance.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Wrench}
                title="No maintenance requests"
                description="Maintenance requests will appear here once submitted."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Facility</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Priority</th>
                    <th className="p-3 font-medium">Requested By</th>
                    <th className="p-3 font-medium">Assigned To</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{m.title}</td>
                      <td className="p-3">{facilityName(m.facilityId)}</td>
                      <td className="p-3 capitalize">{m.category}</td>
                      <td className="p-3">
                        <Badge variant={maintenancePriorityVariant[m.priority]}>{m.priority}</Badge>
                      </td>
                      <td className="p-3">{m.requestedBy}</td>
                      <td className="p-3">{m.assignedTo || '—'}</td>
                      <td className="p-3">
                        <Badge variant={maintenanceStatusVariant[m.status]}>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'spaces' && (
        <div className="space-y-4">
          {filteredSpaces.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={LayoutGrid}
                title="No space allocations"
                description="Allocate space to departments or people to see them here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Facility</th>
                    <th className="p-3 font-medium">Floor</th>
                    <th className="p-3 font-medium">Area</th>
                    <th className="p-3 font-medium">Assigned To</th>
                    <th className="p-3 font-medium">Department</th>
                    <th className="p-3 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpaces.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3">{facilityName(s.facilityId)}</td>
                      <td className="p-3">{s.floor}</td>
                      <td className="p-3">{s.area}</td>
                      <td className="p-3">{s.assignedTo || '—'}</td>
                      <td className="p-3">{s.department || '—'}</td>
                      <td className="p-3 max-w-xs truncate text-fg-secondary">{s.purpose || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
