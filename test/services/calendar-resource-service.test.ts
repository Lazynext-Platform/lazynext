import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ResourceFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};
type ResourceFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};
type ResourceCreateArgs = {
  data: Record<string, unknown>;
};
type ResourceUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};
type ResourceDeleteArgs = {
  where: { id: string };
};
type EventFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};
type EventFindUniqueArgs = {
  where: { id: string };
};
type EventUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let resourceFindManyImpl: (args: ResourceFindManyArgs) => Promise<unknown[]> = async () => [];
let resourceFindUniqueImpl: (args: ResourceFindUniqueArgs) => Promise<unknown> = async () => null;
let resourceCreateImpl: (args: ResourceCreateArgs) => Promise<unknown> = async () => ({});
let resourceUpdateImpl: (args: ResourceUpdateArgs) => Promise<unknown> = async () => ({});
let resourceDeleteImpl: (args: ResourceDeleteArgs) => Promise<unknown> = async () => ({});
let eventFindManyImpl: (args: EventFindManyArgs) => Promise<unknown[]> = async () => [];
let eventFindUniqueImpl: (args: EventFindUniqueArgs) => Promise<unknown> = async () => null;
let eventUpdateImpl: (args: EventUpdateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  calendarResource: {
    findMany: (args: ResourceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'calendarResource.findMany', args });
      return resourceFindManyImpl(args);
    },
    findUnique: (args: ResourceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'calendarResource.findUnique', args });
      return resourceFindUniqueImpl(args);
    },
    create: (args: ResourceCreateArgs): Promise<unknown> => {
      calls.push({ method: 'calendarResource.create', args });
      return resourceCreateImpl(args);
    },
    update: (args: ResourceUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'calendarResource.update', args });
      return resourceUpdateImpl(args);
    },
    delete: (args: ResourceDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'calendarResource.delete', args });
      return resourceDeleteImpl(args);
    },
  },
  calendarEvent: {
    findMany: (args: EventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'calendarEvent.findMany', args });
      return eventFindManyImpl(args);
    },
    findUnique: (args: EventFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.findUnique', args });
      return eventFindUniqueImpl(args);
    },
    update: (args: EventUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.update', args });
      return eventUpdateImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  resourceFindManyImpl = async () => [];
  resourceFindUniqueImpl = async () => null;
  resourceCreateImpl = async () => ({});
  resourceUpdateImpl = async () => ({});
  resourceDeleteImpl = async () => ({});
  eventFindManyImpl = async () => [];
  eventFindUniqueImpl = async () => null;
  eventUpdateImpl = async () => ({});
}

