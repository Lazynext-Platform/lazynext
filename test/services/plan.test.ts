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

type PlanFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type PlanFindUniqueArgs = { where: Record<string, unknown>; include?: unknown };
type PlanCreateArgs = { data: Record<string, unknown> };
type PlanUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

let planFindManyImpl: (args: PlanFindManyArgs) => Promise<unknown[]> = async () => [];
let planFindUniqueImpl: (args: PlanFindUniqueArgs) => Promise<unknown> = async () => null;
let planCreateImpl: (args: PlanCreateArgs) => Promise<unknown> = async () => ({});
let planUpdateImpl: (args: PlanUpdateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  plan: {
    findMany: (args: PlanFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'plan.findMany', args }); return planFindManyImpl(args); },
    findUnique: (args: PlanFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'plan.findUnique', args }); return planFindUniqueImpl(args); },
    create: (args: PlanCreateArgs): Promise<unknown> => { calls.push({ method: 'plan.create', args }); return planCreateImpl(args); },
    update: (args: PlanUpdateArgs): Promise<unknown> => { calls.push({ method: 'plan.update', args }); return planUpdateImpl(args); },
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

function makePlanRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'plan-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    goalId: 'goal-1',
    title: 'Launch Campaign',
    objective: 'Launch Q3 marketing campaign',
    reasoning: 'Market research supports this',
    priority: 'high',
    riskLevel: 'medium',
    status: 'draft',
    estimatedCost: 5000,
    approvedById: null,
    approvedAt: null,
    createdById: 'user-1',
    agentId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  planFindManyImpl = async () => [];
  planFindUniqueImpl = async () => null;
  planCreateImpl = async () => ({});
  planUpdateImpl = async () => ({});
}

const { PlanService } = await import('@/lib/services/plan');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — PlanService
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanService', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    planCreateImpl = async (args) => makePlanRow({ ...args.data as Record<string, unknown> });
    const p = await PlanService.create({
      workspaceId: 'ws-1', organizationId: 'org-1', title: 'New Plan', objective: 'Do the thing',
    });
    assert.equal(p.title, 'New Plan');
    assert.equal(p.priority, 'medium');
    assert.equal(p.riskLevel, 'low');
    assert.equal(p.estimatedCost, 0);
  });

  it('creates a plan with full input', async () => {
    planCreateImpl = async (args) => makePlanRow({ ...args.data as Record<string, unknown> });
    const p = await PlanService.create({
      workspaceId: 'ws-1', organizationId: 'org-1', goalId: 'goal-1',
      title: 'Full Plan', objective: 'Detailed objective', reasoning: 'Because reasons',
      priority: 'high', riskLevel: 'high', estimatedCost: 10000,
      createdById: 'user-1', agentId: 'agent-1',
    });
    assert.equal(p.title, 'Full Plan');
    assert.equal(p.priority, 'high');
    assert.equal(p.riskLevel, 'high');
    assert.equal(p.estimatedCost, 10000);
  });

  it('gets a plan by id', async () => {
    planFindUniqueImpl = async () => makePlanRow();
    const p = await PlanService.get('plan-1');
    assert.ok(p);
    assert.equal(p!.id, 'plan-1');
    assert.equal(p!.title, 'Launch Campaign');
  });

  it('returns null when plan not found', async () => {
    planFindUniqueImpl = async () => null;
    const p = await PlanService.get('nope');
    assert.equal(p, null);
  });

  it('lists plans by workspace', async () => {
    planFindManyImpl = async () => [makePlanRow()];
    const list = await PlanService.list('ws-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Launch Campaign');
  });

  it('lists plans with status filter', async () => {
    planFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.status === 'active') return [makePlanRow()];
      return [];
    };
    const list = await PlanService.list('ws-1', { status: 'active' });
    assert.equal(list.length, 1);
  });

  it('lists plans with goalId filter', async () => {
    planFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.goalId === 'goal-1') return [makePlanRow()];
      return [];
    };
    const list = await PlanService.list('ws-1', { goalId: 'goal-1' });
    assert.equal(list.length, 1);
  });

  it('updates a plan', async () => {
    planUpdateImpl = async (args) => makePlanRow({ id: 'plan-1', ...args.data as Record<string, unknown> });
    const p = await PlanService.update('plan-1', { status: 'active', priority: 'low' });
    assert.equal(p.status, 'active');
    assert.equal(p.priority, 'low');
  });

  it('updates a plan with approvedById and sets approvedAt', async () => {
    planUpdateImpl = async (args) => makePlanRow({ id: 'plan-1', ...args.data as Record<string, unknown> });
    const p = await PlanService.update('plan-1', { approvedById: 'user-2' });
    assert.equal(p.approvedById, 'user-2');
    assert.ok(p.approvedAt);
  });

  it('approve sets status to active and records approver', async () => {
    planUpdateImpl = async (args) => makePlanRow({ id: 'plan-1', ...args.data as Record<string, unknown> });
    const p = await PlanService.approve('plan-1', 'user-2');
    assert.equal(p.status, 'active');
    assert.equal(p.approvedById, 'user-2');
    assert.ok(p.approvedAt);
  });
});
