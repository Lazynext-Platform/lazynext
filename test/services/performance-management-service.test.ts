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
    type: 'perf_review',
    content: JSON.stringify({
      employeeId: 'emp-1',
      employeeName: 'Alice Johnson',
      type: 'annual',
      status: 'draft',
      rating: 'not_applicable',
      description: 'Annual performance review',
      period: '2028',
      reviewerId: 'mgr-1',
      reviewerName: 'Jane Doe',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      selfAssessment: '',
      managerAssessment: '',
      goals: '',
      strengths: '',
      areasForImprovement: '',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['perf_review', 'annual', 'draft', 'not_applicable']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeGoalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-g1',
    type: 'perf_goal',
    content: JSON.stringify({
      employeeId: 'emp-1',
      employeeName: 'Alice Johnson',
      type: 'performance',
      status: 'not_started',
      priority: 'medium',
      title: 'Increase sales by 20%',
      description: 'Q1 sales target',
      progress: 0,
      targetDate: '2028-06-30',
      notes: '',
    }),
    tags: JSON.stringify(['perf_goal', 'performance', 'not_started', 'medium']),
    ...overrides,
  });
}

function makeFeedbackRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-fb1',
    type: 'perf_feedback',
    content: JSON.stringify({
      employeeId: 'emp-1',
      employeeName: 'Alice Johnson',
      type: 'positive',
      status: 'pending',
      title: 'Great work on project',
      description: 'Exceeded expectations',
      givenBy: 'Jane Doe',
      notes: '',
    }),
    tags: JSON.stringify(['perf_feedback', 'positive', 'pending']),
    ...overrides,
  });
}

function makePlanRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'development_plan',
    content: JSON.stringify({
      employeeId: 'emp-1',
      employeeName: 'Alice Johnson',
      type: 'career',
      status: 'draft',
      title: 'Leadership Development Plan',
      description: 'Path to senior role',
      progress: 0,
      targetDate: '2028-12-31',
      notes: '',
    }),
    tags: JSON.stringify(['development_plan', 'career', 'draft']),
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

