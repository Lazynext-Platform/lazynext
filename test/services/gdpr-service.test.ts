import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventRow {
  id: string;
  type: string;
  metadata: string;
  createdAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindFirstImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryCountImpl: (args: unknown) => Promise<number> = async () => 0;

let userFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let userUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});

let taskFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let taskDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let taskUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let taskCountImpl: (args: unknown) => Promise<number> = async () => 0;

let goalFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let goalDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let goalUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let goalCountImpl: (args: unknown) => Promise<number> = async () => 0;

let projectFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let projectCountImpl: (args: unknown) => Promise<number> = async () => 0;

let eventFindManyImpl: (args: unknown) => Promise<EventRow[]> = async () => [];
let eventCreateImpl: (args: unknown) => Promise<EventRow> = async () => ({}) as EventRow;
let eventDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let eventCountImpl: (args: unknown) => Promise<number> = async () => 0;

let membershipFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let membershipCountImpl: (args: unknown) => Promise<number> = async () => 0;

let dataRequestFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let dataRequestCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let dataRequestUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => { calls.push({ method: 'memory.findMany', args }); return memoryFindManyImpl(args); },
    findFirst: (args: unknown): Promise<MemoryRow | null> => { calls.push({ method: 'memory.findFirst', args }); return memoryFindFirstImpl(args); },
    create: (args: unknown): Promise<MemoryRow> => { calls.push({ method: 'memory.create', args }); return memoryCreateImpl(args); },
    update: (args: unknown): Promise<MemoryRow> => { calls.push({ method: 'memory.update', args }); return memoryUpdateImpl(args); },
    deleteMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'memory.deleteMany', args }); return memoryDeleteManyImpl(args); },
    updateMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'memory.updateMany', args }); return memoryUpdateManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'memory.count', args }); return memoryCountImpl(args); },
  },
  user: {
    findUnique: (args: unknown): Promise<unknown> => { calls.push({ method: 'user.findUnique', args }); return userFindUniqueImpl(args); },
    update: (args: unknown): Promise<unknown> => { calls.push({ method: 'user.update', args }); return userUpdateImpl(args); },
  },
  task: {
    findMany: (args: unknown): Promise<unknown[]> => { calls.push({ method: 'task.findMany', args }); return taskFindManyImpl(args); },
    deleteMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'task.deleteMany', args }); return taskDeleteManyImpl(args); },
    updateMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'task.updateMany', args }); return taskUpdateManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'task.count', args }); return taskCountImpl(args); },
  },
  goal: {
    findMany: (args: unknown): Promise<unknown[]> => { calls.push({ method: 'goal.findMany', args }); return goalFindManyImpl(args); },
    deleteMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'goal.deleteMany', args }); return goalDeleteManyImpl(args); },
    updateMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'goal.updateMany', args }); return goalUpdateManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'goal.count', args }); return goalCountImpl(args); },
  },
  project: {
    findMany: (args: unknown): Promise<unknown[]> => { calls.push({ method: 'project.findMany', args }); return projectFindManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'project.count', args }); return projectCountImpl(args); },
  },
  event: {
    findMany: (args: unknown): Promise<EventRow[]> => { calls.push({ method: 'event.findMany', args }); return eventFindManyImpl(args); },
    create: (args: unknown): Promise<EventRow> => { calls.push({ method: 'event.create', args }); return eventCreateImpl(args); },
    deleteMany: (args: unknown): Promise<{ count: number }> => { calls.push({ method: 'event.deleteMany', args }); return eventDeleteManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'event.count', args }); return eventCountImpl(args); },
  },
  membership: {
    findMany: (args: unknown): Promise<unknown[]> => { calls.push({ method: 'membership.findMany', args }); return membershipFindManyImpl(args); },
    count: (args: unknown): Promise<number> => { calls.push({ method: 'membership.count', args }); return membershipCountImpl(args); },
  },
  dataRequest: {
    findMany: (args: unknown): Promise<unknown[]> => { calls.push({ method: 'dataRequest.findMany', args }); return dataRequestFindManyImpl(args); },
    create: (args: unknown): Promise<unknown> => { calls.push({ method: 'dataRequest.create', args }); return dataRequestCreateImpl(args); },
    update: (args: unknown): Promise<unknown> => { calls.push({ method: 'dataRequest.update', args }); return dataRequestUpdateImpl(args); },
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

function makeConsentMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'cons-1',
    workspaceId: 'global',
    organizationId: 'global',
    type: 'gdpr_consent',
    content: JSON.stringify({
      userId: 'user-1',
      consentType: 'marketing',
      granted: true,
      grantedAt: '2024-01-01T00:00:00.000Z',
      revokedAt: null,
      metadata: {},
    }),
    source: 'gdpr',
    sourceId: 'user-1',
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'permanent',
    tags: '["marketing"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteManyImpl = async () => ({ count: 0 });
  memoryUpdateManyImpl = async () => ({ count: 0 });
  memoryCountImpl = async () => 0;
  userFindUniqueImpl = async () => null;
  userUpdateImpl = async () => ({});
  taskFindManyImpl = async () => [];
  taskDeleteManyImpl = async () => ({ count: 0 });
  taskUpdateManyImpl = async () => ({ count: 0 });
  taskCountImpl = async () => 0;
  goalFindManyImpl = async () => [];
  goalDeleteManyImpl = async () => ({ count: 0 });
  goalUpdateManyImpl = async () => ({ count: 0 });
  goalCountImpl = async () => 0;
  projectFindManyImpl = async () => [];
  projectCountImpl = async () => 0;
  eventFindManyImpl = async () => [];
  eventCreateImpl = async () => ({}) as EventRow;
  eventDeleteManyImpl = async () => ({ count: 0 });
  eventCountImpl = async () => 0;
  membershipFindManyImpl = async () => [];
  membershipCountImpl = async () => 0;
  dataRequestFindManyImpl = async () => [];
  dataRequestCreateImpl = async () => ({});
  dataRequestUpdateImpl = async () => ({});
}

