import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord { method: string; args?: unknown; }
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

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1', workspaceId: 'ws-1', organizationId: 'org-1', type: 'dei_initiative',
    content: JSON.stringify({
      name: 'Mentorship Program', type: 'mentorship', description: 'Mentorship for URG',
      owner: 'HR', startDate: '2024-01-01', endDate: '', budget: 50000, status: 'planning',
      objectives: 'Increase representation', targetGroups: 'Women, Minorities', metrics: 'Retention rate',
    }),
    source: 'user', sourceId: null, confidence: 1.0, owner: null, accessPolicy: null,
    lifecycle: 'permanent', expiresAt: null, tags: JSON.stringify(['dei_initiative', 'mentorship', 'planning']),
    relatedMemoryIds: null, verifiedBy: null, verifiedAt: null,
    createdBy: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
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

const { DeiService } = await import('@/lib/services/dei-service');

// ─────────────────────────────────────────────────────────────────────────────

describe('DeiService — Initiatives', () => {
  beforeEach(() => resetMock());

  it('creates an initiative with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await DeiService.createInitiative('org-1', 'ws-1', {
      name: 'Pay Equity Audit', type: 'pay_equity',
    }, 'user-1');
    assert.equal(i.name, 'Pay Equity Audit');
    assert.equal(i.status, 'planning');
    assert.equal(i.budget, 0);
  });

  it('creates an initiative with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await DeiService.createInitiative('org-1', 'ws-1', {
      name: 'ERG', type: 'employee_resource_group', description: 'Support', owner: 'DEI Team',
      startDate: '2024-03-01', endDate: '2024-12-31', budget: 25000, status: 'active',
      objectives: 'Community', targetGroups: 'All', metrics: 'Participation',
    }, 'user-1');
    assert.equal(i.owner, 'DEI Team');
    assert.equal(i.status, 'active');
    assert.equal(i.budget, 25000);
  });

  it('gets an initiative by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const i = await DeiService.getInitiative('mem-1');
    assert.ok(i);
    assert.equal(i!.name, 'Mentorship Program');
  });

  it('returns null for non-initiative type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'other' });
    const i = await DeiService.getInitiative('mem-1');
    assert.equal(i, null);
  });

  it('returns null when initiative not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await DeiService.getInitiative('nope');
    assert.equal(i, null);
  });

  it('lists initiatives', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'm2', content: JSON.stringify({ name: 'Second', type: 'training', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'active', objectives: '', targetGroups: '', metrics: '' }) })];
    const list = await DeiService.listInitiatives('org-1');
    assert.equal(list.length, 2);
  });

  it('filters initiatives by status', async () => {
    memFindManyImpl = async () => [
      makeRow({ content: JSON.stringify({ name: 'A', type: 'training', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'planning', objectives: '', targetGroups: '', metrics: '' }) }),
      makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', type: 'training', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'active', objectives: '', targetGroups: '', metrics: '' }) }),
    ];
    const list = await DeiService.listInitiatives('org-1', { status: 'active' });
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'active');
  });

  it('updates an initiative', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await DeiService.updateInitiative('mem-1', { budget: 100000 });
    assert.ok(i);
    assert.equal(i!.budget, 100000);
  });

  it('deletes an initiative', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DeiService.deleteInitiative('mem-1');
    assert.equal(ok, true);
  });

  it('activates an initiative', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ name: 'I', type: 'mentorship', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'active', objectives: '', targetGroups: '', metrics: '' }) });
    const i = await DeiService.activateInitiative('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'active');
  });
});

