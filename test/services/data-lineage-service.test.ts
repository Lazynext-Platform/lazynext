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

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
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

function makeLineageMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'lin-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'data_lineage',
    content: JSON.stringify({
      sourceEntity: 'customer',
      sourceId: 'cust-1',
      targetEntity: 'deal',
      targetId: 'deal-1',
      transformation: 'enrichment',
      metadata: { source: 'crm' },
    }),
    source: 'system',
    sourceId: 'cust-1',
    confidence: 0.5,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '{}',
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
  memoryCreateImpl = async () => ({}) as MemoryRow;
}

const { DataLineageService } = await import('@/lib/services/data-lineage-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DataLineageService', () => {
  beforeEach(() => { resetMock(); });

  describe('recordLineage', () => {
    it('creates a lineage memory record with type data_lineage', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'data_lineage');
        const content = JSON.parse(a.data.content);
        assert.equal(content.sourceEntity, 'customer');
        assert.equal(content.targetEntity, 'deal');
        assert.equal(content.transformation, 'enrichment');
        return makeLineageMemory({ content: a.data.content });
      };

      const result = await DataLineageService.recordLineage({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        sourceEntity: 'customer',
        sourceId: 'cust-1',
        targetEntity: 'deal',
        targetId: 'deal-1',
        transformation: 'enrichment',
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.sourceEntity, 'customer');
      assert.equal(result.targetEntity, 'deal');
      assert.equal(result.transformation, 'enrichment');
      assert.equal(calls[0].method, 'memory.create');
    });
  });

  describe('getLineage', () => {
    it('returns a lineage record by id', async () => {
      memoryFindUniqueImpl = async () => makeLineageMemory();

      const result = await DataLineageService.getLineage('lin-1');

      assert.ok(result);
      assert.equal(result!.id, 'lin-1');
      assert.equal(result!.sourceEntity, 'customer');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await DataLineageService.getLineage('nonexistent');

      assert.equal(result, null);
    });

    it('returns null when type is not data_lineage', async () => {
      memoryFindUniqueImpl = async () => makeLineageMemory({ type: 'email_list' });

      const result = await DataLineageService.getLineage('lin-1');

      assert.equal(result, null);
    });
  });

  describe('getEntityLineage', () => {
    it('returns lineage records for an entity', async () => {
      memoryFindManyImpl = async () => [
        makeLineageMemory(),
        makeLineageMemory({ id: 'lin-2', content: JSON.stringify({ sourceEntity: 'customer', sourceId: 'cust-1', targetEntity: 'task', targetId: 'task-1', transformation: 'import', metadata: {} }) }),
      ];

      const result = await DataLineageService.getEntityLineage('ws-1', 'customer', 'cust-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].sourceEntity, 'customer');
    });

    it('returns empty array when no records', async () => {
      memoryFindManyImpl = async () => [];

      const result = await DataLineageService.getEntityLineage('ws-1', 'customer', 'cust-1');

      assert.equal(result.length, 0);
    });
  });

  describe('getLineageGraph', () => {
    it('builds a lineage graph from records', async () => {
      memoryFindManyImpl = async () => [
        makeLineageMemory({ content: JSON.stringify({ sourceEntity: 'customer', sourceId: 'c1', targetEntity: 'deal', targetId: 'd1', transformation: 'enrich', metadata: {} }) }),
        makeLineageMemory({ id: 'lin-2', content: JSON.stringify({ sourceEntity: 'deal', sourceId: 'd1', targetEntity: 'task', targetId: 't1', transformation: 'import', metadata: {} }) }),
      ];

      const result = await DataLineageService.getLineageGraph('ws-1', 'customer', 'c1', 5);

      assert.ok(result.nodes.length >= 2);
      assert.ok(result.edges.length >= 1);
      assert.equal(result.depth, 5);
    });

    it('returns empty graph when no records', async () => {
      memoryFindManyImpl = async () => [];

      const result = await DataLineageService.getLineageGraph('ws-1', 'customer', 'c1');

      assert.equal(result.nodes.length, 1); // just the root node
      assert.equal(result.edges.length, 0);
    });
  });

  describe('getStats', () => {
    it('returns aggregate lineage stats', async () => {
      memoryFindManyImpl = async () => [
        makeLineageMemory({ content: JSON.stringify({ sourceEntity: 'customer', sourceId: 'c1', targetEntity: 'deal', targetId: 'd1', transformation: 'enrich', metadata: {} }) }),
        makeLineageMemory({ id: 'lin-2', content: JSON.stringify({ sourceEntity: 'customer', sourceId: 'c2', targetEntity: 'task', targetId: 't1', transformation: 'import', metadata: {} }) }),
      ];

      const result = await DataLineageService.getStats('ws-1');

      assert.equal(result.totalRecords, 2);
      assert.equal(result.bySourceEntity.customer, 2);
      assert.equal(result.byTargetEntity.deal, 1);
      assert.equal(result.byTargetEntity.task, 1);
      assert.equal(result.byTransformation.enrich, 1);
      assert.equal(result.byTransformation.import, 1);
    });

    it('returns empty stats when no records', async () => {
      memoryFindManyImpl = async () => [];

      const result = await DataLineageService.getStats('ws-1');

      assert.equal(result.totalRecords, 0);
      assert.equal(Object.keys(result.bySourceEntity).length, 0);
    });
  });
});