const { GdprService } = await import('@/lib/services/gdpr-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GdprService', () => {
  beforeEach(() => { resetMock(); });

  describe('exportUserData', () => {
    it('exports all user data', async () => {
      userFindUniqueImpl = async () => ({ id: 'user-1', name: 'Alice', email: 'alice@example.com' });
      taskFindManyImpl = async () => [{ id: 't1' }];
      goalFindManyImpl = async () => [{ id: 'g1' }];
      eventCreateImpl = async () => ({ id: 'evt-1', type: 'gdpr.export.completed', metadata: '{}', createdAt: new Date() });

      const result = await GdprService.exportUserData('user-1');

      assert.equal(result.userId, 'user-1');
      assert.ok(result.user);
      assert.equal(result.tasks.length, 1);
      assert.equal(result.goals.length, 1);
      assert.ok(result.exportedAt);
    });

    it('handles missing user gracefully', async () => {
      userFindUniqueImpl = async () => null;
      eventCreateImpl = async () => ({ id: 'evt-1', type: 'gdpr.export.completed', metadata: '{}', createdAt: new Date() });

      const result = await GdprService.exportUserData('nonexistent');

      assert.equal(result.user, null);
      assert.equal(result.tasks.length, 0);
    });
  });

  describe('deleteUserData', () => {
    it('hard deletes user data', async () => {
      taskDeleteManyImpl = async () => ({ count: 5 });
      goalDeleteManyImpl = async () => ({ count: 3 });
      memoryDeleteManyImpl = async () => ({ count: 10 });
      eventDeleteManyImpl = async () => ({ count: 2 });
      eventCreateImpl = async () => ({ id: 'evt-1', type: 'gdpr.deletion.completed', metadata: '{}', createdAt: new Date() });

      const result = await GdprService.deleteUserData('user-1');

      assert.equal(result.deleted, true);
      assert.equal(result.anonymized, false);
      assert.equal(result.recordsAffected, 20);
    });

    it('anonymizes when option is set', async () => {
      userUpdateImpl = async () => ({ id: 'user-1' });
      taskUpdateManyImpl = async () => ({ count: 5 });
      goalUpdateManyImpl = async () => ({ count: 3 });
      memoryUpdateManyImpl = async () => ({ count: 10 });
      eventCreateImpl = async () => ({ id: 'evt-1', type: 'gdpr.anonymization.completed', metadata: '{}', createdAt: new Date() });

      const result = await GdprService.deleteUserData('user-1', { anonymize: true });

      assert.equal(result.deleted, false);
      assert.equal(result.anonymized, true);
      assert.ok(result.recordsAffected > 0);
    });
  });

  describe('anonymizeUserData', () => {
    it('anonymizes user PII', async () => {
      userUpdateImpl = async (args: unknown) => {
        const a = args as { data: { name: string; email: string } };
        assert.equal(a.data.name, 'Anonymous User');
        assert.ok(a.data.email.includes('anonymized'));
        return { id: 'user-1' };
      };
      taskUpdateManyImpl = async () => ({ count: 2 });
      goalUpdateManyImpl = async () => ({ count: 1 });
      memoryUpdateManyImpl = async () => ({ count: 3 });
      eventCreateImpl = async () => ({ id: 'evt-1', type: 'gdpr.anonymization.completed', metadata: '{}', createdAt: new Date() });

      const result = await GdprService.anonymizeUserData('user-1');

      assert.equal(result.anonymized, true);
      assert.ok(result.recordsAffected > 0);
    });
  });

  describe('getDataInventory', () => {
    it('returns data inventory with counts', async () => {
      taskCountImpl = async () => 5;
      goalCountImpl = async () => 3;
      projectCountImpl = async () => 2;
      eventCountImpl = async () => 10;
      memoryCountImpl = async () => 7;
      membershipCountImpl = async () => 1;

      const result = await GdprService.getDataInventory('user-1');

      assert.equal(result.userId, 'user-1');
      assert.ok(result.items.length >= 7);
      assert.equal(result.items.find((i) => i.entity === 'task')!.count, 5);
      assert.equal(result.items.find((i) => i.entity === 'goal')!.count, 3);
      assert.ok(result.totalRecords > 0);
    });
  });

  describe('getConsentRecord', () => {
    it('returns a single consent record by type', async () => {
      memoryFindFirstImpl = async () => makeConsentMemory();

      const result = await GdprService.getConsentRecord('user-1', 'marketing');

      assert.ok(result);
      assert.ok(!Array.isArray(result));
      const record = result as { userId: string; consentType: string; granted: boolean };
      assert.equal(record.userId, 'user-1');
      assert.equal(record.consentType, 'marketing');
      assert.equal(record.granted, true);
    });

    it('returns null when no consent record found', async () => {
      memoryFindFirstImpl = async () => null;

      const result = await GdprService.getConsentRecord('user-1', 'marketing');

      assert.equal(result, null);
    });

    it('returns all consent records when no type specified', async () => {
      memoryFindManyImpl = async () => [
        makeConsentMemory(),
        makeConsentMemory({ id: 'cons-2', content: JSON.stringify({ userId: 'user-1', consentType: 'analytics', granted: false }) }),
      ];

      const result = await GdprService.getConsentRecord('user-1');

      assert.ok(Array.isArray(result));
      assert.equal((result as unknown[]).length, 2);
    });
  });

  describe('updateConsent', () => {
    it('creates a new consent record', async () => {
      memoryFindFirstImpl = async () => null;
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'gdpr_consent');
        const content = JSON.parse(a.data.content);
        assert.equal(content.granted, true);
        return makeConsentMemory({ content: a.data.content });
      };

      const result = await GdprService.updateConsent({
        userId: 'user-1',
        consentType: 'marketing',
        granted: true,
      });

      assert.ok(result);
      assert.equal(result.granted, true);
    });

    it('updates an existing consent record', async () => {
      memoryFindFirstImpl = async () => makeConsentMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.granted, false);
        return makeConsentMemory({ content: a.data.content });
      };

      const result = await GdprService.updateConsent({
        userId: 'user-1',
        consentType: 'marketing',
        granted: false,
      });

      assert.ok(result);
      assert.equal(result.granted, false);
    });
  });

  describe('createDataRequest', () => {
    it('creates a data subject access request', async () => {
      dataRequestCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; email: string; status: string } };
        assert.equal(a.data.type, 'access');
        assert.equal(a.data.email, 'user@example.com');
        assert.equal(a.data.status, 'pending');
        return { id: 'dr-1', ...a.data };
      };

      const result = await GdprService.createDataRequest({
        type: 'access',
        email: 'user@example.com',
        name: 'Alice',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'dataRequest.create');
    });
  });

  describe('processDataRequest', () => {
    it('updates the request status', async () => {
      dataRequestUpdateImpl = async (args: unknown) => {
        const a = args as { where: { id: string }; data: { status: string } };
        assert.equal(a.where.id, 'dr-1');
        assert.equal(a.data.status, 'completed');
        return { id: 'dr-1', status: 'completed' };
      };

      const result = await GdprService.processDataRequest('dr-1', 'completed');

      assert.ok(result);
      assert.equal(calls[0].method, 'dataRequest.update');
    });
  });

  describe('getStats', () => {
    it('returns aggregate GDPR stats', async () => {
      dataRequestFindManyImpl = async () => [
        { id: 'dr-1', status: 'pending' },
        { id: 'dr-2', status: 'completed' },
        { id: 'dr-3', status: 'rejected' },
      ];
      memoryCountImpl = async (args: unknown) => {
        const a = args as { where: { type: string } };
        if (a.where.type === 'gdpr_export') return 5;
        if (a.where.type === 'gdpr_consent') return 8;
        return 0;
      };
      eventCountImpl = async () => 3;

      const result = await GdprService.getStats();

      assert.equal(result.totalRequests, 3);
      assert.equal(result.pendingRequests, 1);
      assert.equal(result.completedRequests, 1);
      assert.equal(result.rejectedRequests, 1);
      assert.equal(result.totalExports, 5);
      assert.equal(result.totalDeletions, 3);
      assert.equal(result.consentRecords, 8);
    });
  });
});
