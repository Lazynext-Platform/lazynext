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
    type: 'continuity_plan',
    content: JSON.stringify({ name: 'Test Plan', type: 'business_continuity', description: '', status: 'draft', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['continuity_plan', 'business_continuity', 'draft']),
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

// Applies the service's `where.AND` content-contains filters client-side so list
// tests can verify the service builds the correct DB-side filter conditions.
function filterByWhere(rows: Record<string, unknown>[], where: Record<string, unknown>): Record<string, unknown>[] {
  const conditions = (where.AND as Array<{ content?: { contains?: string } }>) ?? [];
  return rows.filter((row) => {
    const content = String(row.content ?? '');
    return conditions.every((cond) => cond.content?.contains ? content.includes(cond.content.contains) : true);
  });
}

const { BusinessContinuityService } = await import('@/lib/services/business-continuity-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BusinessContinuityService', () => {
  beforeEach(() => { resetMock(); });

  // ── Continuity Plans ──

  describe('createContinuityPlan', () => {
    it('creates a plan with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.createContinuityPlan('org-1', 'ws-1', { name: 'BCP 2024', type: 'business_continuity' }, 'user-1');
      assert.equal(plan.name, 'BCP 2024');
      assert.equal(plan.status, 'draft');
      assert.equal(plan.type, 'business_continuity');
      assert.equal(plan.owner, '');
      assert.equal(plan.scope, '');
      assert.equal(plan.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.createContinuityPlan('org-1', 'ws-1', {
        name: 'DR Plan', type: 'disaster_recovery', description: 'desc', scope: 'datacenter', owner: 'alice', priority: 'high', recoveryTime: '4h', status: 'active', notes: 'n',
      }, 'user-1');
      assert.equal(plan.type, 'disaster_recovery');
      assert.equal(plan.owner, 'alice');
      assert.equal(plan.status, 'active');
      assert.equal(plan.priority, 'high');
      assert.equal(plan.recoveryTime, '4h');
    });
  });

  describe('getContinuityPlan', () => {
    it('returns a plan when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      const plan = await BusinessContinuityService.getContinuityPlan('mem-1');
      assert.ok(plan);
      assert.equal(plan!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const plan = await BusinessContinuityService.getContinuityPlan('nope');
      assert.equal(plan, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy' });
      const plan = await BusinessContinuityService.getContinuityPlan('mem-1');
      assert.equal(plan, null);
    });
  });

  describe('listContinuityPlans', () => {
    it('lists plans and filters by type and status', async () => {
      const rows = [
        makeRow({ id: 'p1', content: JSON.stringify({ name: 'A', type: 'business_continuity', description: '', status: 'draft', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'B', type: 'disaster_recovery', description: '', status: 'active', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }) }),
      ];
      memFindManyImpl = async (args) => filterByWhere(rows, args.where as Record<string, unknown>);
      const list = await BusinessContinuityService.listContinuityPlans('org-1', { type: 'disaster_recovery', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'disaster_recovery');
    });
  });

  describe('updateContinuityPlan', () => {
    it('updates plan fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.updateContinuityPlan('mem-1', { name: 'Updated', status: 'archived' });
      assert.ok(plan);
      assert.equal(plan!.name, 'Updated');
      assert.equal(plan!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const plan = await BusinessContinuityService.updateContinuityPlan('nope', { name: 'X' });
      assert.equal(plan, null);
    });
  });

  describe('deleteContinuityPlan', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await BusinessContinuityService.deleteContinuityPlan('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await BusinessContinuityService.deleteContinuityPlan('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('approveContinuityPlan', () => {
    it('approves a plan', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.approveContinuityPlan('mem-1', 'alice');
      assert.ok(plan);
      assert.equal(plan!.status, 'approved');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const plan = await BusinessContinuityService.approveContinuityPlan('nope', 'u');
      assert.equal(plan, null);
    });
  });

  describe('activateContinuityPlan', () => {
    it('activates a plan', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.activateContinuityPlan('mem-1', 'alice');
      assert.ok(plan);
      assert.equal(plan!.status, 'active');
    });
  });

  describe('testContinuityPlan', () => {
    it('marks a plan as tested with lastTested timestamp', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.testContinuityPlan('mem-1', 'alice');
      assert.ok(plan);
      assert.equal(plan!.status, 'tested');
      assert.ok(plan!.lastTested);
    });
  });

  describe('deprecateContinuityPlan', () => {
    it('deprecates a plan', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.deprecateContinuityPlan('mem-1', 'alice');
      assert.ok(plan);
      assert.equal(plan!.status, 'deprecated');
    });
  });

  describe('archiveContinuityPlan', () => {
    it('archives a plan', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_plan', content: args.data.content as string });
      const plan = await BusinessContinuityService.archiveContinuityPlan('mem-1', 'alice');
      assert.ok(plan);
      assert.equal(plan!.status, 'archived');
    });
  });

  // ── Recovery Strategies ──

  describe('createRecoveryStrategy', () => {
    it('creates a strategy with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.createRecoveryStrategy('org-1', 'ws-1', { name: 'Failover', type: 'active_passive' }, 'user-1');
      assert.equal(s.name, 'Failover');
      assert.equal(s.type, 'active_passive');
      assert.equal(s.status, 'draft');
      assert.equal(s.strategy, '');
      assert.equal(s.planId, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.createRecoveryStrategy('org-1', 'ws-1', {
        name: 'Hot Site', type: 'hot_site', description: 'd', planId: 'p1', strategy: 'auto-failover', cost: 'high', complexity: 'complex', recoveryTime: '1h', recoveryPoint: '15m', notes: 'n',
      }, 'user-1');
      assert.equal(s.planId, 'p1');
      assert.equal(s.strategy, 'auto-failover');
      assert.equal(s.cost, 'high');
      assert.equal(s.complexity, 'complex');
      assert.equal(s.recoveryTime, '1h');
      assert.equal(s.recoveryPoint, '15m');
    });
  });

  describe('getRecoveryStrategy', () => {
    it('returns a strategy when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy', content: JSON.stringify({ name: 'S', type: 'active_passive', description: '', status: 'draft', planId: null, strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) });
      const s = await BusinessContinuityService.getRecoveryStrategy('mem-1');
      assert.ok(s);
      assert.equal(s!.name, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      const s = await BusinessContinuityService.getRecoveryStrategy('mem-1');
      assert.equal(s, null);
    });
  });

  describe('listRecoveryStrategies', () => {
    it('lists strategies and filters by planId and status', async () => {
      const rows = [
        makeRow({ id: 's1', type: 'recovery_strategy', content: JSON.stringify({ name: 'A', type: 'active_passive', description: '', status: 'draft', planId: 'p1', strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) }),
        makeRow({ id: 's2', type: 'recovery_strategy', content: JSON.stringify({ name: 'B', type: 'hot_site', description: '', status: 'implemented', planId: 'p2', strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) }),
      ];
      memFindManyImpl = async (args) => filterByWhere(rows, args.where as Record<string, unknown>);
      const list = await BusinessContinuityService.listRecoveryStrategies('org-1', { planId: 'p2', status: 'implemented' });
      assert.equal(list.length, 1);
      assert.equal(list[0].planId, 'p2');
    });
  });

  describe('updateRecoveryStrategy', () => {
    it('updates strategy fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy', content: JSON.stringify({ name: 'Old', type: 'active_passive', description: '', status: 'draft', planId: null, strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.updateRecoveryStrategy('mem-1', { name: 'New', status: 'implemented' });
      assert.ok(s);
      assert.equal(s!.name, 'New');
      assert.equal(s!.status, 'implemented');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const s = await BusinessContinuityService.updateRecoveryStrategy('nope', { name: 'X' });
      assert.equal(s, null);
    });
  });

  describe('approveRecoveryStrategy', () => {
    it('approves a strategy', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy' });
      memUpdateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.approveRecoveryStrategy('mem-1', 'alice');
      assert.ok(s);
      assert.equal(s!.status, 'approved');
    });
  });

  describe('implementRecoveryStrategy', () => {
    it('implements a strategy', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy' });
      memUpdateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.implementRecoveryStrategy('mem-1', 'alice');
      assert.ok(s);
      assert.equal(s!.status, 'implemented');
    });
  });

  describe('testRecoveryStrategy', () => {
    it('tests a strategy', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy' });
      memUpdateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.testRecoveryStrategy('mem-1', 'alice');
      assert.ok(s);
      assert.equal(s!.status, 'tested');
    });
  });

  describe('deprecateRecoveryStrategy', () => {
    it('deprecates a strategy', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'recovery_strategy' });
      memUpdateImpl = async (args) => makeRow({ type: 'recovery_strategy', content: args.data.content as string });
      const s = await BusinessContinuityService.deprecateRecoveryStrategy('mem-1', 'alice');
      assert.ok(s);
      assert.equal(s!.status, 'deprecated');
    });
  });

  // ── Business Impact Analyses ──

  describe('createBusinessImpactAnalysis', () => {
    it('creates a BIA with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.createBusinessImpactAnalysis('org-1', 'ws-1', { name: 'Checkout BIA', type: 'process' }, 'user-1');
      assert.equal(b.name, 'Checkout BIA');
      assert.equal(b.type, 'process');
      assert.equal(b.status, 'draft');
      assert.equal(b.processName, '');
      assert.equal(b.criticality, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.createBusinessImpactAnalysis('org-1', 'ws-1', {
        name: 'DB BIA', type: 'system', description: 'd', processName: 'Checkout', criticality: 'critical', maxDowntime: '4h', recoveryTime: '1h', recoveryPoint: '15m', dependencies: 'db, cache', impact: 'revenue loss', notes: 'n',
      }, 'user-1');
      assert.equal(b.processName, 'Checkout');
      assert.equal(b.criticality, 'critical');
      assert.equal(b.maxDowntime, '4h');
      assert.equal(b.dependencies, 'db, cache');
    });
  });

  describe('getBusinessImpactAnalysis', () => {
    it('returns a BIA when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis', content: JSON.stringify({ name: 'B', type: 'process', description: '', status: 'draft', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) });
      const b = await BusinessContinuityService.getBusinessImpactAnalysis('mem-1');
      assert.ok(b);
      assert.equal(b!.name, 'B');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      const b = await BusinessContinuityService.getBusinessImpactAnalysis('mem-1');
      assert.equal(b, null);
    });
  });

  describe('listBusinessImpactAnalyses', () => {
    it('lists BIAs and filters by type and status', async () => {
      const rows = [
        makeRow({ id: 'b1', type: 'business_impact_analysis', content: JSON.stringify({ name: 'A', type: 'process', description: '', status: 'draft', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) }),
        makeRow({ id: 'b2', type: 'business_impact_analysis', content: JSON.stringify({ name: 'B', type: 'system', description: '', status: 'completed', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) }),
      ];
      memFindManyImpl = async (args) => filterByWhere(rows, args.where as Record<string, unknown>);
      const list = await BusinessContinuityService.listBusinessImpactAnalyses('org-1', { type: 'system', status: 'completed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'system');
    });
  });

  describe('updateBusinessImpactAnalysis', () => {
    it('updates BIA fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis', content: JSON.stringify({ name: 'Old', type: 'process', description: '', status: 'draft', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.updateBusinessImpactAnalysis('mem-1', { name: 'New', status: 'completed' });
      assert.ok(b);
      assert.equal(b!.name, 'New');
      assert.equal(b!.status, 'completed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const b = await BusinessContinuityService.updateBusinessImpactAnalysis('nope', { name: 'X' });
      assert.equal(b, null);
    });
  });

  describe('startBIA', () => {
    it('starts a BIA', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis' });
      memUpdateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.startBIA('mem-1', 'alice');
      assert.ok(b);
      assert.equal(b!.status, 'in_progress');
    });
  });

  describe('completeBIA', () => {
    it('completes a BIA', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis' });
      memUpdateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.completeBIA('mem-1', 'alice');
      assert.ok(b);
      assert.equal(b!.status, 'completed');
    });
  });

  describe('reviewBIA', () => {
    it('reviews a BIA', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis' });
      memUpdateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.reviewBIA('mem-1', 'alice');
      assert.ok(b);
      assert.equal(b!.status, 'reviewed');
    });
  });

  describe('archiveBIA', () => {
    it('archives a BIA', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'business_impact_analysis' });
      memUpdateImpl = async (args) => makeRow({ type: 'business_impact_analysis', content: args.data.content as string });
      const b = await BusinessContinuityService.archiveBIA('mem-1', 'alice');
      assert.ok(b);
      assert.equal(b!.status, 'archived');
    });
  });

  // ── Continuity Tests ──

  describe('createContinuityTest', () => {
    it('creates a test with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.createContinuityTest('org-1', 'ws-1', { name: 'Quarterly DR', type: 'tabletop' }, 'user-1');
      assert.equal(t.name, 'Quarterly DR');
      assert.equal(t.type, 'tabletop');
      assert.equal(t.status, 'scheduled');
      assert.equal(t.duration, 0);
      assert.equal(t.participants, 0);
      assert.equal(t.planId, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.createContinuityTest('org-1', 'ws-1', {
        name: 'Full DR', type: 'full_scale', description: 'd', planId: 'p1', testDate: '2024-06-01', duration: 120, participants: 10, results: 'pass', gaps: 'none', recommendations: 'repeat', notes: 'n',
      }, 'user-1');
      assert.equal(t.planId, 'p1');
      assert.equal(t.duration, 120);
      assert.equal(t.participants, 10);
      assert.equal(t.results, 'pass');
      assert.equal(t.gaps, 'none');
    });
  });

  describe('getContinuityTest', () => {
    it('returns a test when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test', content: JSON.stringify({ name: 'T', type: 'tabletop', description: '', status: 'scheduled', planId: null, testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) });
      const t = await BusinessContinuityService.getContinuityTest('mem-1');
      assert.ok(t);
      assert.equal(t!.name, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_plan' });
      const t = await BusinessContinuityService.getContinuityTest('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listContinuityTests', () => {
    it('lists tests and filters by planId and status', async () => {
      const rows = [
        makeRow({ id: 't1', type: 'continuity_test', content: JSON.stringify({ name: 'A', type: 'tabletop', description: '', status: 'scheduled', planId: 'p1', testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) }),
        makeRow({ id: 't2', type: 'continuity_test', content: JSON.stringify({ name: 'B', type: 'full_scale', description: '', status: 'completed', planId: 'p2', testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) }),
      ];
      memFindManyImpl = async (args) => filterByWhere(rows, args.where as Record<string, unknown>);
      const list = await BusinessContinuityService.listContinuityTests('org-1', { planId: 'p2', status: 'completed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].planId, 'p2');
    });
  });

  describe('updateContinuityTest', () => {
    it('updates test fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test', content: JSON.stringify({ name: 'Old', type: 'tabletop', description: '', status: 'scheduled', planId: null, testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.updateContinuityTest('mem-1', { name: 'New', status: 'failed', results: 'system did not recover' });
      assert.ok(t);
      assert.equal(t!.name, 'New');
      assert.equal(t!.status, 'failed');
      assert.equal(t!.results, 'system did not recover');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await BusinessContinuityService.updateContinuityTest('nope', { name: 'X' });
      assert.equal(t, null);
    });
  });

  describe('scheduleContinuityTest', () => {
    it('schedules a test', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.scheduleContinuityTest('mem-1', 'alice');
      assert.ok(t);
      assert.equal(t!.status, 'scheduled');
    });
  });

  describe('startContinuityTest', () => {
    it('starts a test', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.startContinuityTest('mem-1', 'alice');
      assert.ok(t);
      assert.equal(t!.status, 'in_progress');
    });
  });

  describe('completeContinuityTest', () => {
    it('completes a test with testDate timestamp', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.completeContinuityTest('mem-1', 'alice');
      assert.ok(t);
      assert.equal(t!.status, 'completed');
      assert.ok(t!.testDate);
    });
  });

  describe('failContinuityTest', () => {
    it('fails a test', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.failContinuityTest('mem-1', 'alice');
      assert.ok(t);
      assert.equal(t!.status, 'failed');
    });
  });

  describe('cancelContinuityTest', () => {
    it('cancels a test', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'continuity_test' });
      memUpdateImpl = async (args) => makeRow({ type: 'continuity_test', content: args.data.content as string });
      const t = await BusinessContinuityService.cancelContinuityTest('mem-1', 'alice');
      assert.ok(t);
      assert.equal(t!.status, 'cancelled');
    });
  });

  // ── Metrics ──

  describe('getBusinessContinuityMetrics', () => {
    it('computes metrics across plans, strategies, bias, and tests', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'continuity_plan') return [
          makeRow({ id: 'p1', type: 'continuity_plan', content: JSON.stringify({ name: 'A', type: 'business_continuity', description: '', status: 'active', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }) }),
          makeRow({ id: 'p2', type: 'continuity_plan', content: JSON.stringify({ name: 'B', type: 'disaster_recovery', description: '', status: 'draft', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }) }),
        ];
        if (where.type === 'recovery_strategy') return [
          makeRow({ id: 's1', type: 'recovery_strategy', content: JSON.stringify({ name: 'S', type: 'active_passive', description: '', status: 'implemented', planId: null, strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) }),
        ];
        if (where.type === 'business_impact_analysis') return [
          makeRow({ id: 'b1', type: 'business_impact_analysis', content: JSON.stringify({ name: 'B', type: 'process', description: '', status: 'completed', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) }),
        ];
        if (where.type === 'continuity_test') return [
          makeRow({ id: 't1', type: 'continuity_test', content: JSON.stringify({ name: 'T1', type: 'tabletop', description: '', status: 'scheduled', planId: null, testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) }),
          makeRow({ id: 't2', type: 'continuity_test', content: JSON.stringify({ name: 'T2', type: 'full_scale', description: '', status: 'completed', planId: null, testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) }),
        ];
        return [];
      };
      const metrics = await BusinessContinuityService.getBusinessContinuityMetrics('org-1');
      assert.equal(metrics.activePlans, 1);
      assert.equal(metrics.implementedStrategies, 1);
      assert.equal(metrics.completedBIAs, 1);
      assert.equal(metrics.scheduledTests, 1);
      assert.equal(metrics.completedTests, 1);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const metrics = await BusinessContinuityService.getBusinessContinuityMetrics('org-1');
      assert.equal(metrics.activePlans, 0);
      assert.equal(metrics.completedTests, 0);
    });
  });

  // ── Stats ──

  describe('getBusinessContinuityStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'continuity_plan') return [makeRow({ type: 'continuity_plan', content: JSON.stringify({ name: 'A', type: 'business_continuity', description: '', status: 'active', scope: '', owner: '', priority: '', recoveryTime: '', lastTested: null, nextTest: null, notes: '' }) })];
        if (where.type === 'recovery_strategy') return [makeRow({ type: 'recovery_strategy', content: JSON.stringify({ name: 'S', type: 'hot_site', description: '', status: 'implemented', planId: null, strategy: '', cost: '', complexity: '', recoveryTime: '', recoveryPoint: '', notes: '' }) })];
        if (where.type === 'business_impact_analysis') return [makeRow({ type: 'business_impact_analysis', content: JSON.stringify({ name: 'B', type: 'process', description: '', status: 'completed', processName: '', criticality: '', maxDowntime: '', recoveryTime: '', recoveryPoint: '', dependencies: '', impact: '', notes: '' }) })];
        if (where.type === 'continuity_test') return [makeRow({ type: 'continuity_test', content: JSON.stringify({ name: 'T', type: 'tabletop', description: '', status: 'scheduled', planId: null, testDate: null, duration: 0, participants: 0, results: '', gaps: '', recommendations: '', notes: '' }) })];
        return [];
      };
      const stats = await BusinessContinuityService.getBusinessContinuityStats('org-1');
      assert.equal(stats.planCount, 1);
      assert.equal(stats.strategyCount, 1);
      assert.equal(stats.biaCount, 1);
      assert.equal(stats.testCount, 1);
      assert.equal(stats.byPlanStatus['active'], 1);
      assert.equal(stats.byPlanType['business_continuity'], 1);
      assert.equal(stats.byStrategyStatus['implemented'], 1);
      assert.equal(stats.byStrategyType['hot_site'], 1);
      assert.equal(stats.byBIAStatus['completed'], 1);
      assert.equal(stats.byTestStatus['scheduled'], 1);
    });

    it('returns zero stats when no data', async () => {
      memFindManyImpl = async () => [];
      const stats = await BusinessContinuityService.getBusinessContinuityStats('org-1');
      assert.equal(stats.planCount, 0);
      assert.equal(stats.strategyCount, 0);
    });
  });
});
