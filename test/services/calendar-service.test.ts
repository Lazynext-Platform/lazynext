import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type EventFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};
type EventFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};
type EventCreateArgs = {
  data: Record<string, unknown>;
};
type EventUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};
type EventDeleteArgs = {
  where: { id: string };
};
type TaskFindManyArgs = {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  take?: number;
};
type GoalFindManyArgs = {
  where: Record<string, unknown>;
  take?: number;
};
type ProjectFindManyArgs = {
  where: Record<string, unknown>;
  take?: number;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let eventFindManyImpl: (args: EventFindManyArgs) => Promise<unknown[]> = async () => [];
let eventFindUniqueImpl: (args: EventFindUniqueArgs) => Promise<unknown> = async () => null;
let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> = async () => ({});
let eventUpdateImpl: (args: EventUpdateArgs) => Promise<unknown> = async () => ({});
let eventDeleteImpl: (args: EventDeleteArgs) => Promise<unknown> = async () => ({});
let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let goalFindManyImpl: (args: GoalFindManyArgs) => Promise<unknown[]> = async () => [];
let projectFindManyImpl: (args: ProjectFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  calendarEvent: {
    findMany: (args: EventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'calendarEvent.findMany', args });
      return eventFindManyImpl(args);
    },
    findUnique: (args: EventFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.findUnique', args });
      return eventFindUniqueImpl(args);
    },
    create: (args: EventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.create', args });
      return eventCreateImpl(args);
    },
    update: (args: EventUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.update', args });
      return eventUpdateImpl(args);
    },
    delete: (args: EventDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'calendarEvent.delete', args });
      return eventDeleteImpl(args);
    },
  },
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  goal: {
    findMany: (args: GoalFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
    },
  },
  project: {
    findMany: (args: ProjectFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
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
  eventFindManyImpl = async () => [];
  eventFindUniqueImpl = async () => null;
  eventCreateImpl = async () => ({});
  eventUpdateImpl = async () => ({});
  eventDeleteImpl = async () => ({});
  taskFindManyImpl = async () => [];
  goalFindManyImpl = async () => [];
  projectFindManyImpl = async () => [];
}

const { CalendarService } = await import('@/lib/services/calendar-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an event with required fields', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.equal(args.data.title, 'Team Meeting');
        assert.equal(args.data.type, 'meeting');
        assert.equal(args.data.timezone, 'UTC');
        return { id: 'ev1', ...args.data };
      };

      const result = await CalendarService.create('org-1', {
        title: 'Team Meeting',
        startDate: new Date('2025-01-15T10:00:00Z'),
        endDate: new Date('2025-01-15T11:00:00Z'),
        organizerId: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.id, 'ev1');
      assert.equal(calls[0].method, 'calendarEvent.create');
    });

    it('truncates long titles to 300 characters', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.ok((args.data.title as string).length <= 300);
        return { id: 'ev1', title: args.data.title };
      };

      await CalendarService.create('org-1', {
        title: 'A'.repeat(500),
        startDate: new Date('2025-01-15T10:00:00Z'),
        endDate: new Date('2025-01-15T11:00:00Z'),
        organizerId: 'user-1',
      });
    });
  });

  describe('get', () => {
    it('returns a parsed event by id', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1',
        organizationId: 'org-1',
        workspaceId: null,
        title: 'Meeting',
        description: '',
        type: 'meeting',
        status: 'scheduled',
        startDate: new Date('2025-01-15T10:00:00Z'),
        endDate: new Date('2025-01-15T11:00:00Z'),
        allDay: false,
        timezone: 'UTC',
        location: '',
        meetingUrl: null,
        organizerId: 'user-1',
        attendees: '[]',
        resources: '[]',
        recurrence: null,
        recurrenceParentId: null,
        color: '',
        tags: '[]',
        reminders: '[]',
        linkedTaskId: null,
        linkedGoalId: null,
        linkedProjectId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await CalendarService.get('ev1');
      assert.ok(result);
      assert.equal(result.id, 'ev1');
      assert.equal(result.title, 'Meeting');
      assert.equal(calls[0].method, 'calendarEvent.findUnique');
    });

    it('returns null when event not found', async () => {
      eventFindUniqueImpl = async () => null;
      const result = await CalendarService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      eventFindUniqueImpl = async () => { throw new Error('fail'); };
      const result = await CalendarService.get('ev1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns events for an organization', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'A', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'ev1');
      assert.equal(calls[0].method, 'calendarEvent.findMany');
    });

    it('applies type and status filters', async () => {
      eventFindManyImpl = async () => [];
      await CalendarService.list('org-1', { type: 'meeting', status: 'scheduled' });
      const args = calls[0].args as EventFindManyArgs;
      assert.equal(args.where.type, 'meeting');
      assert.equal(args.where.status, 'scheduled');
    });

    it('filters by attendee in-memory', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'A', startDate: new Date(), endDate: new Date(), attendees: '[{"userId":"u1","status":"pending"}]', resources: '[]', tags: '[]', reminders: '[]' },
        { id: 'ev2', title: 'B', startDate: new Date(), endDate: new Date(), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.list('org-1', { attendeeUserId: 'u1' });
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'ev1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      eventFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await CalendarService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.description, undefined);
        return { id: 'ev1', ...args.data };
      };

      const result = await CalendarService.update('ev1', { title: 'Updated' });
      assert.ok(result);
      assert.equal(calls[0].method, 'calendarEvent.update');
    });
  });

  describe('delete', () => {
    it('deletes an event', async () => {
      eventDeleteImpl = async () => ({ id: 'ev1' });
      const result = await CalendarService.delete('ev1');
      assert.ok(result);
      assert.equal(calls[0].method, 'calendarEvent.delete');
    });
  });

  describe('cancel', () => {
    it('sets status to cancelled', async () => {
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        assert.equal(args.data.status, 'cancelled');
        return { id: 'ev1', status: 'cancelled' };
      };

      const result = await CalendarService.cancel('ev1');
      assert.ok(result);
    });
  });

  describe('addAttendee', () => {
    it('adds a new attendee with pending status', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', attendees: '[]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const attendees = JSON.parse(args.data.attendees as string);
        assert.equal(attendees.length, 1);
        assert.equal(attendees[0].userId, 'u1');
        assert.equal(attendees[0].status, 'pending');
        return { id: 'ev1', attendees: args.data.attendees };
      };

      const result = await CalendarService.addAttendee('ev1', 'u1');
      assert.ok(result);
    });

    it('does not add duplicate attendee', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', attendees: '[{"userId":"u1","status":"pending"}]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const attendees = JSON.parse(args.data.attendees as string);
        assert.equal(attendees.length, 1);
        return { id: 'ev1', attendees: args.data.attendees };
      };

      await CalendarService.addAttendee('ev1', 'u1');
    });

    it('returns null when event not found', async () => {
      eventFindUniqueImpl = async () => null;
      const result = await CalendarService.addAttendee('nope', 'u1');
      assert.equal(result, null);
    });
  });

  describe('removeAttendee', () => {
    it('removes an attendee from the list', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', attendees: '[{"userId":"u1","status":"pending"},{"userId":"u2","status":"yes"}]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const attendees = JSON.parse(args.data.attendees as string);
        assert.equal(attendees.length, 1);
        assert.equal(attendees[0].userId, 'u2');
        return { id: 'ev1', attendees: args.data.attendees };
      };

      await CalendarService.removeAttendee('ev1', 'u1');
    });
  });

  describe('respondToInvite', () => {
    it('updates existing attendee response', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', attendees: '[{"userId":"u1","status":"pending"}]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const attendees = JSON.parse(args.data.attendees as string);
        assert.equal(attendees[0].status, 'yes');
        assert.ok(attendees[0].responseAt);
        return { id: 'ev1', attendees: args.data.attendees };
      };

      await CalendarService.respondToInvite('ev1', 'u1', 'yes');
    });

    it('adds attendee with response if not already invited', async () => {
      eventFindUniqueImpl = async () => ({
        id: 'ev1', attendees: '[]',
      });
      eventUpdateImpl = async (args: EventUpdateArgs) => {
        const attendees = JSON.parse(args.data.attendees as string);
        assert.equal(attendees.length, 1);
        assert.equal(attendees[0].status, 'no');
        return { id: 'ev1', attendees: args.data.attendees };
      };

      await CalendarService.respondToInvite('ev1', 'u1', 'no');
    });
  });

  describe('getUpcoming', () => {
    it('returns upcoming events', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Future', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.getUpcoming('org-1', { days: 7 });
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'ev1');
    });

    it('filters by user involvement', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'A', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), organizerId: 'u1', attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
        { id: 'ev2', title: 'B', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), organizerId: 'other', attendees: '[{"userId":"u1","status":"yes"}]', resources: '[]', tags: '[]', reminders: '[]' },
        { id: 'ev3', title: 'C', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), organizerId: 'other', attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.getUpcoming('org-1', { userId: 'u1' });
      assert.equal(result.length, 2);
    });
  });

  describe('getDay', () => {
    it('returns events for a specific day', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Day Event', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.getDay('org-1', new Date('2025-01-15'));
      assert.equal(result.length, 1);
    });
  });

  describe('getWeek', () => {
    it('returns events for a week', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Week Event', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.getWeek('org-1', new Date('2025-01-12'));
      assert.equal(result.length, 1);
    });
  });

  describe('getMonth', () => {
    it('returns events for a month', async () => {
      eventFindManyImpl = async () => ([
        { id: 'ev1', title: 'Month Event', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'), attendees: '[]', resources: '[]', tags: '[]', reminders: '[]' },
      ]);

      const result = await CalendarService.getMonth('org-1', 2025, 0);
      assert.equal(result.length, 1);
    });
  });

  describe('checkAvailability', () => {
    it('returns conflicts for overlapping events', async () => {
      eventFindManyImpl = async () => ([
        {
          id: 'ev1', title: 'Busy', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z'),
          organizerId: 'u1', attendees: '[{"userId":"u2","status":"yes"}]',
        },
      ]);

      const result = await CalendarService.checkAvailability(
        ['u1', 'u2'],
        new Date('2025-01-15T10:30:00Z'),
        new Date('2025-01-15T11:30:00Z'),
        'UTC',
      );
      assert.ok(result.conflicts.length >= 2);
    });

    it('returns no conflicts when no overlapping events', async () => {
      eventFindManyImpl = async () => [];
      const result = await CalendarService.checkAvailability(
        ['u1'], new Date('2025-01-15T10:00:00Z'), new Date('2025-01-15T11:00:00Z'), 'UTC',
      );
      assert.equal(result.conflicts.length, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates event stats', async () => {
      eventFindManyImpl = async () => ([
        { type: 'meeting', status: 'scheduled', startDate: new Date('2025-01-15T10:00:00Z'), endDate: new Date('2025-01-15T11:00:00Z') },
        { type: 'meeting', status: 'completed', startDate: new Date('2025-01-16T10:00:00Z'), endDate: new Date('2025-01-16T12:00:00Z') },
        { type: 'deadline', status: 'cancelled', startDate: new Date('2025-01-17T10:00:00Z'), endDate: new Date('2025-01-17T10:30:00Z') },
      ]);

      const stats = await CalendarService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.byType.meeting, 2);
      assert.equal(stats.byType.deadline, 1);
      assert.equal(stats.byStatus.scheduled, 1);
      assert.equal(stats.byStatus.completed, 1);
      assert.equal(stats.byStatus.cancelled, 1);
      // meetingHours only counts non-cancelled: 1h + 2h = 3h
      assert.equal(stats.meetingHours, 3);
    });

    it('returns zero stats on error', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };
      const stats = await CalendarService.getStats('org-1');
      assert.equal(stats.total, 0);
    });
  });

  describe('getGanttData', () => {
    it('returns gantt items from tasks, projects, and goals', async () => {
      taskFindManyImpl = async () => ([
        { id: 't1', title: 'Task 1', status: 'in_progress', createdAt: new Date('2025-01-01'), dueDate: new Date('2025-01-15'), dependencies: [], project: { workspaceId: 'ws-1' } },
      ]);
      projectFindManyImpl = async () => ([
        { id: 'p1', name: 'Project 1', status: 'active', createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-02-01') },
      ]);
      goalFindManyImpl = async () => ([
        { id: 'g1', title: 'Goal 1', progress: 0.5, createdAt: new Date('2025-01-01'), dueDate: new Date('2025-03-01') },
      ]);

      const data = await CalendarService.getGanttData('org-1');
      assert.equal(data.items.length, 3);
      assert.ok(data.items.some((i) => i.type === 'task'));
      assert.ok(data.items.some((i) => i.type === 'project'));
      assert.ok(data.items.some((i) => i.type === 'goal'));
    });

    it('returns empty items on error', async () => {
      taskFindManyImpl = async () => { throw new Error('fail'); };
      goalFindManyImpl = async () => { throw new Error('fail'); };
      projectFindManyImpl = async () => { throw new Error('fail'); };
      const data = await CalendarService.getGanttData('org-1');
      assert.equal(data.items.length, 0);
    });
  });

  describe('getDeadlines', () => {
    it('returns upcoming deadlines sorted by date', async () => {
      const now = new Date();
      taskFindManyImpl = async () => ([
        { id: 't1', title: 'Task A', status: 'todo', dueDate: new Date(now.getTime() + 5 * 86400000), priority: 'high', assigneeId: 'u1' },
      ]);
      goalFindManyImpl = async () => ([
        { id: 'g1', title: 'Goal B', status: 'in_progress', dueDate: new Date(now.getTime() + 2 * 86400000), priority: 'medium' },
      ]);

      const deadlines = await CalendarService.getDeadlines('org-1', { days: 30 });
      assert.equal(deadlines.length, 2);
      // Goal B is due sooner
      assert.equal(deadlines[0].id, 'g1');
      assert.equal(deadlines[1].id, 't1');
    });

    it('returns empty array on error', async () => {
      taskFindManyImpl = async () => { throw new Error('fail'); };
      goalFindManyImpl = async () => { throw new Error('fail'); };
      const deadlines = await CalendarService.getDeadlines('org-1');
      assert.equal(deadlines.length, 0);
    });
  });
});
