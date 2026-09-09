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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'dg_catalog_entry',
    content: JSON.stringify({ name: 'Test', type: 'dataset', source: 'db', owner: '', description: '', tags: [], classification: 'internal', pii: false, refreshFrequency: '', qualityScore: null, status: 'active' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['dg_catalog_entry', 'dataset', 'internal', 'active']),
    relatedMemoryIds: null,
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
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { DataGovernanceService } = await import('@/lib/services/data-governance-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DataGovernanceService', () => {
  beforeEach(() => { resetMock(); });

  // ── Catalog ──

  describe('createCatalogEntry', () => {
    it('creates a catalog entry with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_catalog_entry', content: args.data.content as string });
      const entry = await DataGovernanceService.createCatalogEntry('org-1', 'ws-1', { name: 'Customers', type: 'table', source: 'db', classification: 'internal' }, 'user-1');
      assert.equal(entry.name, 'Customers');
      assert.equal(entry.type, 'table');
      assert.equal(entry.classification, 'internal');
      assert.equal(entry.pii, false);
      assert.equal(entry.status, 'active');
      assert.equal(entry.tags.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_catalog_entry', content: args.data.content as string });
      const entry = await DataGovernanceService.createCatalogEntry('org-1', 'ws-1', {
        name: 'Orders', type: 'dataset', source: 'api', owner: 'Alice', description: 'desc',
        tags: ['sales'], classification: 'confidential', pii: true, refreshFrequency: 'daily',
        qualityScore: 95, status: 'draft',
      }, 'user-1');
      assert.equal(entry.owner, 'Alice');
      assert.equal(entry.pii, true);
      assert.equal(entry.qualityScore, 95);
      assert.equal(entry.status, 'draft');
    });
  });

  describe('getCatalogEntry', () => {
    it('returns an entry when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      const entry = await DataGovernanceService.getCatalogEntry('mem-1');
      assert.ok(entry);
      assert.equal(entry!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const entry = await DataGovernanceService.getCatalogEntry('nope');
      assert.equal(entry, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_quality_rule' });
      const entry = await DataGovernanceService.getCatalogEntry('mem-1');
      assert.equal(entry, null);
    });
  });

  describe('listCatalog', () => {
    it('lists catalog entries and filters by type, classification, owner, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ name: 'A', type: 'table', source: 'db', owner: 'Alice', description: '', tags: [], classification: 'internal', pii: false, refreshFrequency: '', qualityScore: null, status: 'active' }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ name: 'B', type: 'api', source: 'ext', owner: 'Bob', description: '', tags: [], classification: 'restricted', pii: true, refreshFrequency: '', qualityScore: null, status: 'draft' }) }),
      ];
      const list = await DataGovernanceService.listCatalog('org-1', { type: 'table', classification: 'internal', owner: 'Alice', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateCatalogEntry', () => {
    it('updates catalog entry fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_catalog_entry', content: args.data.content as string });
      const entry = await DataGovernanceService.updateCatalogEntry('mem-1', { name: 'Updated', status: 'archived' });
      assert.ok(entry);
      assert.equal(entry!.name, 'Updated');
      assert.equal(entry!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const entry = await DataGovernanceService.updateCatalogEntry('nope', { name: 'X' });
      assert.equal(entry, null);
    });
  });

  describe('deleteCatalogEntry', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DataGovernanceService.deleteCatalogEntry('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await DataGovernanceService.deleteCatalogEntry('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Quality Rules ──

  describe('createQualityRule', () => {
    it('creates a quality rule with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_quality_rule', content: args.data.content as string });
      const rule = await DataGovernanceService.createQualityRule('org-1', 'ws-1', { name: 'Completeness', type: 'completeness', rule: 'NOT NULL' }, 'user-1');
      assert.equal(rule.name, 'Completeness');
      assert.equal(rule.type, 'completeness');
      assert.equal(rule.status, 'active');
      assert.equal(rule.violations, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_quality_rule', content: args.data.content as string });
      const rule = await DataGovernanceService.createQualityRule('org-1', 'ws-1', {
        name: 'Accuracy', type: 'accuracy', rule: 'CHECK', catalogEntryId: 'c1',
        description: 'desc', threshold: 95, frequency: 'daily', status: 'draft',
        lastRun: '2024-01-01', lastResult: 'pass', violations: 3,
      }, 'user-1');
      assert.equal(rule.threshold, 95);
      assert.equal(rule.status, 'draft');
      assert.equal(rule.violations, 3);
    });
  });

  describe('getQualityRule', () => {
    it('returns a rule when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_quality_rule', content: JSON.stringify({ name: 'R', catalogEntryId: null, type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: null, violations: 0 }) });
      const rule = await DataGovernanceService.getQualityRule('mem-1');
      assert.ok(rule);
      assert.equal(rule!.name, 'R');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      const rule = await DataGovernanceService.getQualityRule('mem-1');
      assert.equal(rule, null);
    });
  });

  describe('listQualityRules', () => {
    it('lists quality rules and filters by catalogEntryId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'dg_quality_rule', content: JSON.stringify({ name: 'A', catalogEntryId: 'c1', type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: null, violations: 0 }) }),
        makeRow({ id: 'r2', type: 'dg_quality_rule', content: JSON.stringify({ name: 'B', catalogEntryId: 'c2', type: 'accuracy', description: '', rule: '', threshold: null, frequency: '', status: 'inactive', lastRun: null, lastResult: null, violations: 0 }) }),
      ];
      const list = await DataGovernanceService.listQualityRules('org-1', { catalogEntryId: 'c1', type: 'completeness', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateQualityRule', () => {
    it('updates quality rule fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_quality_rule', content: JSON.stringify({ name: 'Old', catalogEntryId: null, type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: null, violations: 0 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_quality_rule', content: args.data.content as string });
      const rule = await DataGovernanceService.updateQualityRule('mem-1', { name: 'New', status: 'inactive' });
      assert.ok(rule);
      assert.equal(rule!.name, 'New');
      assert.equal(rule!.status, 'inactive');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const rule = await DataGovernanceService.updateQualityRule('nope', { name: 'X' });
      assert.equal(rule, null);
    });
  });

  describe('deleteQualityRule', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DataGovernanceService.deleteQualityRule('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('runQualityCheck', () => {
    it('runs a quality check and updates lastRun, lastResult, violations', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_quality_rule', content: JSON.stringify({ name: 'R', catalogEntryId: null, type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: null, violations: 0 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_quality_rule', content: args.data.content as string });
      const rule = await DataGovernanceService.runQualityCheck('mem-1', 'fail', 5, 'admin');
      assert.ok(rule);
      assert.equal(rule!.lastResult, 'fail');
      assert.equal(rule!.violations, 5);
      assert.ok(rule!.lastRun);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const rule = await DataGovernanceService.runQualityCheck('nope', 'pass', 0, 'u');
      assert.equal(rule, null);
    });
  });

  // ── Lineage ──

  describe('createLineage', () => {
    it('creates a lineage entry with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_lineage', content: args.data.content as string });
      const lin = await DataGovernanceService.createLineage('org-1', 'ws-1', { name: 'ETL', source: 'db', target: 'warehouse' }, 'user-1');
      assert.equal(lin.name, 'ETL');
      assert.equal(lin.source, 'db');
      assert.equal(lin.target, 'warehouse');
      assert.equal(lin.status, 'active');
      assert.equal(lin.dependencies.length, 0);
    });
  });

  describe('getLineage', () => {
    it('returns a lineage entry when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_lineage', content: JSON.stringify({ name: 'L', source: 'a', target: 'b', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) });
      const lin = await DataGovernanceService.getLineage('mem-1');
      assert.ok(lin);
      assert.equal(lin!.name, 'L');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      const lin = await DataGovernanceService.getLineage('mem-1');
      assert.equal(lin, null);
    });
  });

  describe('listLineage', () => {
    it('lists lineage and filters by status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'l1', type: 'dg_lineage', content: JSON.stringify({ name: 'A', source: 'a', target: 'b', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) }),
        makeRow({ id: 'l2', type: 'dg_lineage', content: JSON.stringify({ name: 'B', source: 'c', target: 'd', transformation: '', schedule: '', status: 'inactive', dependencies: [], dataVolume: '', lastUpdated: null }) }),
      ];
      const list = await DataGovernanceService.listLineage('org-1', { status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateLineage', () => {
    it('updates lineage fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_lineage', content: JSON.stringify({ name: 'Old', source: 'a', target: 'b', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_lineage', content: args.data.content as string });
      const lin = await DataGovernanceService.updateLineage('mem-1', { name: 'New', status: 'inactive' });
      assert.ok(lin);
      assert.equal(lin!.name, 'New');
      assert.equal(lin!.status, 'inactive');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const lin = await DataGovernanceService.updateLineage('nope', { name: 'X' });
      assert.equal(lin, null);
    });
  });

  describe('deleteLineage', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DataGovernanceService.deleteLineage('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('getLineageGraph', () => {
    it('returns upstream and downstream for an entry', async () => {
      memFindUniqueImpl = async (args) => {
        const id = (args.where as Record<string, unknown>).id as string;
        if (id === 'entry-1') return makeRow({ id: 'entry-1', type: 'dg_catalog_entry', content: JSON.stringify({ name: 'Customers', type: 'table', source: 'db', owner: '', description: '', tags: [], classification: 'internal', pii: false, refreshFrequency: '', qualityScore: null, status: 'active' }) });
        return null;
      };
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'dg_lineage') return [
          makeRow({ id: 'l1', content: JSON.stringify({ name: 'up', source: 'source', target: 'Customers', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) }),
          makeRow({ id: 'l2', content: JSON.stringify({ name: 'down', source: 'Customers', target: 'report', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) }),
        ];
        return [];
      };
      const graph = await DataGovernanceService.getLineageGraph('org-1', 'entry-1');
      assert.equal(graph.upstream.length, 1);
      assert.equal(graph.downstream.length, 1);
      assert.equal(graph.upstream[0].name, 'up');
      assert.equal(graph.downstream[0].name, 'down');
    });
  });

  // ── Stewardship ──

  describe('createStewardship', () => {
    it('creates a stewardship with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_stewardship', content: args.data.content as string });
      const s = await DataGovernanceService.createStewardship('org-1', 'ws-1', { stewardName: 'Alice', role: 'steward' }, 'user-1');
      assert.equal(s.stewardName, 'Alice');
      assert.equal(s.role, 'steward');
      assert.equal(s.status, 'active');
    });
  });

  describe('getStewardship', () => {
    it('returns a stewardship when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_stewardship', content: JSON.stringify({ catalogEntryId: null, stewardName: 'S', role: 'steward', responsibilities: '', accountability: '', accessLevel: '', status: 'active' }) });
      const s = await DataGovernanceService.getStewardship('mem-1');
      assert.ok(s);
      assert.equal(s!.stewardName, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      const s = await DataGovernanceService.getStewardship('mem-1');
      assert.equal(s, null);
    });
  });

  describe('listStewardship', () => {
    it('lists stewardship and filters by catalogEntryId, role, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'dg_stewardship', content: JSON.stringify({ catalogEntryId: 'c1', stewardName: 'A', role: 'steward', responsibilities: '', accountability: '', accessLevel: '', status: 'active' }) }),
        makeRow({ id: 's2', type: 'dg_stewardship', content: JSON.stringify({ catalogEntryId: 'c2', stewardName: 'B', role: 'owner', responsibilities: '', accountability: '', accessLevel: '', status: 'inactive' }) }),
      ];
      const list = await DataGovernanceService.listStewardship('org-1', { catalogEntryId: 'c1', role: 'steward', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].stewardName, 'A');
    });
  });

  describe('updateStewardship', () => {
    it('updates stewardship fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_stewardship', content: JSON.stringify({ catalogEntryId: null, stewardName: 'Old', role: 'steward', responsibilities: '', accountability: '', accessLevel: '', status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_stewardship', content: args.data.content as string });
      const s = await DataGovernanceService.updateStewardship('mem-1', { stewardName: 'New', status: 'inactive' });
      assert.ok(s);
      assert.equal(s!.stewardName, 'New');
      assert.equal(s!.status, 'inactive');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const s = await DataGovernanceService.updateStewardship('nope', { stewardName: 'X' });
      assert.equal(s, null);
    });
  });

  describe('deleteStewardship', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DataGovernanceService.deleteStewardship('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── MDM ──

  describe('createMDMRecord', () => {
    it('creates an MDM record with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_mdm_record', content: args.data.content as string });
      const r = await DataGovernanceService.createMDMRecord('org-1', 'ws-1', { domain: 'customer', entityName: 'Cust-1', goldenRecord: { name: 'Alice' } }, 'user-1');
      assert.equal(r.entityName, 'Cust-1');
      assert.equal(r.domain, 'customer');
      assert.equal(r.status, 'active');
      assert.equal(r.sourceRecords.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'dg_mdm_record', content: args.data.content as string });
      const r = await DataGovernanceService.createMDMRecord('org-1', 'ws-1', {
        domain: 'product', entityName: 'Prod-1', goldenRecord: { sku: 'X' },
        sourceRecords: [{ source: 'erp', recordId: 'r1', matchScore: 95 }],
        status: 'pending', qualityScore: 80, lastVerified: '2024-01-01', verifiedBy: 'admin',
      }, 'user-1');
      assert.equal(r.domain, 'product');
      assert.equal(r.sourceRecords.length, 1);
      assert.equal(r.qualityScore, 80);
    });
  });

  describe('getMDMRecord', () => {
    it('returns an MDM record when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_mdm_record', content: JSON.stringify({ domain: 'customer', entityName: 'C', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) });
      const r = await DataGovernanceService.getMDMRecord('mem-1');
      assert.ok(r);
      assert.equal(r!.entityName, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_catalog_entry' });
      const r = await DataGovernanceService.getMDMRecord('mem-1');
      assert.equal(r, null);
    });
  });

  describe('listMDMRecords', () => {
    it('lists MDM records and filters by domain, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', type: 'dg_mdm_record', content: JSON.stringify({ domain: 'customer', entityName: 'A', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) }),
        makeRow({ id: 'm2', type: 'dg_mdm_record', content: JSON.stringify({ domain: 'product', entityName: 'B', goldenRecord: {}, sourceRecords: [], status: 'merged', qualityScore: null, lastVerified: null, verifiedBy: null }) }),
      ];
      const list = await DataGovernanceService.listMDMRecords('org-1', { domain: 'customer', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].entityName, 'A');
    });
  });

  describe('updateMDMRecord', () => {
    it('updates MDM record fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_mdm_record', content: JSON.stringify({ domain: 'customer', entityName: 'Old', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_mdm_record', content: args.data.content as string });
      const r = await DataGovernanceService.updateMDMRecord('mem-1', { entityName: 'New', status: 'archived' });
      assert.ok(r);
      assert.equal(r!.entityName, 'New');
      assert.equal(r!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await DataGovernanceService.updateMDMRecord('nope', { entityName: 'X' });
      assert.equal(r, null);
    });
  });

  describe('deleteMDMRecord', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DataGovernanceService.deleteMDMRecord('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('mergeRecords', () => {
    it('merges a source record into an MDM record', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_mdm_record', content: JSON.stringify({ domain: 'customer', entityName: 'C', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_mdm_record', content: args.data.content as string });
      const r = await DataGovernanceService.mergeRecords('mem-1', 'src-1', 'admin');
      assert.ok(r);
      assert.equal(r!.status, 'merged');
      assert.equal(r!.sourceRecords.length, 1);
      assert.ok(r!.lastVerified);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await DataGovernanceService.mergeRecords('nope', 's', 'u');
      assert.equal(r, null);
    });
  });

  describe('verifyMDMRecord', () => {
    it('verifies an MDM record', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'dg_mdm_record', content: JSON.stringify({ domain: 'customer', entityName: 'C', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'dg_mdm_record', content: args.data.content as string });
      const r = await DataGovernanceService.verifyMDMRecord('mem-1', 'admin');
      assert.ok(r);
      assert.ok(r!.lastVerified);
      assert.equal(r!.verifiedBy, 'admin');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await DataGovernanceService.verifyMDMRecord('nope', 'u');
      assert.equal(r, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getDGMetrics', () => {
    it('returns aggregated metrics', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'dg_catalog_entry') return [
          makeRow({ id: 'c1', content: JSON.stringify({ name: 'A', type: 'table', source: 'db', owner: '', description: '', tags: [], classification: 'confidential', pii: true, refreshFrequency: '', qualityScore: null, status: 'active' }) }),
        ];
        if (t === 'dg_quality_rule') return [
          makeRow({ id: 'r1', content: JSON.stringify({ name: 'R', catalogEntryId: null, type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: 'pass', violations: 0 }) }),
        ];
        if (t === 'dg_mdm_record') return [
          makeRow({ id: 'm1', content: JSON.stringify({ domain: 'customer', entityName: 'C', goldenRecord: {}, sourceRecords: [], status: 'active', qualityScore: null, lastVerified: null, verifiedBy: null }) }),
        ];
        if (t === 'dg_lineage') return [
          makeRow({ id: 'l1', content: JSON.stringify({ name: 'L', source: 'a', target: 'b', transformation: '', schedule: '', status: 'active', dependencies: [], dataVolume: '', lastUpdated: null }) }),
        ];
        return [];
      };
      const m = await DataGovernanceService.getDGMetrics('org-1');
      assert.equal(m.catalogCoverage, 1);
      assert.equal(m.qualityRulePassRate, 100);
      assert.equal(m.piiClassificationCoverage, 100);
      assert.equal(m.mdmGoldenRecords, 1);
      assert.equal(m.lineageCompleteness, 1);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'dg_catalog_entry') return [
          makeRow({ id: 'c1', content: JSON.stringify({ name: 'A', type: 'table', source: 'db', owner: '', description: '', tags: [], classification: 'confidential', pii: true, refreshFrequency: '', qualityScore: null, status: 'active' }) }),
        ];
        if (t === 'dg_quality_rule') return [
          makeRow({ id: 'r1', content: JSON.stringify({ name: 'R', catalogEntryId: null, type: 'completeness', description: '', rule: '', threshold: null, frequency: '', status: 'active', lastRun: null, lastResult: 'pass', violations: 0 }) }),
        ];
        return [];
      };
      const s = await DataGovernanceService.getStats('org-1');
      assert.equal(s.catalogCount, 1);
      assert.equal(s.qualityRuleCount, 1);
      assert.equal(s.piiCount, 1);
      assert.equal(s.activeCatalogCount, 1);
      assert.equal(s.byCatalogType.table, 1);
      assert.equal(s.byClassification.confidential, 1);
    });
  });
});
