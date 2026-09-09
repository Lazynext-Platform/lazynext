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
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let eventCreateImpl: (args: unknown) => Promise<EventRow> = async () => ({}) as EventRow;

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
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  event: {
    create: (args: unknown): Promise<EventRow> => {
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

function makeABTestMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'ab-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'email_ab_test',
    content: JSON.stringify({
      name: 'Subject Line Test',
      campaignId: 'camp-1',
      variants: [
        { id: 'v1', name: 'Variant A', subject: 'Hello', sendPercentage: 50, stats: { sent: 100, opens: 40, clicks: 10 } },
        { id: 'v2', name: 'Variant B', subject: 'Hi there', sendPercentage: 50, stats: { sent: 100, opens: 60, clicks: 20 } },
      ],
      metric: 'open_rate',
      status: 'running',
      winnerVariantId: null,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
    }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["email_ab_test"]',
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
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteImpl = async () => ({}) as MemoryRow;
  eventCreateImpl = async () => ({}) as EventRow;
}

const { EmailABTestService } = await import('@/lib/services/email-ab-test-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EmailABTestService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an A/B test memory record with type email_ab_test', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'email_ab_test');
        assert.ok(a.data.content.includes('"name":"Subject Line Test"'));
        return makeABTestMemory({ content: a.data.content });
      };

      const result = await EmailABTestService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: {
          name: 'Subject Line Test',
          campaignId: 'camp-1',
          variants: [],
          metric: 'open_rate',
        },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });
  });

  describe('get', () => {
    it('returns an A/B test by id', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory();

      const result = await EmailABTestService.get('ab-1');

      assert.ok(result);
      assert.equal(result!.id, 'ab-1');
      assert.equal(result!.name, 'Subject Line Test');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await EmailABTestService.get('nonexistent');

      assert.equal(result, null);
    });

    it('returns null when type is not email_ab_test', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory({ type: 'email_list' });

      const result = await EmailABTestService.get('ab-1');

      assert.equal(result, null);
    });
  });

  describe('getByCampaign', () => {
    it('returns an A/B test by campaign id', async () => {
      memoryFindManyImpl = async () => [makeABTestMemory()];

      const result = await EmailABTestService.getByCampaign('camp-1');

      assert.ok(result);
      assert.equal(result!.campaignId, 'camp-1');
    });

    it('returns null when no match', async () => {
      memoryFindManyImpl = async () => [];

      const result = await EmailABTestService.getByCampaign('nonexistent');

      assert.equal(result, null);
    });
  });

  describe('update', () => {
    it('updates A/B test data', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'completed');
        return makeABTestMemory({ content: a.data.content });
      };

      const result = await EmailABTestService.update('ab-1', { status: 'completed' });

      assert.ok(result);
      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when A/B test not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => EmailABTestService.update('nonexistent', { name: 'Test' }),
        /A\/B test not found/,
      );
    });
  });

  describe('delete', () => {
    it('deletes the A/B test memory record', async () => {
      memoryDeleteImpl = async () => makeABTestMemory();

      await EmailABTestService.delete('ab-1');

      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('getResults', () => {
    it('returns per-variant results with rates and winner', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory();

      const result = await EmailABTestService.getResults('ab-1');

      assert.equal(result.variants.length, 2);
      // v2 has higher open rate (60/100=0.6 vs 40/100=0.4)
      assert.equal(result.winner!.id, 'v2');
      assert.equal(result.metric, 'open_rate');
    });

    it('returns empty results when test not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await EmailABTestService.getResults('nonexistent');

      assert.equal(result.variants.length, 0);
      assert.equal(result.winner, null);
    });

    it('respects explicit winnerVariantId', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory({
        content: JSON.stringify({
          name: 'Test', campaignId: 'c1', variants: [
            { id: 'v1', name: 'A', subject: 'S', sendPercentage: 50, stats: { sent: 10, opens: 9, clicks: 0 } },
            { id: 'v2', name: 'B', subject: 'S', sendPercentage: 50, stats: { sent: 10, opens: 1, clicks: 0 } },
          ],
          metric: 'open_rate', status: 'completed', winnerVariantId: 'v1',
          startedAt: null, completedAt: null,
        }),
      });

      const result = await EmailABTestService.getResults('ab-1');

      assert.equal(result.winner!.id, 'v1');
    });
  });

  describe('declareWinner', () => {
    it('sets winner and marks test as completed', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.winnerVariantId, 'v1');
        assert.equal(content.status, 'completed');
        return makeABTestMemory({ content: a.data.content });
      };

      await EmailABTestService.declareWinner('ab-1', 'v1');

      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when test not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => EmailABTestService.declareWinner('nonexistent', 'v1'),
        /A\/B test not found/,
      );
    });

    it('throws when variant not found', async () => {
      memoryFindUniqueImpl = async () => makeABTestMemory();

      await assert.rejects(
        () => EmailABTestService.declareWinner('ab-1', 'nonexistent-variant'),
        /Variant not found/,
      );
    });
  });

  describe('getStats', () => {
    it('returns aggregate A/B test stats', async () => {
      memoryFindManyImpl = async () => [
        makeABTestMemory({ content: JSON.stringify({ name: 'T1', campaignId: 'c1', variants: [], metric: 'open_rate', status: 'running' }) }),
        makeABTestMemory({ id: 'ab-2', content: JSON.stringify({ name: 'T2', campaignId: 'c2', variants: [], metric: 'open_rate', status: 'completed' }) }),
      ];

      const result = await EmailABTestService.getStats('ws-1');

      assert.equal(result.total, 2);
      assert.equal(result.running, 1);
      assert.equal(result.completed, 1);
    });
  });
});
