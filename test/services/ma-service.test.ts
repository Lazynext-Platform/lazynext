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
type FindFirstArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
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
    type: 'ma_target',
    content: JSON.stringify({ name: 'Test', industry: 'Tech', location: 'NYC', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'identified', contactName: '', contactEmail: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['ma_target', 'Tech', 'identified']),
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
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { MAService } = await import('@/lib/services/ma-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MAService', () => {
  beforeEach(() => { resetMock(); });

  // ── Targets ──

  describe('createTarget', () => {
    it('creates a target with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_target', content: args.data.content as string });
      const t = await MAService.createTarget('org-1', 'ws-1', { name: 'Acme', industry: 'Tech' }, 'user-1');
      assert.equal(t.name, 'Acme');
      assert.equal(t.industry, 'Tech');
      assert.equal(t.ownershipType, 'private');
      assert.equal(t.status, 'identified');
      assert.equal(t.organizationId, 'org-1');
      assert.equal(t.workspaceId, 'ws-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_target', content: args.data.content as string });
      const t = await MAService.createTarget('org-1', 'ws-1', {
        name: 'Beta', industry: 'Finance', location: 'London', revenue: 5000000, employees: 120,
        description: 'desc', website: 'https://beta.com', ownershipType: 'public', strategicFit: 'high',
        status: 'researching', contactName: 'Jane', contactEmail: 'jane@beta.com',
      }, 'user-1');
      assert.equal(t.location, 'London');
      assert.equal(t.revenue, 5000000);
      assert.equal(t.employees, 120);
      assert.equal(t.ownershipType, 'public');
      assert.equal(t.status, 'researching');
      assert.equal(t.contactName, 'Jane');
      assert.equal(t.contactEmail, 'jane@beta.com');
    });
  });

  describe('getTarget', () => {
    it('returns a target when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target' });
      const t = await MAService.getTarget('mem-1');
      assert.ok(t);
      assert.equal(t!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await MAService.getTarget('nope');
      assert.equal(t, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_deal' });
      const t = await MAService.getTarget('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listTargets', () => {
    it('lists targets', async () => {
      memFindManyImpl = async () => [makeRow({ id: 't1' }), makeRow({ id: 't2' })];
      const list = await MAService.listTargets('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by industry, status, and location', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', content: JSON.stringify({ name: 'A', industry: 'Tech', location: 'NYC', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'identified', contactName: '', contactEmail: '' }) }),
        makeRow({ id: 't2', content: JSON.stringify({ name: 'B', industry: 'Finance', location: 'London', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'researching', contactName: '', contactEmail: '' }) }),
      ];
      const list = await MAService.listTargets('org-1', { industry: 'Tech', status: 'identified', location: 'NYC' });
      assert.equal(list.length, 1);
      assert.equal(list[0].industry, 'Tech');
    });
  });

  describe('updateTarget', () => {
    it('updates target fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target', content: JSON.stringify({ name: 'Old', industry: 'Tech', location: 'NYC', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'identified', contactName: '', contactEmail: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_target', content: args.data.content as string });
      const t = await MAService.updateTarget('mem-1', { name: 'New', status: 'acquired' });
      assert.ok(t);
      assert.equal(t!.name, 'New');
      assert.equal(t!.status, 'acquired');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await MAService.updateTarget('nope', { name: 'X' });
      assert.equal(t, null);
    });
  });

  describe('deleteTarget', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await MAService.deleteTarget('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await MAService.deleteTarget('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Deals ──

  describe('createDeal', () => {
    it('creates a deal with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_deal', content: args.data.content as string });
      const d = await MAService.createDeal('org-1', 'ws-1', { targetId: 't1', name: 'Acquire Co', type: 'acquisition' }, 'user-1');
      assert.equal(d.name, 'Acquire Co');
      assert.equal(d.type, 'acquisition');
      assert.equal(d.status, 'pipeline');
      assert.equal(d.targetId, 't1');
      assert.equal(d.dealValue, null);
      assert.deepEqual(d.team, []);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_deal', content: args.data.content as string });
      const d = await MAService.createDeal('org-1', 'ws-1', {
        targetId: 't1', name: 'Merger', type: 'merger', status: 'negotiation', dealValue: 10000000,
        structure: 'stock', expectedCloseDate: '2024-12-31', lead: 'Alice', team: ['Alice', 'Bob'],
      }, 'user-1');
      assert.equal(d.type, 'merger');
      assert.equal(d.status, 'negotiation');
      assert.equal(d.dealValue, 10000000);
      assert.equal(d.structure, 'stock');
      assert.ok(d.expectedCloseDate instanceof Date);
      assert.equal(d.lead, 'Alice');
      assert.deepEqual(d.team, ['Alice', 'Bob']);
    });
  });

  describe('getDeal', () => {
    it('returns a deal when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'D', type: 'acquisition', status: 'pipeline', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) });
      const d = await MAService.getDeal('mem-1');
      assert.ok(d);
      assert.equal(d!.id, 'mem-1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target' });
      const d = await MAService.getDeal('mem-1');
      assert.equal(d, null);
    });
  });

  describe('listDeals', () => {
    it('lists deals and filters by status, type, targetId', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'A', type: 'acquisition', status: 'negotiation', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
        makeRow({ id: 'd2', type: 'ma_deal', content: JSON.stringify({ targetId: 't2', name: 'B', type: 'merger', status: 'pipeline', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
      ];
      const list = await MAService.listDeals('org-1', { status: 'negotiation', type: 'acquisition', targetId: 't1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].targetId, 't1');
    });
  });

  describe('updateDeal', () => {
    it('updates deal fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'Old', type: 'acquisition', status: 'pipeline', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_deal', content: args.data.content as string });
      const d = await MAService.updateDeal('mem-1', { name: 'New', status: 'negotiation', dealValue: 5000 });
      assert.ok(d);
      assert.equal(d!.name, 'New');
      assert.equal(d!.status, 'negotiation');
      assert.equal(d!.dealValue, 5000);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await MAService.updateDeal('nope', { name: 'X' });
      assert.equal(d, null);
    });
  });

  describe('advanceDeal', () => {
    it('advances deal status and sets advancedBy/advancedAt', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'D', type: 'acquisition', status: 'pipeline', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_deal', content: args.data.content as string });
      const d = await MAService.advanceDeal('mem-1', 'due_diligence', 'alice');
      assert.ok(d);
      assert.equal(d!.status, 'due_diligence');
      assert.equal(d!.advancedBy, 'alice');
      assert.ok(d!.advancedAt instanceof Date);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await MAService.advanceDeal('nope', 'negotiation', 'u');
      assert.equal(d, null);
    });
  });

  describe('terminateDeal', () => {
    it('terminates a deal with reason and by', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'D', type: 'acquisition', status: 'negotiation', dealValue: null, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_deal', content: args.data.content as string });
      const d = await MAService.terminateDeal('mem-1', 'price too high', 'bob');
      assert.ok(d);
      assert.equal(d!.status, 'terminated');
      assert.equal(d!.terminatedReason, 'price too high');
      assert.equal(d!.terminatedBy, 'bob');
      assert.ok(d!.terminatedAt instanceof Date);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await MAService.terminateDeal('nope', 'r', 'u');
      assert.equal(d, null);
    });
  });

  // ── Due Diligence ──

  describe('createDueDiligence', () => {
    it('creates a due diligence with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_due_diligence', content: args.data.content as string });
      const dd = await MAService.createDueDiligence('org-1', 'ws-1', { dealId: 'd1', areas: [{ area: 'financial', status: 'pending' }] }, 'user-1');
      assert.equal(dd.dealId, 'd1');
      assert.equal(dd.areas.length, 1);
      assert.equal(dd.areas[0].area, 'financial');
      assert.equal(dd.areas[0].riskLevel, 'medium');
      assert.equal(dd.status, 'in_progress');
      assert.ok(dd.startDate instanceof Date);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_due_diligence', content: args.data.content as string });
      const dd = await MAService.createDueDiligence('org-1', 'ws-1', {
        dealId: 'd1', areas: [{ area: 'legal', status: 'in_progress', findings: 'review', riskLevel: 'high', owner: 'alice' }],
        status: 'pending', startDate: '2024-06-01', endDate: '2024-07-01',
      }, 'user-1');
      assert.equal(dd.areas[0].findings, 'review');
      assert.equal(dd.areas[0].riskLevel, 'high');
      assert.equal(dd.areas[0].owner, 'alice');
      assert.equal(dd.status, 'pending');
      assert.ok(dd.endDate instanceof Date);
    });
  });

  describe('getDueDiligence', () => {
    it('returns a due diligence when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) });
      const dd = await MAService.getDueDiligence('mem-1');
      assert.ok(dd);
      assert.equal(dd!.dealId, 'd1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target' });
      const dd = await MAService.getDueDiligence('mem-1');
      assert.equal(dd, null);
    });
  });

  describe('listDueDiligence', () => {
    it('lists due diligence and filters by dealId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'dd1', type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) }),
        makeRow({ id: 'dd2', type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd2', areas: [], status: 'complete', startDate: '2024-01-02', endDate: null, summary: '', completedBy: null, completedAt: null }) }),
      ];
      const list = await MAService.listDueDiligence('org-1', { dealId: 'd1', status: 'in_progress' });
      assert.equal(list.length, 1);
      assert.equal(list[0].dealId, 'd1');
    });
  });

  describe('updateDueDiligence', () => {
    it('updates due diligence fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_due_diligence', content: args.data.content as string });
      const dd = await MAService.updateDueDiligence('mem-1', { status: 'flagged', areas: [{ area: 'tax', status: 'flagged', findings: 'issue', riskLevel: 'critical', owner: 'bob' }] });
      assert.ok(dd);
      assert.equal(dd!.status, 'flagged');
      assert.equal(dd!.areas.length, 1);
      assert.equal(dd!.areas[0].area, 'tax');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const dd = await MAService.updateDueDiligence('nope', { status: 'complete' });
      assert.equal(dd, null);
    });
  });

  describe('completeDueDiligence', () => {
    it('completes a due diligence with summary', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_due_diligence', content: args.data.content as string });
      const dd = await MAService.completeDueDiligence('mem-1', 'all clear', 'alice');
      assert.ok(dd);
      assert.equal(dd!.status, 'complete');
      assert.equal(dd!.summary, 'all clear');
      assert.equal(dd!.completedBy, 'alice');
      assert.ok(dd!.completedAt instanceof Date);
      assert.ok(dd!.endDate instanceof Date);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const dd = await MAService.completeDueDiligence('nope', 's', 'u');
      assert.equal(dd, null);
    });
  });

  // ── Integrations ──

  describe('createIntegration', () => {
    it('creates an integration with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_integration', content: args.data.content as string });
      const i = await MAService.createIntegration('org-1', 'ws-1', { dealId: 'd1', name: 'Post-merger', workstreams: [{ name: 'IT' }] }, 'user-1');
      assert.equal(i.dealId, 'd1');
      assert.equal(i.name, 'Post-merger');
      assert.equal(i.workstreams.length, 1);
      assert.equal(i.workstreams[0].name, 'IT');
      assert.equal(i.workstreams[0].status, 'not_started');
      assert.equal(i.status, 'planning');
      assert.deepEqual(i.synergies, []);
      assert.deepEqual(i.risks, []);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_integration', content: args.data.content as string });
      const i = await MAService.createIntegration('org-1', 'ws-1', {
        dealId: 'd1', name: 'Integration', workstreams: [{ name: 'HR', owner: 'alice', status: 'in_progress', startDate: '2024-06-01', endDate: '2024-09-01', milestones: [{ name: 'M1', date: '2024-07-01', completed: true }] }],
        timeline: '6 months', budget: 500000, status: 'in_progress',
        synergies: [{ type: 'cost', description: 'reduce overhead', estimatedValue: 200000, realizedValue: 50000 }],
        risks: ['culture clash'],
      }, 'user-1');
      assert.equal(i.workstreams[0].owner, 'alice');
      assert.equal(i.workstreams[0].status, 'in_progress');
      assert.ok(i.workstreams[0].startDate instanceof Date);
      assert.equal(i.workstreams[0].milestones.length, 1);
      assert.equal(i.workstreams[0].milestones[0].name, 'M1');
      assert.equal(i.timeline, '6 months');
      assert.equal(i.budget, 500000);
      assert.equal(i.status, 'in_progress');
      assert.equal(i.synergies[0].estimatedValue, 200000);
      assert.equal(i.synergies[0].realizedValue, 50000);
      assert.deepEqual(i.risks, ['culture clash']);
    });
  });

  describe('getIntegration', () => {
    it('returns an integration when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'I', workstreams: [], timeline: '', budget: null, status: 'planning', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) });
      const i = await MAService.getIntegration('mem-1');
      assert.ok(i);
      assert.equal(i!.dealId, 'd1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target' });
      const i = await MAService.getIntegration('mem-1');
      assert.equal(i, null);
    });
  });

  describe('listIntegrations', () => {
    it('lists integrations and filters by dealId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'i1', type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'A', workstreams: [], timeline: '', budget: null, status: 'planning', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) }),
        makeRow({ id: 'i2', type: 'ma_integration', content: JSON.stringify({ dealId: 'd2', name: 'B', workstreams: [], timeline: '', budget: null, status: 'complete', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) }),
      ];
      const list = await MAService.listIntegrations('org-1', { dealId: 'd1', status: 'planning' });
      assert.equal(list.length, 1);
      assert.equal(list[0].dealId, 'd1');
    });
  });

  describe('updateIntegration', () => {
    it('updates integration fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'Old', workstreams: [], timeline: '', budget: null, status: 'planning', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_integration', content: args.data.content as string });
      const i = await MAService.updateIntegration('mem-1', { name: 'New', status: 'in_progress', budget: 100000, risks: ['risk1'] });
      assert.ok(i);
      assert.equal(i!.name, 'New');
      assert.equal(i!.status, 'in_progress');
      assert.equal(i!.budget, 100000);
      assert.deepEqual(i!.risks, ['risk1']);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const i = await MAService.updateIntegration('nope', { name: 'X' });
      assert.equal(i, null);
    });
  });

  describe('completeIntegration', () => {
    it('completes an integration with summary', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'I', workstreams: [], timeline: '', budget: null, status: 'in_progress', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_integration', content: args.data.content as string });
      const i = await MAService.completeIntegration('mem-1', 'done', 'alice');
      assert.ok(i);
      assert.equal(i!.status, 'complete');
      assert.equal(i!.summary, 'done');
      assert.equal(i!.completedBy, 'alice');
      assert.ok(i!.completedAt instanceof Date);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const i = await MAService.completeIntegration('nope', 's', 'u');
      assert.equal(i, null);
    });
  });

  // ── Valuations ──

  describe('createValuation', () => {
    it('creates a valuation with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_valuation', content: args.data.content as string });
      const v = await MAService.createValuation('org-1', 'ws-1', { targetId: 't1', method: 'dcf', value: 10000000 }, 'user-1');
      assert.equal(v.targetId, 't1');
      assert.equal(v.method, 'dcf');
      assert.equal(v.value, 10000000);
      assert.equal(v.rangeLow, null);
      assert.equal(v.rangeHigh, null);
      assert.equal(v.assumptions, '');
      assert.ok(v.date instanceof Date);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ma_valuation', content: args.data.content as string });
      const v = await MAService.createValuation('org-1', 'ws-1', {
        targetId: 't1', method: 'comparable_company', value: 8000000, rangeLow: 7000000, rangeHigh: 9000000,
        assumptions: 'growth 10%', multiples: '5x EBITDA', date: '2024-05-01', analyst: 'jane',
      }, 'user-1');
      assert.equal(v.rangeLow, 7000000);
      assert.equal(v.rangeHigh, 9000000);
      assert.equal(v.assumptions, 'growth 10%');
      assert.equal(v.multiples, '5x EBITDA');
      assert.equal(v.analyst, 'jane');
    });
  });

  describe('getValuation', () => {
    it('returns a valuation when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_valuation', content: JSON.stringify({ targetId: 't1', method: 'dcf', value: 100, rangeLow: null, rangeHigh: null, assumptions: '', multiples: '', date: '2024-01-01', analyst: '' }) });
      const v = await MAService.getValuation('mem-1');
      assert.ok(v);
      assert.equal(v!.targetId, 't1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_target' });
      const v = await MAService.getValuation('mem-1');
      assert.equal(v, null);
    });
  });

  describe('listValuations', () => {
    it('lists valuations and filters by targetId and method', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'v1', type: 'ma_valuation', content: JSON.stringify({ targetId: 't1', method: 'dcf', value: 100, rangeLow: null, rangeHigh: null, assumptions: '', multiples: '', date: '2024-01-01', analyst: '' }) }),
        makeRow({ id: 'v2', type: 'ma_valuation', content: JSON.stringify({ targetId: 't2', method: 'market', value: 200, rangeLow: null, rangeHigh: null, assumptions: '', multiples: '', date: '2024-01-02', analyst: '' }) }),
      ];
      const list = await MAService.listValuations('org-1', { targetId: 't1', method: 'dcf' });
      assert.equal(list.length, 1);
      assert.equal(list[0].targetId, 't1');
    });
  });

  describe('updateValuation', () => {
    it('updates valuation fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ma_valuation', content: JSON.stringify({ targetId: 't1', method: 'dcf', value: 100, rangeLow: null, rangeHigh: null, assumptions: '', multiples: '', date: '2024-01-01', analyst: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ma_valuation', content: args.data.content as string });
      const v = await MAService.updateValuation('mem-1', { value: 500, method: 'lbo', analyst: 'bob' });
      assert.ok(v);
      assert.equal(v!.value, 500);
      assert.equal(v!.method, 'lbo');
      assert.equal(v!.analyst, 'bob');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const v = await MAService.updateValuation('nope', { value: 1 });
      assert.equal(v, null);
    });
  });

  describe('deleteValuation', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await MAService.deleteValuation('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await MAService.deleteValuation('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Metrics ──

  describe('getMAMetrics', () => {
    it('computes metrics across deals, dds, and integrations', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'ma_deal') return [
          makeRow({ id: 'd1', type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'A', type: 'acquisition', status: 'negotiation', dealValue: 5000000, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
          makeRow({ id: 'd2', type: 'ma_deal', content: JSON.stringify({ targetId: 't2', name: 'B', type: 'merger', status: 'completed', dealValue: 3000000, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: 'alice', advancedAt: '2024-01-01' }) }),
        ];
        if (where.type === 'ma_due_diligence') return [
          makeRow({ id: 'dd1', type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'complete', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) }),
          makeRow({ id: 'dd2', type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd2', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) }),
        ];
        if (where.type === 'ma_integration') return [
          makeRow({ id: 'i1', type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'I', workstreams: [], timeline: '', budget: null, status: 'planning', synergies: [{ type: 'cost', description: 'd', estimatedValue: null, realizedValue: 100000 }], risks: [], summary: '', completedBy: null, completedAt: null }) }),
        ];
        return [];
      };
      const m = await MAService.getMAMetrics('org-1');
      assert.equal(m.activeDeals, 1);
      assert.equal(m.ddCompletionRate, 50);
      assert.equal(m.integrationSynergyRealized, 100000);
      assert.ok(m.pipelineValueByStage['negotiation'] !== undefined);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const m = await MAService.getMAMetrics('org-1');
      assert.equal(m.activeDeals, 0);
      assert.equal(m.ddCompletionRate, 0);
      assert.equal(m.integrationSynergyRealized, 0);
      assert.equal(m.avgDealCycleDays, 0);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'ma_target') return [
          makeRow({ id: 't1', type: 'ma_target', content: JSON.stringify({ name: 'A', industry: 'Tech', location: '', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'identified', contactName: '', contactEmail: '' }) }),
          makeRow({ id: 't2', type: 'ma_target', content: JSON.stringify({ name: 'B', industry: 'Tech', location: '', revenue: null, employees: null, description: '', website: '', ownershipType: 'private', strategicFit: '', status: 'acquired', contactName: '', contactEmail: '' }) }),
        ];
        if (where.type === 'ma_deal') return [
          makeRow({ id: 'd1', type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'A', type: 'acquisition', status: 'negotiation', dealValue: 5000000, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
          makeRow({ id: 'd2', type: 'ma_deal', content: JSON.stringify({ targetId: 't2', name: 'B', type: 'merger', status: 'completed', dealValue: 3000000, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
          makeRow({ id: 'd3', type: 'ma_deal', content: JSON.stringify({ targetId: 't1', name: 'C', type: 'acquisition', status: 'terminated', dealValue: 1000000, structure: '', expectedCloseDate: null, lead: '', team: [], terminatedReason: null, terminatedBy: null, terminatedAt: null, advancedBy: null, advancedAt: null }) }),
        ];
        if (where.type === 'ma_due_diligence') return [makeRow({ type: 'ma_due_diligence', content: JSON.stringify({ dealId: 'd1', areas: [], status: 'in_progress', startDate: '2024-01-01', endDate: null, summary: '', completedBy: null, completedAt: null }) })];
        if (where.type === 'ma_integration') return [makeRow({ type: 'ma_integration', content: JSON.stringify({ dealId: 'd1', name: 'I', workstreams: [], timeline: '', budget: null, status: 'planning', synergies: [], risks: [], summary: '', completedBy: null, completedAt: null }) })];
        if (where.type === 'ma_valuation') return [makeRow({ type: 'ma_valuation', content: JSON.stringify({ targetId: 't1', method: 'dcf', value: 100, rangeLow: null, rangeHigh: null, assumptions: '', multiples: '', date: '2024-01-01', analyst: '' }) })];
        return [];
      };
      const s = await MAService.getStats('org-1');
      assert.equal(s.targetCount, 2);
      assert.equal(s.dealCount, 3);
      assert.equal(s.activeDealCount, 1);
      assert.equal(s.completedDealCount, 1);
      assert.equal(s.terminatedDealCount, 1);
      assert.equal(s.dueDiligenceCount, 1);
      assert.equal(s.integrationCount, 1);
      assert.equal(s.valuationCount, 1);
      assert.equal(s.totalPipelineValue, 9000000);
      assert.equal(s.byDealStatus['negotiation'], 1);
      assert.equal(s.byDealType['acquisition'], 2);
      assert.equal(s.byTargetStatus['identified'], 1);
    });

    it('returns zero stats when no data', async () => {
      memFindManyImpl = async () => [];
      const s = await MAService.getStats('org-1');
      assert.equal(s.targetCount, 0);
      assert.equal(s.dealCount, 0);
      assert.equal(s.totalPipelineValue, 0);
    });
  });
});
