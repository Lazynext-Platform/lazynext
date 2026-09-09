import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — mirrors the pattern in test/services/memory.test.ts
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

interface MemoryRowOverrides {
  id?: string;
  workspaceId?: string;
  organizationId?: string;
  type?: string;
  content?: string;
  source?: string;
  sourceId?: string | null;
  confidence?: number;
  owner?: string | null;
  lifecycle?: string;
  expiresAt?: Date | null;
  tags?: string;
  relatedMemoryIds?: string;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function makeMemoryRow(overrides: MemoryRowOverrides = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'fact',
    content: 'Company was founded in 2024',
    source: 'user',
    sourceId: null,
    confidence: 0.9,
    owner: null,
    accessPolicy: 'workspace',
    lifecycle: 'medium',
    expiresAt: null,
    tags: '[]',
    relatedMemoryIds: '[]',
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Tests — detectContradictions
// ─────────────────────────────────────────────────────────────────────────────

describe('MemoryService — detectContradictions', () => {
  beforeEach(() => resetMock());

  it('returns an empty array when there are no contradictions', async () => {
    // Two preferences about different subjects (different sourceIds) → no group
    // has a conflicting pair.
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-1', type: 'preference', content: 'preferred model is GPT-4', sourceId: 'pref-model', confidence: 0.8 }),
      makeMemoryRow({ id: 'mem-2', type: 'preference', content: 'preferred tone is casual', sourceId: 'pref-tone', confidence: 0.7 }),
    ];

    const result = await MemoryService.detectContradictions('ws-1');
    assert.deepEqual(result, []);
  });

  it('returns an empty array when memories have identical content', async () => {
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-1', type: 'fact', content: 'Company uses Atlas Cloud', sourceId: 'fact-stack', confidence: 0.9 }),
      makeMemoryRow({ id: 'mem-2', type: 'fact', content: 'Company uses Atlas Cloud', sourceId: 'fact-stack', confidence: 0.9 }),
    ];

    const result = await MemoryService.detectContradictions('ws-1');
    assert.deepEqual(result, []);
  });

  it('detects conflicting preferences about the same topic', async () => {
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-1', type: 'preference', content: 'preferred model is GPT-4', sourceId: 'pref-model', confidence: 0.8 }),
      makeMemoryRow({ id: 'mem-2', type: 'preference', content: 'preferred model is Claude', sourceId: 'pref-model', confidence: 0.6 }),
    ];

    const result = await MemoryService.detectContradictions('ws-1');
    assert.equal(result.length, 1);
    const c = result[0];
    assert.equal(c.type, 'preference');
    assert.ok(c.reason.includes('preference'));
    assert.equal(c.confidence1, 0.8);
    assert.equal(c.confidence2, 0.6);
    // Confidence gap >= 0.2 → keep_higher_confidence.
    assert.equal(c.recommendedAction, 'keep_higher_confidence');
  });

  it('detects conflicting facts about the same entity', async () => {
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-1', type: 'fact', content: 'Company was founded in 2024', sourceId: 'fact-founded', confidence: 0.9 }),
      makeMemoryRow({ id: 'mem-2', type: 'fact', content: 'Company was founded in 2023', sourceId: 'fact-founded', confidence: 0.7 }),
    ];

    const result = await MemoryService.detectContradictions('ws-1');
    assert.equal(result.length, 1);
    const c = result[0];
    assert.equal(c.type, 'fact');
    assert.ok(c.reason.includes('fact'));
    assert.equal(c.recommendedAction, 'keep_higher_confidence');
  });

  it('detects a newer decision that overrides an older one', async () => {
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-new', type: 'decision', content: 'Chose Postgres for the database', sourceId: 'dec-db', confidence: 0.8, updatedAt: new Date('2024-06-01') }),
      makeMemoryRow({ id: 'mem-old', type: 'decision', content: 'Chose D1 for the database', sourceId: 'dec-db', confidence: 0.8, updatedAt: new Date('2024-01-01') }),
    ];

    const result = await MemoryService.detectContradictions('ws-1');
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'decision');
    assert.equal(result[0].recommendedAction, 'keep_newer');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — resolveContradiction
