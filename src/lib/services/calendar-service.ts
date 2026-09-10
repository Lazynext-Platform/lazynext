import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { RecurrenceUtils } from '@/lib/services/recurrence-utils';
import { TimezoneUtils } from '@/lib/services/timezone-utils';

// ── Types ──

export interface CalendarAttendee {
  userId: string;
  status: 'pending' | 'yes' | 'no' | 'maybe';
  responseAt?: string;
}

export interface CalendarResourceRef {
  resourceId: string;
  name: string;
  type: string;
}

export interface CalendarReminder {
  minutes: number;
  type: 'email' | 'push' | 'sms';
}

export interface ParsedCalendarEvent {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  title: string;
  description: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timezone: string;
  location: string;
  meetingUrl: string | null;
  organizerId: string;
  attendees: CalendarAttendee[];
  resources: CalendarResourceRef[];
  recurrence: string | null;
  recurrenceParentId: string | null;
  color: string;
  tags: string[];
  reminders: CalendarReminder[];
  linkedTaskId: string | null;
  linkedGoalId: string | null;
  linkedProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GanttItem {
  id: string;
  name: string;
  type: 'task' | 'project' | 'goal';
  startDate: string;
  endDate: string;
  progress: number;
  dependencies: string[];
}

export interface Deadline {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'project';
  dueDate: string;
  status: string;
  priority?: string;
  assigneeId?: string | null;
}

// ── Helpers ──

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseEvent(raw: unknown): ParsedCalendarEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    organizationId: String(r.organizationId),
    workspaceId: (r.workspaceId as string | null) ?? null,
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    type: String(r.type ?? 'meeting'),
    status: String(r.status ?? 'scheduled'),
    startDate: r.startDate instanceof Date ? r.startDate : new Date(String(r.startDate)),
    endDate: r.endDate instanceof Date ? r.endDate : new Date(String(r.endDate)),
    allDay: Boolean(r.allDay),
    timezone: String(r.timezone ?? 'UTC'),
    location: String(r.location ?? ''),
    meetingUrl: (r.meetingUrl as string | null) ?? null,
    organizerId: String(r.organizerId ?? ''),
    attendees: parseJson<CalendarAttendee[]>(String(r.attendees ?? '[]'), []),
    resources: parseJson<CalendarResourceRef[]>(String(r.resources ?? '[]'), []),
    recurrence: (r.recurrence as string | null) ?? null,
    recurrenceParentId: (r.recurrenceParentId as string | null) ?? null,
    color: String(r.color ?? ''),
    tags: parseJson<string[]>(String(r.tags ?? '[]'), []),
    reminders: parseJson<CalendarReminder[]>(String(r.reminders ?? '[]'), []),
    linkedTaskId: (r.linkedTaskId as string | null) ?? null,
    linkedGoalId: (r.linkedGoalId as string | null) ?? null,
    linkedProjectId: (r.linkedProjectId as string | null) ?? null,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(),
  };
}

function parseEvents(raw: unknown[]): ParsedCalendarEvent[] {
  return raw.map(parseEvent).filter((e): e is ParsedCalendarEvent => e !== null);
}

// ── Calendar Service ──

