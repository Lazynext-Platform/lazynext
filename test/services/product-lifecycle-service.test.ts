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

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'product_item',
    content: JSON.stringify({
      name: 'Atlas Cloud Platform',
      description: 'AI marketing platform',
      category: 'SaaS',
      status: 'concept',
      owner: 'Jane Doe',
      startDate: '2028-01-01',
      targetLaunchDate: '2028-06-01',
      actualLaunchDate: null,
      budget: 500000,
      priority: 'high',
      tags: ['ai', 'marketing'],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['product_item', 'concept', 'high']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePhaseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'lifecycle_phase',
    content: JSON.stringify({
      productId: 'mem-1',
      name: 'Market Research',
      type: 'research',
      description: 'Conduct market research',
      status: 'not_started',
      startDate: '2028-01-15',
      endDate: '2028-02-15',
      owner: 'Bob',
      deliverables: ['Report'],
      dependencies: [],
      milestones: ['Survey complete'],
      notes: '',
    }),
    tags: JSON.stringify(['lifecycle_phase', 'research', 'not_started']),
    ...overrides,
  });
}

function makeVersionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'product_version',
    content: JSON.stringify({
      productId: 'mem-1',
      version: '1.0.0',
      status: 'draft',
      releaseDate: null,
      description: 'Initial release',
      changes: ['New feature'],
      features: ['AI generation'],
      bugFixes: [],
      breakingChanges: [],
      downloadUrl: '',
      notes: '',
    }),
    tags: JSON.stringify(['product_version', 'draft']),
    ...overrides,
  });
}

function makeEolRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'end_of_life',
    content: JSON.stringify({
      productId: 'mem-1',
      versionId: null,
      reason: 'end_of_life',
      status: 'planned',
      announcementDate: null,
      effectiveDate: '2028-12-01',
      endOfSupportDate: '2029-01-01',
      migrationPath: 'Upgrade to v2',
      replacement: 'Atlas Cloud v2',
      description: 'Sunsetting v1',
      notes: '',
    }),
    tags: JSON.stringify(['end_of_life', 'end_of_life', 'planned']),
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
}

