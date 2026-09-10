'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock,
  MapPin, Video, Users, X, AlertCircle, BarChart3, CalendarDays,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, Input, Textarea, Dialog } from '@/components/ui';
import { TimezoneUtils } from '@/lib/services/timezone-utils';

// ── Types ──

interface CalendarAttendee {
  userId: string;
  status: 'pending' | 'yes' | 'no' | 'maybe';
  responseAt?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  timezone: string;
  location: string;
  meetingUrl: string | null;
  organizerId: string;
  attendees: CalendarAttendee[];
  tags: string[];
  color: string;
}

interface Deadline {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'project';
  dueDate: string;
  status: string;
  priority?: string;
}

interface GanttItem {
  id: string;
  name: string;
  type: 'task' | 'project' | 'goal';
  startDate: string;
  endDate: string;
  progress: number;
}

interface Stats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  upcoming: number;
  meetingHours: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'gantt';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-info/20 border-info',
  deadline: 'bg-danger/20 border-danger',
  reminder: 'bg-warning/20 border-warning',
  milestone: 'bg-accent/20 border-accent',
  block: 'bg-fg-muted/20 border-fg-muted',
  time_off: 'bg-success/20 border-success',
};

const RSVP_VARIANT: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  pending: 'default',
  yes: 'success',
  no: 'danger',
  maybe: 'warning',
};

// ── Component ──