describe('DeiService — Metrics', () => {
  beforeEach(() => resetMock());

  it('creates a metric', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_metric', content: args.data.content as string });
    const m = await DeiService.createMetric('org-1', 'ws-1', {
      category: 'gender', period: 'quarterly', periodLabel: '2024-Q2', metricName: 'Women in Leadership', value: 35,
    }, 'user-1');
    assert.equal(m.category, 'gender');
    assert.equal(m.metricName, 'Women in Leadership');
    assert.equal(m.value, 35);
    assert.equal(m.unit, '%');
  });

  it('creates a metric with target and breakdown', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_metric', content: args.data.content as string });
    const m = await DeiService.createMetric('org-1', 'ws-1', {
      category: 'ethnicity', period: 'annual', periodLabel: '2024', metricName: 'Minority Representation',
      value: 28, target: 40, unit: '%', demographicBreakdown: '{"black":12,"hispanic":10,"asian":6}',
    }, 'user-1');
    assert.equal(m.target, 40);
    assert.ok(m.demographicBreakdown.includes('black'));
  });

  it('gets a metric by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_metric', content: JSON.stringify({
      category: 'gender', period: 'annual', periodLabel: '2024', metricName: 'M', value: 50, target: 60, unit: '%', description: '', demographicBreakdown: '', notes: '',
    }) });
    const m = await DeiService.getMetric('mem-1');
    assert.ok(m);
  });

  it('lists metrics', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'dei_metric', content: JSON.stringify({
      category: 'gender', period: 'annual', periodLabel: '2024', metricName: 'M', value: 50, target: 60, unit: '%', description: '', demographicBreakdown: '', notes: '',
    }) })];
    const list = await DeiService.listMetrics('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a metric', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_metric', content: JSON.stringify({
      category: 'gender', period: 'annual', periodLabel: '2024', metricName: 'M', value: 50, target: 60, unit: '%', description: '', demographicBreakdown: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'dei_metric', content: args.data.content as string });
    const m = await DeiService.updateMetric('mem-1', { value: 55 });
    assert.ok(m);
    assert.equal(m!.value, 55);
  });

  it('deletes a metric', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DeiService.deleteMetric('mem-1');
    assert.equal(ok, true);
  });
});

describe('DeiService — Training', () => {
  beforeEach(() => resetMock());

  it('creates a training with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_training', content: args.data.content as string });
    const t = await DeiService.createTraining('org-1', 'ws-1', {
      title: 'Unconscious Bias Training',
    }, 'user-1');
    assert.equal(t.title, 'Unconscious Bias Training');
    assert.equal(t.status, 'scheduled');
  });

  it('creates a training with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_training', content: args.data.content as string });
    const t = await DeiService.createTraining('org-1', 'ws-1', {
      title: 'Inclusive Leadership', description: 'Workshop', facilitator: 'Dr. Smith',
      audience: 'Managers', format: 'in-person', duration: 120, scheduledDate: '2024-06-15',
      materials: 'Slides', completionRate: 0, notes: 'Mandatory',
    }, 'user-1');
    assert.equal(t.facilitator, 'Dr. Smith');
    assert.equal(t.duration, 120);
  });

  it('gets a training by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_training', content: JSON.stringify({
      title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'scheduled', materials: '', completionRate: 0, notes: '',
    }) });
    const t = await DeiService.getTraining('mem-1');
    assert.ok(t);
  });

  it('lists trainings', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'dei_training', content: JSON.stringify({
      title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'scheduled', materials: '', completionRate: 0, notes: '',
    }) })];
    const list = await DeiService.listTrainings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a training', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_training', content: JSON.stringify({
      title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'scheduled', materials: '', completionRate: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'dei_training', content: args.data.content as string });
    const t = await DeiService.updateTraining('mem-1', { status: 'in_progress' });
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('completes a training with completion rate', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_training', content: JSON.stringify({
      title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'in_progress', materials: '', completionRate: 50, notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'dei_training', content: JSON.stringify({
      title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'completed', materials: '', completionRate: 95, notes: '',
    }) });
    const t = await DeiService.completeTraining('mem-1', 95, 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'completed');
    assert.equal(t!.completionRate, 95);
  });
});

