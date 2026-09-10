import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  take?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source?: string;
    sourceId?: string | null;
    confidence: number;
    owner?: string | null;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryUpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

const calls: { method: string; args?: unknown }[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateManyImpl: (args: MemoryUpdateManyArgs) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryDeleteImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    updateMany: (args: MemoryUpdateManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'memory.updateMany', args });
      return memoryUpdateManyImpl(args);
    },
    delete: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryUpdateManyImpl = async () => ({ count: 0 });
  memoryDeleteImpl = async () => ({});
}

const { MemoryService } = await import('@/lib/services/memory');

describe('MemoryService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('create', () => {
    it('creates a memory with correct fields', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'fact');
        assert.equal(args.data.content, 'Company was founded in 2024');
        assert.equal(args.data.confidence, 0.9);
        assert.equal(args.data.lifecycle, 'permanent');
        assert.deepEqual(JSON.parse(args.data.tags), ['history']);
        return { id: 'mem-1', ...args.data };
      };

      const result = await MemoryService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'fact',
        content: 'Company was founded in 2024',
        confidence: 0.9,
        lifecycle: 'permanent',
        tags: ['history'],
        createdBy: 'user-1',
      });

      assert.ok(result);
    });

    it('clamps confidence to 0-1 range', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.confidence, 1);
        return { id: 'mem-1', confidence: 1 };
      };

      await MemoryService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'fact',
        content: 'Test',
        confidence: 1.5,
        createdBy: 'user-1',
      });
    });

    it('truncates content to 10000 characters', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.ok(args.data.content.length <= 10000);
        return { id: 'mem-1' };
      };

      await MemoryService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        type: 'knowledge',
        content: 'A'.repeat(15000),
        createdBy: 'user-1',
      });
    });
  });

  describe('verify', () => {
    it('marks a memory as verified with confidence 1.0', async () => {
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        assert.equal(args.data.verifiedBy, 'user-1');
        assert.ok(args.data.verifiedAt);
        assert.equal(args.data.confidence, 1.0);
        return { id: 'mem-1', verifiedBy: 'user-1', confidence: 1.0 };
      };

      const result = await MemoryService.verify('mem-1', 'user-1');
      assert.ok(result);
      assert.equal(result.confidence, 1.0);
    });
  });

  describe('assembleContext', () => {
    it('returns relevant memories for an agent run', async () => {
      memoryFindManyImpl = async () =>
        [
          { id: 'mem-1', type: 'active_context', content: 'Current priority: launch v2', confidence: 1.0 },
          { id: 'mem-2', type: 'fact', content: 'Company uses Atlas Cloud', confidence: 0.9 },
          { id: 'mem-3', type: 'decision', content: 'Chose D1 over Postgres', confidence: 0.8 },
        ];

      const result = await MemoryService.assembleContext({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        objective: 'Launch v2',
        maxMemories: 10,
      });

      assert.ok(result.memories);
      assert.equal(result.memories.length, 3);
      assert.ok(result.summary.includes('3 memories'));
    });

    it('returns empty memories when none exist', async () => {
      memoryFindManyImpl = async () => [];

      const result = await MemoryService.assembleContext({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
      });

      assert.equal(result.memories.length, 0);
    });
  });

  describe('expireStale', () => {
    it('lowers confidence of expired non-permanent memories', async () => {
      memoryUpdateManyImpl = async () =>
        ({ count: 5 });

      const count = await MemoryService.expireStale();
      assert.equal(count, 5);
    });
  });
});
