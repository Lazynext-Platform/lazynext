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
    type: 'eng_metric',
    content: JSON.stringify({
      type: 'velocity',
      value: 45,
      unit: 'count',
      period: 'Sprint 42',
      team: 'Platform',
      project: 'Atlas',
      measuredDate: '2028-01-15',
      target: 50,
      trend: 'up',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['eng_metric', 'velocity', 'count', 'up']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeSprintRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'sprint_report',
    content: JSON.stringify({
      name: 'Sprint 42',
      team: 'Platform',
      startDate: '2028-01-01',
      endDate: '2028-01-15',
      status: 'planned',
      plannedPoints: 50,
      completedPoints: 0,
      committedPoints: 45,
      addedPoints: 0,
      removedPoints: 0,
      teamMembers: ['Alice', 'Bob'],
      goal: 'Ship feature X',
      retrospective: '',
      notes: '',
    }),
    tags: JSON.stringify(['sprint_report', 'Platform', 'planned']),
    ...overrides,
  });
}

function makeQualityRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-q1',
    type: 'code_quality',
    content: JSON.stringify({
      type: 'code_coverage',
      status: 'good',
      score: 85,
      description: 'Coverage above target',
      project: 'Atlas',
      measuredDate: '2028-01-10',
      target: 80,
      trend: 'up',
      issues: [],
      recommendations: ['Increase test coverage for edge cases'],
      measuredBy: 'Alice',
      notes: '',
    }),
    tags: JSON.stringify(['code_quality', 'code_coverage', 'good', 'up']),
    ...overrides,
  });
}

function makeHealthRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-h1',
    type: 'team_health',
    content: JSON.stringify({
      category: 'morale',
      status: 'healthy',
      score: 8,
      description: 'Team morale is high',
      team: 'Platform',
      measuredDate: '2028-01-12',
      trend: 'up',
      factors: ['Recent wins', 'Good collaboration'],
      recommendations: [],
      actionItems: [],
      notes: '',
    }),
    tags: JSON.stringify(['team_health', 'morale', 'healthy', 'up']),
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