// ─────────────────────────────────────────────────────────────────────────────

describe('MemoryService — resolveContradiction', () => {
  beforeEach(() => resetMock());

  it('keep_newer archives the older memory', async () => {
    const oldRow = makeMemoryRow({ id: 'mem-old', updatedAt: new Date('2024-01-01'), confidence: 0.8 });
    const newRow = makeMemoryRow({ id: 'mem-new', updatedAt: new Date('2024-06-01'), confidence: 0.8 });

    memoryFindUniqueImpl = async (args) =>
      args.where.id === 'mem-old' ? oldRow : args.where.id === 'mem-new' ? newRow : null;

    const archived: string[] = [];
    memoryUpdateImpl = async (args) => {
      if (args.data.lifecycle === 'archived') archived.push(args.where.id);
      return { id: args.where.id, ...args.data };
    };

    const res = await MemoryService.resolveContradiction('mem-old', 'mem-new', 'keep_newer');
    assert.equal(res.resolved, true);
    assert.equal(res.keptMemoryId, 'mem-new');
    assert.equal(res.archivedMemoryId, 'mem-old');
    assert.deepEqual(archived, ['mem-old']);
  });

  it('keep_higher_confidence archives the lower-confidence memory', async () => {
    const low = makeMemoryRow({ id: 'mem-low', confidence: 0.5, updatedAt: new Date('2024-06-01') });
    const high = makeMemoryRow({ id: 'mem-high', confidence: 0.9, updatedAt: new Date('2024-01-01') });

    memoryFindUniqueImpl = async (args) =>
      args.where.id === 'mem-low' ? low : args.where.id === 'mem-high' ? high : null;

    const archived: string[] = [];
    memoryUpdateImpl = async (args) => {
      if (args.data.lifecycle === 'archived') archived.push(args.where.id);
      return { id: args.where.id, ...args.data };
    };

    const res = await MemoryService.resolveContradiction('mem-low', 'mem-high', 'keep_higher_confidence');
    assert.equal(res.resolved, true);
    assert.equal(res.keptMemoryId, 'mem-high');
    assert.equal(res.archivedMemoryId, 'mem-low');
    assert.deepEqual(archived, ['mem-low']);
  });

  it('merge archives both memories and creates a new merged memory', async () => {
    const m1 = makeMemoryRow({ id: 'mem-1', type: 'fact', content: 'Founded in 2024', confidence: 0.8, tags: '["history"]' });
    const m2 = makeMemoryRow({ id: 'mem-2', type: 'fact', content: 'Founded in 2023', confidence: 0.7, tags: '["history"]' });

    memoryFindUniqueImpl = async (args) =>
      args.where.id === 'mem-1' ? m1 : args.where.id === 'mem-2' ? m2 : null;

    const archived: string[] = [];
    memoryUpdateImpl = async (args) => {
      if (args.data.lifecycle === 'archived') archived.push(args.where.id);
      return { id: args.where.id, ...args.data };
    };

    const createdHolder: { data: MemoryCreateArgs['data'] | null } = { data: null };
    memoryCreateImpl = async (args) => {
      createdHolder.data = args.data;
      return { id: 'mem-merged', ...args.data };
    };

    const res = await MemoryService.resolveContradiction('mem-1', 'mem-2', 'merge', 'Founded in 2023, rebranded in 2024');
    assert.equal(res.resolved, true);
    assert.equal(res.keptMemoryId, 'mem-merged');
    assert.deepEqual(archived, ['mem-1', 'mem-2']);
    assert.ok(createdHolder.data);
    assert.equal(createdHolder.data.content, 'Founded in 2023, rebranded in 2024');
    assert.equal(createdHolder.data.confidence, 0.8); // max of the two
    assert.equal(createdHolder.data.lifecycle, 'medium');
  });

  it('manual_review flags both memories for review', async () => {
    const m1 = makeMemoryRow({ id: 'mem-1' });
    const m2 = makeMemoryRow({ id: 'mem-2' });

    memoryFindUniqueImpl = async (args) =>
      args.where.id === 'mem-1' ? m1 : args.where.id === 'mem-2' ? m2 : null;

    const flagged: string[] = [];
    memoryUpdateImpl = async (args) => {
      if (args.data.lifecycle === 'needs_review') flagged.push(args.where.id);
      return { id: args.where.id, ...args.data };
    };

    const res = await MemoryService.resolveContradiction('mem-1', 'mem-2', 'manual_review');
    assert.equal(res.resolved, true);
    assert.deepEqual(flagged, ['mem-1', 'mem-2']);
  });

  it('returns resolved=false when a memory cannot be found', async () => {
    memoryFindUniqueImpl = async () => null;
    const res = await MemoryService.resolveContradiction('mem-x', 'mem-y', 'keep_newer');
    assert.equal(res.resolved, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — runExpirationCycle
// ─────────────────────────────────────────────────────────────────────────────

describe('MemoryService — runExpirationCycle', () => {
  beforeEach(() => resetMock());

  it('expires stale memories, detects and auto-resolves contradictions', async () => {
    // Step 1: expireStale() → updateMany returns count 3.
    memoryUpdateManyImpl = async () => ({ count: 3 });

    // Step 2: remaining active memories include a conflicting fact pair.
    const factA = makeMemoryRow({
      id: 'mem-a',
      type: 'fact',
      content: 'Company was founded in 2024',
      sourceId: 'fact-founded',
      confidence: 0.9,
      updatedAt: new Date('2024-06-01'),
    });
    const factB = makeMemoryRow({
      id: 'mem-b',
      type: 'fact',
      content: 'Company was founded in 2023',
      sourceId: 'fact-founded',
      confidence: 0.7,
      updatedAt: new Date('2024-01-01'),
    });

    memoryFindManyImpl = async () => [factA, factB];

    // resolveContradiction fetches both memories via findUnique.
    memoryFindUniqueImpl = async (args) =>
      args.where.id === 'mem-a' ? factA : args.where.id === 'mem-b' ? factB : null;

    const archived: string[] = [];
    memoryUpdateImpl = async (args) => {
      if (args.data.lifecycle === 'archived') archived.push(args.where.id);
      return { id: args.where.id, ...args.data };
    };

    const result = await MemoryService.runExpirationCycle('org-1');

    assert.equal(result.expiredCount, 3);
    assert.equal(result.contradictionCount, 1);
    // Facts auto-resolve via keep_higher_confidence.
    assert.equal(result.autoResolvedCount, 1);
    assert.equal(result.needsReviewCount, 0);
    assert.equal(result.contradictions.length, 1);
    assert.equal(result.contradictions[0].type, 'fact');
    // The lower-confidence memory (mem-b) should be archived.
    assert.ok(archived.includes('mem-b'));
  });

  it('leaves manual_review contradictions for review', async () => {
    memoryUpdateManyImpl = async () => ({ count: 0 });

    // Two same-source, very different "knowledge" memories → manual_review.
    memoryFindManyImpl = async () => [
      makeMemoryRow({ id: 'mem-1', type: 'knowledge', content: 'alpha beta gamma delta epsilon zeta eta theta', source: 'agent-1', sourceId: null, confidence: 0.6 }),
      makeMemoryRow({ id: 'mem-2', type: 'knowledge', content: 'one two three four five six seven eight', source: 'agent-1', sourceId: null, confidence: 0.6 }),
    ];

    const result = await MemoryService.runExpirationCycle();
    assert.equal(result.expiredCount, 0);
    assert.equal(result.contradictionCount, 1);
    assert.equal(result.autoResolvedCount, 0);
    assert.equal(result.needsReviewCount, 1);
    assert.equal(result.contradictions[0].recommendedAction, 'manual_review');
  });

  it('returns zeroed summary when there are no memories', async () => {
    memoryUpdateManyImpl = async () => ({ count: 0 });
    memoryFindManyImpl = async () => [];

    const result = await MemoryService.runExpirationCycle('org-1');
    assert.equal(result.expiredCount, 0);
    assert.equal(result.contradictionCount, 0);
    assert.equal(result.autoResolvedCount, 0);
    assert.equal(result.needsReviewCount, 0);
    assert.deepEqual(result.contradictions, []);
  });
});
