import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { AnalyticsService as BIAnalyticsService } from '@/lib/services/analytics-service';

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

  /**
   * Analytics hub overview — comprehensive snapshot combining ad performance,
   * creation stats, credit usage, and workflow metrics for the analytics-hub page.
   */
  async getHub(organizationId: string): Promise<Record<string, unknown>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      perfRecords,
      creations,
      creditLines,
      agentRuns,
    ] = await Promise.all([
      safePrisma(() => prisma.creativePerformance.findMany({
        where: { workspace: { organizationId }, deletedAt: null },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.creation.findMany({
        where: { workspace: { organizationId }, deletedAt: null },
        select: { status: true, templateId: true, cost: true, createdAt: true },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.creditLedger.findMany({
        where: { user: { workspaces: { some: { organizationId } } }, createdAt: { gte: thirtyDaysAgo } },
        select: { delta: true, reason: true, createdAt: true },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.agentRun.findMany({
        where: { agent: { workspace: { organizationId } } },
        select: { status: true, startedAt: true, completedAt: true },
        take: 5000,
      }), [] as any[]),
    ]);

    // ── Overview ──
    const totalImpressions = perfRecords.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
    const totalClicks = perfRecords.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
    const totalConversions = perfRecords.reduce((s: number, r: any) => s + (r.conversions || 0), 0);
    const totalSpend = perfRecords.reduce((s: number, r: any) => s + (r.spend || 0), 0);
    const totalRevenue = perfRecords.reduce((s: number, r: any) => s + (r.revenue || 0), 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const totalCreations = creations.length;
    const completedCreations = creations.filter((c: any) => c.status === 'completed').length;
    const failedCreations = creations.filter((c: any) => c.status === 'failed').length;
    const processingCreations = creations.filter((c: any) => c.status === 'processing' || c.status === 'pending').length;
    const totalCreditsUsed = creations.reduce((s: number, c: any) => s + (c.cost || 0), 0);
    const currentBalance = creditLines.reduce((s: number, c: any) => s + c.delta, 0);

    // ── Performance by day ──
    const perfByDayMap = new Map<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number }>();
    for (const r of perfRecords) {
      const date = (r.recordedAt || new Date()).toISOString().split('T')[0];
      if (!perfByDayMap.has(date)) perfByDayMap.set(date, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      const entry = perfByDayMap.get(date)!;
      entry.impressions += r.impressions || 0;
      entry.clicks += r.clicks || 0;
      entry.conversions += r.conversions || 0;
      entry.spend += r.spend || 0;
      entry.revenue += r.revenue || 0;
    }
    const perfByDay = Array.from(perfByDayMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

    // ── Creations by day ──
    const creationsByDayMap = new Map<string, number>();
    for (const c of creations) {
      const date = (c.createdAt || new Date()).toISOString().split('T')[0];
      creationsByDayMap.set(date, (creationsByDayMap.get(date) || 0) + 1);
    }
    const creationsByDay = Array.from(creationsByDayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    // ── By platform ──
    const platformMap = new Map<string, { impressions: number; clicks: number; conversions: number; spend: number; revenue: number }>();
    for (const r of perfRecords) {
      const p = r.platform || 'unknown';
      if (!platformMap.has(p)) platformMap.set(p, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
      const entry = platformMap.get(p)!;
      entry.impressions += r.impressions || 0;
      entry.clicks += r.clicks || 0;
      entry.conversions += r.conversions || 0;
      entry.spend += r.spend || 0;
      entry.revenue += r.revenue || 0;
    }
    const byPlatform = Array.from(platformMap.entries()).map(([platform, v]) => ({
      platform,
      ...v,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
      roas: v.spend > 0 ? v.revenue / v.spend : 0,
    }));

    // ── By template ──
    const templateMap = new Map<string, { count: number; credits: number }>();
    for (const c of creations) {
      const t = c.templateId || 'unknown';
      if (!templateMap.has(t)) templateMap.set(t, { count: 0, credits: 0 });
      const entry = templateMap.get(t)!;
      entry.count++;
      entry.credits += c.cost || 0;
    }
    const byTemplate = Array.from(templateMap.entries()).map(([template, v]) => ({ template, ...v }));

    // ── Credit by reason ──
    const creditByReasonMap = new Map<string, { count: number; totalDelta: number }>();
    for (const c of creditLines) {
      const r = c.reason || 'unknown';
      if (!creditByReasonMap.has(r)) creditByReasonMap.set(r, { count: 0, totalDelta: 0 });
      const entry = creditByReasonMap.get(r)!;
      entry.count++;
      entry.totalDelta += c.delta;
    }
    const creditByReason = Array.from(creditByReasonMap.entries()).map(([reason, v]) => ({ reason, ...v }));

    // ── Top creatives ──
    const topCreatives = perfRecords
      .map((r: any) => ({
        creationId: r.creationId,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        conversions: r.conversions || 0,
        spend: r.spend || 0,
        revenue: r.revenue || 0,
        roas: (r.spend || 0) > 0 ? (r.revenue || 0) / r.spend : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── Credit usage ──
    const spent30d = creditLines.filter((c: any) => c.delta < 0).reduce((s: number, c: any) => s + Math.abs(c.delta), 0);
    const granted30d = creditLines.filter((c: any) => c.delta > 0).reduce((s: number, c: any) => s + c.delta, 0);
    const dailyAvgSpend = spent30d / 30;

    // ── Workflows (agent runs) ──
    const totalRuns = agentRuns.length;
    const completedRuns = agentRuns.filter((r: any) => r.status === 'completed').length;
    const failedRuns = agentRuns.filter((r: any) => r.status === 'failed').length;
    const runningRuns = agentRuns.filter((r: any) => r.status === 'running' || r.status === 'pending').length;
    const byTypeMap = new Map<string, number>();
    for (const r of agentRuns) {
      const t = r.status || 'unknown';
      byTypeMap.set(t, (byTypeMap.get(t) || 0) + 1);
    }
    const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count }));
    const durations = agentRuns
      .filter((r: any) => r.completedAt && r.startedAt)
      .map((r: any) => (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000);
    const avgDurationSec = durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;

    return {
      overview: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        totalRevenue,
        avgCtr,
        avgCvr,
        avgRoas,
        totalCreations,
        completedCreations,
        failedCreations,
        processingCreations,
        totalCreditsUsed,
        currentBalance,
        totalCampaigns: new Set(perfRecords.map((r: any) => r.campaignId).filter(Boolean)).size,
        activeCampaigns: new Set(perfRecords.filter((r: any) => r.campaignId).map((r: any) => r.campaignId)).size,
      },
      perfByDay,
      creationsByDay,
      byPlatform,
      byTemplate,
      campaignsByPlatform: Object.fromEntries(byPlatform.map((p) => [p.platform, p.impressions > 0 ? 1 : 0])),
      creditByReason,
      topCreatives,
      creditUsage: { spent30d, granted30d, dailyAvgSpend, projectionDays: dailyAvgSpend > 0 ? Math.floor(currentBalance / dailyAvgSpend) : null },
      workflows: { totalRuns, completedRuns, failedRuns, runningRuns, byType, avgDurationSec, perStage: [] },
    };
  },

  // ── BI Analytics wrappers (delegate to analytics-service.ts) ──
  // These methods are referenced by the analytics catch-all route but
  // implemented in analytics-service.ts. Wrapped here so the catch-all
  // route's single import works for both sets of methods.

  async listDashboards(organizationId: string) {
    return BIAnalyticsService.listDashboards(organizationId);
  },
  async createDashboard(organizationId: string, _workspaceId: string, input: any) {
    return BIAnalyticsService.createDashboard(organizationId, input);
  },
  async getDashboard(id: string) {
    return BIAnalyticsService.getDashboard(id);
  },
  async updateDashboard(id: string, input: any) {
    return BIAnalyticsService.updateDashboard(id, input);
  },
  async deleteDashboard(id: string) {
    return BIAnalyticsService.deleteDashboard(id);
  },
  async listReports(organizationId: string) {
    return BIAnalyticsService.listReports(organizationId);
  },
  async createReport(organizationId: string, _workspaceId: string, input: any) {
    return BIAnalyticsService.createReport(organizationId, input);
  },
  async getReport(id: string) {
    return BIAnalyticsService.getReport(id);
  },
  async updateReport(id: string, input: any) {
    return BIAnalyticsService.updateReport(id, input);
  },
  async deleteReport(id: string) {
    return BIAnalyticsService.deleteReport(id);
  },
  async runReport(organizationId: string, reportId: string) {
    return BIAnalyticsService.runReport(organizationId, reportId);
  },
  async getQueryResults(organizationId: string, query: any, opts?: any) {
    return BIAnalyticsService.getQueryResults(organizationId, query, opts);
  },
  async getKPIs(organizationId: string, workspaceId?: string) {
    return BIAnalyticsService.getKPIs(organizationId, workspaceId);
  },
  async getTrend(organizationId: string, metric: any, opts?: any) {
    return BIAnalyticsService.getTrend(organizationId, metric, opts);
  },
  async getPredictiveForecast(organizationId: string, metric: any, opts?: any) {
    return BIAnalyticsService.getPredictiveForecast(organizationId, metric, opts);
  },
  async getDashboardStats(organizationId: string) {
    return BIAnalyticsService.getDashboardStats(organizationId);
  },
  async exportDashboard(dashboardId: string, format: any) {
    return BIAnalyticsService.exportDashboard(dashboardId, format);
  },
  async exportReport(reportId: string, format: any) {
    return BIAnalyticsService.exportReport(reportId, format);
  },
};