const { ProductLifecycleService } = await import('@/lib/services/product-lifecycle-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Products
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductLifecycleService — Products', () => {
  beforeEach(() => resetMock());

  it('creates a product with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await ProductLifecycleService.createProduct('org-1', 'ws-1', {
      name: 'New Product',
    }, 'user-1');
    assert.equal(p.name, 'New Product');
    assert.equal(p.status, 'concept');
    assert.equal(p.priority, 'medium');
    assert.equal(p.budget, 0);
    assert.equal(p.tags.length, 0);
  });

  it('creates a product with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await ProductLifecycleService.createProduct('org-1', 'ws-1', {
      name: 'Atlas Pro', description: 'Pro version', category: 'Enterprise',
      status: 'development', owner: 'Alice', startDate: '2028-01-01',
      targetLaunchDate: '2028-09-01', actualLaunchDate: '2028-08-15',
      budget: 1000000, priority: 'critical', tags: ['pro', 'enterprise'],
      notes: 'High priority product',
    }, 'user-1');
    assert.equal(p.name, 'Atlas Pro');
    assert.equal(p.status, 'development');
    assert.equal(p.owner, 'Alice');
    assert.equal(p.budget, 1000000);
    assert.equal(p.priority, 'critical');
    assert.equal(p.tags.length, 2);
  });

  it('gets a product by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await ProductLifecycleService.getProduct('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Atlas Cloud Platform');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lifecycle_phase' });
    const p = await ProductLifecycleService.getProduct('mem-1');
    assert.equal(p, null);
  });

  it('returns null when product not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await ProductLifecycleService.getProduct('nope');
    assert.equal(p, null);
  });

  it('lists products by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'product_item') return [makeRow()];
      return [];
    };
    const list = await ProductLifecycleService.listProducts('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Atlas Cloud Platform');
  });

  it('updates a product', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ProductLifecycleService.updateProduct('mem-1', { status: 'launched' });
    assert.ok(p);
    assert.equal(p!.status, 'launched');
  });

  it('deletes a product', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await ProductLifecycleService.deleteProduct('mem-1');
    assert.equal(ok, true);
  });

  it('launchProduct sets status to launched', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ProductLifecycleService.launchProduct('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'launched');
    assert.ok(p!.actualLaunchDate);
  });

  it('retireProduct sets status to end_of_life', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await ProductLifecycleService.retireProduct('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'end_of_life');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Phases
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductLifecycleService — Phases', () => {
  beforeEach(() => resetMock());

  it('creates a phase with defaults', async () => {
    memCreateImpl = async (args) => makePhaseRow({ content: args.data.content as string });
    const p = await ProductLifecycleService.createPhase('org-1', 'ws-1', {
      productId: 'mem-1', name: 'Design Phase', type: 'design',
    }, 'user-1');
    assert.equal(p.name, 'Design Phase');
    assert.equal(p.status, 'not_started');
    assert.equal(p.deliverables.length, 0);
  });

  it('creates a phase with full input', async () => {
    memCreateImpl = async (args) => makePhaseRow({ content: args.data.content as string });
    const p = await ProductLifecycleService.createPhase('org-1', 'ws-1', {
      productId: 'mem-1', name: 'Development', type: 'development',
      description: 'Build the product', status: 'in_progress',
      startDate: '2028-02-01', endDate: '2028-05-01', owner: 'Charlie',
      deliverables: ['Code', 'Tests'], dependencies: ['Design'],
      milestones: ['MVP', 'Beta'], notes: 'Sprint-based',
    }, 'user-1');
    assert.equal(p.name, 'Development');
    assert.equal(p.type, 'development');
    assert.equal(p.status, 'in_progress');
    assert.equal(p.owner, 'Charlie');
    assert.equal(p.deliverables.length, 2);
  });

  it('gets a phase by id', async () => {
    memFindUniqueImpl = async () => makePhaseRow();
    const p = await ProductLifecycleService.getPhase('mem-p1');
    assert.ok(p);
    assert.equal(p!.name, 'Market Research');
  });

  it('lists phases by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lifecycle_phase') return [makePhaseRow()];
      return [];
    };
    const list = await ProductLifecycleService.listPhases('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a phase', async () => {
    memFindUniqueImpl = async () => makePhaseRow();
    memUpdateImpl = async (args) => makePhaseRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await ProductLifecycleService.updatePhase('mem-p1', { status: 'in_progress' });
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('deletes a phase', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await ProductLifecycleService.deletePhase('mem-p1');
    assert.equal(ok, true);
  });

  it('startPhase sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makePhaseRow();
    memUpdateImpl = async (args) => makePhaseRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await ProductLifecycleService.startPhase('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('completePhase sets status to completed', async () => {
    memFindUniqueImpl = async () => makePhaseRow();
    memUpdateImpl = async (args) => makePhaseRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await ProductLifecycleService.completePhase('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('holdPhase sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makePhaseRow();
    memUpdateImpl = async (args) => makePhaseRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await ProductLifecycleService.holdPhase('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Versions
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductLifecycleService — Versions', () => {
  beforeEach(() => resetMock());

  it('creates a version with defaults', async () => {
    memCreateImpl = async (args) => makeVersionRow({ content: args.data.content as string });
    const v = await ProductLifecycleService.createVersion('org-1', 'ws-1', {
      productId: 'mem-1', version: '2.0.0',
    }, 'user-1');
    assert.equal(v.version, '2.0.0');
    assert.equal(v.status, 'draft');
    assert.equal(v.changes.length, 0);
  });

  it('creates a version with full input', async () => {
    memCreateImpl = async (args) => makeVersionRow({ content: args.data.content as string });
    const v = await ProductLifecycleService.createVersion('org-1', 'ws-1', {
      productId: 'mem-1', version: '2.1.0', status: 'beta',
      releaseDate: '2028-04-01', description: 'Beta release',
      changes: ['Refactored API'], features: ['New dashboard'],
      bugFixes: ['Fixed login'], breakingChanges: ['API v1 removed'],
      downloadUrl: 'https://example.com/download', notes: 'Beta channel',
    }, 'user-1');
    assert.equal(v.version, '2.1.0');
    assert.equal(v.status, 'beta');
    assert.equal(v.description, 'Beta release');
    assert.equal(v.features.length, 1);
    assert.equal(v.breakingChanges.length, 1);
  });

  it('gets a version by id', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    const v = await ProductLifecycleService.getVersion('mem-v1');
    assert.ok(v);
    assert.equal(v!.version, '1.0.0');
  });

  it('lists versions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'product_version') return [makeVersionRow()];
      return [];
    };
    const list = await ProductLifecycleService.listVersions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a version', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    memUpdateImpl = async (args) => makeVersionRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await ProductLifecycleService.updateVersion('mem-v1', { status: 'rc' });
    assert.ok(v);
    assert.equal(v!.status, 'rc');
  });

  it('deletes a version', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await ProductLifecycleService.deleteVersion('mem-v1');
    assert.equal(ok, true);
  });

  it('releaseVersion sets status to released', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    memUpdateImpl = async (args) => makeVersionRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await ProductLifecycleService.releaseVersion('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'released');
    assert.ok(v!.releaseDate);
  });

  it('deprecateVersion sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeVersionRow();
    memUpdateImpl = async (args) => makeVersionRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await ProductLifecycleService.deprecateVersion('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — End of Life
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductLifecycleService — End of Life', () => {
  beforeEach(() => resetMock());

  it('creates an eol with defaults', async () => {
    memCreateImpl = async (args) => makeEolRow({ content: args.data.content as string });
    const e = await ProductLifecycleService.createEol('org-1', 'ws-1', {
      productId: 'mem-1', reason: 'end_of_support',
    }, 'user-1');
    assert.equal(e.reason, 'end_of_support');
    assert.equal(e.status, 'planned');
    assert.equal(e.migrationPath, '');
  });

  it('creates an eol with full input', async () => {
    memCreateImpl = async (args) => makeEolRow({ content: args.data.content as string });
    const e = await ProductLifecycleService.createEol('org-1', 'ws-1', {
      productId: 'mem-1', versionId: 'mem-v1', reason: 'replaced', status: 'announced',
      announcementDate: '2028-03-01', effectiveDate: '2028-09-01',
      endOfSupportDate: '2028-12-01', migrationPath: 'Migrate to v3',
      replacement: 'Atlas v3', description: 'Replaced by v3', notes: 'Notify customers',
    }, 'user-1');
    assert.equal(e.reason, 'replaced');
    assert.equal(e.status, 'announced');
    assert.equal(e.replacement, 'Atlas v3');
    assert.equal(e.versionId, 'mem-v1');
  });

  it('gets an eol by id', async () => {
    memFindUniqueImpl = async () => makeEolRow();
    const e = await ProductLifecycleService.getEol('mem-e1');
    assert.ok(e);
    assert.equal(e!.reason, 'end_of_life');
  });

  it('lists eols by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'end_of_life') return [makeEolRow()];
      return [];
    };
    const list = await ProductLifecycleService.listEols('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an eol', async () => {
    memFindUniqueImpl = async () => makeEolRow();
    memUpdateImpl = async (args) => makeEolRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await ProductLifecycleService.updateEol('mem-e1', { status: 'announced' });
    assert.ok(e);
    assert.equal(e!.status, 'announced');
  });

  it('deletes an eol', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await ProductLifecycleService.deleteEol('mem-e1');
    assert.equal(ok, true);
  });

  it('announceEol sets status to announced', async () => {
    memFindUniqueImpl = async () => makeEolRow();
    memUpdateImpl = async (args) => makeEolRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await ProductLifecycleService.announceEol('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'announced');
    assert.ok(e!.announcementDate);
  });

  it('effectEol sets status to in_effect', async () => {
    memFindUniqueImpl = async () => makeEolRow();
    memUpdateImpl = async (args) => makeEolRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await ProductLifecycleService.effectEol('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'in_effect');
    assert.ok(e!.effectiveDate);
  });

  it('completeEol sets status to completed', async () => {
    memFindUniqueImpl = async () => makeEolRow();
    memUpdateImpl = async (args) => makeEolRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await ProductLifecycleService.completeEol('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductLifecycleService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getProductLifecycleMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'product_item') return [
        makeRow({ id: 'p1', content: JSON.stringify({ name: 'P1', status: 'development', category: '', owner: '', priority: 'medium', budget: 0, tags: [], notes: '', description: '', startDate: null, targetLaunchDate: '2028-12-01', actualLaunchDate: null }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', status: 'launched', category: '', owner: '', priority: 'medium', budget: 0, tags: [], notes: '', description: '', startDate: null, targetLaunchDate: null, actualLaunchDate: null }) }),
        makeRow({ id: 'p3', content: JSON.stringify({ name: 'P3', status: 'end_of_life', category: '', owner: '', priority: 'medium', budget: 0, tags: [], notes: '', description: '', startDate: null, targetLaunchDate: null, actualLaunchDate: null }) }),
      ];
      if (t === 'end_of_life') return [
        makeEolRow({ content: JSON.stringify({ productId: 'p1', versionId: null, reason: 'end_of_life', status: 'planned', announcementDate: null, effectiveDate: null, endOfSupportDate: null, migrationPath: '', replacement: '', description: '', notes: '' }) }),
        makeEolRow({ id: 'e2', content: JSON.stringify({ productId: 'p2', versionId: null, reason: 'end_of_life', status: 'completed', announcementDate: null, effectiveDate: null, endOfSupportDate: null, migrationPath: '', replacement: '', description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await ProductLifecycleService.getProductLifecycleMetrics('org-1');
    assert.equal(m.activeProducts, 2);
    assert.equal(m.upcomingLaunches, 1);
    assert.equal(m.eolItems, 1);
  });

  it('getProductLifecycleStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'product_item') return [makeRow()];
      if (t === 'lifecycle_phase') return [makePhaseRow()];
      if (t === 'product_version') return [makeVersionRow()];
      if (t === 'end_of_life') return [makeEolRow()];
      return [];
    };
    const s = await ProductLifecycleService.getProductLifecycleStats('org-1');
    assert.equal(s.productCount, 1);
    assert.equal(s.phaseCount, 1);
    assert.equal(s.versionCount, 1);
    assert.equal(s.eolCount, 1);
    assert.equal(s.byProductStatus['concept'], 1);
    assert.equal(s.byPhaseType['research'], 1);
    assert.equal(s.byVersionStatus['draft'], 1);
    assert.equal(s.byEolStatus['planned'], 1);
    assert.equal(s.byEolReason['end_of_life'], 1);
  });
});
