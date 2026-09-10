'use client';

import { useState, useMemo } from 'react';
import {
  Building2, LayoutGrid, DoorOpen, Map, CalendarCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  WorkspaceDesk, MeetingRoom, OfficeLayout, DeskBooking,
  WorkspaceManagementMetrics, WorkspaceManagementStats,
} from '@/lib/services/workspace-management-service';

type TabId = 'overview' | 'desks' | 'rooms' | 'layouts' | 'bookings';

interface WorkspaceManagementDashboardProps {
  organizationId: string;
  desks: WorkspaceDesk[];
  rooms: MeetingRoom[];
  layouts: OfficeLayout[];
  bookings: DeskBooking[];
  metrics: WorkspaceManagementMetrics;
  stats: WorkspaceManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'approved', 'checked_in', 'completed', 'published'].includes(status)) return 'success';
  if (['pending', 'reserved', 'revision', 'draft', 'maintained'].includes(status)) return 'warning';
  if (['cancelled', 'offline', 'inactive', 'no_show', 'retired', 'error'].includes(status)) return 'danger';
  return 'info';
};

export function WorkspaceManagementDashboard({
  desks, rooms, layouts, bookings, metrics, stats,
}: WorkspaceManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredDesks = useMemo(() => {
    if (!search) return desks;
    const q = search.toLowerCase();
    return desks.filter(
      (d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [desks, search]);

  const filteredRooms = useMemo(() => {
    if (!search) return rooms;
    const q = search.toLowerCase();
    return rooms.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [rooms, search]);

  const filteredLayouts = useMemo(() => {
    if (!search) return layouts;
    const q = search.toLowerCase();
    return layouts.filter(
      (l) => l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [layouts, search]);

  const filteredBookings = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) => b.bookedBy.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [bookings, search]);

  const tabs: { id: TabId; label: string; icon: typeof Building2 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'desks', label: 'Desks', icon: LayoutGrid },
    { id: 'rooms', label: 'Rooms', icon: DoorOpen },
    { id: 'layouts', label: 'Layouts', icon: Map },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
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
              <div className="text-xs text-fg-tertiary">Active Desks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeDesks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Rooms</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableRooms}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Bookings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeBookings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Bookings</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingBookings}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Maintained Desks</div>
              <div className="mt-1 text-2xl font-bold">{metrics.maintainedDesks}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Desk Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDeskType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
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

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Room Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRoomStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'desks' && (
        <div className="space-y-3">
          {filteredDesks.length === 0 ? (
            <Card className="p-8"><EmptyState icon={LayoutGrid} title="No desks" description="Workspace desks will appear here." /></Card>
          ) : (
            filteredDesks.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.capacity > 0 && <Badge variant="default">{d.capacity} cap</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-3">
          {filteredRooms.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DoorOpen} title="No rooms" description="Meeting rooms will appear here." /></Card>
          ) : (
            filteredRooms.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-fg-secondary">{r.type.replace('_', ' ')} · {r.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.hourlyRate > 0 && <Badge variant="default">${r.hourlyRate}/hr</Badge>}
                    {r.capacity > 0 && <Badge variant="default">{r.capacity} cap</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'layouts' && (
        <div className="space-y-3">
          {filteredLayouts.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Map} title="No layouts" description="Office layouts will appear here." /></Card>
          ) : (
            filteredLayouts.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-sm text-fg-secondary">{l.type.replace('_', ' ')} · {l.floor || 'No floor'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.zones.length > 0 && <Badge variant="default">{l.zones.length} zones</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={CalendarCheck} title="No bookings" description="Desk bookings will appear here." /></Card>
          ) : (
            filteredBookings.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.bookedBy || 'Unknown booker'}</div>
                    <div className="text-sm text-fg-secondary">{b.type.replace('_', ' ')} · {b.department || 'No department'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(b.status)}>{b.status.replace('_', ' ')}</Badge>
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