describe('DeiService — Goals', () => {
  beforeEach(() => resetMock());

  it('creates a goal with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_goal', content: args.data.content as string });
    const g = await DeiService.createGoal('org-1', 'ws-1', {
      type: 'representation', title: '50% Women in Leadership', targetValue: 50,
    }, 'user-1');
    assert.equal(g.title, '50% Women in Leadership');
    assert.equal(g.status, 'on_track');
    assert.equal(g.currentValue, 0);
  });

  it('creates a goal with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'dei_goal', content: args.data.content as string });
    const g = await DeiService.createGoal('org-1', 'ws-1', {
      type: 'hiring', title: 'Diverse Hires', targetValue: 100, currentValue: 30,
      unit: 'count', deadline: '2024-12-31', status: 'at_risk',
      initiativeId: 'init-1', owner: 'Recruiting',
    }, 'user-1');
    assert.equal(g.currentValue, 30);
    assert.equal(g.unit, 'count');
    assert.equal(g.initiativeId, 'init-1');
  });

  it('gets a goal by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_goal', content: JSON.stringify({
      type: 'representation', title: 'G', description: '', targetValue: 50, currentValue: 30, unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
    }) });
    const g = await DeiService.getGoal('mem-1');
    assert.ok(g);
  });

  it('lists goals', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'dei_goal', content: JSON.stringify({
      type: 'representation', title: 'G', description: '', targetValue: 50, currentValue: 30, unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
    }) })];
    const list = await DeiService.listGoals('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a goal', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_goal', content: JSON.stringify({
      type: 'representation', title: 'G', description: '', targetValue: 50, currentValue: 30, unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'dei_goal', content: args.data.content as string });
    const g = await DeiService.updateGoal('mem-1', { title: 'Updated Goal' });
    assert.ok(g);
  });

  it('updates goal progress and adjusts status to achieved', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_goal', content: JSON.stringify({
      type: 'representation', title: 'G', description: '', targetValue: 50, currentValue: 30, unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'dei_goal', content: args.data.content as string });
    const g = await DeiService.updateGoalProgress('mem-1', 50, 'user-1');
    assert.ok(g);
    assert.equal(g!.currentValue, 50);
    assert.equal(g!.status, 'achieved');
  });

  it('updates goal progress and adjusts status to at_risk', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dei_goal', content: JSON.stringify({
      type: 'representation', title: 'G', description: '', targetValue: 100, currentValue: 10, unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'dei_goal', content: args.data.content as string });
    const g = await DeiService.updateGoalProgress('mem-1', 55, 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'at_risk');
  });

  it('deletes a goal', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DeiService.deleteGoal('mem-1');
    assert.equal(ok, true);
  });
});

describe('DeiService — Metrics Summary & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics summary', async () => {
    const allRows = [
      makeRow({ type: 'dei_initiative', content: JSON.stringify({ name: 'I', type: 'mentorship', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'active', objectives: '', targetGroups: '', metrics: '' }) }),
      makeRow({ id: 'm2', type: 'dei_training', content: JSON.stringify({ title: 'T', description: '', facilitator: '', audience: '', format: '', duration: 0, scheduledDate: '', status: 'completed', materials: '', completionRate: 100, notes: '' }) }),
      makeRow({ id: 'm3', type: 'dei_goal', content: JSON.stringify({ type: 'representation', title: 'G', description: '', targetValue: 50, currentValue: 50, unit: '%', deadline: '', status: 'achieved', initiativeId: '', owner: '' }) }),
      makeRow({ id: 'm4', type: 'dei_metric', content: JSON.stringify({ category: 'gender', period: 'annual', periodLabel: '2024', metricName: 'Women %', value: 40, target: 50, unit: '%', description: '', demographicBreakdown: '', notes: '' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const m = await DeiService.getDeiMetrics('org-1');
    assert.equal(m.activeInitiatives, 1);
    assert.equal(m.trainingCompletion, 100);
    assert.equal(m.goalProgress, 100);
  });

  it('returns stats with counts', async () => {
    const allRows = [
      makeRow({ type: 'dei_initiative', content: JSON.stringify({ name: 'I', type: 'mentorship', description: '', owner: '', startDate: '', endDate: '', budget: 0, status: 'active', objectives: '', targetGroups: '', metrics: '' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const s = await DeiService.getDeiStats('org-1');
    assert.ok(s.initiativeCount >= 0);
    assert.ok(typeof s.byInitiativeType === 'object');
  });
});