const { EngineeringManagementService } = await import('@/lib/services/engineering-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics
// ─────────────────────────────────────────────────────────────────────────────

describe('EngineeringManagementService — Metrics', () => {
  beforeEach(() => resetMock());

  it('creates a metric with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await EngineeringManagementService.createMetric('org-1', 'ws-1', {
      type: 'velocity', value: 40, unit: 'count',
    }, 'user-1');
    assert.equal(m.type, 'velocity');
    assert.equal(m.value, 40);
    assert.equal(m.unit, 'count');
    assert.equal(m.trend, 'stable');
    assert.equal(m.team, '');
    assert.equal(m.target, null);
  });

  it('creates a metric with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await EngineeringManagementService.createMetric('org-1', 'ws-1', {
      type: 'code_coverage', value: 88, unit: 'percentage',
      period: 'Q1 2028', team: 'Backend', project: 'API',
      measuredDate: '2028-01-01', target: 90, trend: 'up', notes: 'Improving',
    }, 'user-1');
    assert.equal(m.type, 'code_coverage');
    assert.equal(m.value, 88);
    assert.equal(m.unit, 'percentage');
    assert.equal(m.team, 'Backend');
    assert.equal(m.project, 'API');
    assert.equal(m.target, 90);
    assert.equal(m.trend, 'up');
  });

  it('gets a metric by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const m = await EngineeringManagementService.getMetric('mem-1');
    assert.ok(m);
    assert.equal(m!.id, 'mem-1');
    assert.equal(m!.type, 'velocity');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'sprint_report' });
    const m = await EngineeringManagementService.getMetric('mem-1');
    assert.equal(m, null);
  });

  it('returns null when metric not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await EngineeringManagementService.getMetric('nope');
    assert.equal(m, null);
  });

  it('lists metrics by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'eng_metric') return [makeRow()];
      return [];
    };
    const list = await EngineeringManagementService.listMetrics('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'velocity');
  });

  it('updates a metric', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EngineeringManagementService.updateMetric('mem-1', { value: 55, trend: 'up' });
    assert.ok(m);
    assert.equal(m!.value, 55);
    assert.equal(m!.trend, 'up');
  });

  it('deletes a metric', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EngineeringManagementService.deleteMetric('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Sprints
// ─────────────────────────────────────────────────────────────────────────────

describe('EngineeringManagementService — Sprints', () => {
  beforeEach(() => resetMock());

  it('creates a sprint with defaults', async () => {
    memCreateImpl = async (args) => makeSprintRow({ content: args.data.content as string });
    const s = await EngineeringManagementService.createSprint('org-1', 'ws-1', {
      name: 'Sprint 43', team: 'Frontend', startDate: '2028-02-01', endDate: '2028-02-15',
    }, 'user-1');
    assert.equal(s.name, 'Sprint 43');
    assert.equal(s.status, 'planned');
    assert.equal(s.plannedPoints, 0);
    assert.equal(s.teamMembers.length, 0);
  });

  it('creates a sprint with full input', async () => {
    memCreateImpl = async (args) => makeSprintRow({ content: args.data.content as string });
    const s = await EngineeringManagementService.createSprint('org-1', 'ws-1', {
      name: 'Sprint 44', team: 'Backend', startDate: '2028-03-01', endDate: '2028-03-15',
      status: 'active', plannedPoints: 60, completedPoints: 40, committedPoints: 55,
      addedPoints: 5, removedPoints: 2, teamMembers: ['A', 'B', 'C'],
      goal: 'Ship API v2', retrospective: 'Went well', notes: 'Good sprint',
    }, 'user-1');
    assert.equal(s.name, 'Sprint 44');
    assert.equal(s.status, 'active');
    assert.equal(s.plannedPoints, 60);
    assert.equal(s.completedPoints, 40);
    assert.equal(s.teamMembers.length, 3);
    assert.equal(s.goal, 'Ship API v2');
  });

  it('gets a sprint by id', async () => {
    memFindUniqueImpl = async () => makeSprintRow();
    const s = await EngineeringManagementService.getSprint('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Sprint 42');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSprintRow({ type: 'eng_metric' });
    const s = await EngineeringManagementService.getSprint('mem-s1');
    assert.equal(s, null);
  });

  it('lists sprints by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'sprint_report') return [makeSprintRow()];
      return [];
    };
    const list = await EngineeringManagementService.listSprints('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a sprint', async () => {
    memFindUniqueImpl = async () => makeSprintRow();
    memUpdateImpl = async (args) => makeSprintRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await EngineeringManagementService.updateSprint('mem-s1', { completedPoints: 45 });
    assert.ok(s);
    assert.equal(s!.completedPoints, 45);
  });

  it('deletes a sprint', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await EngineeringManagementService.deleteSprint('mem-s1');
    assert.equal(ok, true);
  });

  it('startSprint sets status to active', async () => {
    memFindUniqueImpl = async () => makeSprintRow();
    memUpdateImpl = async (args) => makeSprintRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await EngineeringManagementService.startSprint('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('completeSprint sets status to completed', async () => {
    memFindUniqueImpl = async () => makeSprintRow();
    memUpdateImpl = async (args) => makeSprintRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await EngineeringManagementService.completeSprint('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Code Quality
// ─────────────────────────────────────────────────────────────────────────────

describe('EngineeringManagementService — Code Quality', () => {
  beforeEach(() => resetMock());

  it('creates a quality report with defaults', async () => {
    memCreateImpl = async (args) => makeQualityRow({ content: args.data.content as string });
    const q = await EngineeringManagementService.createQuality('org-1', 'ws-1', {
      type: 'technical_debt', status: 'warning', score: 35,
    }, 'user-1');
    assert.equal(q.type, 'technical_debt');
    assert.equal(q.status, 'warning');
    assert.equal(q.score, 35);
    assert.equal(q.trend, 'stable');
    assert.equal(q.issues.length, 0);
  });

  it('creates a quality report with full input', async () => {
    memCreateImpl = async (args) => makeQualityRow({ content: args.data.content as string });
    const q = await EngineeringManagementService.createQuality('org-1', 'ws-1', {
      type: 'complexity', status: 'critical', score: 12,
      description: 'High complexity', project: 'Core',
      measuredDate: '2028-01-05', target: 10, trend: 'down',
      issues: ['Module A too complex', 'Module B needs refactor'],
      recommendations: ['Break down module A'],
      measuredBy: 'Bob', notes: 'Needs attention',
    }, 'user-1');
    assert.equal(q.type, 'complexity');
    assert.equal(q.status, 'critical');
    assert.equal(q.project, 'Core');
    assert.equal(q.issues.length, 2);
    assert.equal(q.measuredBy, 'Bob');
  });

  it('gets a quality report by id', async () => {
    memFindUniqueImpl = async () => makeQualityRow();
    const q = await EngineeringManagementService.getQuality('mem-q1');
    assert.ok(q);
    assert.equal(q!.type, 'code_coverage');
    assert.equal(q!.score, 85);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeQualityRow({ type: 'eng_metric' });
    const q = await EngineeringManagementService.getQuality('mem-q1');
    assert.equal(q, null);
  });

  it('lists quality reports by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'code_quality') return [makeQualityRow()];
      return [];
    };
    const list = await EngineeringManagementService.listQualities('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a quality report', async () => {
    memFindUniqueImpl = async () => makeQualityRow();
    memUpdateImpl = async (args) => makeQualityRow({ id: 'mem-q1', content: args.data.content as string });
    const q = await EngineeringManagementService.updateQuality('mem-q1', { score: 90, status: 'improving' });
    assert.ok(q);
    assert.equal(q!.score, 90);
    assert.equal(q!.status, 'improving');
  });

  it('deletes a quality report', async () => {
    memDeleteImpl = async () => ({ id: 'mem-q1' });
    const ok = await EngineeringManagementService.deleteQuality('mem-q1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Team Health
// ─────────────────────────────────────────────────────────────────────────────

describe('EngineeringManagementService — Team Health', () => {
  beforeEach(() => resetMock());

  it('creates a health report with defaults', async () => {
    memCreateImpl = async (args) => makeHealthRow({ content: args.data.content as string });
    const h = await EngineeringManagementService.createHealth('org-1', 'ws-1', {
      category: 'burnout_risk', status: 'at_risk', score: 6,
    }, 'user-1');
    assert.equal(h.category, 'burnout_risk');
    assert.equal(h.status, 'at_risk');
    assert.equal(h.score, 6);
    assert.equal(h.trend, 'stable');
    assert.equal(h.factors.length, 0);
  });

  it('creates a health report with full input', async () => {
    memCreateImpl = async (args) => makeHealthRow({ content: args.data.content as string });
    const h = await EngineeringManagementService.createHealth('org-1', 'ws-1', {
      category: 'retention', status: 'healthy', score: 9,
      description: 'Low attrition', team: 'Backend',
      measuredDate: '2028-01-08', trend: 'up',
      factors: ['Good compensation', 'Clear growth path'],
      recommendations: ['Continue mentorship program'],
      actionItems: ['Schedule 1:1s'],
      notes: 'All good',
    }, 'user-1');
    assert.equal(h.category, 'retention');
    assert.equal(h.status, 'healthy');
    assert.equal(h.team, 'Backend');
    assert.equal(h.factors.length, 2);
    assert.equal(h.actionItems.length, 1);
  });

  it('gets a health report by id', async () => {
    memFindUniqueImpl = async () => makeHealthRow();
    const h = await EngineeringManagementService.getHealth('mem-h1');
    assert.ok(h);
    assert.equal(h!.category, 'morale');
    assert.equal(h!.score, 8);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeHealthRow({ type: 'eng_metric' });
    const h = await EngineeringManagementService.getHealth('mem-h1');
    assert.equal(h, null);
  });

  it('lists health reports by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'team_health') return [makeHealthRow()];
      return [];
    };
    const list = await EngineeringManagementService.listHealths('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a health report', async () => {
    memFindUniqueImpl = async () => makeHealthRow();
    memUpdateImpl = async (args) => makeHealthRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await EngineeringManagementService.updateHealth('mem-h1', { score: 9, status: 'improving' });
    assert.ok(h);
    assert.equal(h!.score, 9);
    assert.equal(h!.status, 'improving');
  });

  it('deletes a health report', async () => {
    memDeleteImpl = async () => ({ id: 'mem-h1' });
    const ok = await EngineeringManagementService.deleteHealth('mem-h1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics Summary & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EngineeringManagementService — Metrics Summary & Stats', () => {
  beforeEach(() => resetMock());

  it('getEngineeringMetrics returns correct summary', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'eng_metric') return [
        makeRow({ id: 'm1', content: JSON.stringify({ type: 'velocity', value: 40, unit: 'count', team: '', project: '', period: '', trend: 'up', notes: '', target: null, measuredDate: null }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ type: 'velocity', value: 50, unit: 'count', team: '', project: '', period: '', trend: 'up', notes: '', target: null, measuredDate: null }) }),
        makeRow({ id: 'm3', content: JSON.stringify({ type: 'deployment_frequency', value: 10, unit: 'count', team: '', project: '', period: '', trend: 'stable', notes: '', target: null, measuredDate: null }) }),
        makeRow({ id: 'm4', content: JSON.stringify({ type: 'code_coverage', value: 85, unit: 'percentage', team: '', project: '', period: '', trend: 'up', notes: '', target: null, measuredDate: null }) }),
        makeRow({ id: 'm5', content: JSON.stringify({ type: 'mttr', value: 4, unit: 'hours', team: '', project: '', period: '', trend: 'down', notes: '', target: null, measuredDate: null }) }),
      ];
      if (t === 'sprint_report') return [
        makeSprintRow({ content: JSON.stringify({ name: 'S1', team: 'T', startDate: '2028-01-01', endDate: '2028-01-15', status: 'active', plannedPoints: 0, completedPoints: 0, committedPoints: 0, addedPoints: 0, removedPoints: 0, teamMembers: [], goal: '', retrospective: '', notes: '' }) }),
        makeSprintRow({ id: 's2', content: JSON.stringify({ name: 'S2', team: 'T', startDate: '2028-01-01', endDate: '2028-01-15', status: 'planned', plannedPoints: 0, completedPoints: 0, committedPoints: 0, addedPoints: 0, removedPoints: 0, teamMembers: [], goal: '', retrospective: '', notes: '' }) }),
      ];
      if (t === 'team_health') return [
        makeHealthRow({ content: JSON.stringify({ category: 'morale', status: 'healthy', score: 8, description: '', team: '', measuredDate: null, trend: 'stable', factors: [], recommendations: [], actionItems: [], notes: '' }) }),
        makeHealthRow({ id: 'h2', content: JSON.stringify({ category: 'burnout_risk', status: 'at_risk', score: 6, description: '', team: '', measuredDate: null, trend: 'stable', factors: [], recommendations: [], actionItems: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await EngineeringManagementService.getEngineeringMetrics('org-1');
    assert.equal(m.averageVelocity, 45);
    assert.equal(m.deploymentFrequency, 10);
    assert.equal(m.codeCoverage, 85);
    assert.equal(m.mttr, 4);
    assert.equal(m.activeSprints, 1);
    assert.equal(m.healthSummary['healthy'], 1);
    assert.equal(m.healthSummary['at_risk'], 1);
  });

  it('getEngineeringStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'eng_metric') return [makeRow()];
      if (t === 'sprint_report') return [makeSprintRow()];
      if (t === 'code_quality') return [makeQualityRow()];
      if (t === 'team_health') return [makeHealthRow()];
      return [];
    };
    const s = await EngineeringManagementService.getEngineeringStats('org-1');
    assert.equal(s.metricCount, 1);
    assert.equal(s.sprintCount, 1);
    assert.equal(s.qualityCount, 1);
    assert.equal(s.healthCount, 1);
    assert.equal(s.byMetricType['velocity'], 1);
    assert.equal(s.bySprintStatus['planned'], 1);
    assert.equal(s.byQualityType['code_coverage'], 1);
    assert.equal(s.byQualityStatus['good'], 1);
    assert.equal(s.byHealthCategory['morale'], 1);
    assert.equal(s.byHealthStatus['healthy'], 1);
  });
});
