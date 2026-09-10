import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface SessionRecord {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  revokedAt: Date | null;
}

interface EventRecord {
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

const sessionStore: Map<string, SessionRecord> = new Map();
const eventStore: Map<string, EventRecord> = new Map();
let sessionIdCounter = 0;
let eventIdCounter = 0;

interface CallRecord {
  method: string;
  args?: unknown;
}
const calls: CallRecord[] = [];

let sessionFindManyImpl: (args: unknown) => Promise<SessionRecord[]> = async () => [];
let sessionDeleteImpl: (args: unknown) => Promise<SessionRecord> = async () => ({}) as SessionRecord;
let sessionDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });

let eventFindManyImpl: (args: unknown) => Promise<EventRecord[]> = async () => [];
let eventCreateImpl: (args: unknown) => Promise<EventRecord> = async () => ({}) as EventRecord;

const prismaMock = {
  session: {
    findMany: (args: unknown): Promise<SessionRecord[]> => {
      calls.push({ method: 'session.findMany', args });
      return sessionFindManyImpl(args);
    },
    delete: (args: unknown): Promise<SessionRecord> => {
      calls.push({ method: 'session.delete', args });
      return sessionDeleteImpl(args);
    },
    deleteMany: (args: unknown): Promise<{ count: number }> => {
      calls.push({ method: 'session.deleteMany', args });
      return sessionDeleteManyImpl(args);
    },
  },
  event: {
    findMany: (args: unknown): Promise<EventRecord[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
    create: (args: unknown): Promise<EventRecord> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
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
  sessionStore.clear();
  eventStore.clear();
  sessionIdCounter = 0;
  eventIdCounter = 0;

  sessionFindManyImpl = async (args: unknown) => {
    const a = args as { where: { userId: string; revokedAt?: null; expires?: { gt: Date } } };
    const results: SessionRecord[] = [];
    for (const rec of sessionStore.values()) {
      if (rec.userId !== a.where.userId) continue;
      if (a.where.revokedAt === null && rec.revokedAt !== null) continue;
      if (a.where.expires?.gt && rec.expires <= a.where.expires.gt) continue;
      results.push(rec);
    }
    results.sort((x, y) => y.expires.getTime() - x.expires.getTime());
    return results;
  };

  sessionDeleteImpl = async (args: unknown) => {
    const a = args as { where: { id: string } };
    const rec = sessionStore.get(a.where.id);
    if (rec) sessionStore.delete(a.where.id);
    return rec || ({} as SessionRecord);
  };

  sessionDeleteManyImpl = async (args: unknown) => {
    const a = args as { where: { userId: string; NOT?: { id: string } } };
    let count = 0;
    for (const [id, rec] of sessionStore.entries()) {
      if (rec.userId !== a.where.userId) continue;
      if (a.where.NOT?.id === id) continue;
      sessionStore.delete(id);
      count++;
    }
    return { count };
  };

  eventFindManyImpl = async (args: unknown) => {
    const a = args as { where: { type?: string; actor?: string; type_in?: string[]; createdAt?: { gte: Date } }, take?: number; skip?: number };
    let results: EventRecord[] = [];
    for (const rec of eventStore.values()) {
      if (a.where.type && rec.type !== a.where.type) continue;
      if (a.where.actor && rec.actor !== a.where.actor) continue;
      if (a.where.type_in && !a.where.type_in.includes(rec.type)) continue;
      if (a.where.createdAt?.gte && rec.createdAt < a.where.createdAt.gte) continue;
      results.push(rec);
    }
    results.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
    const skip = a.skip || 0;
    const take = a.take || 50;
    results = results.slice(skip, skip + take);
    return results;
  };

  eventCreateImpl = async (args: unknown) => {
    const a = args as { data: Partial<EventRecord> };
    const id = `evt-${++eventIdCounter}`;
    const rec: EventRecord = {
      id,
      workspaceId: a.data.workspaceId || null,
      organizationId: a.data.organizationId || null,
      type: a.data.type || '',
      actor: a.data.actor || null,
      actorType: a.data.actorType || 'user',
      resourceType: a.data.resourceType || null,
      resourceId: a.data.resourceId || null,
      metadata: a.data.metadata || '{}',
      correlationId: a.data.correlationId || null,
      source: a.data.source || 'system',
      createdAt: new Date(),
    };
    eventStore.set(id, rec);
    return rec;
  };
}

function addSession(userId: string, expires: Date = new Date(Date.now() + 3600000)): SessionRecord {
  const id = `sess-${++sessionIdCounter}`;
  const rec: SessionRecord = {
    id,
    sessionToken: `token-${id}`,
    userId,
    expires,
    revokedAt: null,
  };
  sessionStore.set(id, rec);
  return rec;
}

function addEvent(userId: string, type: string, metadata: Record<string, unknown>, ageMs: number = 0): EventRecord {
  const id = `evt-${++eventIdCounter}`;
  const rec: EventRecord = {
    id,
    workspaceId: null,
    organizationId: null,
    type,
    actor: userId,
    actorType: 'user',
    resourceType: 'session',
    resourceId: null,
    metadata: JSON.stringify(metadata),
    correlationId: null,
    source: 'system',
    createdAt: new Date(Date.now() - ageMs),
  };
  eventStore.set(id, rec);
  return rec;
}

const { SessionManagementService } = await import('@/lib/services/session-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionManagementService', () => {
  beforeEach(() => { resetMock(); });

  describe('listSessions', () => {
    it('lists active sessions for a user', async () => {
      addSession('user-1');
      addSession('user-1');
      addSession('user-2');

      const sessions = await SessionManagementService.listSessions('user-1');
      assert.equal(sessions.length, 2);
      assert.equal(calls[0].method, 'session.findMany');
    });

    it('excludes expired sessions', async () => {
      addSession('user-1', new Date(Date.now() - 1000)); // expired
      addSession('user-1', new Date(Date.now() + 3600000)); // active

      const sessions = await SessionManagementService.listSessions('user-1');
      assert.equal(sessions.length, 1);
    });

    it('returns empty array on error', async () => {
      sessionFindManyImpl = async () => { throw new Error('DB down'); };
      const sessions = await SessionManagementService.listSessions('user-1');
      assert.deepEqual(sessions, []);
    });
  });

  describe('revokeSession', () => {
    it('deletes a session by id', async () => {
      const s = addSession('user-1');
      const result = await SessionManagementService.revokeSession(s.id);
      assert.equal(result.revoked, true);
      assert.equal(sessionStore.size, 0);
    });
  });

  describe('revokeAllSessions', () => {
    it('deletes all sessions for a user', async () => {
      addSession('user-1');
      addSession('user-1');
      addSession('user-2');

      const result = await SessionManagementService.revokeAllSessions('user-1');
      assert.equal(result.revoked, 2);
      assert.equal(sessionStore.size, 1); // user-2's session remains
    });

    it('excepts the specified session', async () => {
      const s1 = addSession('user-1');
      addSession('user-1');

      const result = await SessionManagementService.revokeAllSessions('user-1', s1.id);
      assert.equal(result.revoked, 1);
      assert.ok(sessionStore.has(s1.id));
    });
  });

  describe('recordLogin', () => {
    it('creates a login event', async () => {
      const result = await SessionManagementService.recordLogin('user-1', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'password',
        success: true,
      });

      assert.equal(result.recorded, true);
      assert.equal(calls[0].method, 'event.create');
      const args = calls[0].args as { data: { type: string; actor: string; metadata: string } };
      assert.equal(args.data.type, 'login');
      assert.equal(args.data.actor, 'user-1');
      const metadata = JSON.parse(args.data.metadata);
      assert.equal(metadata.ipAddress, '192.168.1.1');
      assert.equal(metadata.success, true);
    });
  });

  describe('getLoginHistory', () => {
    it('returns login history entries', async () => {
      addEvent('user-1', 'login', { ipAddress: '1.2.3.4', userAgent: 'Chrome', method: 'password', success: true });

      const history = await SessionManagementService.getLoginHistory('user-1');
      assert.equal(history.length, 1);
      assert.equal(history[0].ipAddress, '1.2.3.4');
      assert.equal(history[0].success, true);
    });

    it('returns empty array on error', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };
      const history = await SessionManagementService.getLoginHistory('user-1');
      assert.deepEqual(history, []);
    });
  });

  describe('getActiveDevices', () => {
    it('returns devices parsed from sessions', async () => {
      addSession('user-1');
      addEvent('user-1', 'login', { ipAddress: '10.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', method: 'password', success: true });

      const devices = await SessionManagementService.getActiveDevices('user-1');
      assert.equal(devices.length, 1);
      assert.equal(devices[0].browser, 'Chrome');
      assert.equal(devices[0].os, 'Windows');
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('detects multiple failed logins', async () => {
      addEvent('user-1', 'login', { success: false, ipAddress: '1.1.1.1', userAgent: 'test', method: 'password' }, 0);
      addEvent('user-1', 'login', { success: false, ipAddress: '1.1.1.1', userAgent: 'test', method: 'password' }, 0);
      addEvent('user-1', 'login', { success: false, ipAddress: '1.1.1.1', userAgent: 'test', method: 'password' }, 0);

      const result = await SessionManagementService.detectSuspiciousActivity('user-1');
      assert.equal(result.suspicious, true);
      assert.ok(result.reasons.some((r) => r.includes('failed login')));
    });

    it('returns not suspicious for normal activity', async () => {
      addEvent('user-1', 'login', { success: true, ipAddress: '1.1.1.1', userAgent: 'test', method: 'password' }, 0);

      const result = await SessionManagementService.detectSuspiciousActivity('user-1');
      assert.equal(result.suspicious, false);
    });
  });

  describe('getStats', () => {
    it('returns session statistics', async () => {
      addSession('user-1');
      addEvent('user-1', 'login', { success: false, ipAddress: '1.1.1.1', userAgent: 'test', method: 'password' }, 0);

      const stats = await SessionManagementService.getStats('user-1');
      assert.equal(stats.activeCount, 1);
      assert.equal(stats.failedLogins, 1);
    });
  });
});
