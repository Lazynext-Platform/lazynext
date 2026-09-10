'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar, Users, Mic, MapPin,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  CorpEvent, EventRegistration, EventSpeaker, EventVenue,
  EventMetrics, EventStats,
} from '@/lib/services/events-service';

type TabId = 'overview' | 'events' | 'registrations' | 'speakers' | 'venues';

interface EventsDashboardProps {
  organizationId: string;
  events: CorpEvent[];
  registrations: EventRegistration[];
  speakers: EventSpeaker[];
  venues: EventVenue[];
  metrics: EventMetrics;
  stats: EventStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'confirmed', 'attended', 'booked'].includes(status)) return 'success';
  if (['planning', 'scheduled', 'registration_open', 'in_progress', 'registered', 'invited', 'available', 'waitlisted'].includes(status)) return 'warning';
  if (['cancelled', 'declined', 'postponed', 'unavailable'].includes(status)) return 'danger';
  return 'info';
};

export function EventsDashboard({
  events, registrations, speakers, venues, metrics, stats,
}: EventsDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const eventTitle = useCallback(
    (id: string) => events.find((e) => e.id === id)?.title || id,
    [events],
  );

  const filteredEvents = useMemo(() => {
    if (!search) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [events, search]);

  const filteredRegistrations = useMemo(() => {
    if (!search) return registrations;
    const q = search.toLowerCase();
    return registrations.filter(
      (r) => r.attendeeName.toLowerCase().includes(q) || eventTitle(r.eventId).toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [registrations, search, eventTitle]);

  const filteredSpeakers = useMemo(() => {
    if (!search) return speakers;
    const q = search.toLowerCase();
    return speakers.filter(
      (s) => s.name.toLowerCase().includes(q) || eventTitle(s.eventId).toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [speakers, search, eventTitle]);

  const filteredVenues = useMemo(() => {
    if (!search) return venues;
    const q = search.toLowerCase();
    return venues.filter(
      (v) => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [venues, search]);

  const tabs: { id: TabId; label: string; icon: typeof Calendar }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'speakers', label: 'Speakers', icon: Mic },
    { id: 'venues', label: 'Venues', icon: MapPin },
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
              <div className="text-xs text-fg-tertiary">Upcoming Events</div>
              <div className="mt-1 text-2xl font-bold">{metrics.upcomingEvents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Registrations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalRegistrations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Confirmed Speakers</div>
              <div className="mt-1 text-2xl font-bold">{metrics.confirmedSpeakers}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Budget</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalBudget.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Venue Util.</div>
              <div className="mt-1 text-2xl font-bold">{metrics.venueUtilization}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Event Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEventType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Event Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEventStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calendar} title="No events" description="Events will appear here." /></Card>
          ) : (
            filteredEvents.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {new Date(e.startDate).toLocaleDateString()} · {e.location}</div>
                  </div>
                  <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'registrations' && (
        <div className="space-y-3">
          {filteredRegistrations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No registrations" description="Registrations will appear here." /></Card>
          ) : (
            filteredRegistrations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.attendeeName}</div>
                    <div className="text-sm text-fg-secondary">{eventTitle(r.eventId)} · {r.company}</div>
                  </div>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'speakers' && (
        <div className="space-y-3">
          {filteredSpeakers.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Mic} title="No speakers" description="Speakers will appear here." /></Card>
          ) : (
            filteredSpeakers.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.title} · {s.company} · {eventTitle(s.eventId)}</div>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'venues' && (
        <div className="space-y-3">
          {filteredVenues.length === 0 ? (
            <Card className="p-8"><EmptyState icon={MapPin} title="No venues" description="Venues will appear here." /></Card>
          ) : (
            filteredVenues.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.address} · Cap: {v.capacity}</div>
                  </div>
                  <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