export const CalendarService = {
  /**
   * Create a calendar event.
   */
  async create(organizationId: string, input: {
    title: string;
    description?: string;
    type?: string;
    workspaceId?: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    timezone?: string;
    location?: string;
    meetingUrl?: string;
    organizerId: string;
    attendees?: CalendarAttendee[];
    resources?: CalendarResourceRef[];
    recurrence?: string;
    color?: string;
    tags?: string[];
    reminders?: CalendarReminder[];
    linkedTaskId?: string;
    linkedGoalId?: string;
    linkedProjectId?: string;
  }) {
    return prisma.calendarEvent.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        type: input.type || 'meeting',
        startDate: input.startDate,
        endDate: input.endDate,
        allDay: input.allDay ?? false,
        timezone: input.timezone || 'UTC',
        location: input.location?.slice(0, 500) || '',
        meetingUrl: input.meetingUrl || null,
        organizerId: input.organizerId,
        attendees: JSON.stringify(input.attendees || []),
        resources: JSON.stringify(input.resources || []),
        recurrence: input.recurrence || null,
        color: input.color || '',
        tags: JSON.stringify(input.tags || []),
        reminders: JSON.stringify(input.reminders || []),
        linkedTaskId: input.linkedTaskId || null,
        linkedGoalId: input.linkedGoalId || null,
        linkedProjectId: input.linkedProjectId || null,
      },
    });
  },

  /**
   * Get a single calendar event with parsed JSON fields.
   */
  async get(id: string): Promise<ParsedCalendarEvent | null> {
    const raw = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id } }),
    null);
    return parseEvent(raw);
  },

  /**
   * List calendar events with filters.
   */
  async list(organizationId: string, opts?: {
    workspaceId?: string;
    startDate?: Date;
    endDate?: Date;
    type?: string;
    status?: string;
    organizerId?: string;
    attendeeUserId?: string;
    tag?: string;
    limit?: number;
  }): Promise<ParsedCalendarEvent[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.type) where.type = opts.type;
    if (opts?.status) where.status = opts.status;
    if (opts?.organizerId) where.organizerId = opts.organizerId;
    if (opts?.startDate || opts?.endDate) {
      where.startDate = {};
      if (opts?.startDate) (where.startDate as Record<string, unknown>).gte = opts.startDate;
      if (opts?.endDate) (where.startDate as Record<string, unknown>).lte = opts.endDate;
    }

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where,
        orderBy: { startDate: 'asc' },
        take: Math.min(opts?.limit ?? 200, 1000),
      }),
    []);

    let parsed = parseEvents(events);

    // Filter by attendee (stored as JSON string, filter in-memory)
    if (opts?.attendeeUserId) {
      parsed = parsed.filter((e) =>
        e.attendees.some((a) => a.userId === opts.attendeeUserId),
      );
    }
    // Filter by tag
    if (opts?.tag) {
      parsed = parsed.filter((e) => e.tags.includes(opts.tag!));
    }

    return parsed;
  },

  /**
   * Update a calendar event.
   */
  async update(id: string, input: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    allDay?: boolean;
    timezone?: string;
    location?: string;
    meetingUrl?: string | null;
    recurrence?: string | null;
    color?: string;
    tags?: string[];
    reminders?: CalendarReminder[];
  }) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.endDate !== undefined) data.endDate = input.endDate;
    if (input.allDay !== undefined) data.allDay = input.allDay;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.location !== undefined) data.location = input.location.slice(0, 500);
    if (input.meetingUrl !== undefined) data.meetingUrl = input.meetingUrl;
    if (input.recurrence !== undefined) data.recurrence = input.recurrence;
    if (input.color !== undefined) data.color = input.color;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.reminders !== undefined) data.reminders = JSON.stringify(input.reminders);

    return prisma.calendarEvent.update({ where: { id }, data });
  },

  /**
   * Delete a calendar event.
   */
  async delete(id: string) {
    return prisma.calendarEvent.delete({ where: { id } });
  },

  /**
   * Cancel a calendar event (mark as cancelled).
   */
  async cancel(id: string) {
    return prisma.calendarEvent.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  },

  /**
   * Add an attendee to an event.
   */
  async addAttendee(eventId: string, userId: string) {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event) return null;

    const attendees = parseJson<CalendarAttendee[]>(event.attendees, []);
    if (!attendees.some((a) => a.userId === userId)) {
      attendees.push({ userId, status: 'pending' });
    }

    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees) },
    });
  },

  /**
   * Remove an attendee from an event.
   */
  async removeAttendee(eventId: string, userId: string) {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event) return null;

    const attendees = parseJson<CalendarAttendee[]>(event.attendees, []).filter(
      (a) => a.userId !== userId,
    );

    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees) },
    });
  },

  /**
   * Respond to an invite (yes / no / maybe).
   */
  async respondToInvite(eventId: string, userId: string, status: 'yes' | 'no' | 'maybe') {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event) return null;

    const attendees = parseJson<CalendarAttendee[]>(event.attendees, []);
    const idx = attendees.findIndex((a) => a.userId === userId);
    if (idx === -1) {
      attendees.push({ userId, status, responseAt: new Date().toISOString() });
    } else {
      attendees[idx] = { ...attendees[idx], status, responseAt: new Date().toISOString() };
    }

    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { attendees: JSON.stringify(attendees) },
    });
  },

  /**
   * Get parsed attendees for an event.
   */
  async getAttendees(eventId: string): Promise<CalendarAttendee[]> {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId }, select: { attendees: true } }),
    null);
    if (!event) return [];
    return parseJson<CalendarAttendee[]>(event.attendees, []);
  },

  /**
   * Get upcoming events.
   */
  async getUpcoming(organizationId: string, opts?: {
    workspaceId?: string;
    userId?: string;
    days?: number;
    limit?: number;
  }): Promise<ParsedCalendarEvent[]> {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + (opts?.days ?? 7));

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          organizationId,
          ...(opts?.workspaceId && { workspaceId: opts.workspaceId }),
          startDate: { gte: now, lte: end },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
        take: Math.min(opts?.limit ?? 50, 500),
      }),
    []);

    let parsed = parseEvents(events);
    if (opts?.userId) {
      parsed = parsed.filter(
        (e) => e.organizerId === opts.userId || e.attendees.some((a) => a.userId === opts.userId),
      );
    }
    return parsed;
  },

  /**
   * Get events for a specific day.
   */
  async getDay(organizationId: string, date: Date, opts?: {
    workspaceId?: string;
  }): Promise<ParsedCalendarEvent[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          organizationId,
          ...(opts?.workspaceId && { workspaceId: opts.workspaceId }),
          startDate: { gte: start, lte: end },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
      }),
    []);

    return parseEvents(events);
  },

  /**
   * Get events for a week (starting weekStart).
   */
  async getWeek(organizationId: string, weekStart: Date, opts?: {
    workspaceId?: string;
  }): Promise<ParsedCalendarEvent[]> {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          organizationId,
          ...(opts?.workspaceId && { workspaceId: opts.workspaceId }),
          startDate: { gte: start, lt: end },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
      }),
    []);

    return parseEvents(events);
  },

  /**
   * Get events for a month.
   */
  async getMonth(organizationId: string, year: number, month: number, opts?: {
    workspaceId?: string;
  }): Promise<ParsedCalendarEvent[]> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          organizationId,
          ...(opts?.workspaceId && { workspaceId: opts.workspaceId }),
          startDate: { gte: start, lt: end },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
      }),
    []);

    return parseEvents(events);
  },

  /**
   * Check if attendees are free during a time window.
   */
  async checkAvailability(attendeeIds: string[], startDate: Date, endDate: Date, timezone: string): Promise<{
    conflicts: Array<{ userId: string; eventId: string; title: string; startDate: Date; endDate: Date }>;
  }> {
    const conflicts: Array<{ userId: string; eventId: string; title: string; startDate: Date; endDate: Date }> = [];

    // Query all events overlapping the window
    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          status: { not: 'cancelled' },
        },
        select: { id: true, title: true, startDate: true, endDate: true, attendees: true, organizerId: true },
        take: 500,
      }),
    []);

    for (const ev of events) {
      const attendees = parseJson<CalendarAttendee[]>(ev.attendees, []);
      const involved = new Set<string>([ev.organizerId, ...attendees.map((a) => a.userId)]);
      for (const userId of attendeeIds) {
        if (involved.has(userId)) {
          conflicts.push({
            userId,
            eventId: ev.id,
            title: ev.title,
            startDate: ev.startDate,
            endDate: ev.endDate,
          });
        }
      }
    }

    // timezone is accepted for future use (e.g. DST-aware comparisons)
    void timezone;

    return { conflicts };
  },

  /**
   * Find free time slots for attendees on a given day.
   */
  async findFreeSlots(attendeeIds: string[], date: Date, durationMin: number, timezone: string, workingHours?: { start: number; end: number }): Promise<Array<{ start: Date; end: Date }>> {
    const wh = workingHours ?? TimezoneUtils.getWorkingHours(timezone);
    const dayStart = new Date(date);
    dayStart.setHours(wh.start, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(wh.end, 0, 0, 0);

    // Get all busy intervals for the attendees on this day
    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          startDate: { lt: dayEnd },
          endDate: { gt: dayStart },
          status: { not: 'cancelled' },
        },
        select: { startDate: true, endDate: true, attendees: true, organizerId: true },
        take: 500,
      }),
    []);

    const busy: Array<{ start: Date; end: Date }> = [];
    for (const ev of events) {
      const attendees = parseJson<CalendarAttendee[]>(ev.attendees, []);
      const involved = new Set<string>([ev.organizerId, ...attendees.map((a) => a.userId)]);
      if (attendeeIds.some((id) => involved.has(id))) {
        const s = ev.startDate < dayStart ? dayStart : ev.startDate;
        const e = ev.endDate > dayEnd ? dayEnd : ev.endDate;
        busy.push({ start: s, end: e });
      }
    }

    // Sort busy intervals by start
    busy.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping intervals
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const b of busy) {
      if (merged.length > 0 && b.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = new Date(Math.max(merged[merged.length - 1].end.getTime(), b.end.getTime()));
      } else {
        merged.push({ start: new Date(b.start), end: new Date(b.end) });
      }
    }

    // Find free slots between merged busy intervals
    const slots: Array<{ start: Date; end: Date }> = [];
    let cursor = new Date(dayStart);
    const durationMs = durationMin * 60 * 1000;

    for (const b of merged) {
      if (b.start.getTime() - cursor.getTime() >= durationMs) {
        slots.push({ start: new Date(cursor), end: new Date(b.start) });
      }
      cursor = new Date(Math.max(cursor.getTime(), b.end.getTime()));
    }

    if (dayEnd.getTime() - cursor.getTime() >= durationMs) {
      slots.push({ start: new Date(cursor), end: new Date(dayEnd) });
    }

    return slots;
  },

  /**
   * Expand a recurring event into instances within a range.
   */
  async expandRecurrence(eventId: string, startDate: Date, endDate: Date): Promise<ParsedCalendarEvent[]> {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event || !event.recurrence) return event ? [parseEvent(event)!] : [];

    const instances = RecurrenceUtils.expand(event.recurrence, event.startDate, startDate, endDate);
    const durationMs = event.endDate.getTime() - event.startDate.getTime();
    const base = parseEvent(event)!;

    return instances.map((instStart, idx) => ({
      ...base,
      id: `${base.id}_${idx}`,
      recurrenceParentId: base.id,
      startDate: instStart,
      endDate: new Date(instStart.getTime() + durationMs),
    }));
  },

  /**
   * Find scheduling conflicts in a date range (optionally for specific resources).
   */
  async getConflicts(organizationId: string, startDate: Date, endDate: Date, resources?: string[]): Promise<ParsedCalendarEvent[]> {
    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          organizationId,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
      }),
    []);

    let parsed = parseEvents(events);
    if (resources && resources.length > 0) {
      parsed = parsed.filter((e) =>
        e.resources.some((r) => resources.includes(r.resourceId)),
      );
    }

    // Detect overlapping events
    const conflicts: ParsedCalendarEvent[] = [];
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        if (parsed[i].startDate < parsed[j].endDate && parsed[j].startDate < parsed[i].endDate) {
          if (!conflicts.includes(parsed[i])) conflicts.push(parsed[i]);
          if (!conflicts.includes(parsed[j])) conflicts.push(parsed[j]);
        }
      }
    }
    return conflicts;
  },

  /**
   * Link an event to a task.
   */
  async linkToTask(eventId: string, taskId: string) {
    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { linkedTaskId: taskId },
    });
  },

  /**
   * Link an event to a goal.
   */
  async linkToGoal(eventId: string, goalId: string) {
    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { linkedGoalId: goalId },
    });
  },

  /**
   * Link an event to a project.
   */
  async linkToProject(eventId: string, projectId: string) {
    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { linkedProjectId: projectId },
    });
  },

  /**
   * Get events linked to entities.
   */
  async getLinkedEvents(opts: { taskId?: string; goalId?: string; projectId?: string }): Promise<ParsedCalendarEvent[]> {
    const where: Record<string, unknown> = { OR: [] as Record<string, unknown>[] };
    if (opts.taskId) (where.OR as Record<string, unknown>[]).push({ linkedTaskId: opts.taskId });
    if (opts.goalId) (where.OR as Record<string, unknown>[]).push({ linkedGoalId: opts.goalId });
    if (opts.projectId) (where.OR as Record<string, unknown>[]).push({ linkedProjectId: opts.projectId });
    if ((where.OR as unknown[]).length === 0) return [];

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({ where, orderBy: { startDate: 'asc' } }),
    []);
    return parseEvents(events);
  },

  /**
   * Get calendar stats.
   */
  async getStats(organizationId: string, opts?: {
    workspaceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    upcoming: number;
    meetingHours: number;
  }> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.startDate || opts?.endDate) {
      where.startDate = {};
      if (opts?.startDate) (where.startDate as Record<string, unknown>).gte = opts.startDate;
      if (opts?.endDate) (where.startDate as Record<string, unknown>).lte = opts.endDate;
    }

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({ where, select: { type: true, status: true, startDate: true, endDate: true } }),
    []);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let meetingHours = 0;
    const now = new Date();
    let upcoming = 0;

    for (const ev of events) {
      byType[ev.type] = (byType[ev.type] || 0) + 1;
      byStatus[ev.status] = (byStatus[ev.status] || 0) + 1;
      if (ev.status !== 'cancelled') {
        meetingHours += (ev.endDate.getTime() - ev.startDate.getTime()) / (1000 * 60 * 60);
      }
      if (ev.startDate >= now && ev.status !== 'cancelled') {
        upcoming++;
      }
    }

    return {
      total: events.length,
      byType,
      byStatus,
      upcoming,
      meetingHours: Math.round(meetingHours * 100) / 100,
    };
  },

  /**
   * Get Gantt chart data from tasks, projects, and goals.
   */
  async getGanttData(organizationId: string, opts?: {
    workspaceId?: string;
  }): Promise<{ items: GanttItem[] }> {
    const wsFilter = opts?.workspaceId ? { workspaceId: opts.workspaceId } : {};

    const [tasks, projects, goals] = await Promise.all([
      safePrisma(() =>
        prisma.task.findMany({
          where: { project: { workspace: { organizationId } } },
          include: { project: { select: { workspaceId: true, workspace: { select: { organizationId: true } } } }, dependencies: { select: { dependsOnId: true } } },
          take: 500,
        }),
      []),
      safePrisma(() =>
        prisma.project.findMany({
          where: { workspace: { organizationId, ...wsFilter } },
          take: 200,
        }),
      []),
      safePrisma(() =>
        prisma.goal.findMany({
          where: { organizationId, ...(opts?.workspaceId ? { workspaceId: opts.workspaceId } : {}) },
          take: 200,
        }),
      []),
    ]);

    const items: GanttItem[] = [];

    // Projects
    for (const p of projects) {
      const created = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
      const updated = p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt);
      items.push({
        id: p.id,
        name: p.name,
        type: 'project',
        startDate: created.toISOString(),
        endDate: updated.toISOString(),
        progress: p.status === 'active' ? 0.5 : p.status === 'archived' ? 1 : 0,
        dependencies: [],
      });
    }

    // Tasks
    for (const t of tasks) {
      if (opts?.workspaceId && t.project?.workspaceId !== opts.workspaceId) continue;
      const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
      const due = t.dueDate instanceof Date ? t.dueDate : (t.dueDate ? new Date(t.dueDate) : created);
      const deps = Array.isArray(t.dependencies) ? t.dependencies.map((d: { dependsOnId: string }) => d.dependsOnId) : [];
      items.push({
        id: t.id,
        name: t.title,
        type: 'task',
        startDate: created.toISOString(),
        endDate: due.toISOString(),
        progress: t.status === 'done' ? 1 : t.status === 'in_progress' ? 0.5 : 0,
        dependencies: deps,
      });
    }

    // Goals
    for (const g of goals) {
      const created = g.createdAt instanceof Date ? g.createdAt : new Date(g.createdAt);
      const due = g.dueDate instanceof Date ? g.dueDate : (g.dueDate ? new Date(g.dueDate) : created);
      items.push({
        id: g.id,
        name: g.title,
        type: 'goal',
        startDate: created.toISOString(),
        endDate: due.toISOString(),
        progress: g.progress,
        dependencies: [],
      });
    }

    return { items };
  },

  /**
   * Get upcoming deadlines from tasks, goals, and projects.
   */
  async getDeadlines(organizationId: string, opts?: {
    workspaceId?: string;
    days?: number;
    limit?: number;
  }): Promise<Deadline[]> {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + (opts?.days ?? 30));

    const [tasks, goals] = await Promise.all([
      safePrisma(() =>
        prisma.task.findMany({
          where: {
            dueDate: { gte: now, lte: end },
            status: { notIn: ['done', 'cancelled'] },
            ...(opts?.workspaceId ? { project: { workspaceId: opts.workspaceId } } : { project: { workspace: { organizationId } } }),
          },
          take: Math.min(opts?.limit ?? 100, 500),
        }),
      []),
      safePrisma(() =>
        prisma.goal.findMany({
          where: {
            organizationId,
            dueDate: { gte: now, lte: end },
            status: { notIn: ['completed', 'cancelled'] },
            ...(opts?.workspaceId ? { workspaceId: opts.workspaceId } : {}),
          },
          take: Math.min(opts?.limit ?? 100, 500),
        }),
      []),
    ]);

    const deadlines: Deadline[] = [];

    for (const t of tasks) {
      deadlines.push({
        id: t.id,
        title: t.title,
        type: 'task',
        dueDate: (t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate!)).toISOString(),
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
      });
    }

    for (const g of goals) {
      deadlines.push({
        id: g.id,
        title: g.title,
        type: 'goal',
        dueDate: (g.dueDate instanceof Date ? g.dueDate : new Date(g.dueDate!)).toISOString(),
        status: g.status,
        priority: g.priority,
      });
    }

    deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return deadlines.slice(0, opts?.limit ?? 100);
  },

  /**
   * Import events from iCal data (basic parsing).
   */
  async importFromICal(organizationId: string, icalData: string, userId: string): Promise<ParsedCalendarEvent[]> {
    const imported: ParsedCalendarEvent[] = [];
    // Basic iCal VEVENT parsing
    const events = icalData.split('BEGIN:VEVENT');

    for (let i = 1; i < events.length; i++) {
      const block = events[i].split('END:VEVENT')[0];
      const lines = block.split(/\r?\n/);
      const fields: Record<string, string> = {};
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).split(';')[0].toUpperCase();
        const value = line.slice(colonIdx + 1);
        fields[key] = value;
      }

      const title = fields['SUMMARY'] || 'Imported Event';
      const startStr = fields['DTSTART'];
      const endStr = fields['DTEND'];
      if (!startStr) continue;

      const startDate = parseICalDate(startStr);
      const endDate = endStr ? parseICalDate(endStr) : new Date(startDate.getTime() + 60 * 60 * 1000);

      const created = await this.create(organizationId, {
        title,
        description: fields['DESCRIPTION'] || '',
        type: 'meeting',
        startDate,
        endDate,
        organizerId: userId,
        location: fields['LOCATION'] || '',
        meetingUrl: fields['URL'] || undefined,
      });

      imported.push(parseEvent(created)!);
    }

    return imported;
  },
};

// ── iCal date parsing helper ──

function parseICalDate(value: string): Date {
  // Handle DTSTART;TZID=America/New_York:20240101T100000
  const datePart = value.includes(':') ? value.split(':').pop()! : value;
  // Format: YYYYMMDDTHHMMSS or YYYYMMDD
  if (datePart.length === 8) {
    return new Date(
      parseInt(datePart.slice(0, 4)),
      parseInt(datePart.slice(4, 6)) - 1,
      parseInt(datePart.slice(6, 8)),
    );
  }
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const year = parseInt(datePart.slice(0, 4));
  const month = parseInt(datePart.slice(4, 6)) - 1;
  const day = parseInt(datePart.slice(6, 8));
  const hour = parseInt(datePart.slice(9, 11));
  const min = parseInt(datePart.slice(11, 13));
  const sec = parseInt(datePart.slice(13, 15));
  const isUtc = datePart.endsWith('Z');
  if (isUtc) {
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return new Date(year, month, day, hour, min, sec);
}
