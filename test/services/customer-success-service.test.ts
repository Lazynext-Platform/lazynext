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
    type: 'cs_health_score',
    content: JSON.stringify({ customerId: 'cust-1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-01-01', notes: '' }),
    source: 'user',
    sourceId: 'cust-1',
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['cs_health_score', 'product_usage', 'stable']),
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

const { CustomerSuccessService } = await import('@/lib/services/customer-success-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerSuccessService', () => {
  beforeEach(() => { resetMock(); });

  // ── Health Scores ──

  describe('createHealthScore', () => {
    it('creates a health score with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_health_score', content: args.data.content as string });
      const h = await CustomerSuccessService.createHealthScore('org-1', 'ws-1', { customerId: 'cust-1', score: 80, category: 'product_usage' }, 'user-1');
      assert.equal(h.customerId, 'cust-1');
      assert.equal(h.score, 80);
      assert.equal(h.category, 'product_usage');
      assert.equal(h.trend, 'stable');
      assert.equal(h.notes, '');
      assert.equal(h.organizationId, 'org-1');
    });

    it('calculates score from components when provided', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_health_score', content: args.data.content as string });
      const h = await CustomerSuccessService.createHealthScore('org-1', 'ws-1', {
        customerId: 'cust-1', score: 50, category: 'product_usage',
        components: [
          { name: 'usage', weight: 50, value: 80, max: 100 },
          { name: 'support', weight: 50, value: 60, max: 100 },
        ],
      }, 'user-1');
      assert.equal(h.score, 70);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_health_score', content: args.data.content as string });
      const h = await CustomerSuccessService.createHealthScore('org-1', 'ws-1', {
        customerId: 'cust-1', score: 90, category: 'sentiment', trend: 'improving',
        calculatedAt: '2024-05-01', notes: 'Great progress',
      }, 'user-1');
      assert.equal(h.category, 'sentiment');
      assert.equal(h.trend, 'improving');
      assert.equal(h.notes, 'Great progress');
    });
  });

  describe('getHealthScore', () => {
    it('returns a health score when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const h = await CustomerSuccessService.getHealthScore('mem-1');
      assert.ok(h);
      assert.equal(h!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const h = await CustomerSuccessService.getHealthScore('nope');
      assert.equal(h, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_success_plan' });
      const h = await CustomerSuccessService.getHealthScore('mem-1');
      assert.equal(h, null);
    });
  });

  describe('listHealthScores', () => {
    it('lists health scores and filters by customerId, category', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'h1', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-01-01', notes: '' }) }),
        makeRow({ id: 'h2', content: JSON.stringify({ customerId: 'c2', score: 60, category: 'sentiment', components: [], trend: 'stable', calculatedAt: '2024-01-01', notes: '' }) }),
      ];
      const list = await CustomerSuccessService.listHealthScores('org-1', { customerId: 'c1', category: 'product_usage' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerId, 'c1');
    });
  });

  describe('updateHealthScore', () => {
    it('updates health score fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-01-01', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_health_score', content: args.data.content as string });
      const h = await CustomerSuccessService.updateHealthScore('mem-1', { score: 90, trend: 'improving' });
      assert.ok(h);
      assert.equal(h!.score, 90);
      assert.equal(h!.trend, 'improving');
    });

    it('recalculates score when components are updated', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-01-01', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_health_score', content: args.data.content as string });
      const h = await CustomerSuccessService.updateHealthScore('mem-1', {
        components: [{ name: 'usage', weight: 100, value: 50, max: 100 }],
      });
      assert.ok(h);
      assert.equal(h!.score, 50);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const h = await CustomerSuccessService.updateHealthScore('nope', { score: 90 });
      assert.equal(h, null);
    });
  });

  describe('deleteHealthScore', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await CustomerSuccessService.deleteHealthScore('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await CustomerSuccessService.deleteHealthScore('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('getCustomerHealth', () => {
    it('returns customer health with overall score', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'h1', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-05-01', notes: '' }) }),
        makeRow({ id: 'h2', content: JSON.stringify({ customerId: 'c1', score: 60, category: 'sentiment', components: [], trend: 'stable', calculatedAt: '2024-05-02', notes: '' }) }),
      ];
      const health = await CustomerSuccessService.getCustomerHealth('org-1', 'c1');
      assert.equal(health.customerId, 'c1');
      assert.equal(health.scores.length, 2);
      assert.equal(health.overallScore, 70);
      assert.equal(health.atRisk, false);
    });
  });

  // ── Success Plans ──

  describe('createSuccessPlan', () => {
    it('creates a success plan with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_success_plan', content: args.data.content as string });
      const p = await CustomerSuccessService.createSuccessPlan('org-1', 'ws-1', { customerId: 'c1', name: 'Plan 1', goals: [{ name: 'Goal 1' }] }, 'user-1');
      assert.equal(p.customerId, 'c1');
      assert.equal(p.name, 'Plan 1');
      assert.equal(p.status, 'active');
      assert.equal(p.goals.length, 1);
      assert.equal(p.goals[0].status, 'pending');
      assert.equal(p.milestones.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_success_plan', content: args.data.content as string });
      const p = await CustomerSuccessService.createSuccessPlan('org-1', 'ws-1', {
        customerId: 'c1', name: 'Plan', description: 'Desc',
        goals: [{ name: 'G1', targetDate: '2024-12-01', status: 'in_progress', owner: 'alice' }],
        milestones: [{ name: 'M1', dueDate: '2024-06-01', status: 'pending' }],
        status: 'on_hold', owner: 'bob', startDate: '2024-01-01', endDate: '2024-12-31',
      }, 'user-1');
      assert.equal(p.description, 'Desc');
      assert.equal(p.goals[0].owner, 'alice');
      assert.equal(p.goals[0].status, 'in_progress');
      assert.equal(p.milestones.length, 1);
      assert.equal(p.status, 'on_hold');
      assert.equal(p.owner, 'bob');
    });
  });

  describe('getSuccessPlan', () => {
    it('returns a success plan when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_success_plan', content: JSON.stringify({ customerId: 'c1', name: 'T', description: '', goals: [], milestones: [], status: 'active', owner: '', startDate: '2024-01-01', endDate: null }) });
      const p = await CustomerSuccessService.getSuccessPlan('mem-1');
      assert.ok(p);
      assert.equal(p!.name, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const p = await CustomerSuccessService.getSuccessPlan('mem-1');
      assert.equal(p, null);
    });
  });

  describe('listSuccessPlans', () => {
    it('lists success plans and filters by customerId, status, owner', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'cs_success_plan', content: JSON.stringify({ customerId: 'c1', name: 'A', description: '', goals: [], milestones: [], status: 'active', owner: 'alice', startDate: '2024-01-01', endDate: null }) }),
        makeRow({ id: 'p2', type: 'cs_success_plan', content: JSON.stringify({ customerId: 'c2', name: 'B', description: '', goals: [], milestones: [], status: 'completed', owner: 'bob', startDate: '2024-01-01', endDate: null }) }),
      ];
      const list = await CustomerSuccessService.listSuccessPlans('org-1', { customerId: 'c1', status: 'active', owner: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateSuccessPlan', () => {
    it('updates success plan fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_success_plan', content: JSON.stringify({ customerId: 'c1', name: 'Old', description: '', goals: [], milestones: [], status: 'active', owner: '', startDate: '2024-01-01', endDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_success_plan', content: args.data.content as string });
      const p = await CustomerSuccessService.updateSuccessPlan('mem-1', { name: 'New', status: 'completed' });
      assert.ok(p);
      assert.equal(p!.name, 'New');
      assert.equal(p!.status, 'completed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await CustomerSuccessService.updateSuccessPlan('nope', { name: 'X' });
      assert.equal(p, null);
    });
  });

  describe('deleteSuccessPlan', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await CustomerSuccessService.deleteSuccessPlan('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Churn Risks ──

  describe('createChurnRisk', () => {
    it('creates a churn risk with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_churn_risk', content: args.data.content as string });
      const c = await CustomerSuccessService.createChurnRisk('org-1', 'ws-1', { customerId: 'c1', riskLevel: 'high', reasons: ['Low usage'] }, 'user-1');
      assert.equal(c.customerId, 'c1');
      assert.equal(c.riskLevel, 'high');
      assert.equal(c.reasons.length, 1);
      assert.equal(c.status, 'open');
      assert.equal(c.signals.length, 0);
      assert.equal(c.mitigationPlan, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_churn_risk', content: args.data.content as string });
      const c = await CustomerSuccessService.createChurnRisk('org-1', 'ws-1', {
        customerId: 'c1', riskLevel: 'critical', reasons: ['Low usage', 'Support issues'],
        signals: ['Login decline'], mitigationPlan: 'Increase engagement',
        assignedTo: 'alice', status: 'mitigating', identifiedDate: '2024-05-01',
      }, 'user-1');
      assert.equal(c.riskLevel, 'critical');
      assert.equal(c.reasons.length, 2);
      assert.equal(c.signals.length, 1);
      assert.equal(c.mitigationPlan, 'Increase engagement');
      assert.equal(c.assignedTo, 'alice');
      assert.equal(c.status, 'mitigating');
    });
  });

  describe('getChurnRisk', () => {
    it('returns a churn risk when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) });
      const c = await CustomerSuccessService.getChurnRisk('mem-1');
      assert.ok(c);
      assert.equal(c!.riskLevel, 'high');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const c = await CustomerSuccessService.getChurnRisk('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listChurnRisks', () => {
    it('lists churn risks and filters by customerId, riskLevel, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'cust1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) }),
        makeRow({ id: 'c2', type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'cust2', riskLevel: 'low', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'resolved', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) }),
      ];
      const list = await CustomerSuccessService.listChurnRisks('org-1', { customerId: 'cust1', riskLevel: 'high', status: 'open' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerId, 'cust1');
    });
  });

  describe('updateChurnRisk', () => {
    it('updates churn risk fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'low', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_churn_risk', content: args.data.content as string });
      const c = await CustomerSuccessService.updateChurnRisk('mem-1', { riskLevel: 'critical', status: 'accepted' });
      assert.ok(c);
      assert.equal(c!.riskLevel, 'critical');
      assert.equal(c!.status, 'accepted');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await CustomerSuccessService.updateChurnRisk('nope', { riskLevel: 'high' });
      assert.equal(c, null);
    });
  });

  describe('mitigateChurnRisk', () => {
    it('mitigates a churn risk', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_churn_risk', content: args.data.content as string });
      const c = await CustomerSuccessService.mitigateChurnRisk('mem-1', 'New plan', 'alice');
      assert.ok(c);
      assert.equal(c!.status, 'mitigating');
      assert.equal(c!.mitigationPlan, 'New plan');
      assert.equal(c!.mitigatedBy, 'alice');
      assert.ok(c!.mitigatedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await CustomerSuccessService.mitigateChurnRisk('nope', 'p', 'u');
      assert.equal(c, null);
    });
  });

  describe('resolveChurnRisk', () => {
    it('resolves a churn risk', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'mitigating', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_churn_risk', content: args.data.content as string });
      const c = await CustomerSuccessService.resolveChurnRisk('mem-1', 'Customer retained', 'bob');
      assert.ok(c);
      assert.equal(c!.status, 'resolved');
      assert.equal(c!.resolution, 'Customer retained');
      assert.equal(c!.resolvedBy, 'bob');
      assert.ok(c!.resolvedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await CustomerSuccessService.resolveChurnRisk('nope', 'r', 'u');
      assert.equal(c, null);
    });
  });

  // ── Expansions ──

  describe('createExpansion', () => {
    it('creates an expansion with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_expansion', content: args.data.content as string });
      const e = await CustomerSuccessService.createExpansion('org-1', 'ws-1', { customerId: 'c1', type: 'upsell', opportunity: 'Add seats', estimatedValue: 50000 }, 'user-1');
      assert.equal(e.customerId, 'c1');
      assert.equal(e.type, 'upsell');
      assert.equal(e.opportunity, 'Add seats');
      assert.equal(e.estimatedValue, 50000);
      assert.equal(e.probability, 0);
      assert.equal(e.status, 'identified');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_expansion', content: args.data.content as string });
      const e = await CustomerSuccessService.createExpansion('org-1', 'ws-1', {
        customerId: 'c1', type: 'cross_sell', opportunity: 'New module', estimatedValue: 100000,
        probability: 60, expectedCloseDate: '2024-12-01', status: 'negotiating', notes: 'Hot lead',
      }, 'user-1');
      assert.equal(e.type, 'cross_sell');
      assert.equal(e.probability, 60);
      assert.equal(e.status, 'negotiating');
      assert.equal(e.notes, 'Hot lead');
    });
  });

  describe('getExpansion', () => {
    it('returns an expansion when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'O', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'identified', notes: '', closedBy: '', closedAt: null }) });
      const e = await CustomerSuccessService.getExpansion('mem-1');
      assert.ok(e);
      assert.equal(e!.opportunity, 'O');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const e = await CustomerSuccessService.getExpansion('mem-1');
      assert.equal(e, null);
    });
  });

  describe('listExpansions', () => {
    it('lists expansions and filters by customerId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'A', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'identified', notes: '', closedBy: '', closedAt: null }) }),
        makeRow({ id: 'e2', type: 'cs_expansion', content: JSON.stringify({ customerId: 'c2', type: 'cross_sell', opportunity: 'B', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'won', notes: '', closedBy: '', closedAt: null }) }),
      ];
      const list = await CustomerSuccessService.listExpansions('org-1', { customerId: 'c1', type: 'upsell', status: 'identified' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerId, 'c1');
    });
  });

  describe('updateExpansion', () => {
    it('updates expansion fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'Old', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'identified', notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_expansion', content: args.data.content as string });
      const e = await CustomerSuccessService.updateExpansion('mem-1', { opportunity: 'New', status: 'qualified', probability: 50 });
      assert.ok(e);
      assert.equal(e!.opportunity, 'New');
      assert.equal(e!.status, 'qualified');
      assert.equal(e!.probability, 50);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await CustomerSuccessService.updateExpansion('nope', { opportunity: 'X' });
      assert.equal(e, null);
    });
  });

  describe('closeExpansion', () => {
    it('closes an expansion as won', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'O', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'negotiating', notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_expansion', content: args.data.content as string });
      const e = await CustomerSuccessService.closeExpansion('mem-1', 'won', 'alice', 'Deal closed');
      assert.ok(e);
      assert.equal(e!.status, 'won');
      assert.equal(e!.closedBy, 'alice');
      assert.equal(e!.notes, 'Deal closed');
      assert.ok(e!.closedAt);
    });

    it('closes an expansion as lost', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'O', estimatedValue: 0, probability: 0, expectedCloseDate: null, status: 'negotiating', notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_expansion', content: args.data.content as string });
      const e = await CustomerSuccessService.closeExpansion('mem-1', 'lost', 'bob');
      assert.ok(e);
      assert.equal(e!.status, 'lost');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await CustomerSuccessService.closeExpansion('nope', 'won', 'u');
      assert.equal(e, null);
    });
  });

  // ── Renewals ──

  describe('createRenewal', () => {
    it('creates a renewal with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_renewal', content: args.data.content as string });
      const r = await CustomerSuccessService.createRenewal('org-1', 'ws-1', { customerId: 'c1', renewalDate: '2024-12-01' }, 'user-1');
      assert.equal(r.customerId, 'c1');
      assert.equal(r.status, 'pending');
      assert.equal(r.probability, 0);
      assert.equal(r.contractId, null);
      assert.equal(r.currentMrr, null);
      assert.equal(r.renewalValue, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_renewal', content: args.data.content as string });
      const r = await CustomerSuccessService.createRenewal('org-1', 'ws-1', {
        customerId: 'c1', contractId: 'con-1', currentMrr: 5000, renewalDate: '2024-12-01',
        renewalValue: 60000, termMonths: 12, status: 'in_review', probability: 80, notes: 'Likely',
      }, 'user-1');
      assert.equal(r.contractId, 'con-1');
      assert.equal(r.currentMrr, 5000);
      assert.equal(r.renewalValue, 60000);
      assert.equal(r.termMonths, 12);
      assert.equal(r.status, 'in_review');
      assert.equal(r.probability, 80);
    });
  });

  describe('getRenewal', () => {
    it('returns a renewal when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) });
      const r = await CustomerSuccessService.getRenewal('mem-1');
      assert.ok(r);
      assert.equal(r!.customerId, 'c1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const r = await CustomerSuccessService.getRenewal('mem-1');
      assert.equal(r, null);
    });
  });

  describe('listRenewals', () => {
    it('lists renewals and filters by customerId, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) }),
        makeRow({ id: 'r2', type: 'cs_renewal', content: JSON.stringify({ customerId: 'c2', contractId: null, currentMrr: null, renewalDate: '2024-12-02', renewalValue: null, termMonths: null, status: 'renewed', probability: 0, notes: '', closedBy: '', closedAt: null }) }),
      ];
      const list = await CustomerSuccessService.listRenewals('org-1', { customerId: 'c1', status: 'pending' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerId, 'c1');
    });
  });

  describe('updateRenewal', () => {
    it('updates renewal fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_renewal', content: args.data.content as string });
      const r = await CustomerSuccessService.updateRenewal('mem-1', { status: 'in_review', probability: 90 });
      assert.ok(r);
      assert.equal(r!.status, 'in_review');
      assert.equal(r!.probability, 90);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await CustomerSuccessService.updateRenewal('nope', { status: 'renewed' });
      assert.equal(r, null);
    });
  });

  describe('closeRenewal', () => {
    it('closes a renewal as renewed', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_renewal', content: args.data.content as string });
      const r = await CustomerSuccessService.closeRenewal('mem-1', 'renewed', 'alice', 'Renewed for 12 months');
      assert.ok(r);
      assert.equal(r!.status, 'renewed');
      assert.equal(r!.closedBy, 'alice');
      assert.equal(r!.notes, 'Renewed for 12 months');
      assert.ok(r!.closedAt);
    });

    it('closes a renewal as churned', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_renewal', content: args.data.content as string });
      const r = await CustomerSuccessService.closeRenewal('mem-1', 'churned', 'bob');
      assert.ok(r);
      assert.equal(r!.status, 'churned');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await CustomerSuccessService.closeRenewal('nope', 'renewed', 'u');
      assert.equal(r, null);
    });
  });

  // ── Touchpoints ──

  describe('createTouchpoint', () => {
    it('creates a touchpoint with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_touchpoint', content: args.data.content as string });
      const t = await CustomerSuccessService.createTouchpoint('org-1', 'ws-1', { customerId: 'c1', type: 'call', date: '2024-05-01', participant: 'Alice' }, 'user-1');
      assert.equal(t.customerId, 'c1');
      assert.equal(t.type, 'call');
      assert.equal(t.participant, 'Alice');
      assert.equal(t.summary, '');
      assert.equal(t.outcome, '');
      assert.equal(t.sentiment, 'neutral');
      assert.equal(t.actionItems.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'cs_touchpoint', content: args.data.content as string });
      const t = await CustomerSuccessService.createTouchpoint('org-1', 'ws-1', {
        customerId: 'c1', type: 'meeting', date: '2024-05-01', participant: 'Bob',
        summary: 'Great call', outcome: 'Positive', actionItems: ['Follow up'], nextSteps: 'Schedule next',
        sentiment: 'positive',
      }, 'user-1');
      assert.equal(t.summary, 'Great call');
      assert.equal(t.outcome, 'Positive');
      assert.equal(t.actionItems.length, 1);
      assert.equal(t.nextSteps, 'Schedule next');
      assert.equal(t.sentiment, 'positive');
    });
  });

  describe('getTouchpoint', () => {
    it('returns a touchpoint when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_touchpoint', content: JSON.stringify({ customerId: 'c1', type: 'call', date: '2024-05-01', participant: 'A', summary: '', outcome: '', actionItems: [], nextSteps: '', sentiment: 'neutral' }) });
      const t = await CustomerSuccessService.getTouchpoint('mem-1');
      assert.ok(t);
      assert.equal(t!.participant, 'A');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_health_score' });
      const t = await CustomerSuccessService.getTouchpoint('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listTouchpoints', () => {
    it('lists touchpoints and filters by customerId, type, sentiment', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'cs_touchpoint', content: JSON.stringify({ customerId: 'c1', type: 'call', date: '2024-05-01', participant: 'A', summary: '', outcome: '', actionItems: [], nextSteps: '', sentiment: 'positive' }) }),
        makeRow({ id: 't2', type: 'cs_touchpoint', content: JSON.stringify({ customerId: 'c2', type: 'email', date: '2024-05-02', participant: 'B', summary: '', outcome: '', actionItems: [], nextSteps: '', sentiment: 'negative' }) }),
      ];
      const list = await CustomerSuccessService.listTouchpoints('org-1', { customerId: 'c1', type: 'call', sentiment: 'positive' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerId, 'c1');
    });
  });

  describe('updateTouchpoint', () => {
    it('updates touchpoint fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'cs_touchpoint', content: JSON.stringify({ customerId: 'c1', type: 'call', date: '2024-05-01', participant: 'A', summary: 'Old', outcome: '', actionItems: [], nextSteps: '', sentiment: 'neutral' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'cs_touchpoint', content: args.data.content as string });
      const t = await CustomerSuccessService.updateTouchpoint('mem-1', { summary: 'New', sentiment: 'positive' });
      assert.ok(t);
      assert.equal(t!.summary, 'New');
      assert.equal(t!.sentiment, 'positive');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await CustomerSuccessService.updateTouchpoint('nope', { summary: 'X' });
      assert.equal(t, null);
    });
  });

  // ── Metrics ──

  describe('getCSMetrics', () => {
    it('returns metrics with averages and counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'cs_health_score') {
          return [makeRow({ id: 'h1', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-05-01', notes: '' }) })];
        }
        if (where.type === 'cs_churn_risk') {
          return [makeRow({ id: 'cr1', type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) })];
        }
        if (where.type === 'cs_expansion') {
          return [makeRow({ id: 'e1', type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'O', estimatedValue: 50000, probability: 0, expectedCloseDate: null, status: 'identified', notes: '', closedBy: '', closedAt: null }) })];
        }
        if (where.type === 'cs_renewal') {
          return [];
        }
        if (where.type === 'cs_touchpoint') {
          return [];
        }
        return [];
      };
      const metrics = await CustomerSuccessService.getCSMetrics('org-1');
      assert.equal(metrics.avgHealthScore, 80);
      assert.equal(metrics.atRiskCustomers, 0);
      assert.equal(metrics.openChurnRisks, 1);
      assert.equal(metrics.expansionPipelineValue, 50000);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('returns comprehensive stats', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'cs_health_score') {
          return [makeRow({ id: 'h1', content: JSON.stringify({ customerId: 'c1', score: 80, category: 'product_usage', components: [], trend: 'stable', calculatedAt: '2024-05-01', notes: '' }) })];
        }
        if (where.type === 'cs_success_plan') {
          return [makeRow({ id: 'p1', type: 'cs_success_plan', content: JSON.stringify({ customerId: 'c1', name: 'P', description: '', goals: [], milestones: [], status: 'active', owner: '', startDate: '2024-01-01', endDate: null }) })];
        }
        if (where.type === 'cs_churn_risk') {
          return [makeRow({ id: 'cr1', type: 'cs_churn_risk', content: JSON.stringify({ customerId: 'c1', riskLevel: 'high', reasons: [], signals: [], mitigationPlan: '', assignedTo: '', status: 'open', identifiedDate: '2024-01-01', mitigatedBy: '', mitigatedAt: null, resolution: '', resolvedBy: '', resolvedAt: null }) })];
        }
        if (where.type === 'cs_expansion') {
          return [makeRow({ id: 'e1', type: 'cs_expansion', content: JSON.stringify({ customerId: 'c1', type: 'upsell', opportunity: 'O', estimatedValue: 50000, probability: 0, expectedCloseDate: null, status: 'identified', notes: '', closedBy: '', closedAt: null }) })];
        }
        if (where.type === 'cs_renewal') {
          return [makeRow({ id: 'r1', type: 'cs_renewal', content: JSON.stringify({ customerId: 'c1', contractId: null, currentMrr: null, renewalDate: '2024-12-01', renewalValue: null, termMonths: null, status: 'pending', probability: 0, notes: '', closedBy: '', closedAt: null }) })];
        }
        if (where.type === 'cs_touchpoint') {
          return [makeRow({ id: 't1', type: 'cs_touchpoint', content: JSON.stringify({ customerId: 'c1', type: 'call', date: '2024-05-01', participant: 'A', summary: '', outcome: '', actionItems: [], nextSteps: '', sentiment: 'positive' }) })];
        }
        return [];
      };
      const stats = await CustomerSuccessService.getStats('org-1');
      assert.equal(stats.healthScoreCount, 1);
      assert.equal(stats.successPlanCount, 1);
      assert.equal(stats.churnRiskCount, 1);
      assert.equal(stats.openChurnRiskCount, 1);
      assert.equal(stats.expansionCount, 1);
      assert.equal(stats.renewalCount, 1);
      assert.equal(stats.touchpointCount, 1);
      assert.equal(stats.byChurnRiskLevel.high, 1);
      assert.equal(stats.byExpansionStatus.identified, 1);
      assert.equal(stats.byRenewalStatus.pending, 1);
    });
  });
});
