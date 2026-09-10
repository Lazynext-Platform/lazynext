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
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
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

function sessionContent(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    resourceType: 'task',
    resourceId: 'task-1',
    activeUsers: ['user-1'],
    startedAt: new Date().toISOString(),
    active: true,
    ...overrides,
  });
}

function makeSessionRow(overrides: Partial<MemoryRow> = {}, contentOverrides: Record<string, unknown> = {}): MemoryRow {
  return {
    id: 'sess-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'edit_session',
    content: sessionContent(contentOverrides),
    source: 'user',
    sourceId: 'task:task-1',
    confidence: 1.0,
    lifecycle: 'short',
    tags: JSON.stringify(['edit_session', 'task']),
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSnapshotRow(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'snap-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'edit_snapshot',
    content: JSON.stringify({ content: 'snapshot text', savedBy: 'user-1', savedAt: new Date().toISOString() }),
    source: 'user',
    sourceId: 'sess-1',
    confidence: 1.0,
    lifecycle: 'medium',
    tags: JSON.stringify(['edit_snapshot']),
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
}

const { CollabEditorService } = await import('@/lib/services/collab-editor-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CollabEditorService', () => {
  beforeEach(() => { resetMock(); });

  describe('startSession', () => {
    it('creates an edit session with the starting user', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.type, 'edit_session');
        assert.equal(a.data.sourceId, 'task:task-1');
        return makeSessionRow({ id: 's1' });
      };

      const result = await CollabEditorService.startSession('org-1', {
        resourceType: 'task',
        resourceId: 'task-1',
        userId: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(result.resourceType, 'task');
      assert.equal(result.resourceId, 'task-1');
      assert.deepEqual(result.activeUsers, ['user-1']);
      assert.equal(result.active, true);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('uses workspaceId when provided', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.workspaceId, 'ws-2');
        return makeSessionRow({ workspaceId: 'ws-2' });
      };

      const result = await CollabEditorService.startSession('org-1', {
        resourceType: 'task',
        resourceId: 't1',
        workspaceId: 'ws-2',
        userId: 'user-1',
      });

      assert.equal(result.workspaceId, 'ws-2');
    });
  });

  describe('joinSession', () => {
    it('adds a user to activeUsers', async () => {
      memoryFindUniqueImpl = async () => makeSessionRow({ id: 's1' });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.ok(content.activeUsers.includes('user-2'));
        return makeSessionRow({ id: 's1', content: a.data.content });
      };

      const result = await CollabEditorService.joinSession('s1', 'user-2');

      assert.ok(result);
      assert.ok(result!.activeUsers.includes('user-2'));
    });

    it('does not add a user already present', async () => {
      memoryFindUniqueImpl = async () =>
        makeSessionRow({ id: 's1', content: sessionContent({ activeUsers: ['user-1', 'user-2'] }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.activeUsers.filter((u: string) => u === 'user-2').length, 1);
        return makeSessionRow({ id: 's1', content: a.data.content });
      };

      await CollabEditorService.joinSession('s1', 'user-2');
    });

    it('returns null when session not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CollabEditorService.joinSession('nope', 'user-2');
      assert.equal(result, null);
    });
  });

  describe('leaveSession', () => {
    it('removes the user from activeUsers', async () => {
      memoryFindUniqueImpl = async () =>
        makeSessionRow({ id: 's1', content: sessionContent({ activeUsers: ['user-1', 'user-2'] }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.ok(!content.activeUsers.includes('user-2'));
        return makeSessionRow({ id: 's1', content: a.data.content });
      };

      const result = await CollabEditorService.leaveSession('s1', 'user-2');

      assert.ok(result);
      assert.ok(!result!.activeUsers.includes('user-2'));
    });

    it('auto-ends the session when no users remain', async () => {
      memoryFindUniqueImpl = async () =>
        makeSessionRow({ id: 's1', content: sessionContent({ activeUsers: ['user-1'] }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.active, false);
        assert.ok(content.endedAt);
        return makeSessionRow({ id: 's1', content: a.data.content });
      };

      const result = await CollabEditorService.leaveSession('s1', 'user-1');

      assert.ok(result);
      assert.equal(result!.active, false);
      assert.ok(result!.endedAt);
    });

    it('returns null when session not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CollabEditorService.leaveSession('nope', 'user-1');
      assert.equal(result, null);
    });
  });

  describe('getActiveSessions', () => {
    it('returns only active sessions for a workspace', async () => {
      memoryFindManyImpl = async () => [
        makeSessionRow({ id: 's1', content: sessionContent({ active: true }) }),
        makeSessionRow({ id: 's2', content: sessionContent({ active: false }) }),
      ];

      const result = await CollabEditorService.getActiveSessions('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 's1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const result = await CollabEditorService.getActiveSessions('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getSessionUsers', () => {
    it('returns the active users for a session', async () => {
      memoryFindUniqueImpl = async () =>
        makeSessionRow({ id: 's1', content: sessionContent({ activeUsers: ['user-1', 'user-2'] }) });

      const users = await CollabEditorService.getSessionUsers('s1');

      assert.deepEqual(users, ['user-1', 'user-2']);
    });

    it('returns empty array when session not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const users = await CollabEditorService.getSessionUsers('nope');
      assert.deepEqual(users, []);
    });
  });

  describe('saveSnapshot', () => {
    it('creates a snapshot for an existing session', async () => {
      memoryFindUniqueImpl = async () => makeSessionRow({ id: 's1' });
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.type, 'edit_snapshot');
        assert.equal(a.data.sourceId, 's1');
        return makeSnapshotRow({ id: 'snap1', content: a.data.content as string });
      };

      const result = await CollabEditorService.saveSnapshot('s1', 'content here', 'user-1');

      assert.ok(result);
      assert.equal(result!.sessionId, 's1');
      assert.equal(result!.content, 'content here');
      assert.equal(result!.savedBy, 'user-1');
    });

    it('returns null when session not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CollabEditorService.saveSnapshot('nope', 'x', 'user-1');
      assert.equal(result, null);
    });
  });

  describe('getSnapshots', () => {
    it('returns snapshots for a session', async () => {
      memoryFindManyImpl = async () => [
        makeSnapshotRow({ id: 'snap1' }),
        makeSnapshotRow({ id: 'snap2' }),
      ];

      const result = await CollabEditorService.getSnapshots('s1');

      assert.equal(result.length, 2);
      assert.equal(result[0].sessionId, 's1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('respects the limit option', async () => {
      memoryFindManyImpl = async (args: unknown) => {
        const a = args as { take: number };
        assert.equal(a.take, 5);
        return [];
      };

      await CollabEditorService.getSnapshots('s1', 5);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const result = await CollabEditorService.getSnapshots('s1');
      assert.deepEqual(result, []);
    });
  });

  describe('endSession', () => {
    it('marks the session as inactive and sets endedAt', async () => {
      memoryFindUniqueImpl = async () => makeSessionRow({ id: 's1', content: sessionContent({ active: true }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.active, false);
        assert.ok(content.endedAt);
        assert.deepEqual(content.activeUsers, []);
        return makeSessionRow({ id: 's1', content: a.data.content });
      };

      const result = await CollabEditorService.endSession('s1');

      assert.ok(result);
      assert.equal(result!.active, false);
      assert.ok(result!.endedAt);
      assert.deepEqual(result!.activeUsers, []);
    });

    it('returns null when session not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CollabEditorService.endSession('nope');
      assert.equal(result, null);
    });
  });
});