const { CalendarResourceService } = await import('@/lib/services/calendar-resource-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarResourceService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a resource with defaults', async () => {
      resourceCreateImpl = async (args: ResourceCreateArgs) => {
        assert.equal(args.data.type, 'room');
        assert.equal(args.data.capacity, 1);
        assert.equal(args.data.active, true);
        return { id: 'r1', ...args.data };
      };

      const result = await CalendarResourceService.create('org-1', { name: 'Conference Room A' });
      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(calls[0].method, 'calendarResource.create');
    });

    it('truncates long names to 300 characters', async () => {
      resourceCreateImpl = async (args: ResourceCreateArgs) => {
        assert.ok((args.data.name as string).length <= 300);
        return { id: 'r1', name: args.data.name };
      };

      await CalendarResourceService.create('org-1', { name: 'A'.repeat(500) });
    });
  });

  describe('get', () => {
    it('returns a parsed resource by id', async () => {
      resourceFindUniqueImpl = async () => ({
        id: 'r1', organizationId: 'org-1', workspaceId: null, name: 'Room A', type: 'room',
        capacity: 10, location: 'Floor 1', description: '', availability: '[]', bookingPolicy: '{}',
        active: true, createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await CalendarResourceService.get('r1');
      assert.ok(result);
      assert.equal(result.id, 'r1');
      assert.equal(result.name, 'Room A');
      assert.equal(calls[0].method, 'calendarResource.findUnique');
    });

    it('returns null when resource not found', async () => {
      resourceFindUniqueImpl = async () => null;
      const result = await CalendarResourceService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns resources for an organization', async () => {
      resourceFindManyImpl = async () => ([
        { id: 'r1', name: 'Room A', type: 'room', capacity: 10, location: '', description: '', availability: '[]', bookingPolicy: '{}', active: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await CalendarResourceService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
      assert.equal(calls[0].method, 'calendarResource.findMany');
    });

    it('applies type and active filters', async () => {
      resourceFindManyImpl = async () => [];
      await CalendarResourceService.list('org-1', { type: 'equipment', active: true });
      const args = calls[0].args as ResourceFindManyArgs;
      assert.equal(args.where.type, 'equipment');
      assert.equal(args.where.active, true);
    });

    it('returns empty array on error', async () => {
      resourceFindManyImpl = async () => { throw new Error('fail'); };
      const result = await CalendarResourceService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      resourceUpdateImpl = async (args: ResourceUpdateArgs) => {
        assert.equal(args.data.name, 'Updated Room');
        assert.equal(args.data.capacity, undefined);
        return { id: 'r1', ...args.data };
      };

      const result = await CalendarResourceService.update('r1', { name: 'Updated Room' });
      assert.ok(result);
      assert.equal(calls[0].method, 'calendarResource.update');
    });
  });

  describe('delete', () => {
    it('deletes a resource', async () => {
      resourceDeleteImpl = async () => ({ id: 'r1' });
      const result = await CalendarResourceService.delete('r1');
      assert.ok(result);
      assert.equal(calls[0].method, 'calendarResource.delete');
    });
  });

  describe('getAvailability', () => {
    it('returns bookings for events that reference the resource', async () => {
      resourceFindUniqueImpl = async () => ({
        id: 'r1', name: 'Room A', type: 'room',
      });
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Meeting', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), status: 'scheduled', resources: '[{"resourceId":"r1","name":"Room A","type":"room"}]' },
        { id: 'ev2', title: 'Other', startDate: new Date('2025-01-15T14:00:00Z'), endDate: new Date('2025-01-15T15:00:00Z'), status: 'scheduled', resources: '[{"resourceId":"r2"}]' },
      ]);

      const result = await CalendarResourceService.getAvailability('r1', new Date('2025-01-15T00:00:00Z'), new Date('2025-01-15T23:59:59Z'));
      assert.equal(result.bookings.length, 1);
      assert.equal(result.bookings[0].eventId, 'ev1');
      assert.equal(result.available, false);
    });

    it('returns available=true when no bookings', async () => {
      resourceFindUniqueImpl = async () => ({ id: 'r1', name: 'Room A' });
      eventFindManyImpl = async () => [];
      const result = await CalendarResourceService.getAvailability('r1', new Date('2025-01-15'), new Date('2025-01-16'));
      assert.equal(result.bookings.length, 0);
      assert.equal(result.available, true);
    });

    it('returns available=false when resource not found', async () => {
      resourceFindUniqueImpl = async () => null;
      const result = await CalendarResourceService.getAvailability('nope', new Date('2025-01-15'), new Date('2025-01-16'));
      assert.equal(result.available, false);
    });
  });

  describe('book', () => {
    it('adds resource ref to event resources JSON', async () => {
      resourceFindUniqueImpl = async () => ({ id: 'r1', name: 'Room A', type: 'room' });
      eventFindUniqueImpl = async () => ({ id: 'ev1', resources: '[]' });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const refs = JSON.parse(args.data.resources as string);
        assert.equal(refs.length, 1);
        assert.equal(refs[0].resourceId, 'r1');
        assert.equal(refs[0].name, 'Room A');
        return { id: 'ev1', resources: args.data.resources };
      };

      const result = await CalendarResourceService.book('r1', 'ev1', new Date('2025-01-15T10:00:00Z'), new Date('2025-01-15T11:00:00Z'));
      assert.ok(result);
    });

    it('does not add duplicate resource ref', async () => {
      resourceFindUniqueImpl = async () => ({ id: 'r1', name: 'Room A', type: 'room' });
      eventFindUniqueImpl = async () => ({ id: 'ev1', resources: '[{"resourceId":"r1","name":"Room A","type":"room"}]' });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const refs = JSON.parse(args.data.resources as string);
        assert.equal(refs.length, 1);
        return { id: 'ev1', resources: args.data.resources };
      };

      await CalendarResourceService.book('r1', 'ev1', new Date('2025-01-15T10:00:00Z'), new Date('2025-01-15T11:00:00Z'));
    });

    it('returns null when resource not found', async () => {
      resourceFindUniqueImpl = async () => null;
      const result = await CalendarResourceService.book('nope', 'ev1', new Date(), new Date());
      assert.equal(result, null);
    });

    it('returns null when event not found', async () => {
      resourceFindUniqueImpl = async () => ({ id: 'r1', name: 'Room A', type: 'room' });
      eventFindUniqueImpl = async () => null;
      const result = await CalendarResourceService.book('r1', 'nope', new Date(), new Date());
      assert.equal(result, null);
    });
  });

  describe('release', () => {
    it('removes resource ref from event resources JSON', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', resources: '[{"resourceId":"r1","name":"Room A","type":"room"},{"resourceId":"r2","name":"Room B","type":"room"}]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const refs = JSON.parse(args.data.resources as string);
        assert.equal(refs.length, 1);
        assert.equal(refs[0].resourceId, 'r2');
        return { id: 'ev1', resources: args.data.resources };
      };

      await CalendarResourceService.release('r1', 'ev1');
    });

    it('returns null when event not found', async () => {
      eventFindUniqueImpl = async () => null;
      const result = await CalendarResourceService.release('r1', 'nope');
      assert.equal(result, null);
    });
  });

  describe('getBookings', () => {
    it('returns bookings for a resource', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Meeting A', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), status: 'scheduled', resources: '[{"resourceId":"r1"}]' },
        { id: 'ev2', title: 'Meeting B', startDate: new Date('2025-01-16T10:00:00Z'), endDate: new Date('2025-01-16T11:00:00Z'), status: 'scheduled', resources: '[{"resourceId":"r2"}]' },
      ]);

      const bookings = await CalendarResourceService.getBookings('r1');
      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].eventId, 'ev1');
    });

    it('returns empty array on error', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };
      const bookings = await CalendarResourceService.getBookings('r1');
      assert.equal(bookings.length, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates resource stats', async () => {
      resourceFindManyImpl = async () => ([
        { id: 'r1', type: 'room', active: true },
        { id: 'r2', type: 'room', active: true },
        { id: 'r3', type: 'equipment', active: false },
      ]);
      eventFindManyImpl = async () => ([
        { resources: '[{"resourceId":"r1"}]' },
        { resources: '[{"resourceId":"r1"}]' },
      ]);

      const stats = await CalendarResourceService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.byType.room, 2);
      assert.equal(stats.byType.equipment, 1);
      assert.equal(stats.activeCount, 2);
      // 1 out of 3 resources has bookings = 33%
      assert.equal(stats.utilization, 33);
    });

    it('returns zero stats on error', async () => {
      resourceFindManyImpl = async () => { throw new Error('fail'); };
      const stats = await CalendarResourceService.getStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.utilization, 0);
    });
  });
});
