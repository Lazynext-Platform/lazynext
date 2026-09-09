import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MetricFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type MetricCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    value: number;
    unit: string | null;
    dimensions: string;
    timestamp: Date;
  };
};

type KpiFindManyArgs = {
  where: { organizationId: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type GoalFindManyArgs = {
  where: { organizationId: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type AgentRunFindManyArgs = {
  where: { agent: { workspaceId: string } };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CountArgs = {
  where: Record<string, unknown>;
};

type WorkspaceFindFirstArgs = {
  where: { organizationId: string };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Mutable implementation functions ──

let metricFindManyImpl: (args: MetricFindManyArgs) => Promise<unknown[]> =
  async () => [];
let metricCreateImpl: (args: MetricCreateArgs) => Promise<unknown> =
  async () => ({});

let kpiFindManyImpl: (args: KpiFindManyArgs) => Promise<unknown[]> =
  async () => [];

let goalFindManyImpl: (args: GoalFindManyArgs) => Promise<unknown[]> =
  async () => [];

let agentRunFindManyImpl: (args: AgentRunFindManyArgs) => Promise<unknown[]> =
  async () => [];

let eventCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;

let automationRunCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;

let taskCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;

let agentDefCountImpl: (args: CountArgs) => Promise<number> =
  async () => 0;

let workspaceFindFirstImpl: (args: WorkspaceFindFirstArgs) => Promise<unknown> =
  async () => null;

const prismaMock = {
  metric: {
    findMany: (args: MetricFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'metric.findMany', args });
      return metricFindManyImpl(args);
    },
    create: (args: MetricCreateArgs): Promise<unknown> => {
      calls.push({ method: 'metric.create', args });
      return metricCreateImpl(args);
    },
  },
  kpi: {
    findMany: (args: KpiFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'kpi.findMany', args });
      return kpiFindManyImpl(args);
    },
  },
  goal: {
    findMany: (args: GoalFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
    },
  },
  agentRun: {
    findMany: (args: AgentRunFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'agentRun.findMany', args });
      return agentRunFindManyImpl(args);
    },
  },
  event: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'event.count', args });
      return eventCountImpl(args);
    },
  },
  automationRun: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'automationRun.count', args });
      return automationRunCountImpl(args);
    },
  },
  task: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'task.count', args });
      return taskCountImpl(args);
    },
  },
  agentDef: {
    count: (args: CountArgs): Promise<number> => {
      calls.push({ method: 'agentDef.count', args });
      return agentDefCountImpl(args);
    },
  },
  workspace: {
    findFirst: (args: WorkspaceFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findFirst', args });
      return workspaceFindFirstImpl(args);
    },
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
  metricFindManyImpl = async () => [];
  metricCreateImpl = async () => ({});
  kpiFindManyImpl = async () => [];
  goalFindManyImpl = async () => [];
  agentRunFindManyImpl = async () => [];
  eventCountImpl = async () => 0;
  automationRunCountImpl = async () => 0;
  taskCountImpl = async () => 0;
  agentDefCountImpl = async () => 0;
  workspaceFindFirstImpl = async () => null;
}

