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

type GoalFindManyArgs = { where: Record<string, unknown>; include?: unknown; orderBy?: unknown; take?: number };
type GoalFindUniqueArgs = { where: Record<string, unknown>; include?: unknown };
type GoalCreateArgs = { data: Record<string, unknown> };
type GoalUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

type KpiFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type KpiCreateArgs = { data: Record<string, unknown> };
type KpiUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

let goalFindManyImpl: (args: GoalFindManyArgs) => Promise<unknown[]> = async () => [];
let goalFindUniqueImpl: (args: GoalFindUniqueArgs) => Promise<unknown> = async () => null;
let goalCreateImpl: (args: GoalCreateArgs) => Promise<unknown> = async () => ({});
let goalUpdateImpl: (args: GoalUpdateArgs) => Promise<unknown> = async () => ({});

let kpiFindManyImpl: (args: KpiFindManyArgs) => Promise<unknown[]> = async () => [];
let kpiCreateImpl: (args: KpiCreateArgs) => Promise<unknown> = async () => ({});
let kpiUpdateImpl: (args: KpiUpdateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  goal: {
    findMany: (args: GoalFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'goal.findMany', args }); return goalFindManyImpl(args); },
    findUnique: (args: GoalFindUniqueArgs): Promise<unknown> => { calls.push({ method: 'goal.findUnique', args }); return goalFindUniqueImpl(args); },
    create: (args: GoalCreateArgs): Promise<unknown> => { calls.push({ method: 'goal.create', args }); return goalCreateImpl(args); },
    update: (args: GoalUpdateArgs): Promise<unknown> => { calls.push({ method: 'goal.update', args }); return goalUpdateImpl(args); },
  },
  kpi: {
    findMany: (args: KpiFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'kpi.findMany', args }); return kpiFindManyImpl(args); },
    create: (args: KpiCreateArgs): Promise<unknown> => { calls.push({ method: 'kpi.create', args }); return kpiCreateImpl(args); },
    update: (args: KpiUpdateArgs): Promise<unknown> => { calls.push({ method: 'kpi.update', args }); return kpiUpdateImpl(args); },
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

function makeGoalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'goal-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    title: 'Increase Revenue',
    description: 'Grow top-line revenue',
    type: 'objective',
    priority: 'high',
    status: 'active',
    progress: 0,
    dueDate: new Date('2028-01-01'),
    parentGoalId: null,
    createdById: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeKpiRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'kpi-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    goalId: 'goal-1',
    name: 'Monthly Revenue',
    description: 'Total monthly revenue',
    target: 100000,
    current: 50000,
    unit: 'usd',
    period: 'monthly',
    direction: 'up',
    lastUpdated: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  goalFindManyImpl = async () => [];
  goalFindUniqueImpl = async () => null;
  goalCreateImpl = async () => ({});
  goalUpdateImpl = async () => ({});
  kpiFindManyImpl = async () => [];
  kpiCreateImpl = async () => ({});
  kpiUpdateImpl = async () => ({});
}

const { GoalService, KpiService } = await import('@/lib/services/goal');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — GoalService
// ─────────────────────────────────────────────────────────────────────────────

