import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'context_snapshot',
    content: JSON.stringify({
      name: 'Agent Context Snapshot',
      type: 'agent',
      description: 'Context snapshot for AI agent',
      status: 'active',
      agentId: 'agent-1',
      taskId: 'task-1',
      scope: 'workspace',
      relevanceScore: 0.9,
      tokens: 500,
      expiresAt: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['context_snapshot', 'agent', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeSourceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'context_source',
    content: JSON.stringify({
      name: 'Knowledge Base Source',
      type: 'knowledge',
      description: 'Knowledge base context source',
      status: 'active',
      sourceId: 'kb-1',
      sourceType: 'database',
      priority: 5,
      weight: 0.8,
      lastSynced: null,
      reliability: 0.95,
      notes: '',
    }),
    tags: JSON.stringify(['context_source', 'knowledge', 'active']),
    ...overrides,
  });
}

function makeRetrievalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'context_retrieval',
    content: JSON.stringify({
      name: 'Semantic Retrieval',
      type: 'semantic',
      description: 'Semantic search retrieval',
      status: 'completed',
      query: 'agent context',
      sources: 'kb-1,kb-2',
      results: '5 results',
      tokens: 200,
      latency: 150,
      score: 0.85,
      notes: '',
    }),
    tags: JSON.stringify(['context_retrieval', 'semantic', 'completed']),
    ...overrides,
  });
}

function makeAssemblyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'context_assembly',
    content: JSON.stringify({
      name: 'Agent Prompt Assembly',
      type: 'agent_prompt',
      description: 'Assembled agent prompt context',
      status: 'draft',
      agentId: 'agent-1',
      taskId: 'task-1',
      snapshotId: 'mem-1',
      sources: 'kb-1,kb-2',
      tokens: 1000,
      priority: 5,
      assembledAt: null,
      deliveredAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['context_assembly', 'agent_prompt', 'draft']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { ContextEngineService } = await import('@/lib/services/context-engine-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Context Snapshots
// ─────────────────────────────────────────────────────────────────────────────

describe('ContextEngineService — Context Snapshots', () => {
  beforeEach(() => resetMock());

  it('creates a context snapshot with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ContextEngineService.createContextSnapshot('org-1', 'ws-1', {
      name: 'Task Snapshot', type: 'task',
    }, 'user-1');
    assert.equal(s.name, 'Task Snapshot');
    assert.equal(s.status, 'active');
    assert.equal(s.tokens, 0);
  });

  it('creates a context snapshot with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ContextEngineService.createContextSnapshot('org-1', 'ws-1', {
      name: 'Project Snapshot', type: 'project', description: 'Project context',
      status: 'archived', agentId: 'agent-2', taskId: 'task-2', scope: 'organization',
      relevanceScore: 0.95, tokens: 800, expiresAt: '2028-12-31', notes: 'Archived snapshot',
    }, 'user-1');
    assert.equal(s.name, 'Project Snapshot');
    assert.equal(s.type, 'project');
    assert.equal(s.tokens, 800);
    assert.equal(s.scope, 'organization');
  });

  it('gets a context snapshot by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await ContextEngineService.getContextSnapshot('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'Agent Context Snapshot');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'context_source' });
    const s = await ContextEngineService.getContextSnapshot('mem-1');
    assert.equal(s, null);
  });

  it('returns null when context snapshot not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await ContextEngineService.getContextSnapshot('nope');
    assert.equal(s, null);
  });

  it('lists context snapshots by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_snapshot') return [makeRow()];
      return [];
    };
    const list = await ContextEngineService.listContextSnapshots('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Agent Context Snapshot');
  });

  it('updates a context snapshot', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ContextEngineService.updateContextSnapshot('mem-1', { status: 'archived' });
    assert.ok(s);
    assert.equal(s!.status, 'archived');
  });

  it('deletes a context snapshot', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await ContextEngineService.deleteContextSnapshot('mem-1');
    assert.equal(ok, true);
  });

  it('activateContextSnapshot sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ContextEngineService.activateContextSnapshot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('archiveContextSnapshot sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ContextEngineService.archiveContextSnapshot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'archived');
  });

  it('expireContextSnapshot sets status to expired', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ContextEngineService.expireContextSnapshot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'expired');
  });

  it('referenceContextSnapshot sets status to referenced', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ContextEngineService.referenceContextSnapshot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'referenced');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Context Sources