const { AnalyticsService } = await import('@/lib/services/analytics');

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsService
// ─────────────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  beforeEach(() => { resetMock(); });

  // ── recordMetric ──

  describe('recordMetric', () => {
    it('creates a metric record with the provided data', async () => {
      metricCreateImpl = async (args: MetricCreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.name, 'agent.runs.completed');
        assert.equal(args.data.value, 42);
        assert.equal(args.data.unit, 'count');
        assert.equal(args.data.dimensions, JSON.stringify({ agentId: 'a1' }));
        assert.ok(args.data.timestamp instanceof Date);
        return { id: 'm1', ...args.data };
      };

      const result = await AnalyticsService.recordMetric('org-1', {
        name: 'agent.runs.completed',
        value: 42,
        unit: 'count',
        dimensions: { agentId: 'a1' },
      });

      assert.ok(result);
      assert.equal((result as { id: string }).id, 'm1');
      assert.equal(calls[0].method, 'metric.create');
    });

    it('defaults workspaceId to null and dimensions to empty object', async () => {
      metricCreateImpl = async (args: MetricCreateArgs) => {
        assert.equal(args.data.workspaceId, null);
        assert.equal(args.data.dimensions, '{}');
        return { id: 'm2', ...args.data };
      };

      await AnalyticsService.recordMetric('org-1', {
        name: 'test.metric',
        value: 1,
      });
    });
  });

  // ── listMetrics ──

  describe('listMetrics', () => {
    it('returns metrics for an organization', async () => {
      metricFindManyImpl = async () =>
        ([{ id: 'm1', name: 'test.metric', value: 10, timestamp: new Date() }]);

      const result = await AnalyticsService.listMetrics('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'm1');
      assert.equal(calls[0].method, 'metric.findMany');
      const args = calls[0].args as MetricFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies name and date filters', async () => {
      metricFindManyImpl = async () => [];

      const since = new Date('2024-01-01');
      const until = new Date('2024-02-01');
      await AnalyticsService.listMetrics('org-1', {
        name: 'test.metric',
        since,
        until,
      });

      const args = calls[0].args as MetricFindManyArgs;
      assert.equal(args.where.name, 'test.metric');
      const ts = args.where.timestamp as Record<string, unknown>;
      assert.equal(ts.gte, since);
      assert.equal(ts.lte, until);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      metricFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await AnalyticsService.listMetrics('org-1');
      assert.deepEqual(result, []);
    });
  });

  // ── getMetricSeries ──

  describe('getMetricSeries', () => {
    it('returns time series grouped by day bucket', async () => {
      const day1 = new Date('2024-01-01T10:30:00Z');
      const day2 = new Date('2024-01-01T15:00:00Z');
      const day3 = new Date('2024-01-02T12:00:00Z');
      metricFindManyImpl = async () => ([
        { value: 10, timestamp: day1 },
        { value: 20, timestamp: day2 },
        { value: 30, timestamp: day3 },
      ]);

      const series = await AnalyticsService.getMetricSeries('org-1', 'test.metric');

      assert.equal(series.length, 2);
      // Day 1: 10 + 20 = 30, count 2
      assert.equal(series[0].value, 30);
      assert.equal(series[0].count, 2);
      // Day 2: 30, count 1
      assert.equal(series[1].value, 30);
      assert.equal(series[1].count, 1);
      // Sorted ascending
      assert.ok(series[0].bucket < series[1].bucket);
    });

    it('passes name and organizationId to the query', async () => {
      metricFindManyImpl = async () => [];

      await AnalyticsService.getMetricSeries('org-1', 'my.metric');

      const args = calls[0].args as MetricFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.name, 'my.metric');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      metricFindManyImpl = async () => { throw new Error('fail'); };

      const series = await AnalyticsService.getMetricSeries('org-1', 'test.metric');
      assert.deepEqual(series, []);
    });
  });

  // ── getKpiSummary ──

  describe('getKpiSummary', () => {
    it('returns KPIs with computed progress percentage', async () => {
      kpiFindManyImpl = async () => ([
        { id: 'k1', name: 'Revenue', description: null, target: 100, current: 75, unit: 'currency', period: 'monthly', direction: 'up', goalId: null },
        { id: 'k2', name: 'Churn', description: null, target: 10, current: 3, unit: 'percent', period: 'monthly', direction: 'down', goalId: 'g1' },
      ]);

      const kpis = await AnalyticsService.getKpiSummary('org-1');

      assert.equal(kpis.length, 2);
      assert.equal(kpis[0].id, 'k1');
      assert.equal(kpis[0].progress, 75); // 75/100 * 100
      // direction 'down': progress = (1 - 3/10) * 100 = 70
      assert.equal(kpis[1].progress, 70);
      assert.equal(kpis[1].goalId, 'g1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      kpiFindManyImpl = async () => { throw new Error('fail'); };

      const kpis = await AnalyticsService.getKpiSummary('org-1');
      assert.deepEqual(kpis, []);
    });

    it('handles zero target gracefully', async () => {
      kpiFindManyImpl = async () => ([
        { id: 'k1', name: 'Zero', description: null, target: 0, current: 5, unit: 'count', period: 'monthly', direction: 'up', goalId: null },
      ]);

      const kpis = await AnalyticsService.getKpiSummary('org-1');
      assert.equal(kpis[0].progress, 0);
    });
  });

  // ── getGoalProgress ──

  describe('getGoalProgress', () => {
    it('returns goals with progress and linked KPIs', async () => {
      goalFindManyImpl = async () => ([
        {
          id: 'g1',
          title: 'Grow Revenue',
          description: 'Q1 target',
          status: 'active',
          priority: 'high',
          progress: 0.65,
          type: 'objective',
          dueDate: new Date('2024-03-31'),
          kpis: [{ id: 'k1', name: 'MRR', current: 65, target: 100, unit: 'currency' }],
          _count: { kpis: 1 },
        },
      ]);

      const goals = await AnalyticsService.getGoalProgress('org-1');

      assert.equal(goals.length, 1);
      assert.equal(goals[0].id, 'g1');
      assert.equal(goals[0].progress, 65); // 0.65 * 100
      assert.equal(goals[0].kpiCount, 1);
      assert.equal(goals[0].kpis.length, 1);
      assert.equal(goals[0].kpis[0].name, 'MRR');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      goalFindManyImpl = async () => { throw new Error('fail'); };

      const goals = await AnalyticsService.getGoalProgress('org-1');
      assert.deepEqual(goals, []);
    });
  });

  // ── getAgentPerformance ──

  describe('getAgentPerformance', () => {
    it('aggregates agent run stats correctly', async () => {
      const now = Date.now();
      agentRunFindManyImpl = async () => ([
        {
          id: 'r1',
          status: 'completed',
          startedAt: new Date(now - 10000),
          completedAt: new Date(now),
          toolCalls: JSON.stringify([{ tool: 'a' }, { tool: 'b' }]),
          costCredits: 5,
          agent: { id: 'a1', name: 'CEO Agent' },
        },
        {
          id: 'r2',
          status: 'failed',
          startedAt: new Date(now - 5000),
          completedAt: null,
          toolCalls: JSON.stringify([{ tool: 'c' }]),
          costCredits: 2,
          agent: { id: 'a1', name: 'CEO Agent' },
        },
        {
          id: 'r3',
          status: 'completed',
          startedAt: new Date(now - 20000),
          completedAt: new Date(now - 15000),
          toolCalls: '[]',
          costCredits: 0,
          agent: { id: 'a2', name: 'Research Agent' },
        },
      ]);

      const stats = await AnalyticsService.getAgentPerformance('ws-1');

      assert.equal(stats.totalRuns, 3);
      assert.equal(stats.byStatus.completed, 2);
      assert.equal(stats.byStatus.failed, 1);
      assert.equal(stats.successRate, 67); // 2/3 * 100 = 66.67 -> 67
      assert.equal(stats.totalCredits, 7);
      // Tool calls: 2 + 1 + 0 = 3, per run = 3/3 = 1
      assert.equal(stats.toolCallsPerRun, 1);
      // Most active agents sorted by runs
      assert.equal(stats.mostActiveAgents[0].agentId, 'a1');
      assert.equal(stats.mostActiveAgents[0].runs, 2);
      assert.equal(stats.mostActiveAgents[1].agentId, 'a2');
      assert.equal(stats.mostActiveAgents[1].runs, 1);
    });

    it('returns zero stats when no runs exist', async () => {
      agentRunFindManyImpl = async () => [];

      const stats = await AnalyticsService.getAgentPerformance('ws-1');

      assert.equal(stats.totalRuns, 0);
      assert.equal(stats.successRate, 0);
      assert.equal(stats.avgDurationSec, 0);
      assert.equal(stats.mostActiveAgents.length, 0);
    });

    it('returns zero stats on error (safePrisma fallback)', async () => {
      agentRunFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await AnalyticsService.getAgentPerformance('ws-1');
      assert.equal(stats.totalRuns, 0);
      assert.equal(stats.successRate, 0);
    });
  });

  // ── getSystemHealth ──

  describe('getSystemHealth', () => {
    it('aggregates system health metrics', async () => {
      // Return values based on the where clause, not call order,
      // because the service uses Promise.all (concurrent calls).
      eventCountImpl = async (args: CountArgs) => {
        // total events vs error events
        if (args.where?.type && typeof args.where.type === 'object' && 'contains' in (args.where.type as Record<string, unknown>)) {
          return 5; // error events
        }
        return 100; // total events
      };
      automationRunCountImpl = async (args: CountArgs) => {
        if (args.where?.status === 'completed') return 40;
        if (args.where?.status === 'failed') return 10;
        return 50; // total runs
      };
      taskCountImpl = async (args: CountArgs) => {
        if (args.where?.status === 'done') return 30;
        return 15; // pending (status: { in: ['todo', 'in_progress'] })
      };
      agentDefCountImpl = async () => 3;

      const health = await AnalyticsService.getSystemHealth('org-1');

      assert.equal(health.totalEvents, 100);
      assert.equal(health.errorEvents, 5);
      assert.equal(health.automationRuns, 50);
      assert.equal(health.automationSuccessRate, 80); // 40/50 * 100
      assert.equal(health.pendingTasks, 15);
      assert.equal(health.completedTasks, 30);
      assert.equal(health.activeAgents, 3);
    });

    it('returns zero values on error (safePrisma fallback)', async () => {
      eventCountImpl = async () => { throw new Error('fail'); };
      automationRunCountImpl = async () => { throw new Error('fail'); };
      taskCountImpl = async () => { throw new Error('fail'); };
      agentDefCountImpl = async () => { throw new Error('fail'); };

      const health = await AnalyticsService.getSystemHealth('org-1');

      assert.equal(health.totalEvents, 0);
      assert.equal(health.errorEvents, 0);
      assert.equal(health.automationRuns, 0);
      assert.equal(health.automationSuccessRate, 0);
      assert.equal(health.pendingTasks, 0);
      assert.equal(health.completedTasks, 0);
      assert.equal(health.activeAgents, 0);
    });
  });

  // ── getDashboardData ──

  describe('getDashboardData', () => {
    it('combines KPIs, goals, agent performance, system health, and recent metrics', async () => {
      workspaceFindFirstImpl = async () => ({ id: 'ws-1' });
      kpiFindManyImpl = async () => ([
        { id: 'k1', name: 'Revenue', description: null, target: 100, current: 50, unit: 'currency', period: 'monthly', direction: 'up', goalId: null },
      ]);
      goalFindManyImpl = async () => ([
        {
          id: 'g1', title: 'Goal 1', description: null, status: 'active', priority: 'high',
          progress: 0.5, type: 'objective', dueDate: null,
          kpis: [], _count: { kpis: 0 },
        },
      ]);
      agentRunFindManyImpl = async () => ([
        {
          id: 'r1', status: 'completed', startedAt: new Date(), completedAt: new Date(),
          toolCalls: '[]', costCredits: 0, agent: { id: 'a1', name: 'Agent 1' },
        },
      ]);
      eventCountImpl = async () => 10;
      automationRunCountImpl = async () => 5;
      taskCountImpl = async () => 3;
      agentDefCountImpl = async () => 1;
      // recentMetrics uses metric.findMany
      metricFindManyImpl = async () => ([
        { id: 'm1', name: 'test.metric', value: 42, unit: 'count', timestamp: new Date() },
      ]);

      const data = await AnalyticsService.getDashboardData('org-1');

      assert.equal(data.kpis.length, 1);
      assert.equal(data.kpis[0].name, 'Revenue');
      assert.equal(data.goals.length, 1);
      assert.equal(data.goals[0].title, 'Goal 1');
      assert.equal(data.agentPerformance.totalRuns, 1);
      assert.equal(data.systemHealth.totalEvents, 10);
      assert.equal(data.recentMetrics.length, 1);
      assert.equal(data.recentMetrics[0].name, 'test.metric');
    });

    it('handles no workspace gracefully with zero agent performance', async () => {
      workspaceFindFirstImpl = async () => null;
      kpiFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];
      eventCountImpl = async () => 0;
      automationRunCountImpl = async () => 0;
      taskCountImpl = async () => 0;
      agentDefCountImpl = async () => 0;
      metricFindManyImpl = async () => [];

      const data = await AnalyticsService.getDashboardData('org-1');

      assert.equal(data.agentPerformance.totalRuns, 0);
      assert.equal(data.agentPerformance.mostActiveAgents.length, 0);
      assert.equal(data.kpis.length, 0);
      assert.equal(data.recentMetrics.length, 0);
    });
  });
});
