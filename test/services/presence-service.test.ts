import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  actor: string | null;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string;
  correlationId: string | null;
  source: string;
  createdAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let eventFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let eventCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let eventDeleteManyImpl: (args: unknown) => Promise<unknown> = async () => ({ count: 0 });

const prismaMock = {
  event: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
    },
    deleteMany: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'event.deleteMany', args });
      return eventDeleteManyImpl(args);
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

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 'evt-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'presence',
    actor: 'user-1',
    actorType: 'user',
    resourceType: null,
    resourceId: null,
    metadata: JSON.stringify({ status: 'online', lastSeen: new Date().toISOString() }),
    correlationId: 'ws-1:user-1',
    source: 'heartbeat',
    createdAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  eventFindManyImpl = async () => [];
  eventCreateImpl = async () => ({});
  eventDeleteManyImpl = async () => ({ count: 0 });
}

const { PresenceService } = await import('@/lib/services/presence-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PresenceService', () => {
  beforeEach(() => { resetMock(); });

  describe('heartbeat', () => {
    it('records a heartbeat event', async () => {
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.type, 'presence');
        assert.equal(a.data.source, 'heartbeat');
        assert.equal(a.data.actor, 'user-1');
        return makeEvent();
      };

      const ok = await PresenceService.heartbeat('org-1', 'ws-1', 'user-1', 'online');

      assert.equal(ok, true);
      assert.equal(calls[0].method, 'event.create');
    });

    it('returns false on error', async () => {
      eventCreateImpl = async () => { throw new Error('DB down'); };

      const ok = await PresenceService.heartbeat('org-1', 'ws-1', 'user-1');

      assert.equal(ok, false);
    });

    it('defaults status to online', async () => {
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: { metadata: string } };
        const parsed = JSON.parse(a.data.metadata);
        assert.equal(parsed.status, 'online');
        return makeEvent();
      };

      await PresenceService.heartbeat('org-1', 'ws-1', 'user-1');
    });
  });

  describe('getPresence', () => {
    it('returns presence records for a workspace', async () => {
      eventFindManyImpl = async () => [
        makeEvent({ id: 'e1', actor: 'user-1', metadata: JSON.stringify({ status: 'online', lastSeen: new Date().toISOString() }) }),
        makeEvent({ id: 'e2', actor: 'user-2', metadata: JSON.stringify({ status: 'away', lastSeen: new Date().toISOString() }) }),
      ];

      const presence = await PresenceService.getPresence('ws-1');

      assert.equal(presence.length, 2);
      assert.equal(presence[0].userId, 'user-1');
      assert.equal(calls[0].method, 'event.findMany');
    });

    it('keeps only the most recent heartbeat per user', async () => {
      const now = new Date();
      eventFindManyImpl = async () => [
        makeEvent({ id: 'e1', actor: 'user-1', createdAt: now }),
        makeEvent({ id: 'e2', actor: 'user-1', createdAt: new Date(now.getTime() - 60000) }),
      ];

      const presence = await PresenceService.getPresence('ws-1');

      assert.equal(presence.length, 1);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };

      const presence = await PresenceService.getPresence('ws-1');
      assert.deepEqual(presence, []);
    });
  });

  describe('getUserPresence', () => {
    it('returns the most recent presence for a user', async () => {
      eventFindManyImpl = async () => [
        makeEvent({ id: 'e1', actor: 'user-1', metadata: JSON.stringify({ status: 'busy', lastSeen: new Date().toISOString() }) }),
      ];

      const presence = await PresenceService.getUserPresence('user-1');

      assert.ok(presence);
      assert.equal(presence!.userId, 'user-1');
    });

    it('returns null when no heartbeat found', async () => {
      eventFindManyImpl = async () => [];

      const presence = await PresenceService.getUserPresence('nope');
      assert.equal(presence, null);
    });
  });

  describe('setStatus', () => {
    it('records a heartbeat with the new status', async () => {
      eventFindManyImpl = async () => [makeEvent({ actor: 'user-1', workspaceId: 'ws-1', organizationId: 'org-1' })];
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: { metadata: string } };
        const parsed = JSON.parse(a.data.metadata);
        assert.equal(parsed.status, 'busy');
        return makeEvent();
      };

      const ok = await PresenceService.setStatus('user-1', 'busy');

      assert.equal(ok, true);
    });

    it('uses unknown workspace when no prior heartbeat', async () => {
      eventFindManyImpl = async () => [];
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.workspaceId, 'unknown');
        return makeEvent();
      };

      const ok = await PresenceService.setStatus('user-1', 'away');

      assert.equal(ok, true);
    });
  });

  describe('getOnlineCount', () => {
    it('counts users with online status', async () => {
      eventFindManyImpl = async () => [
        makeEvent({ actor: 'user-1', metadata: JSON.stringify({ status: 'online', lastSeen: new Date().toISOString() }) }),
        makeEvent({ actor: 'user-2', metadata: JSON.stringify({ status: 'away', lastSeen: new Date().toISOString() }) }),
      ];

      const count = await PresenceService.getOnlineCount('ws-1');

      assert.equal(count, 1);
    });
  });

  describe('getViewing', () => {
    it('returns users currently viewing a resource', async () => {
      eventFindManyImpl = async () => [
        makeEvent({ actor: 'user-1', source: 'viewing', resourceType: 'task', resourceId: 't1' }),
        makeEvent({ actor: 'user-2', source: 'viewing', resourceType: 'task', resourceId: 't1' }),
      ];

      const viewing = await PresenceService.getViewing('task', 't1', 'ws-1');

      assert.equal(viewing.length, 2);
      assert.equal(viewing[0].userId, 'user-1');
      assert.equal(viewing[0].resourceType, 'task');
    });

    it('keeps only the most recent viewing event per user', async () => {
      const now = new Date();
      eventFindManyImpl = async () => [
        makeEvent({ actor: 'user-1', source: 'viewing', resourceType: 'task', resourceId: 't1', createdAt: now }),
        makeEvent({ actor: 'user-1', source: 'viewing', resourceType: 'task', resourceId: 't1', createdAt: new Date(now.getTime() - 30000) }),
      ];

      const viewing = await PresenceService.getViewing('task', 't1', 'ws-1');

      assert.equal(viewing.length, 1);
    });
  });

  describe('startViewing', () => {
    it('records a viewing event', async () => {
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.source, 'viewing');
        assert.equal(a.data.resourceType, 'task');
        assert.equal(a.data.resourceId, 't1');
        return makeEvent();
      };

      const ok = await PresenceService.startViewing('org-1', 'ws-1', 'user-1', 'task', 't1');

      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      eventCreateImpl = async () => { throw new Error('fail'); };

      const ok = await PresenceService.startViewing('org-1', 'ws-1', 'user-1', 'task', 't1');

      assert.equal(ok, false);
    });
  });

  describe('stopViewing', () => {
    it('deletes viewing events for a user and resource', async () => {
      eventDeleteManyImpl = async (args: unknown) => {
        const a = args as { where: Record<string, unknown> };
        assert.equal(a.where.actor, 'user-1');
        assert.equal(a.where.resourceType, 'task');
        return { count: 1 };
      };

      const ok = await PresenceService.stopViewing('user-1', 'task', 't1');

      assert.equal(ok, true);
      assert.equal(calls[0].method, 'event.deleteMany');
    });

    it('returns false on error', async () => {
      eventDeleteManyImpl = async () => { throw new Error('fail'); };

      const ok = await PresenceService.stopViewing('user-1', 'task', 't1');

      assert.equal(ok, false);
    });
  });

  describe('getActivityFeed', () => {
    it('returns activity items for an organization', async () => {
      eventFindManyImpl = async () => [
        makeEvent({ id: 'e1', type: 'presence', actor: 'user-1', metadata: '{}' }),
        makeEvent({ id: 'e2', type: 'comment', actor: 'user-2', metadata: '{}' }),
      ];

      const activity = await PresenceService.getActivityFeed('org-1');

      assert.equal(activity.length, 2);
      assert.equal(activity[0].id, 'e1');
      assert.equal(calls[0].method, 'event.findMany');
    });

    it('applies workspace, user, and type filters', async () => {
      eventFindManyImpl = async (args: unknown) => {
        const a = args as { where: Record<string, unknown> };
        assert.equal(a.where.workspaceId, 'ws-1');
        assert.equal(a.where.actor, 'user-1');
        assert.deepEqual(a.where.type, { in: ['presence', 'comment'] });
        return [];
      };

      await PresenceService.getActivityFeed('org-1', {
        workspaceId: 'ws-1',
        userId: 'user-1',
        types: ['presence', 'comment'],
      });
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };

      const activity = await PresenceService.getActivityFeed('org-1');
      assert.deepEqual(activity, []);
    });
  });

  describe('getStats', () => {
    it('returns presence stats for a workspace', async () => {
      // getPresence call
      eventFindManyImpl = async () => [
        makeEvent({ actor: 'user-1', metadata: JSON.stringify({ status: 'online', lastSeen: new Date().toISOString() }) }),
        makeEvent({ actor: 'user-2', metadata: JSON.stringify({ status: 'away', lastSeen: new Date().toISOString() }) }),
      ];

      const stats = await PresenceService.getStats('ws-1');

      assert.equal(stats.onlineCount, 1);
      assert.equal(stats.activeUsers, 2);
      assert.ok(typeof stats.viewingCount === 'number');
    });
  });
});
