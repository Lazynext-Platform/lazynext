import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown; include?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let initFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let initFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let initCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let initUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let initDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let initCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let initGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

let milestoneFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let milestoneFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let milestoneCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let milestoneUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let milestoneDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let milestoneCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

let goalFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let goalFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let goalCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let goalUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let goalDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

let kpiFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let kpiCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let kpiUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let kpiDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  strategicInitiative: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'initiative.findMany', args }); return initFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'initiative.findUnique', args }); return initFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'initiative.create', args }); return initCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'initiative.update', args }); return initUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'initiative.delete', args }); return initDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'initiative.count', args }); return initCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'initiative.groupBy', args }); return initGroupByImpl(args); },
  },
  milestone: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'milestone.findMany', args }); return milestoneFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'milestone.findUnique', args }); return milestoneFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'milestone.create', args }); return milestoneCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'milestone.update', args }); return milestoneUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'milestone.delete', args }); return milestoneDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'milestone.count', args }); return milestoneCountImpl(args); },
  },
  goal: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'goal.findMany', args }); return goalFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'goal.findUnique', args }); return goalFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'goal.create', args }); return goalCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'goal.update', args }); return goalUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'goal.delete', args }); return goalDeleteImpl(args); },
  },
  kpi: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'kpi.findMany', args }); return kpiFindManyImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'kpi.create', args }); return kpiCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'kpi.update', args }); return kpiUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'kpi.delete', args }); return kpiDeleteImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  initFindManyImpl = async () => [];
  initFindUniqueImpl = async () => null;
  initCreateImpl = async () => ({});
  initUpdateImpl = async () => ({});
  initDeleteImpl = async () => ({});
  initCountImpl = async () => 0;
  initGroupByImpl = async () => [];
  milestoneFindManyImpl = async () => [];
  milestoneFindUniqueImpl = async () => null;
  milestoneCreateImpl = async () => ({});
  milestoneUpdateImpl = async () => ({});
  milestoneDeleteImpl = async () => ({});
  milestoneCountImpl = async () => 0;
  goalFindManyImpl = async () => [];
  goalFindUniqueImpl = async () => null;
  goalCreateImpl = async () => ({});
  goalUpdateImpl = async () => ({});
  goalDeleteImpl = async () => ({});
  kpiFindManyImpl = async () => [];
  kpiCreateImpl = async () => ({});
  kpiUpdateImpl = async () => ({});
  kpiDeleteImpl = async () => ({});
}

