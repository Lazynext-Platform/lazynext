import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type EventCreateArgs = {
  data: {
    workspaceId?: string | null;
    organizationId?: string | null;
    type: string;
    actor?: string | null;
    actorType: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata: string;
    correlationId?: string | null;
    source: string;
  };
};

type EventFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

const calls: { method: string; args?: unknown }[] = [];

let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> = async () => ({});
let eventFindManyImpl: (args: EventFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  event: {
    create: (args: EventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
    },
    findMany: (args: EventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
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
  eventCreateImpl = async () => ({});
  eventFindManyImpl = async () => [];
}

const { EventService } = await import('@/lib/services/event');

describe('EventService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('emit', () => {
    it('creates an event with correct fields', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.equal(args.data.type, 'task.created');
        assert.equal(args.data.actor, 'user-1');
        assert.equal(args.data.actorType, 'user');
        assert.equal(args.data.resourceType, 'task');
        assert.equal(args.data.resourceId, 'task-1');
        assert.deepEqual(JSON.parse(args.data.metadata), { title: 'Test task' });
        return { id: 'evt-1', ...args.data };
      };

      const result = await EventService.emit({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'task.created',
        actor: 'user-1',
        actorType: 'user',
        resourceType: 'task',
        resourceId: 'task-1',
        metadata: { title: 'Test task' },
      });

      assert.ok(result);
      assert.equal(result.id, 'evt-1');
    });

    it('defaults actorType to system when not provided', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.equal(args.data.actorType, 'system');
        return { id: 'evt-1' };
      };

      await EventService.emit({
        type: 'system.cleanup',
      });
    });

    it('truncates type to 100 characters', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.ok(args.data.type.length <= 100);
        return { id: 'evt-1' };
      };

      await EventService.emit({
        type: 'A'.repeat(150),
      });
    });
  });

  describe('list', () => {
    it('lists events for a workspace', async () => {
      eventFindManyImpl = async () =>
        [
          { id: 'evt-1', type: 'task.created', createdAt: new Date() },
          { id: 'evt-2', type: 'agent.run.completed', createdAt: new Date() },
        ];

      const result = await EventService.list('ws-1');
      assert.equal(result.length, 2);
    });

    it('filters by type when provided', async () => {
      eventFindManyImpl = async (args: EventFindManyArgs) => {
        assert.equal(args.where.type, 'task.created');
        return [{ id: 'evt-1', type: 'task.created' }];
      };

      const result = await EventService.list('ws-1', { type: 'task.created' });
      assert.equal(result.length, 1);
    });
  });

  describe('listByCorrelation', () => {
    it('lists events by correlation ID in chronological order', async () => {
      eventFindManyImpl = async (args: EventFindManyArgs) => {
        assert.equal(args.where.correlationId, 'corr-1');
        assert.equal(args.orderBy?.createdAt, 'asc');
        return [
          { id: 'evt-1', correlationId: 'corr-1' },
          { id: 'evt-2', correlationId: 'corr-1' },
        ];
      };

      const result = await EventService.listByCorrelation('corr-1');
      assert.equal(result.length, 2);
    });
  });
});
