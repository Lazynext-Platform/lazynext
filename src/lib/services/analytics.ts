import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface MetricInput {
  workspaceId?: string;
  name: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, unknown>;
  timestamp?: Date;
}

export interface ListMetricsOptions {
  workspaceId?: string;
  name?: string;
  since?: Date;
  until?: Date;
  dimensions?: Record<string, unknown>;
  limit?: number;
}

export interface MetricSeriesOptions {
  workspaceId?: string;
  since?: Date;
  until?: Date;
  bucket?: 'hour' | 'day' | 'week';
  limit?: number;
}

export interface MetricSeriesPoint {
  bucket: string; // ISO timestamp truncated to bucket
  value: number;
  count: number;
}

export interface KpiSummary {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  period: string;
  direction: string;
  progress: number; // 0-100
  goalId: string | null;
}

export interface GoalProgress {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number; // 0-100
  type: string;
  dueDate: Date | null;
  kpiCount: number;
  kpis: { id: string; name: string; current: number; target: number; unit: string }[];
}

export interface AgentPerformanceStats {
  totalRuns: number;
  byStatus: Record<string, number>;
  successRate: number; // 0-100
  avgDurationSec: number;
  toolCallsPerRun: number;
  totalCredits: number;
  mostActiveAgents: {
    agentId: string;
    agentName: string;
    runs: number;
    successRate: number;
    avgDurationSec: number;
  }[];
}

export interface SystemHealthSummary {
  totalEvents: number;
  errorEvents: number;
  automationRuns: number;
  automationSuccessRate: number; // 0-100
  pendingTasks: number;
  completedTasks: number;
  activeAgents: number;
}

export interface DashboardData {
  kpis: KpiSummary[];
  goals: GoalProgress[];
  agentPerformance: AgentPerformanceStats;
  systemHealth: SystemHealthSummary;
  recentMetrics: {
    id: string;
    name: string;
    value: number;
    unit: string | null;
    timestamp: Date;
  }[];
}

// ── Helpers ──

/**
 * Truncate a Date to the start of the given time bucket.
 */
function truncateToBucket(date: Date, bucket: 'hour' | 'day' | 'week'): Date {
  const d = new Date(date);
  if (bucket === 'hour') {
    d.setMinutes(0, 0, 0);
  } else if (bucket === 'day') {
    d.setHours(0, 0, 0, 0);
  } else if (bucket === 'week') {
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
  }
  return d;
}

/**
 * Compute progress percentage for a KPI respecting direction.
 */