const { StrategyService } = await import('@/lib/services/strategy-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('StrategyService', () => {
  beforeEach(() => resetMock());

  // ── Strategic Initiatives ──

  describe('createInitiative', () => {
    it('creates an initiative with defaults', async () => {
      initCreateImpl = async (args) => ({ id: 'i1', ...args.data });
      const result = await StrategyService.createInitiative('org1', {
        name: 'Digital Transformation',
        startDate: new Date('2026-01-01'),
      });
      assert.equal(result.name, 'Digital Transformation');
      assert.equal(result.status, 'planning');
      assert.equal(result.priority, 'medium');
      assert.equal(result.progress, 0);
    });

    it('clamps progress to 0-100', async () => {
      let captured: Record<string, unknown> = {};
      initCreateImpl = async (args) => { captured = args.data; return { id: 'i1' }; };
      await StrategyService.createInitiative('org1', {
        name: 'Init',
        startDate: new Date('2026-01-01'),
        progress: 150,
      });
      assert.equal(captured.progress, 100);
    });
  });

  describe('getInitiative', () => {
    it('returns initiative when found', async () => {
      initFindUniqueImpl = async () => ({ id: 'i1', name: 'Test' });
      const result = await StrategyService.getInitiative('i1');
      assert.equal(result?.id, 'i1');
    });

    it('returns null when not found', async () => {
      initFindUniqueImpl = async () => null;
      const result = await StrategyService.getInitiative('nonexistent');
      assert.equal(result, null);
    });
  });

  describe('listInitiatives', () => {
    it('applies filters', async () => {
      let captured: Record<string, unknown> = {};
      initFindManyImpl = async (args) => { captured = args.where; return []; };
      await StrategyService.listInitiatives('org1', { status: 'active', priority: 'high' });
      assert.equal(captured.status, 'active');
      assert.equal(captured.priority, 'high');
    });
  });

  describe('updateInitiative', () => {
    it('updates only provided fields', async () => {
      let captured: Record<string, unknown> = {};
      initUpdateImpl = async (args) => { captured = args.data; return { id: 'i1' }; };
      await StrategyService.updateInitiative('i1', { status: 'completed', progress: 80 });
      assert.equal(captured.status, 'completed');
      assert.equal(captured.progress, 80);
      assert.ok(!('name' in captured));
    });
  });

  describe('deleteInitiative', () => {
    it('calls prisma delete', async () => {
      initDeleteImpl = async () => ({ id: 'i1' });
      const result = await StrategyService.deleteInitiative('i1');
      assert.equal(result.id, 'i1');
    });
  });

  // ── Milestones ──

  describe('createMilestone', () => {
    it('creates a milestone with defaults', async () => {
      milestoneCreateImpl = async (args) => ({ id: 'ms1', ...args.data });
      const result = await StrategyService.createMilestone('org1', {
        name: 'MVP Launch',
        targetDate: new Date('2026-06-01'),
      });
      assert.equal(result.name, 'MVP Launch');
      assert.equal(result.status, 'planned');
      assert.equal(result.progress, 0);
    });

    it('links to initiative when provided', async () => {
      let captured: Record<string, unknown> = {};
      milestoneCreateImpl = async (args) => { captured = args.data; return { id: 'ms1' }; };
      await StrategyService.createMilestone('org1', {
        name: 'Phase 1',
        targetDate: new Date('2026-06-01'),
        initiativeId: 'i1',
      });
      assert.equal(captured.initiativeId, 'i1');
    });
  });

  describe('listMilestones', () => {
    it('filters by initiativeId', async () => {
      let captured: Record<string, unknown> = {};
      milestoneFindManyImpl = async (args) => { captured = args.where; return []; };
      await StrategyService.listMilestones('org1', { initiativeId: 'i1' });
      assert.equal(captured.initiativeId, 'i1');
    });
  });

  describe('updateMilestone', () => {
    it('updates milestone status', async () => {
      let captured: Record<string, unknown> = {};
      milestoneUpdateImpl = async (args) => { captured = args.data; return { id: 'ms1' }; };
      await StrategyService.updateMilestone('ms1', { status: 'achieved', achievedDate: new Date('2026-05-01') });
      assert.equal(captured.status, 'achieved');
      assert.ok(captured.achievedDate);
    });
  });

  describe('deleteMilestone', () => {
    it('calls prisma delete', async () => {
      milestoneDeleteImpl = async () => ({ id: 'ms1' });
      const result = await StrategyService.deleteMilestone('ms1');
      assert.equal(result.id, 'ms1');
    });
  });

  // ── OKRs ──

  describe('getOkRs', () => {
    it('returns goals with type objective', async () => {
      goalFindManyImpl = async () => [{ id: 'g1', title: 'Objective 1', kpis: [] }];
      const result = await StrategyService.getOkRs('org1');
      assert.equal(result.length, 1);
      assert.equal(result[0].title, 'Objective 1');
    });

    it('returns empty array on error', async () => {
      goalFindManyImpl = async () => { throw new Error('fail'); };
      const result = await StrategyService.getOkRs('org1');
      assert.deepEqual(result, []);
    });
  });

  describe('createOkR', () => {
    it('creates a goal and associated KPIs', async () => {
      let goalCreated = false;
      let kpiCount = 0;
      goalCreateImpl = async (args) => ({ id: 'g1', ...args.data, kpis: [] });
      kpiCreateImpl = async () => { kpiCount++; return { id: `k${kpiCount}` }; };
      goalUpdateImpl = async (args) => ({ id: 'g1', ...args.data, kpis: [{ id: 'k1' }] });
      const result = await StrategyService.createOkR('org1', {
        title: 'Increase Revenue',
        createdById: 'u1',
        keyResults: [
          { name: 'Reach $1M', target: 1000000, current: 500000 },
          { name: '100 customers', target: 100, current: 50 },
        ],
      });
      assert.equal(kpiCount, 2);
      assert.ok(goalCreated || calls.some(c => c.method === 'goal.create'));
    });

    it('creates OKR without key results', async () => {
      goalCreateImpl = async (args) => ({ id: 'g1', ...args.data, kpis: [] });
      goalUpdateImpl = async (args) => ({ id: 'g1', ...args.data, kpis: [] });
      const result = await StrategyService.createOkR('org1', {
        title: 'Simple OKR',
        createdById: 'u1',
      });
      assert.equal(result.id, 'g1');
    });
  });

  describe('getOkRProgress', () => {
    it('calculates progress from KPIs (direction up)', async () => {
      kpiFindManyImpl = async () => [
        { target: 100, current: 50, direction: 'up' },
        { target: 100, current: 75, direction: 'up' },
      ];
      const progress = await StrategyService.getOkRProgress('g1');
      // (0.5 + 0.75) / 2 = 0.625
      assert.equal(progress, 0.63);
    });

    it('calculates progress from KPIs (direction down)', async () => {
      kpiFindManyImpl = async () => [
        { target: 100, current: 30, direction: 'down' },
      ];
      const progress = await StrategyService.getOkRProgress('g1');
      // (100 - 30) / 100 = 0.7
      assert.equal(progress, 0.7);
    });

    it('returns 0 when no KPIs', async () => {
      kpiFindManyImpl = async () => [];
      const progress = await StrategyService.getOkRProgress('g1');
      assert.equal(progress, 0);
    });
  });

  describe('getAlignmentMatrix', () => {
    it('returns initiatives with aligned milestones and goals', async () => {
      initFindManyImpl = async () => [
        { id: 'i1', name: 'Init 1', status: 'active', progress: 50, owner: 'u1' },
      ];
      goalFindManyImpl = async () => [
        { id: 'g1', title: 'Goal 1', status: 'active', kpis: [] },
      ];
      milestoneFindManyImpl = async () => [
        { id: 'ms1', initiativeId: 'i1', name: 'M1', status: 'planned', progress: 0 },
        { id: 'ms2', initiativeId: 'i2', name: 'M2', status: 'planned', progress: 0 },
      ];
      const result = await StrategyService.getAlignmentMatrix('org1');
      assert.equal(result.totalGoals, 1);
      assert.equal(result.initiatives.length, 1);
      assert.equal(result.initiatives[0].milestones.length, 1);
      assert.equal(result.initiatives[0].milestones[0].id, 'ms1');
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      initCountImpl = async () => 5;
      initGroupByImpl = async (args) => {
        if (args.by[0] === 'status') return [{ status: 'active', _count: 3 }, { status: 'planning', _count: 2 }];
        if (args.by[0] === 'priority') return [{ priority: 'high', _count: 2 }, { priority: 'medium', _count: 3 }];
        return [];
      };
      milestoneCountImpl = async (args) => {
        if (args.where.status === 'achieved') return 3;
        return 10;
      };
      initFindManyImpl = async () => [{ progress: 50 }, { progress: 70 }];
      const result = await StrategyService.getStats('org1');
      assert.equal(result.totalInitiatives, 5);
      assert.equal(result.byStatus.active, 3);
      assert.equal(result.byPriority.high, 2);
      assert.equal(result.totalMilestones, 10);
      assert.equal(result.achievedMilestones, 3);
      assert.equal(result.avgProgress, 60);
    });
  });

  describe('getRoadmap', () => {
    it('returns initiatives and milestones ordered by date', async () => {
      initFindManyImpl = async () => [{ id: 'i1', name: 'Init 1', startDate: new Date('2026-01-01') }];
      milestoneFindManyImpl = async () => [{ id: 'ms1', name: 'M1', targetDate: new Date('2026-03-01') }];
      const result = await StrategyService.getRoadmap('org1');
      assert.equal(result.initiatives.length, 1);
      assert.equal(result.milestones.length, 1);
    });
  });
});