export function CalendarView({
  organizationId: _organizationId,
  initialEvents,
  upcomingEvents,
  deadlines,
  ganttItems,
  stats,
  detectedTimezone,
  year: initialYear,
  month: initialMonth,
}: {
  organizationId: string;
  initialEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  deadlines: Deadline[];
  ganttItems: GanttItem[];
  stats: Stats;
  detectedTimezone: string;
  year: number;
  month: number;
}) {
  const [view, setView] = useState<ViewMode>('month');
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const timezones = useMemo(() => TimezoneUtils.getTimezones(), []);

  // ── Month grid ──
  const monthDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(currentYear, currentMonth, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentYear, currentMonth]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = new Date(ev.startDate);
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const now = useMemo(() => new Date(), []);

  // ── Navigation ──
  const goPrev = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goNext = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToday = useCallback(() => {
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
  }, []);

  // ── Week view ──
  const weekDays = useMemo(() => {
    const base = selectedDate || new Date(currentYear, currentMonth, 1);
    const start = new Date(base);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate, currentYear, currentMonth]);

  // ── Day view ──
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return (eventsByDay[selectedDate.toDateString()] || []).slice().sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [selectedDate, eventsByDay]);

  // ── Gantt ──
  const ganttRange = useMemo(() => {
    if (ganttItems.length === 0) return { start: 0, end: 0, span: 1 };
    const starts = ganttItems.map((g) => new Date(g.startDate).getTime());
    const ends = ganttItems.map((g) => new Date(g.endDate).getTime());
    const start = Math.min(...starts);
    const end = Math.max(...ends);
    return { start, end, span: Math.max(end - start, 86400000) };
  }, [ganttItems]);

  // ── Deadlines ──
  const overdueDeadlines = useMemo(() =>
    deadlines.filter((d) => new Date(d.dueDate) < now),
  [deadlines, now]);
  const upcomingDeadlines = useMemo(() =>
    deadlines.filter((d) => new Date(d.dueDate) >= now).slice(0, 10),
  [deadlines, now]);

  // ── Create event ──
  const handleCreateEvent = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.event) {
        const newEvent: CalendarEvent = {
          id: result.event.id,
          title: result.event.title,
          description: result.event.description || '',
          type: result.event.type || 'meeting',
          status: result.event.status || 'scheduled',
          startDate: result.event.startDate,
          endDate: result.event.endDate,
          allDay: result.event.allDay || false,
          timezone: result.event.timezone || 'UTC',
          location: result.event.location || '',
          meetingUrl: result.event.meetingUrl || null,
          organizerId: result.event.organizerId || '',
          attendees: [],
          tags: [],
          color: result.event.color || '',
        };
        setEvents((prev) => [...prev, newEvent]);
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error('Failed to create event:', e);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Total Events</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Upcoming</div>
          <div className="text-2xl font-bold">{stats.upcoming}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Meeting Hours</div>
          <div className="text-2xl font-bold">{stats.meetingHours?.toFixed(1) || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Deadlines</div>
          <div className="text-2xl font-bold">{deadlines.length}</div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="sm" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="heading-display text-lg ml-2">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Timezone selector */}
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input text-xs py-1.5"
            aria-label="Timezone"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>

          {/* View switcher */}
          <div className="flex border-2 rounded-[var(--radius-sm)]" style={{ borderColor: 'var(--c-ink)' }}>
            {(['month', 'week', 'day', 'gantt'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs capitalize transition-colors ${view === v ? 'bg-accent text-accent-fg' : 'hover:bg-hover'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main calendar area */}
        <div className="lg:col-span-3 space-y-6">
          {view === 'month' && (
            <MonthGrid
              days={monthDays}
              eventsByDay={eventsByDay}
              now={now}
              onDayClick={setSelectedDate}
              onEventClick={setSelectedEvent}
              timezone={timezone}
            />
          )}

          {view === 'week' && (
            <WeekView
              weekDays={weekDays}
              eventsByDay={eventsByDay}
              now={now}
              onEventClick={setSelectedEvent}
              timezone={timezone}
            />
          )}

          {view === 'day' && (
            <DayView
              date={selectedDate || now}
              events={dayEvents}
              onEventClick={setSelectedEvent}
              timezone={timezone}
            />
          )}

          {view === 'gantt' && (
            <GanttView items={ganttItems} range={ganttRange} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming events */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-accent-primary" />
              <h3 className="heading-display text-sm">Upcoming</h3>
              <Badge variant="default" className="text-xs">{upcomingEvents.length}</Badge>
            </div>
            {upcomingEvents.length === 0 ? (
              <Card className="p-4"><div className="text-sm text-fg-secondary">No upcoming events.</div></Card>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <Card
                    key={ev.id}
                    className="p-3 cursor-pointer hover:bg-hover transition-colors"
                    interactive
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="text-sm font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-fg-secondary mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {TimezoneUtils.formatInTimezone(new Date(ev.startDate), timezone, 'short')}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Deadlines */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-fg-danger" />
              <h3 className="heading-display text-sm">Deadlines</h3>
              <Badge variant="danger" className="text-xs">{overdueDeadlines.length}</Badge>
            </div>
            {deadlines.length === 0 ? (
              <Card className="p-4"><div className="text-sm text-fg-secondary">No upcoming deadlines.</div></Card>
            ) : (
              <div className="space-y-2">
                {overdueDeadlines.map((d) => (
                  <Card key={d.id} className="p-3 border-danger/30">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="danger" className="text-xs">Overdue</Badge>
                      <span className="text-xs text-fg-secondary">
                        {TimezoneUtils.formatInTimezone(new Date(d.dueDate), timezone, 'date')}
                      </span>
                    </div>
                  </Card>
                ))}
                {upcomingDeadlines.map((d) => (
                  <Card key={d.id} className="p-3">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={d.type === 'task' ? 'info' : d.type === 'goal' ? 'accent' : 'default'} className="text-xs">
                        {d.type}
                      </Badge>
                      <span className="text-xs text-fg-secondary">
                        {TimezoneUtils.formatInTimezone(new Date(d.dueDate), timezone, 'date')}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Panel */}
      {selectedEvent && (
        <EventDetailsPanel
          event={selectedEvent}
          timezone={timezone}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          timezone={timezone}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}
    </div>
  );
}

// ── Month Grid ──

function MonthGrid({
  days, eventsByDay, now, onDayClick, onEventClick, timezone,
}: {
  days: (Date | null)[];
  eventsByDay: Record<string, CalendarEvent[]>;
  now: Date;
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
  timezone: string;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="label-mono text-center py-2 px-1 border-r-2 last:border-r-0" style={{ borderColor: 'var(--c-ink)' }}>
            {day}
          </div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = day && day.toDateString() === now.toDateString();
          const dayEvents = day ? eventsByDay[day.toDateString()] || [] : [];
          return (
            <div
              key={i}
              className="min-h-[80px] sm:min-h-[120px] p-1.5 border-r-2 border-b-2 last:border-r-0 cursor-pointer hover:bg-hover transition-colors"
              style={{ borderColor: 'var(--c-ink)' }}
              onClick={() => day && onDayClick(day)}
            >
              {day && (
                <>
                  <div
                    className="text-xs font-mono mb-1 inline-flex items-center justify-center h-5 w-5"
                    style={isToday ? { backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-sm)' } : undefined}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-xs px-1.5 py-0.5 border truncate cursor-pointer ${EVENT_TYPE_COLORS[ev.type] || 'bg-surface-alt border-fg-muted'}`}
                        style={{ borderRadius: 'var(--radius-sm)' }}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-fg-muted px-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* Timezone indicator */}
      <div className="border-t-2 px-3 py-1.5 text-xs text-fg-secondary" style={{ borderColor: 'var(--c-ink)' }}>
        Showing times in {timezone} (UTC{TimezoneUtils.getOffset(timezone)})
      </div>
    </Card>
  );
}

// ── Week View ──

function WeekView({
  weekDays, eventsByDay, now, onEventClick, timezone,
}: {
  weekDays: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  now: Date;
  onEventClick: (ev: CalendarEvent) => void;
  timezone: string;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
        {weekDays.map((day, i) => {
          const isToday = day.toDateString() === now.toDateString();
          return (
            <div key={i} className="text-center py-2 px-1 border-r-2 last:border-r-0" style={{ borderColor: 'var(--c-ink)' }}>
              <div className="label-mono text-xs">{WEEKDAYS[day.getDay()]}</div>
              <div
                className="text-sm font-bold mt-0.5 inline-flex items-center justify-center h-6 w-6"
                style={isToday ? { backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-sm)' } : undefined}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {weekDays.map((day, i) => {
          const dayEvents = eventsByDay[day.toDateString()] || [];
          return (
            <div key={i} className="p-2 border-r-2 last:border-r-0 min-h-[400px]" style={{ borderColor: 'var(--c-ink)' }}>
              <div className="space-y-1">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-xs px-2 py-1 border cursor-pointer ${EVENT_TYPE_COLORS[ev.type] || 'bg-surface-alt border-fg-muted'}`}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                    onClick={() => onEventClick(ev)}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-fg-secondary mt-0.5">
                      {TimezoneUtils.formatInTimezone(new Date(ev.startDate), timezone, 'time')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Day View ──

function DayView({
  date, events, onEventClick, timezone,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (ev: CalendarEvent) => void;
  timezone: string;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b-2 px-4 py-3" style={{ borderColor: 'var(--c-ink)' }}>
        <h3 className="heading-display text-sm">
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {hours.map((h) => {
          const hourEvents = events.filter((ev) => {
            const sd = new Date(ev.startDate);
            return sd.getHours() === h;
          });
          return (
            <div key={h} className="flex border-b" style={{ borderColor: 'var(--c-ink)' }}>
              <div className="w-16 p-2 text-xs text-fg-secondary font-mono border-r-2" style={{ borderColor: 'var(--c-ink)' }}>
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              <div className="flex-1 p-2 min-h-[40px]">
                {hourEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-xs px-2 py-1 border mb-1 cursor-pointer ${EVENT_TYPE_COLORS[ev.type] || 'bg-surface-alt border-fg-muted'}`}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                    onClick={() => onEventClick(ev)}
                  >
                    <span className="font-medium">{ev.title}</span>
                    <span className="text-fg-secondary ml-2">
                      {TimezoneUtils.formatInTimezone(new Date(ev.startDate), timezone, 'time')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Gantt View ──

function GanttView({ items, range }: { items: GanttItem[]; range: { start: number; end: number; span: number } }) {
  if (items.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={BarChart3}
          title="No Gantt data"
          description="Create tasks, projects, or goals to see them on the Gantt chart."
        />
      </Card>
    );
  }

  const TYPE_COLOR: Record<string, string> = {
    task: 'bg-info',
    project: 'bg-accent',
    goal: 'bg-success',
  };

  return (
    <Card className="p-0 overflow-x-auto">
      <div className="border-b-2 px-4 py-3" style={{ borderColor: 'var(--c-ink)' }}>
        <h3 className="heading-display text-sm">Gantt Chart</h3>
      </div>
      <div className="p-4 min-w-[600px]">
        {items.map((item) => {
          const start = new Date(item.startDate).getTime();
          const end = new Date(item.endDate).getTime();
          const leftPct = ((start - range.start) / range.span) * 100;
          const widthPct = Math.max(((end - start) / range.span) * 100, 2);
          return (
            <div key={item.id} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{item.name}</span>
                <Badge variant={item.type === 'task' ? 'info' : item.type === 'project' ? 'accent' : 'success'} className="text-xs">
                  {item.type}
                </Badge>
              </div>
              <div className="relative h-6 bg-fg-muted/10 rounded" style={{ borderRadius: 'var(--radius-sm)' }}>
                <div
                  className={`absolute h-full ${TYPE_COLOR[item.type] || 'bg-fg-muted'} rounded`}
                  style={{
                    left: `${Math.max(leftPct, 0)}%`,
                    width: `${Math.min(widthPct, 100 - leftPct)}%`,
                    borderRadius: 'var(--radius-sm)',
                    opacity: 0.8,
                  }}
                />
                <div
                  className="absolute h-full border-r-2 border-ink"
                  style={{
                    left: `${Math.max(leftPct + (widthPct * item.progress), 0)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Event Details Panel ──

function EventDetailsPanel({
  event, timezone, onClose,
}: {
  event: CalendarEvent;
  timezone: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onClose={onClose} title={event.title} size="lg">
      <div className="space-y-4">
        {/* Type & Status */}
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">{event.type}</Badge>
          <Badge variant={event.status === 'cancelled' ? 'danger' : 'success'} className="text-xs">{event.status}</Badge>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-fg-secondary">{event.description}</p>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-fg-muted" />
          <span>
            {TimezoneUtils.formatInTimezone(new Date(event.startDate), timezone, 'long')}
            {' — '}
            {TimezoneUtils.formatInTimezone(new Date(event.endDate), timezone, 'time')}
          </span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-fg-muted" />
            <span>{event.location}</span>
          </div>
        )}

        {/* Meeting URL */}
        {event.meetingUrl && (
          <div className="flex items-center gap-2 text-sm">
            <Video className="h-4 w-4 text-fg-muted" />
            <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
              {event.meetingUrl}
            </a>
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-fg-muted" />
              <span className="text-sm font-medium">Attendees ({event.attendees.length})</span>
            </div>
            <div className="space-y-1">
              {event.attendees.map((a) => (
                <div key={a.userId} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{a.userId}</span>
                  <Badge variant={RSVP_VARIANT[a.status] || 'default'} className="text-xs">{a.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-xs">#{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ── Create Event Modal ──

function CreateEventModal({
  timezone, onClose, onCreate,
}: {
  timezone: string;
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('meeting');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [description, setDescription] = useState('');
  const [attendees, setAttendees] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    setSaving(true);
    const attendeeList = attendees
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((userId) => ({ userId, status: 'pending' as const }));
    onCreate({
      title: title.trim(),
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      timezone,
      location,
      meetingUrl: meetingUrl || undefined,
      description,
      attendees: attendeeList,
    });
    setSaving(false);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="New Event"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !title.trim() || !startDate || !endDate}>
            {saving ? 'Creating...' : 'Create Event'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-mono">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input"
            >
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
              <option value="reminder">Reminder</option>
              <option value="milestone">Milestone</option>
              <option value="block">Block</option>
              <option value="time_off">Time Off</option>
            </select>
          </div>
          <div>
            <label className="label-mono">Timezone</label>
            <input className="input" value={timezone} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date & Time"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date & Time"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Office, address, etc."
        />

        <Input
          label="Meeting URL"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://meet.example.com/..."
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Event description..."
          rows={3}
        />

        <Input
          label="Attendees (comma-separated user IDs)"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="user-1, user-2, user-3"
        />
      </form>
    </Dialog>
  );
}
