import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface ParsedCalendarResource {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  availability: unknown[];
  bookingPolicy: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceBooking {
  eventId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface ResourceAvailability {
  resourceId: string;
  startDate: Date;
  endDate: Date;
  bookings: ResourceBooking[];
  available: boolean;
}

export interface ResourceStats {
  total: number;
  byType: Record<string, number>;
  activeCount: number;
  utilization: number; // percentage of resources with at least one booking
}

// ── Helpers ──

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseResource(raw: unknown): ParsedCalendarResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    organizationId: String(r.organizationId),
    workspaceId: (r.workspaceId as string | null) ?? null,
    name: String(r.name ?? ''),
    type: String(r.type ?? 'room'),
    capacity: Number(r.capacity ?? 1),
    location: String(r.location ?? ''),
    description: String(r.description ?? ''),
    availability: parseJson<unknown[]>(String(r.availability ?? '[]'), []),
    bookingPolicy: parseJson<Record<string, unknown>>(String(r.bookingPolicy ?? '{}'), {}),
    active: Boolean(r.active ?? true),
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(),
  };
}

function parseResources(raw: unknown[]): ParsedCalendarResource[] {
  return raw.map(parseResource).filter((r): r is ParsedCalendarResource => r !== null);
}

// ── Calendar Resource Service ──