describe('GoalService', () => {
  beforeEach(() => resetMock());

  it('creates a goal with defaults', async () => {
    goalCreateImpl = async (args) => makeGoalRow({ ...args.data as Record<string, unknown> });
    const g = await GoalService.create({
      organizationId: 'org-1', title: 'New Goal', createdById: 'user-1',
    });
    assert.equal(g.title, 'New Goal');
    assert.equal(g.type, 'objective');
    assert.equal(g.priority, 'medium');
  });

  it('creates a goal with full input', async () => {
    goalCreateImpl = async (args) => makeGoalRow({ ...args.data as Record<string, unknown> });
    const g = await GoalService.create({
      organizationId: 'org-1', workspaceId: 'ws-1', title: 'Full Goal',
      description: 'A detailed goal', type: 'milestone', priority: 'high',
      dueDate: new Date('2028-06-01'), parentGoalId: 'goal-0', createdById: 'user-1',
    });
    assert.equal(g.title, 'Full Goal');
    assert.equal(g.type, 'milestone');
    assert.equal(g.priority, 'high');
  });

  it('gets a goal by id', async () => {
    goalFindUniqueImpl = async () => makeGoalRow();
    const g = await GoalService.get('goal-1');
    assert.ok(g);
    assert.equal(g!.id, 'goal-1');
    assert.equal(g!.title, 'Increase Revenue');
  });

  it('returns null when goal not found', async () => {
    goalFindUniqueImpl = async () => null;
    const g = await GoalService.get('nope');
    assert.equal(g, null);
  });

  it('lists goals by company', async () => {
    goalFindManyImpl = async () => [makeGoalRow()];
    const list = await GoalService.list('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Increase Revenue');
  });

  it('lists goals with status filter', async () => {
    goalFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.status === 'active') return [makeGoalRow()];
      return [];
    };
    const list = await GoalService.list('org-1', { status: 'active' });
    assert.equal(list.length, 1);
  });

  it('updates a goal', async () => {
    goalUpdateImpl = async (args) => makeGoalRow({ id: 'goal-1', ...args.data as Record<string, unknown> });
    const g = await GoalService.update('goal-1', { status: 'completed', progress: 0.5 });
    assert.equal(g.status, 'completed');
    assert.equal(g.progress, 0.5);
  });

  it('clamps progress to [0,1]', async () => {
    goalUpdateImpl = async (args) => makeGoalRow({ id: 'goal-1', ...args.data as Record<string, unknown> });
    const g = await GoalService.update('goal-1', { progress: 5 });
    assert.equal(g.progress, 1);
  });

  it('deletes a goal (soft delete sets status to cancelled)', async () => {
    goalUpdateImpl = async (args) => makeGoalRow({ id: 'goal-1', ...args.data as Record<string, unknown> });
    const g = await GoalService.delete('goal-1');
    assert.equal(g.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — KpiService
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService', () => {
  beforeEach(() => resetMock());

  it('creates a kpi with defaults', async () => {
    kpiCreateImpl = async (args) => makeKpiRow({ ...args.data as Record<string, unknown> });
    const k = await KpiService.create({
      organizationId: 'org-1', name: 'New KPI',
    });
    assert.equal(k.name, 'New KPI');
    assert.equal(k.unit, 'count');
    assert.equal(k.period, 'monthly');
    assert.equal(k.direction, 'up');
    assert.equal(k.target, 0);
  });

  it('creates a kpi with full input', async () => {
    kpiCreateImpl = async (args) => makeKpiRow({ ...args.data as Record<string, unknown> });
    const k = await KpiService.create({
      organizationId: 'org-1', workspaceId: 'ws-1', goalId: 'goal-1',
      name: 'Full KPI', description: 'A detailed KPI', target: 250,
      unit: 'usd', period: 'weekly', direction: 'down',
    });
    assert.equal(k.name, 'Full KPI');
    assert.equal(k.target, 250);
    assert.equal(k.period, 'weekly');
    assert.equal(k.direction, 'down');
  });

  it('lists kpis by company', async () => {
    kpiFindManyImpl = async () => [makeKpiRow()];
    const list = await KpiService.list('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Monthly Revenue');
  });

  it('lists kpis with goalId filter', async () => {
    kpiFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.goalId === 'goal-1') return [makeKpiRow()];
      return [];
    };
    const list = await KpiService.list('org-1', { goalId: 'goal-1' });
    assert.equal(list.length, 1);
  });

  it('updates a kpi', async () => {
    kpiUpdateImpl = async (args) => makeKpiRow({ id: 'kpi-1', ...args.data as Record<string, unknown> });
    const k = await KpiService.update('kpi-1', { target: 200, current: 100 });
    assert.equal(k.target, 200);
    assert.equal(k.current, 100);
  });

  it('recordValue sets current and lastUpdated', async () => {
    kpiUpdateImpl = async (args) => makeKpiRow({ id: 'kpi-1', ...args.data as Record<string, unknown> });
    const k = await KpiService.recordValue('kpi-1', 75000);
    assert.equal(k.current, 75000);
  });
});