// ─────────────────────────────────────────────────────────────────────────────

describe('ContextEngineService — Context Sources', () => {
  beforeEach(() => resetMock());

  it('creates a context source with defaults', async () => {
    memCreateImpl = async (args) => makeSourceRow({ content: args.data.content as string });
    const s = await ContextEngineService.createContextSource('org-1', 'ws-1', {
      name: 'Memory Source', type: 'memory',
    }, 'user-1');
    assert.equal(s.name, 'Memory Source');
    assert.equal(s.status, 'active');
    assert.equal(s.priority, 0);
  });

  it('creates a context source with full input', async () => {
    memCreateImpl = async (args) => makeSourceRow({ content: args.data.content as string });
    const s = await ContextEngineService.createContextSource('org-1', 'ws-1', {
      name: 'Document Source', type: 'document', description: 'Document context source',
      status: 'inactive', sourceId: 'doc-1', sourceType: 'file', priority: 10,
      weight: 0.5, lastSynced: '2028-01-01', reliability: 0.9, notes: 'Synced source',
    }, 'user-1');
    assert.equal(s.name, 'Document Source');
    assert.equal(s.type, 'document');
    assert.equal(s.priority, 10);
    assert.equal(s.reliability, 0.9);
  });

  it('gets a context source by id', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    const s = await ContextEngineService.getContextSource('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Knowledge Base Source');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSourceRow({ type: 'context_snapshot' });
    const s = await ContextEngineService.getContextSource('mem-s1');
    assert.equal(s, null);
  });

  it('returns null when context source not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await ContextEngineService.getContextSource('nope');
    assert.equal(s, null);
  });

  it('lists context sources by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_source') return [makeSourceRow()];
      return [];
    };
    const list = await ContextEngineService.listContextSources('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a context source', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await ContextEngineService.updateContextSource('mem-s1', { status: 'inactive' });
    assert.ok(s);
    assert.equal(s!.status, 'inactive');
  });

  it('deletes a context source', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await ContextEngineService.deleteContextSource('mem-s1');
    assert.equal(ok, true);
  });

  it('activateContextSource sets status to active', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await ContextEngineService.activateContextSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deactivateContextSource sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await ContextEngineService.deactivateContextSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'inactive');
  });

  it('deprecateContextSource sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await ContextEngineService.deprecateContextSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'deprecated');
  });

  it('errorContextSource sets status to error', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await ContextEngineService.errorContextSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Context Retrievals
// ─────────────────────────────────────────────────────────────────────────────

describe('ContextEngineService — Context Retrievals', () => {
  beforeEach(() => resetMock());

  it('creates a context retrieval with defaults', async () => {
    memCreateImpl = async (args) => makeRetrievalRow({ content: args.data.content as string });
    const r = await ContextEngineService.createContextRetrieval('org-1', 'ws-1', {
      name: 'Keyword Retrieval', type: 'keyword',
    }, 'user-1');
    assert.equal(r.name, 'Keyword Retrieval');
    assert.equal(r.status, 'completed');
    assert.equal(r.tokens, 0);
  });

  it('creates a context retrieval with full input', async () => {
    memCreateImpl = async (args) => makeRetrievalRow({ content: args.data.content as string });
    const r = await ContextEngineService.createContextRetrieval('org-1', 'ws-1', {
      name: 'Hybrid Retrieval', type: 'hybrid', description: 'Hybrid search retrieval',
      status: 'failed', query: 'project context', sources: 'kb-1',
      results: '0 results', tokens: 300, latency: 500, score: 0.5, notes: 'Failed retrieval',
    }, 'user-1');
    assert.equal(r.name, 'Hybrid Retrieval');
    assert.equal(r.type, 'hybrid');
    assert.equal(r.tokens, 300);
    assert.equal(r.latency, 500);
  });

  it('gets a context retrieval by id', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    const r = await ContextEngineService.getContextRetrieval('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Semantic Retrieval');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow({ type: 'context_snapshot' });
    const r = await ContextEngineService.getContextRetrieval('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when context retrieval not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await ContextEngineService.getContextRetrieval('nope');
    assert.equal(r, null);
  });

  it('lists context retrievals by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_retrieval') return [makeRetrievalRow()];
      return [];
    };
    const list = await ContextEngineService.listContextRetrievals('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a context retrieval', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    memUpdateImpl = async (args) => makeRetrievalRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ContextEngineService.updateContextRetrieval('mem-r1', { status: 'failed' });
    assert.ok(r);
    assert.equal(r!.status, 'failed');
  });

  it('deletes a context retrieval', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await ContextEngineService.deleteContextRetrieval('mem-r1');
    assert.equal(ok, true);
  });

  it('completeRetrieval sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    memUpdateImpl = async (args) => makeRetrievalRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ContextEngineService.completeRetrieval('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('failRetrieval sets status to failed', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    memUpdateImpl = async (args) => makeRetrievalRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ContextEngineService.failRetrieval('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'failed');
  });

  it('partialRetrieval sets status to partial', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    memUpdateImpl = async (args) => makeRetrievalRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ContextEngineService.partialRetrieval('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'partial');
  });

  it('timeoutRetrieval sets status to timeout', async () => {
    memFindUniqueImpl = async () => makeRetrievalRow();
    memUpdateImpl = async (args) => makeRetrievalRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await ContextEngineService.timeoutRetrieval('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Context Assemblies
// ─────────────────────────────────────────────────────────────────────────────

describe('ContextEngineService — Context Assemblies', () => {
  beforeEach(() => resetMock());

  it('creates a context assembly with defaults', async () => {
    memCreateImpl = async (args) => makeAssemblyRow({ content: args.data.content as string });
    const a = await ContextEngineService.createContextAssembly('org-1', 'ws-1', {
      name: 'Task Context Assembly', type: 'task_context',
    }, 'user-1');
    assert.equal(a.name, 'Task Context Assembly');
    assert.equal(a.status, 'draft');
    assert.equal(a.tokens, 0);
  });

  it('creates a context assembly with full input', async () => {
    memCreateImpl = async (args) => makeAssemblyRow({ content: args.data.content as string });
    const a = await ContextEngineService.createContextAssembly('org-1', 'ws-1', {
      name: 'Decision Brief Assembly', type: 'decision_brief', description: 'Decision brief context',
      status: 'assembled', agentId: 'agent-3', taskId: 'task-3', snapshotId: 'mem-2',
      sources: 'kb-1,kb-3', tokens: 2000, priority: 10, assembledAt: '2028-01-01',
      deliveredAt: '2028-01-02', notes: 'High priority assembly',
    }, 'user-1');
    assert.equal(a.name, 'Decision Brief Assembly');
    assert.equal(a.type, 'decision_brief');
    assert.equal(a.tokens, 2000);
    assert.equal(a.priority, 10);
  });

  it('gets a context assembly by id', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    const a = await ContextEngineService.getContextAssembly('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Agent Prompt Assembly');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow({ type: 'context_snapshot' });
    const a = await ContextEngineService.getContextAssembly('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when context assembly not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await ContextEngineService.getContextAssembly('nope');
    assert.equal(a, null);
  });

  it('lists context assemblies by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_assembly') return [makeAssemblyRow()];
      return [];
    };
    const list = await ContextEngineService.listContextAssemblies('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a context assembly', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    memUpdateImpl = async (args) => makeAssemblyRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await ContextEngineService.updateContextAssembly('mem-a1', { status: 'assembled' });
    assert.ok(a);
    assert.equal(a!.status, 'assembled');
  });

  it('deletes a context assembly', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await ContextEngineService.deleteContextAssembly('mem-a1');
    assert.equal(ok, true);
  });

  it('assembleContext sets status to assembled', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    memUpdateImpl = async (args) => makeAssemblyRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await ContextEngineService.assembleContext('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'assembled');
  });

  it('deliverContext sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    memUpdateImpl = async (args) => makeAssemblyRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await ContextEngineService.deliverContext('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'delivered');
  });

  it('archiveAssembly sets status to archived', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    memUpdateImpl = async (args) => makeAssemblyRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await ContextEngineService.archiveAssembly('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });

  it('draftAssembly sets status to draft', async () => {
    memFindUniqueImpl = async () => makeAssemblyRow();
    memUpdateImpl = async (args) => makeAssemblyRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await ContextEngineService.draftAssembly('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'draft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('ContextEngineService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getContextEngineMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_snapshot') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'agent', status: 'active', description: '', agentId: '', taskId: '', scope: '', relevanceScore: 0, tokens: 100, expiresAt: null, notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'agent', status: 'archived', description: '', agentId: '', taskId: '', scope: '', relevanceScore: 0, tokens: 50, expiresAt: null, notes: '' }) }),
      ];
      if (t === 'context_source') return [
        makeSourceRow({ content: JSON.stringify({ name: 'Src1', type: 'knowledge', status: 'active', description: '', sourceId: '', sourceType: '', priority: 0, weight: 0, lastSynced: null, reliability: 0, notes: '' }) }),
      ];
      if (t === 'context_retrieval') return [
        makeRetrievalRow({ content: JSON.stringify({ name: 'R1', type: 'semantic', status: 'completed', description: '', query: '', sources: '', results: '', tokens: 200, latency: 0, score: 0, notes: '' }) }),
        makeRetrievalRow({ id: 'r2', content: JSON.stringify({ name: 'R2', type: 'semantic', status: 'failed', description: '', query: '', sources: '', results: '', tokens: 100, latency: 0, score: 0, notes: '' }) }),
      ];
      if (t === 'context_assembly') return [
        makeAssemblyRow({ content: JSON.stringify({ name: 'A1', type: 'agent_prompt', status: 'delivered', description: '', agentId: '', taskId: '', snapshotId: '', sources: '', tokens: 300, priority: 0, assembledAt: null, deliveredAt: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await ContextEngineService.getContextEngineMetrics('org-1');
    assert.equal(m.activeSnapshots, 1);
    assert.equal(m.activeSources, 1);
    assert.equal(m.completedRetrievals, 1);
    assert.equal(m.deliveredAssemblies, 1);
    assert.equal(m.totalTokens, 750);
  });

  it('getContextEngineStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'context_snapshot') return [makeRow()];
      if (t === 'context_source') return [makeSourceRow()];
      if (t === 'context_retrieval') return [makeRetrievalRow()];
      if (t === 'context_assembly') return [makeAssemblyRow()];
      return [];
    };
    const s = await ContextEngineService.getContextEngineStats('org-1');
    assert.equal(s.snapshotCount, 1);
    assert.equal(s.sourceCount, 1);
    assert.equal(s.retrievalCount, 1);
    assert.equal(s.assemblyCount, 1);
    assert.equal(s.bySnapshotType['agent'], 1);
    assert.equal(s.bySourceType['knowledge'], 1);
    assert.equal(s.byRetrievalType['semantic'], 1);
    assert.equal(s.byAssemblyType['agent_prompt'], 1);
  });
});