export const CalendarResourceService = {
  /**
   * Create a calendar resource.
   */
  async create(organizationId: string, input: {
    name: string;
    type?: string;
    capacity?: number;
    location?: string;
    description?: string;
    workspaceId?: string;
  }) {
    return prisma.calendarResource.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 300),
        type: input.type || 'room',
        capacity: input.capacity ?? 1,
        location: input.location?.slice(0, 500) || '',
        description: input.description?.slice(0, 5000) || '',
        availability: '[]',
        bookingPolicy: '{}',
        active: true,
      },
    });
  },

  /**
   * Get a single resource.
   */
  async get(id: string): Promise<ParsedCalendarResource | null> {
    const raw = await safePrisma(() =>
      prisma.calendarResource.findUnique({ where: { id } }),
    null);
    return parseResource(raw);
  },

  /**
   * List resources with filters.
   */
  async list(organizationId: string, opts?: {
    type?: string;
    workspaceId?: string;
    active?: boolean;
  }): Promise<ParsedCalendarResource[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.type) where.type = opts.type;
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.active !== undefined) where.active = opts.active;

    const resources = await safePrisma(() =>
      prisma.calendarResource.findMany({
        where,
        orderBy: { name: 'asc' },
      }),
    []);

    return parseResources(resources);
  },

  /**
   * Update a resource.
   */
  async update(id: string, input: {
    name?: string;
    type?: string;
    capacity?: number;
    location?: string;
    description?: string;
    active?: boolean;
  }) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 300);
    if (input.type !== undefined) data.type = input.type;
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.location !== undefined) data.location = input.location.slice(0, 500);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.active !== undefined) data.active = input.active;

    return prisma.calendarResource.update({ where: { id }, data });
  },

  /**
   * Delete a resource.
   */
  async delete(id: string) {
    return prisma.calendarResource.delete({ where: { id } });
  },

  /**
   * Get availability for a resource in a date range.
   * Checks existing CalendarEvent bookings that reference this resource.
   */
  async getAvailability(resourceId: string, startDate: Date, endDate: Date): Promise<ResourceAvailability> {
    const resource = await safePrisma(() =>
      prisma.calendarResource.findUnique({ where: { id: resourceId } }),
    null);

    if (!resource) {
      return { resourceId, startDate, endDate, bookings: [], available: false };
    }

    // Find all events that overlap the date range and reference this resource
    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where: {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
          status: { not: 'cancelled' },
        },
        select: { id: true, title: true, startDate: true, endDate: true, status: true, resources: true },
        take: 500,
      }),
    []);

    const bookings: ResourceBooking[] = [];
    for (const ev of events) {
      const refs = parseJson<Array<{ resourceId: string }>>(ev.resources, []);
      if (refs.some((r) => r.resourceId === resourceId)) {
        bookings.push({
          eventId: ev.id,
          title: ev.title,
          startDate: ev.startDate,
          endDate: ev.endDate,
          status: ev.status,
        });
      }
    }

    // Sort bookings by start date
    bookings.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Resource is "available" if it has no overlapping bookings in the range
    const available = bookings.length === 0;

    return { resourceId, startDate, endDate, bookings, available };
  },

  /**
   * Book a resource for an event (add the resource ref to the event's resources JSON).
   */
  async book(resourceId: string, eventId: string, startDate: Date, endDate: Date) {
    const resource = await safePrisma(() =>
      prisma.calendarResource.findUnique({ where: { id: resourceId } }),
    null);
    if (!resource) return null;

    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event) return null;

    const refs = parseJson<Array<{ resourceId: string; name: string; type: string }>>(event.resources, []);
    if (!refs.some((r) => r.resourceId === resourceId)) {
      refs.push({ resourceId, name: resource.name, type: resource.type });
    }

    // startDate/endDate are accepted for validation but the event's own dates govern the booking
    void startDate;
    void endDate;

    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { resources: JSON.stringify(refs) },
    });
  },

  /**
   * Release a booking (remove the resource ref from the event's resources JSON).
   */
  async release(resourceId: string, eventId: string) {
    const event = await safePrisma(() =>
      prisma.calendarEvent.findUnique({ where: { id: eventId } }),
    null);
    if (!event) return null;

    const refs = parseJson<Array<{ resourceId: string; name: string; type: string }>>(event.resources, [])
      .filter((r) => r.resourceId !== resourceId);

    return prisma.calendarEvent.update({
      where: { id: eventId },
      data: { resources: JSON.stringify(refs) },
    });
  },

  /**
   * Get all bookings for a resource.
   */
  async getBookings(resourceId: string, opts?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<ResourceBooking[]> {
    const where: Record<string, unknown> = {
      status: { not: 'cancelled' },
    };
    if (opts?.startDate || opts?.endDate) {
      where.startDate = {};
      if (opts?.startDate) (where.startDate as Record<string, unknown>).gte = opts.startDate;
      if (opts?.endDate) (where.startDate as Record<string, unknown>).lte = opts.endDate;
    }
    if (opts?.status) where.status = opts.status;

    const events = await safePrisma(() =>
      prisma.calendarEvent.findMany({
        where,
        select: { id: true, title: true, startDate: true, endDate: true, status: true, resources: true },
        orderBy: { startDate: 'asc' },
        take: 500,
      }),
    []);

    const bookings: ResourceBooking[] = [];
    for (const ev of events) {
      const refs = parseJson<Array<{ resourceId: string }>>(ev.resources, []);
      if (refs.some((r) => r.resourceId === resourceId)) {
        bookings.push({
          eventId: ev.id,
          title: ev.title,
          startDate: ev.startDate,
          endDate: ev.endDate,
          status: ev.status,
        });
      }
    }

    return bookings;
  },

  /**
   * Get resource stats for an organization.
   */
  async getStats(organizationId: string): Promise<ResourceStats> {
    const resources = await safePrisma(() =>
      prisma.calendarResource.findMany({
        where: { organizationId },
        select: { id: true, type: true, active: true },
      }),
    []);

    const byType: Record<string, number> = {};
    let activeCount = 0;
    const resourceIds = resources.map((r) => r.id);

    for (const r of resources) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.active) activeCount++;
    }

    // Calculate utilization: percentage of resources with at least one booking
    let bookedCount = 0;
    if (resourceIds.length > 0) {
      const events = await safePrisma(() =>
        prisma.calendarEvent.findMany({
          where: { status: { not: 'cancelled' } },
          select: { resources: true },
          take: 1000,
        }),
      []);

      const bookedResourceIds = new Set<string>();
      for (const ev of events) {
        const refs = parseJson<Array<{ resourceId: string }>>(ev.resources, []);
        for (const ref of refs) {
          if (resourceIds.includes(ref.resourceId)) {
            bookedResourceIds.add(ref.resourceId);
          }
        }
      }
      bookedCount = bookedResourceIds.size;
    }

    const utilization = resources.length > 0
      ? Math.round((bookedCount / resources.length) * 100)
      : 0;

    return {
      total: resources.length,
      byType,
      activeCount,
      utilization,
    };
  },
};