const { PerformanceManagementService } = await import('@/lib/services/performance-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Reviews
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceManagementService — Reviews', () => {
  beforeEach(() => resetMock());

  it('creates a review with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await PerformanceManagementService.createReview('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'annual',
    }, 'user-1');
    assert.equal(r.employeeId, 'emp-1');
    assert.equal(r.employeeName, 'Alice Johnson');
    assert.equal(r.status, 'draft');
    assert.equal(r.rating, 'not_applicable');
    assert.equal(r.description, '');
  });

  it('creates a review with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await PerformanceManagementService.createReview('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'mid_year',
      description: 'Mid-year review', status: 'sent', rating: 'exceeds',
      period: 'H1 2028', reviewerId: 'mgr-1', reviewerName: 'Jane Doe',
      startDate: '2028-01-01', endDate: '2028-06-30',
      selfAssessment: 'Self assessment text', managerAssessment: 'Manager assessment',
      goals: 'Goal 1', strengths: 'Strengths', areasForImprovement: 'Areas',
      notes: 'Notes',
    }, 'user-1');
    assert.equal(r.type, 'mid_year');
    assert.equal(r.status, 'sent');
    assert.equal(r.rating, 'exceeds');
    assert.equal(r.period, 'H1 2028');
    assert.equal(r.reviewerName, 'Jane Doe');
  });

  it('gets a review by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const r = await PerformanceManagementService.getReview('mem-1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-1');
    assert.equal(r!.employeeName, 'Alice Johnson');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'perf_goal' });
    const r = await PerformanceManagementService.getReview('mem-1');
    assert.equal(r, null);
  });

  it('lists reviews by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'perf_review') return [makeRow()];
      return [];
    };
    const list = await PerformanceManagementService.listReviews('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].employeeName, 'Alice Johnson');
  });

  it('updates a review', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await PerformanceManagementService.updateReview('mem-1', { status: 'completed', rating: 'meets' });
    assert.ok(r);
    assert.equal(r!.status, 'completed');
    assert.equal(r!.rating, 'meets');
  });

  it('deletes a review', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PerformanceManagementService.deleteReview('mem-1');
    assert.equal(ok, true);
  });

  it('sendReview sets status to sent', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await PerformanceManagementService.sendReview('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'sent');
  });

  it('submitReview sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await PerformanceManagementService.submitReview('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('completeReview sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await PerformanceManagementService.completeReview('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Goals
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceManagementService — Goals', () => {
  beforeEach(() => resetMock());

  it('creates a goal with defaults', async () => {
    memCreateImpl = async (args) => makeGoalRow({ content: args.data.content as string });
    const g = await PerformanceManagementService.createGoal('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', title: 'Increase sales', type: 'performance',
    }, 'user-1');
    assert.equal(g.title, 'Increase sales');
    assert.equal(g.status, 'not_started');
    assert.equal(g.priority, 'medium');
    assert.equal(g.progress, 0);
  });

  it('creates a goal with full input', async () => {
    memCreateImpl = async (args) => makeGoalRow({ content: args.data.content as string });
    const g = await PerformanceManagementService.createGoal('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', title: 'Learn TypeScript', type: 'development',
      status: 'in_progress', priority: 'high',
      description: 'Complete TS course', progress: 30,
      targetDate: '2028-03-31', notes: 'Priority goal',
    }, 'user-1');
    assert.equal(g.title, 'Learn TypeScript');
    assert.equal(g.type, 'development');
    assert.equal(g.priority, 'high');
    assert.equal(g.progress, 30);
  });

  it('gets a goal by id', async () => {
    memFindUniqueImpl = async () => makeGoalRow();
    const g = await PerformanceManagementService.getGoal('mem-g1');
    assert.ok(g);
    assert.equal(g!.id, 'mem-g1');
    assert.equal(g!.title, 'Increase sales by 20%');
  });

  it('lists goals by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'perf_goal') return [makeGoalRow()];
      return [];
    };
    const list = await PerformanceManagementService.listGoals('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Increase sales by 20%');
  });

  it('updates a goal', async () => {
    memFindUniqueImpl = async () => makeGoalRow();
    memUpdateImpl = async (args) => makeGoalRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PerformanceManagementService.updateGoal('mem-g1', { progress: 50, priority: 'critical' });
    assert.ok(g);
    assert.equal(g!.progress, 50);
    assert.equal(g!.priority, 'critical');
  });

  it('deletes a goal', async () => {
    memDeleteImpl = async () => ({ id: 'mem-g1' });
    const ok = await PerformanceManagementService.deleteGoal('mem-g1');
    assert.equal(ok, true);
  });

  it('startGoal sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeGoalRow();
    memUpdateImpl = async (args) => makeGoalRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PerformanceManagementService.startGoal('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'in_progress');
  });

  it('achieveGoal sets status to achieved and progress to 100', async () => {
    memFindUniqueImpl = async () => makeGoalRow();
    memUpdateImpl = async (args) => makeGoalRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PerformanceManagementService.achieveGoal('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'achieved');
    assert.equal(g!.progress, 100);
  });

  it('missGoal sets status to missed', async () => {
    memFindUniqueImpl = async () => makeGoalRow();
    memUpdateImpl = async (args) => makeGoalRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await PerformanceManagementService.missGoal('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'missed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceManagementService — Feedback', () => {
  beforeEach(() => resetMock());

  it('creates feedback with defaults', async () => {
    memCreateImpl = async (args) => makeFeedbackRow({ content: args.data.content as string });
    const f = await PerformanceManagementService.createFeedback('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'positive', title: 'Great work',
    }, 'user-1');
    assert.equal(f.employeeId, 'emp-1');
    assert.equal(f.status, 'pending');
    assert.equal(f.title, 'Great work');
    assert.equal(f.givenBy, '');
  });

  it('creates feedback with full input', async () => {
    memCreateImpl = async (args) => makeFeedbackRow({ content: args.data.content as string });
    const f = await PerformanceManagementService.createFeedback('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'constructive',
      status: 'delivered', title: 'Improvement needed',
      description: 'Focus on communication', givenBy: 'Jane Doe', notes: 'Private',
    }, 'user-1');
    assert.equal(f.type, 'constructive');
    assert.equal(f.status, 'delivered');
    assert.equal(f.title, 'Improvement needed');
    assert.equal(f.givenBy, 'Jane Doe');
  });

  it('gets feedback by id', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    const f = await PerformanceManagementService.getFeedback('mem-fb1');
    assert.ok(f);
    assert.equal(f!.id, 'mem-fb1');
    assert.equal(f!.title, 'Great work on project');
  });

  it('lists feedback by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'perf_feedback') return [makeFeedbackRow()];
      return [];
    };
    const list = await PerformanceManagementService.listFeedback('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'positive');
  });

  it('updates feedback', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-fb1', content: args.data.content as string });
    const f = await PerformanceManagementService.updateFeedback('mem-fb1', { status: 'acknowledged', notes: 'Updated' });
    assert.ok(f);
    assert.equal(f!.status, 'acknowledged');
  });

  it('deletes feedback', async () => {
    memDeleteImpl = async () => ({ id: 'mem-fb1' });
    const ok = await PerformanceManagementService.deleteFeedback('mem-fb1');
    assert.equal(ok, true);
  });

  it('deliverFeedback sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-fb1', content: args.data.content as string });
    const f = await PerformanceManagementService.deliverFeedback('mem-fb1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'delivered');
  });

  it('acknowledgeFeedback sets status to acknowledged', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-fb1', content: args.data.content as string });
    const f = await PerformanceManagementService.acknowledgeFeedback('mem-fb1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'acknowledged');
  });

  it('actionFeedback sets status to actioned', async () => {
    memFindUniqueImpl = async () => makeFeedbackRow();
    memUpdateImpl = async (args) => makeFeedbackRow({ id: 'mem-fb1', content: args.data.content as string });
    const f = await PerformanceManagementService.actionFeedback('mem-fb1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'actioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceManagementService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makePlanRow({ content: args.data.content as string });
    const p = await PerformanceManagementService.createPlan('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'career', title: 'Career Path',
    }, 'user-1');
    assert.equal(p.title, 'Career Path');
    assert.equal(p.status, 'draft');
    assert.equal(p.progress, 0);
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makePlanRow({ content: args.data.content as string });
    const p = await PerformanceManagementService.createPlan('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'Alice Johnson', type: 'leadership', title: 'Leadership Track',
      status: 'active', description: 'Develop leadership skills',
      progress: 25, targetDate: '2028-12-31', notes: 'High potential',
    }, 'user-1');
    assert.equal(p.title, 'Leadership Track');
    assert.equal(p.type, 'leadership');
    assert.equal(p.status, 'active');
    assert.equal(p.progress, 25);
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    const p = await PerformanceManagementService.getPlan('mem-p1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-p1');
    assert.equal(p!.title, 'Leadership Development Plan');
  });

  it('lists plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'development_plan') return [makePlanRow()];
      return [];
    };
    const list = await PerformanceManagementService.listPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Leadership Development Plan');
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PerformanceManagementService.updatePlan('mem-p1', { progress: 60, notes: 'On track' });
    assert.ok(p);
    assert.equal(p!.progress, 60);
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await PerformanceManagementService.deletePlan('mem-p1');
    assert.equal(ok, true);
  });

  it('activatePlan sets status to active', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PerformanceManagementService.activatePlan('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('completePlan sets status to completed and progress to 100', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PerformanceManagementService.completePlan('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
    assert.equal(p!.progress, 100);
  });

  it('holdPlan sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makePlanRow();
    memUpdateImpl = async (args) => makePlanRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PerformanceManagementService.holdPlan('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPerformanceManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'perf_review') return [
        makeRow({ content: JSON.stringify({ employeeId: 'emp-1', employeeName: 'Alice', type: 'annual', status: 'in_progress', rating: 'not_applicable', description: '', period: '', reviewerId: '', reviewerName: '', startDate: null, endDate: null, selfAssessment: '', managerAssessment: '', goals: '', strengths: '', areasForImprovement: '', notes: '' }) }),
        makeRow({ id: 'r2', content: JSON.stringify({ employeeId: 'emp-2', employeeName: 'Bob', type: 'annual', status: 'completed', rating: 'meets', description: '', period: '', reviewerId: '', reviewerName: '', startDate: null, endDate: null, selfAssessment: '', managerAssessment: '', goals: '', strengths: '', areasForImprovement: '', notes: '' }) }),
      ];
      if (t === 'perf_goal') return [
        makeGoalRow({ content: JSON.stringify({ employeeId: 'emp-1', employeeName: 'Alice', type: 'performance', status: 'in_progress', priority: 'medium', title: 'G1', description: '', progress: 50, targetDate: null, notes: '' }) }),
        makeGoalRow({ id: 'g2', content: JSON.stringify({ employeeId: 'emp-2', employeeName: 'Bob', type: 'development', status: 'achieved', priority: 'low', title: 'G2', description: '', progress: 100, targetDate: null, notes: '' }) }),
      ];
      if (t === 'perf_feedback') return [
        makeFeedbackRow({ content: JSON.stringify({ employeeId: 'emp-1', employeeName: 'Alice', type: 'positive', status: 'pending', title: '', description: '', givenBy: '', notes: '' }) }),
      ];
      if (t === 'development_plan') return [
        makePlanRow({ content: JSON.stringify({ employeeId: 'emp-1', employeeName: 'Alice', type: 'career', status: 'active', title: 'P1', description: '', progress: 0, targetDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await PerformanceManagementService.getPerformanceManagementMetrics('org-1');
    assert.equal(m.activeReviews, 1);
    assert.equal(m.completedReviews, 1);
    assert.equal(m.activeGoals, 1);
    assert.equal(m.achievedGoals, 1);
    assert.equal(m.pendingFeedback, 1);
    assert.equal(m.activePlans, 1);
  });

  it('getPerformanceManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'perf_review') return [makeRow()];
      if (t === 'perf_goal') return [makeGoalRow()];
      if (t === 'perf_feedback') return [makeFeedbackRow()];
      if (t === 'development_plan') return [makePlanRow()];
      return [];
    };
    const s = await PerformanceManagementService.getPerformanceManagementStats('org-1');
    assert.equal(s.reviewCount, 1);
    assert.equal(s.goalCount, 1);
    assert.equal(s.feedbackCount, 1);
    assert.equal(s.planCount, 1);
    assert.equal(s.byReviewType['annual'], 1);
    assert.equal(s.byReviewStatus['draft'], 1);
    assert.equal(s.byGoalType['performance'], 1);
    assert.equal(s.byGoalStatus['not_started'], 1);
    assert.equal(s.byFeedbackType['positive'], 1);
    assert.equal(s.byFeedbackStatus['pending'], 1);
    assert.equal(s.byPlanType['career'], 1);
    assert.equal(s.byPlanStatus['draft'], 1);
  });
});