function computeKpiProgress(current: number, target: number, direction: string): number {
  if (target === 0) return 0;
  if (direction === 'down') {
    // Lower is better — progress is how close current is to 0 relative to target
    return Math.max(0, Math.min(100, Math.round((1 - current / target) * 100)));
  }
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

// ── Analytics Service ──

export const AnalyticsService = {
  /**
   * Record a new metric.
   */
  async recordMetric(organizationId: string, input: MetricInput) {
    return prisma.metric.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 200),
        value: input.value,
        unit: input.unit?.slice(0, 50) || null,
        dimensions: JSON.stringify(input.dimensions || {}),
        timestamp: input.timestamp || new Date(),
      },
    });
  },

  /**
   * List metrics with optional filters.
   */
  async listMetrics(organizationId: string, opts?: ListMetricsOptions) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.name) where.name = opts.name;
    if (opts?.since || opts?.until) {
      where.timestamp = {};
      if (opts?.since) (where.timestamp as Record<string, unknown>).gte = opts.since;
      if (opts?.until) (where.timestamp as Record<string, unknown>).lte = opts.until;
    }
    if (opts?.dimensions) {
      // Dimensions are stored as JSON string — filter by string path match
      where.dimensions = { contains: JSON.stringify(opts.dimensions).slice(0, -2) };
    }

    return safePrisma(() =>
      prisma.metric.findMany({
        where: where as never,
        orderBy: { timestamp: 'desc' },
        take: opts?.limit ?? 200,
      }),
    []);
  },

  /**
   * Get a time series for a specific metric name, grouped by time bucket.
   */
  async getMetricSeries(
    organizationId: string,
    name: string,
    opts?: MetricSeriesOptions,
  ): Promise<MetricSeriesPoint[]> {
    const bucket = opts?.bucket ?? 'day';
    const since = opts?.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const until = opts?.until ?? new Date();

    const where: Record<string, unknown> = {
      organizationId,
      name,
      timestamp: { gte: since, lte: until },
    };
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;

    const metrics = await safePrisma(() =>
      prisma.metric.findMany({
        where: where as never,
        orderBy: { timestamp: 'asc' },
        take: opts?.limit ?? 1000,
        select: { value: true, timestamp: true },
      }),
    []);

    // Group into buckets
    const buckets: Record<string, { sum: number; count: number }> = {};
    for (const m of metrics) {
      const bucketStart = truncateToBucket(m.timestamp, bucket);
      const key = bucketStart.toISOString();
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0 };
      buckets[key].sum += m.value;
      buckets[key].count += 1;
    }

    return Object.entries(buckets)
      .map(([key, v]) => ({
        bucket: key,
        value: v.sum,
        count: v.count,
      }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  },

  /**
   * List all KPIs with their current vs target and progress percentage.
   */
  async getKpiSummary(organizationId: string): Promise<KpiSummary[]> {
    const kpis = await safePrisma(() =>
      prisma.kpi.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);

    return kpis.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      target: k.target,
      current: k.current,
      unit: k.unit,
      period: k.period,
      direction: k.direction,
      progress: computeKpiProgress(k.current, k.target, k.direction),
      goalId: k.goalId,
    }));
  },

  /**
   * List goals with progress, status, and linked KPIs.
   */
  async getGoalProgress(organizationId: string): Promise<GoalProgress[]> {
    const goals = await safePrisma(() =>
      prisma.goal.findMany({
        where: { organizationId },
        include: {
          kpis: { select: { id: true, name: true, current: true, target: true, unit: true } },
          _count: { select: { kpis: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
    []);

    return goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      status: g.status,
      priority: g.priority,
      progress: Math.round(g.progress * 100),
      type: g.type,
      dueDate: g.dueDate,
      kpiCount: g._count?.kpis ?? g.kpis?.length ?? 0,
      kpis: g.kpis.map((k) => ({
        id: k.id,
        name: k.name,
        current: k.current,
        target: k.target,
        unit: k.unit,
      })),
    }));
  },

  /**
   * Aggregate AgentRun stats: total runs, by status, average duration,
   * success rate, tool calls per run, most active agents.
   */
  async getAgentPerformance(workspaceId: string): Promise<AgentPerformanceStats> {
    const runs = await safePrisma(() =>
      prisma.agentRun.findMany({
        where: { agent: { workspaceId } },
        include: {
          agent: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 500,
      }),
    []);

    const totalRuns = runs.length;
    const byStatus: Record<string, number> = {};
    let completed = 0;
    let totalDurationSec = 0;
    let durationCount = 0;
    let totalToolCalls = 0;
    let totalCredits = 0;

    const agentMap: Record<string, {
      agentId: string;
      agentName: string;
      runs: number;
      completed: number;
      totalDurationSec: number;
      durationCount: number;
    }> = {};

    for (const r of runs) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'completed') completed++;

      // Duration for completed runs
      if (r.completedAt && r.startedAt) {
        const dur = (r.completedAt.getTime() - r.startedAt.getTime()) / 1000;
        if (Number.isFinite(dur) && dur >= 0) {
          totalDurationSec += dur;
          durationCount += 1;
        }
      }

      // Tool calls
      try {
        const calls = JSON.parse(r.toolCalls || '[]');
        if (Array.isArray(calls)) totalToolCalls += calls.length;
      } catch {
        // ignore parse errors
      }

      totalCredits += r.costCredits || 0;

      // Per-agent aggregation
      const aid = r.agent?.id || 'unknown';
      const aname = r.agent?.name || 'Unknown';
      if (!agentMap[aid]) {
        agentMap[aid] = { agentId: aid, agentName: aname, runs: 0, completed: 0, totalDurationSec: 0, durationCount: 0 };
      }
      agentMap[aid].runs += 1;
      if (r.status === 'completed') agentMap[aid].completed += 1;
      if (r.completedAt && r.startedAt) {
        const dur = (r.completedAt.getTime() - r.startedAt.getTime()) / 1000;
        if (Number.isFinite(dur) && dur >= 0) {
          agentMap[aid].totalDurationSec += dur;
          agentMap[aid].durationCount += 1;
        }
      }
    }

    const successRate = totalRuns > 0 ? Math.round((completed / totalRuns) * 100) : 0;
    const avgDurationSec = durationCount > 0 ? Math.round(totalDurationSec / durationCount) : 0;
    const toolCallsPerRun = totalRuns > 0 ? Math.round((totalToolCalls / totalRuns) * 100) / 100 : 0;

    const mostActiveAgents = Object.values(agentMap)
      .map((a) => ({
        agentId: a.agentId,
        agentName: a.agentName,
        runs: a.runs,
        successRate: a.runs > 0 ? Math.round((a.completed / a.runs) * 100) : 0,
        avgDurationSec: a.durationCount > 0 ? Math.round(a.totalDurationSec / a.durationCount) : 0,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10);

    return {
      totalRuns,
      byStatus,
      successRate,
      avgDurationSec,
      toolCallsPerRun,
      totalCredits,
      mostActiveAgents,
    };
  },

  /**
   * Aggregate system health: total events, error events, automation runs,
   * automation success rate, pending tasks, completed tasks, active agents.
   */
  async getSystemHealth(organizationId: string): Promise<SystemHealthSummary> {
    const [
      totalEvents,
      errorEvents,
      automationRuns,
      automationCompleted,
      automationFailed,
      pendingTasks,
      completedTasks,
      activeAgents,
    ] = await Promise.all([
      safePrisma(() => prisma.event.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.event.count({ where: { organizationId, type: { contains: 'error' } } }), 0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: { automation: { workspace: { organizationId } } },
        }),
      0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: { automation: { workspace: { organizationId } }, status: 'completed' },
        }),
      0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: { automation: { workspace: { organizationId } }, status: 'failed' },
        }),
      0),
      safePrisma(() =>
        prisma.task.count({
          where: {
            project: { workspace: { organizationId } },
            deletedAt: null,
            status: { in: ['todo', 'in_progress'] },
          },
        }),
      0),
      safePrisma(() =>
        prisma.task.count({
          where: {
            project: { workspace: { organizationId } },
            deletedAt: null,
            status: 'done',
          },
        }),
      0),
      safePrisma(() =>
        prisma.agentDef.count({
          where: { workspace: { organizationId }, enabled: true },
        }),
      0),
    ]);

    const automationSuccessRate = automationRuns > 0
      ? Math.round((automationCompleted / automationRuns) * 100)
      : 0;

    return {
      totalEvents,
      errorEvents,
      automationRuns,
      automationSuccessRate,
      pendingTasks,
      completedTasks,
      activeAgents,
    };
  },

  /**
   * Combined dashboard data: KPIs, goals, agent performance, system health, recent metrics.
   */
  async getDashboardData(organizationId: string, workspaceId?: string): Promise<DashboardData> {
    // Determine the workspace to use for agent performance.
    // If a workspaceId is provided, use it; otherwise find the first workspace for the org.
    let wsId = workspaceId;
    if (!wsId) {
      const ws = await safePrisma(() =>
        prisma.workspace.findFirst({
          where: { organizationId },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        }),
      null);
      wsId = ws?.id || '';
    }

    const [kpis, goals, agentPerformance, systemHealth, recentMetrics] = await Promise.all([
      this.getKpiSummary(organizationId),
      this.getGoalProgress(organizationId),
      wsId ? this.getAgentPerformance(wsId) : Promise.resolve({
        totalRuns: 0,
        byStatus: {},
        successRate: 0,
        avgDurationSec: 0,
        toolCallsPerRun: 0,
        totalCredits: 0,
        mostActiveAgents: [],
      } as AgentPerformanceStats),
      this.getSystemHealth(organizationId),
      safePrisma(() =>
        prisma.metric.findMany({
          where: { organizationId, ...(workspaceId && { workspaceId }) },
          orderBy: { timestamp: 'desc' },
          take: 20,
          select: { id: true, name: true, value: true, unit: true, timestamp: true },
        }),
      []) as Promise<{ id: string; name: string; value: number; unit: string | null; timestamp: Date }[]>,
    ]);

    return {
      kpis,
      goals,
      agentPerformance,
      systemHealth,
      recentMetrics,
    };
  },
};
