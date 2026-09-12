import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { PredictiveAnalytics } from '@/lib/services/predictive-analytics';
import { ChartFormatter, type AggregationSpec } from '@/lib/services/chart-formatter';

// ── Types ──

export type WidgetType = 'line' | 'bar' | 'pie' | 'table' | 'metric' | 'gauge';
export type DataSource =
  | 'tasks'
  | 'goals'
  | 'projects'
  | 'events'
  | 'agents'
  | 'finance'
  | 'sales'
  | 'support';
export type ExportFormat = 'json' | 'csv' | 'markdown';
export type Granularity = 'day' | 'week' | 'month';
export type TrendMetric =
  | 'tasks_completed'
  | 'goals_progress'
  | 'agent_executions'
  | 'projects_active'
  | 'revenue'
  | 'tickets_resolved';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export interface DashboardInput {
  name: string;
  description?: string;
  workspaceId?: string;
  widgets: Widget[];
  createdBy: string;
}

export interface DashboardData {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  widgets: Widget[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  query: AnalyticsQuery;
  chartType: WidgetType;
  groupBy?: string;
  aggregations?: AggregationSpec[];
}

export interface ReportInput {
  name: string;
  description?: string;
  workspaceId?: string;
  sections: ReportSection[];
  schedule?: { frequency: string; cron?: string };
  createdBy: string;
}

export interface ReportData {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  sections: ReportSection[];
  schedule?: { frequency: string; cron?: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsQuery {
  dataSource: DataSource;
  filters?: QueryFilter[];
  groupBy?: string;
  aggregations?: AggregationSpec[];
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  summary: Record<string, number>;
  metadata: {
    dataSource: DataSource;
    rowCount: number;
    executedAt: string;
    aggregations?: string[];
    groupBy?: string;
  };
}

export interface KPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  history: { date: string; value: number }[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface ForecastResult {
  historical: TrendPoint[];
  forecast: TrendPoint[];
  confidence: { lower: number[]; upper: number[] };
  method: string;
}

export interface DashboardStats {
  totalDashboards: number;
  totalReports: number;
  totalWidgets: number;
  dataSources: number;
}

// ── Helpers ──

const DASHBOARD_TYPE = 'analytics_dashboard';
const REPORT_TYPE = 'analytics_report';
const DATA_SOURCES: DataSource[] = [
  'tasks', 'goals', 'projects', 'events', 'agents', 'finance', 'sales', 'support',
];

function parseContent<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return {} as T;
  }
}

function memoryToDashboard(mem: {
  id: string;
  organizationId: string;
  workspaceId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): DashboardData {
  const parsed = parseContent<{ name: string; description?: string; widgets: Widget[] }>(mem.content);
  return {
    id: mem.id,
    organizationId: mem.organizationId,
    workspaceId: mem.workspaceId,
    name: parsed.name || '',
    description: parsed.description || '',
    widgets: parsed.widgets || [],
    createdBy: mem.createdBy,
    createdAt: mem.createdAt.toISOString(),
    updatedAt: mem.updatedAt.toISOString(),
  };
}

function memoryToReport(mem: {
  id: string;
  organizationId: string;
  workspaceId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): ReportData {
  const parsed = parseContent<{
    name: string;
    description?: string;
    sections: ReportSection[];
    schedule?: { frequency: string; cron?: string };
  }>(mem.content);
  return {
    id: mem.id,
    organizationId: mem.organizationId,
    workspaceId: mem.workspaceId,
    name: parsed.name || '',
    description: parsed.description || '',
    sections: parsed.sections || [],
    schedule: parsed.schedule,
    createdBy: mem.createdBy,
    createdAt: mem.createdAt.toISOString(),
    updatedAt: mem.updatedAt.toISOString(),
  };
}

/**
 * Fetch raw rows for a data source, scoped to an organization (and
 * optionally a workspace). Returns plain objects suitable for JS-side
 * aggregation.
 */
async function fetchDataSource(
  organizationId: string,
  dataSource: DataSource,
  workspaceId?: string,
): Promise<Record<string, unknown>[]> {
  const wsFilter = workspaceId ? { workspaceId } : {};

  switch (dataSource) {
    case 'tasks': {
      const tasks = await safePrisma(() =>
        prisma.task.findMany({
          where: {
            deletedAt: null,
            project: { workspace: { organizationId }, ...wsFilter },
          },
          include: { project: { select: { name: true, workspaceId: true } } },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: t.projectId,
        projectName: (t.project as { name?: string })?.name || '',
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        assigneeId: t.assigneeId,
        assignedAgentId: t.assignedAgentId,
      }));
    }
    case 'goals': {
      const goals = await safePrisma(() =>
        prisma.goal.findMany({
          where: { organizationId, ...wsFilter },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return goals.map((g) => ({
        id: g.id,
        title: g.title,
        status: g.status,
        priority: g.priority,
        progress: g.progress,
        type: g.type,
        dueDate: g.dueDate,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }));
    }
    case 'projects': {
      const projects = await safePrisma(() =>
        prisma.project.findMany({
          where: { workspace: { organizationId }, ...wsFilter, deletedAt: null },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        workspaceId: p.workspaceId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }
    case 'events': {
      const events = await safePrisma(() =>
        prisma.event.findMany({
          where: { organizationId, ...wsFilter },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return events.map((e) => ({
        id: e.id,
        type: e.type,
        actor: e.actor,
        actorType: e.actorType,
        resourceType: e.resourceType,
        createdAt: e.createdAt,
      }));
    }
    case 'agents': {
      const agents = await safePrisma(() =>
        prisma.agentDef.findMany({
          where: { workspace: { organizationId }, ...wsFilter },
          include: { runs: { select: { status: true, createdAt: true, costCredits: true } } },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      const rows: Record<string, unknown>[] = [];
      for (const a of agents) {
        const runs = (a.runs as { status: string; createdAt: Date; costCredits: number }[]) || [];
        rows.push({
          id: a.id,
          name: a.name,
          role: a.role,
          enabled: a.enabled,
          runCount: runs.length,
          completedRuns: runs.filter((r) => r.status === 'completed').length,
          failedRuns: runs.filter((r) => r.status === 'failed').length,
          totalCost: runs.reduce((sum, r) => sum + (r.costCredits || 0), 0),
          createdAt: a.createdAt,
        });
      }
      return rows;
    }
    case 'finance': {
      const transactions = await safePrisma(() =>
        prisma.transaction.findMany({
          where: { organizationId, ...wsFilter },
          orderBy: { date: 'desc' },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return transactions.map((t) => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        date: t.date,
        createdAt: t.createdAt,
      }));
    }
    case 'sales': {
      const deals = await safePrisma(() =>
        prisma.deal.findMany({
          where: { organizationId, ...wsFilter },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return deals.map((d) => ({
        id: d.id,
        title: d.title,
        stage: d.stage,
        value: d.value,
        currency: d.currency,
        probability: d.probability,
        ownerId: d.ownerId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    }
    case 'support': {
      const tickets = await safePrisma(() =>
        prisma.ticket.findMany({
          where: { organizationId, ...wsFilter },
          take: 5000,
        }),
      [] as Record<string, unknown>[]);
      return tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        category: t.category,
        channel: t.channel,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
      }));
    }
    default:
      return [];
  }
}

/**
 * Apply query filters to a set of rows in JS.
 */
function applyFilters(
  rows: Record<string, unknown>[],
  filters?: QueryFilter[],
): Record<string, unknown>[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.field];
      switch (f.operator) {
        case 'eq': return val === f.value;
        case 'ne': return val !== f.value;
        case 'gt': return Number(val) > Number(f.value);
        case 'gte': return Number(val) >= Number(f.value);
        case 'lt': return Number(val) < Number(f.value);
        case 'lte': return Number(val) <= Number(f.value);
        case 'in': return Array.isArray(f.value) && f.value.includes(val);
        case 'contains': return String(val ?? '').includes(String(f.value));
        default: return true;
      }
    }),
  );
}

function computeSummary(rows: Record<string, unknown>[], aggregations?: AggregationSpec[]): Record<string, number> {
  const summary: Record<string, number> = { count: rows.length };
  if (!aggregations) return summary;
  const aggResult = ChartFormatter.aggregateBy(rows, '__all__', aggregations);
  if (aggResult[0]) {
    for (const [k, v] of Object.entries(aggResult[0])) {
      if (k !== '__all__') summary[k] = Number(v) || 0;
    }
  }
  return summary;
}

function dateBucket(d: Date | string, granularity: Granularity): string {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return 'unknown';
  switch (granularity) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week': {
      const tmp = new Date(date);
      const day = tmp.getUTCDay();
      const diff = tmp.getUTCDate() - day + (day === 0 ? -6 : 1);
      tmp.setUTCDate(diff);
      return tmp.toISOString().split('T')[0];
    }
    case 'month':
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0];
  }
}

// ── AnalyticsService ──

export const AnalyticsService = {
  // ── Dashboards ──

  /**
   * Create a custom dashboard stored as a Memory record.
   */
  async createDashboard(organizationId: string, input: DashboardInput): Promise<DashboardData> {
    const workspaceId = input.workspaceId || (await this.getDefaultWorkspace(organizationId));
    const content = JSON.stringify({
      name: input.name,
      description: input.description || '',
      widgets: input.widgets,
    });

    const mem = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: DASHBOARD_TYPE,
        content: content.slice(0, 10000),
        source: 'system',
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['analytics', 'dashboard']),
        createdBy: input.createdBy,
      },
    });
    return memoryToDashboard(mem);
  },

  /**
   * Get a dashboard by ID.
   */
  async getDashboard(id: string): Promise<DashboardData | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== DASHBOARD_TYPE) return null;
    return memoryToDashboard(mem);
  },

  /**
   * List dashboards for an organization, optionally filtered by workspace.
   */
  async listDashboards(organizationId: string, workspaceId?: string): Promise<DashboardData[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          organizationId,
          type: DASHBOARD_TYPE,
          ...(workspaceId ? { workspaceId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    [] as Record<string, unknown>[]);
    return mems.map((m) => memoryToDashboard(m as Parameters<typeof memoryToDashboard>[0]));
  },

  /**
   * Update a dashboard.
   */
  async updateDashboard(id: string, input: Partial<DashboardInput>): Promise<DashboardData | null> {
    const existing = await this.getDashboard(id);
    if (!existing) return null;

    const content = JSON.stringify({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      widgets: input.widgets ?? existing.widgets,
    });

    const mem = await prisma.memory.update({
      where: { id },
      data: { content: content.slice(0, 10000) },
    });
    return memoryToDashboard(mem);
  },

  /**
   * Delete a dashboard.
   */
  async deleteDashboard(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Reports ──

  /**
   * Create a report template stored as a Memory record.
   */
  async createReport(organizationId: string, input: ReportInput): Promise<ReportData> {
    const workspaceId = input.workspaceId || (await this.getDefaultWorkspace(organizationId));
    const content = JSON.stringify({
      name: input.name,
      description: input.description || '',
      sections: input.sections,
      schedule: input.schedule,
    });

    const mem = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: REPORT_TYPE,
        content: content.slice(0, 10000),
        source: 'system',
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['analytics', 'report']),
        createdBy: input.createdBy,
      },
    });
    return memoryToReport(mem);
  },

  /**
   * Get a report by ID.
   */
  async getReport(id: string): Promise<ReportData | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== REPORT_TYPE) return null;
    return memoryToReport(mem);
  },

  /**
   * List reports for an organization.
   */
  async listReports(organizationId: string, workspaceId?: string): Promise<ReportData[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          organizationId,
          type: REPORT_TYPE,
          ...(workspaceId ? { workspaceId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    [] as Record<string, unknown>[]);
    return mems.map((m) => memoryToReport(m as Parameters<typeof memoryToReport>[0]));
  },

  /**
   * Update a report.
   */
  async updateReport(id: string, input: Partial<ReportInput>): Promise<ReportData | null> {
    const existing = await this.getReport(id);
    if (!existing) return null;

    const content = JSON.stringify({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      sections: input.sections ?? existing.sections,
      schedule: input.schedule ?? existing.schedule,
    });

    const mem = await prisma.memory.update({
      where: { id },
      data: { content: content.slice(0, 10000) },
    });
    return memoryToReport(mem);
  },

  /**
   * Delete a report.
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Execute a report — runs each section's query and returns structured results.
   */
  async runReport(
    organizationId: string,
    reportId: string,
    opts?: { workspaceId?: string },
  ): Promise<{
    report: ReportData;
    sections: { section: ReportSection; result: QueryResult }[];
  }> {
    const report = await this.getReport(reportId);
    if (!report) {
      return { report: null as unknown as ReportData, sections: [] };
    }

    const sections: { section: ReportSection; result: QueryResult }[] = [];
    for (const section of report.sections) {
      const result = await this.getQueryResults(organizationId, section.query, opts);
      sections.push({ section, result });
    }

    return { report, sections };
  },

  /**
   * Run a raw analytics query against a data source.
   * Filters, grouping, and aggregations are applied in JS.
   */
  async getQueryResults(
    organizationId: string,
    query: AnalyticsQuery,
    opts?: { workspaceId?: string },
  ): Promise<QueryResult> {
    const rows = await fetchDataSource(organizationId, query.dataSource, opts?.workspaceId);
    const filtered = applyFilters(rows, query.filters);

    let resultRows = filtered;
    if (query.groupBy && query.aggregations && query.aggregations.length > 0) {
      resultRows = ChartFormatter.aggregateBy(filtered, query.groupBy, query.aggregations);
    }

    if (query.sortBy) {
      resultRows = ChartFormatter.sortBy(resultRows, query.sortBy.field, query.sortBy.direction);
    }

    if (query.limit && query.limit > 0) {
      resultRows = resultRows.slice(0, query.limit);
    }

    const summary = computeSummary(filtered, query.aggregations);

    return {
      rows: resultRows,
      summary,
      metadata: {
        dataSource: query.dataSource,
        rowCount: resultRows.length,
        executedAt: new Date().toISOString(),
        aggregations: query.aggregations?.map((a) => a.alias || `${a.type}_${a.field}`),
        groupBy: query.groupBy,
      },
    };
  },

  /**
   * Get predefined KPIs for an organization.
   */
  async getKPIs(organizationId: string, workspaceId?: string): Promise<KPI[]> {
    const wsFilter = workspaceId ? { workspaceId } : {};

    const [tasks, completedTasks, overdueTasks, goals, agentRuns, projects, tickets] = await Promise.all([
      safePrisma(() => prisma.task.count({
        where: { deletedAt: null, project: { workspace: { organizationId }, ...wsFilter } },
      }), 0),
      safePrisma(() => prisma.task.count({
        where: { deletedAt: null, status: 'done', project: { workspace: { organizationId }, ...wsFilter } },
      }), 0),
      safePrisma(() => prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ['done', 'cancelled'] },
          project: { workspace: { organizationId }, ...wsFilter },
        },
      }), 0),
      safePrisma(() => prisma.goal.findMany({
        where: { organizationId, ...wsFilter, status: 'active' },
        select: { progress: true },
      }), [] as { progress: number }[]),
      safePrisma(() => prisma.agentRun.count({
        where: { agent: { workspace: { organizationId }, ...wsFilter } },
      }), 0),
      safePrisma(() => prisma.project.count({
        where: { workspace: { organizationId }, ...wsFilter, status: 'active', deletedAt: null },
      }), 0),
      safePrisma(() => prisma.ticket.count({
        where: { organizationId, ...wsFilter, status: 'resolved' },
      }), 0),
    ]);

    const taskCompletionRate = tasks > 0 ? Math.round((completedTasks / tasks) * 100) : 0;
    const goalProgress = goals.length > 0
      ? Math.round((goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length) * 100)
      : 0;
    const projectHealth = projects > 0 ? Math.min(100, Math.round((projects / Math.max(projects, 10)) * 100)) : 0;

    const kpis: KPI[] = [
      {
        name: 'Task Completion Rate',
        value: taskCompletionRate,
        target: 80,
        unit: 'percent',
        trend: PredictiveAnalytics.trendDirection([taskCompletionRate]),
        history: [{ date: new Date().toISOString().split('T')[0], value: taskCompletionRate }],
      },
      {
        name: 'Overdue Tasks',
        value: overdueTasks,
        target: 0,
        unit: 'count',
        trend: overdueTasks > 0 ? 'up' : 'flat',
        history: [{ date: new Date().toISOString().split('T')[0], value: overdueTasks }],
      },
      {
        name: 'Active Goals',
        value: goals.length,
        target: 10,
        unit: 'count',
        trend: 'flat',
        history: [{ date: new Date().toISOString().split('T')[0], value: goals.length }],
      },
      {
        name: 'Goal Progress',
        value: goalProgress,
        target: 100,
        unit: 'percent',
        trend: PredictiveAnalytics.trendDirection([goalProgress]),
        history: [{ date: new Date().toISOString().split('T')[0], value: goalProgress }],
      },
      {
        name: 'Agent Executions',
        value: agentRuns,
        target: 100,
        unit: 'count',
        trend: 'flat',
        history: [{ date: new Date().toISOString().split('T')[0], value: agentRuns }],
      },
      {
        name: 'Project Health',
        value: projectHealth,
        target: 100,
        unit: 'percent',
        trend: 'flat',
        history: [{ date: new Date().toISOString().split('T')[0], value: projectHealth }],
      },
    ];

    return kpis;
  },

  /**
   * Get trend (time series) data for a metric.
   */
  async getTrend(
    organizationId: string,
    metric: TrendMetric,
    opts?: { startDate?: Date; endDate?: Date; granularity?: Granularity },
  ): Promise<TrendPoint[]> {
    const granularity: Granularity = opts?.granularity || 'day';
    const endDate = opts?.endDate || new Date();
    const startDate = opts?.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const wsFilter = {};

    let rows: { date: Date; value: number }[] = [];

    switch (metric) {
      case 'tasks_completed': {
        const tasks = await safePrisma(() =>
          prisma.task.findMany({
            where: {
              deletedAt: null,
              status: 'done',
              updatedAt: { gte: startDate, lte: endDate },
              project: { workspace: { organizationId }, ...wsFilter },
            },
            select: { updatedAt: true },
            take: 5000,
          }),
        [] as { updatedAt: Date }[]);
        rows = tasks.map((t) => ({ date: t.updatedAt, value: 1 }));
        break;
      }
      case 'goals_progress': {
        const goals = await safePrisma(() =>
          prisma.goal.findMany({
            where: { organizationId, ...wsFilter, updatedAt: { gte: startDate, lte: endDate } },
            select: { progress: true, updatedAt: true },
            take: 5000,
          }),
        [] as { progress: number; updatedAt: Date }[]);
        rows = goals.map((g) => ({ date: g.updatedAt, value: g.progress * 100 }));
        break;
      }
      case 'agent_executions': {
        const runs = await safePrisma(() =>
          prisma.agentRun.findMany({
            where: {
              startedAt: { gte: startDate, lte: endDate },
              agent: { workspace: { organizationId }, ...wsFilter },
            },
            select: { startedAt: true },
            take: 5000,
          }),
        [] as { startedAt: Date }[]);
        rows = runs.map((r) => ({ date: r.startedAt, value: 1 }));
        break;
      }
      case 'projects_active': {
        const projects = await safePrisma(() =>
          prisma.project.findMany({
            where: {
              workspace: { organizationId }, ...wsFilter,
              status: 'active', deletedAt: null,
              updatedAt: { gte: startDate, lte: endDate },
            },
            select: { updatedAt: true },
            take: 5000,
          }),
        [] as { updatedAt: Date }[]);
        rows = projects.map((p) => ({ date: p.updatedAt, value: 1 }));
        break;
      }
      case 'revenue': {
        const txns = await safePrisma(() =>
          prisma.transaction.findMany({
            where: {
              organizationId, ...wsFilter,
              type: 'income',
              status: 'confirmed',
              date: { gte: startDate, lte: endDate },
            },
            select: { amount: true, date: true },
            take: 5000,
          }),
        [] as { amount: number; date: Date }[]);
        rows = txns.map((t) => ({ date: t.date, value: t.amount }));
        break;
      }
      case 'tickets_resolved': {
        const tickets = await safePrisma(() =>
          prisma.ticket.findMany({
            where: {
              organizationId, ...wsFilter,
              status: 'resolved',
              resolvedAt: { gte: startDate, lte: endDate },
            },
            select: { resolvedAt: true },
            take: 5000,
          }),
        [] as { resolvedAt: Date }[]);
        rows = tickets.map((t) => ({ date: t.resolvedAt || t.resolvedAt || new Date(), value: 1 }));
        break;
      }
      default:
        rows = [];
    }

    // Bucket and aggregate by granularity
    const buckets = new Map<string, number[]>();
    for (const row of rows) {
      const bucket = dateBucket(row.date, granularity);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(row.value);
    }

    const points: TrendPoint[] = [];
    for (const [date, values] of buckets) {
      const sum = values.reduce((a, b) => a + b, 0);
      // For rate-like metrics, use average; for count metrics, use sum
      const value = metric === 'goals_progress'
        ? Math.round((sum / values.length) * 10) / 10
        : Math.round(sum * 100) / 100;
      points.push({ date, value });
    }

    return points.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Export a dashboard as JSON or CSV.
   */
  async exportDashboard(dashboardId: string, format: ExportFormat): Promise<string> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) return '';

    if (format === 'json') {
      return JSON.stringify(dashboard, null, 2);
    }

    // CSV: flatten widgets
    const rows = dashboard.widgets.map((w) => ({
      id: w.id,
      title: w.title,
      type: w.type,
      dataSource: w.dataSource,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h,
    }));
    return ChartFormatter.toCSV(rows);
  },

  /**
   * Export report results as JSON, CSV, or Markdown.
   */
  async exportReport(reportId: string, format: ExportFormat): Promise<string> {
    const report = await this.getReport(reportId);
    if (!report) return '';

    // Run the report with the org from the report record
    const { sections } = await this.runReport(report.organizationId, reportId);

    if (format === 'json') {
      return JSON.stringify({ report, sections }, null, 2);
    }

    if (format === 'markdown') {
      const parts: string[] = [`# ${report.name}`, ''];
      if (report.description) parts.push(report.description, '');
      for (const { section, result } of sections) {
        parts.push(`## ${section.title}`, '');
        parts.push(ChartFormatter.toMarkdown(result.rows));
        parts.push('');
      }
      return parts.join('\n');
    }

    // CSV: combine all section rows with a section column
    const allRows: Record<string, unknown>[] = [];
    for (const { section, result } of sections) {
      for (const row of result.rows) {
        allRows.push({ section: section.title, ...row });
      }
    }
    return ChartFormatter.toCSV(allRows);
  },

  /**
   * Get a predictive forecast for a metric using historical trend data.
   */
  async getPredictiveForecast(
    organizationId: string,
    metric: TrendMetric,
    opts?: { periods?: number; granularity?: Granularity },
  ): Promise<ForecastResult> {
    const granularity: Granularity = opts?.granularity || 'day';
    const periods = opts?.periods || 7;

    // Fetch 90 days of history for a meaningful forecast
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const historical = await this.getTrend(organizationId, metric, { startDate, endDate, granularity });

    const values = historical.map((p) => p.value);
    const { forecast, confidence } = PredictiveAnalytics.forecast(values, periods);

    // Build forecast points with dates continuing from last historical point
    const lastDate = historical.length > 0 ? new Date(historical[historical.length - 1].date) : new Date();
    const forecastPoints: TrendPoint[] = forecast.map((value, i) => {
      const d = new Date(lastDate);
      if (granularity === 'day') d.setDate(d.getDate() + i + 1);
      else if (granularity === 'week') d.setDate(d.getDate() + (i + 1) * 7);
      else d.setMonth(d.getMonth() + i + 1);
      return { date: d.toISOString().split('T')[0], value };
    });

    return {
      historical,
      forecast: forecastPoints,
      confidence,
      method: 'linear_regression',
    };
  },

  /**
   * Get summary stats about analytics assets.
   */
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    const [dashboards, reports] = await Promise.all([
      this.listDashboards(organizationId),
      this.listReports(organizationId),
    ]);

    const totalWidgets = dashboards.reduce((sum, d) => sum + d.widgets.length, 0);

    return {
      totalDashboards: dashboards.length,
      totalReports: reports.length,
      totalWidgets,
      dataSources: DATA_SOURCES.length,
    };
  },

  /**
   * Get the analytics hub overview — a comprehensive snapshot combining
   * ad performance, creation stats, credit usage, and workflow metrics.
   */
  async getHub(organizationId: string): Promise<Record<string, unknown>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const wsFilter = {};

    const [
      perfRecords,
      creations,
      creditLines,
      agentRuns,
    ] = await Promise.all([
      safePrisma(() => prisma.creativePerformance.findMany({
        where: { workspace: { organizationId }, ...wsFilter, deletedAt: null },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.creation.findMany({
        where: { workspace: { organizationId }, ...wsFilter, deletedAt: null },
        select: { status: true, templateId: true, cost: true, createdAt: true },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.creditLedger.findMany({
        where: { user: { workspaces: { some: { organizationId } } }, createdAt: { gte: thirtyDaysAgo } },
        select: { delta: true, reason: true, createdAt: true },
        take: 5000,
      }), [] as any[]),
      safePrisma(() => prisma.agentRun.findMany({
        where: { agent: { workspace: { organizationId }, ...wsFilter } },
        select: { status: true, startedAt: true, completedAt: true },
        take: 5000,
      }), [] as any[]),
    ]);

    // ── Overview ──
    const totalImpressions = perfRecords.reduce((s, r) => s + (r.impressions || 0), 0);
    const totalClicks = perfRecords.reduce((s, r) => s + (r.clicks || 0), 0);
    const totalConversions = perfRecords.reduce((s, r) => s + (r.conversions || 0), 0);
    const totalSpend = perfRecords.reduce((s, r) => s + (r.spend || 0), 0);
    const totalRevenue = perfRecords.reduce((s, r) => s + (r.revenue || 0), 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const totalCreations = creations.length;
    const completedCreations = creations.filter((c) => c.status === 'completed').length;
    const failedCreations = creations.filter((c) => c.status === 'failed').length;
    const processingCreations = creations.filter((c) => c.status === 'processing' || c.status === 'pending').length;
    const totalCreditsUsed = creations.reduce((s, c) => s + (c.cost || 0), 0);
    const currentBalance = creditLines.reduce((s, c) => s + c.delta, 0);

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
      .map((r) => ({
        creationId: r.creationId,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        conversions: r.conversions || 0,
        spend: r.spend || 0,
        revenue: r.revenue || 0,
        roas: (r.spend || 0) > 0 ? (r.revenue || 0) / r.spend : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── Credit usage ──
    const spent30d = creditLines.filter((c) => c.delta < 0).reduce((s, c) => s + Math.abs(c.delta), 0);
    const granted30d = creditLines.filter((c) => c.delta > 0).reduce((s, c) => s + c.delta, 0);
    const dailyAvgSpend = spent30d / 30;

    // ── Workflows (agent runs) ──
    const totalRuns = agentRuns.length;
    const completedRuns = agentRuns.filter((r) => r.status === 'completed').length;
    const failedRuns = agentRuns.filter((r) => r.status === 'failed').length;
    const runningRuns = agentRuns.filter((r) => r.status === 'running' || r.status === 'pending').length;
    const byTypeMap = new Map<string, number>();
    for (const r of agentRuns) {
      const t = r.status || 'unknown';
      byTypeMap.set(t, (byTypeMap.get(t) || 0) + 1);
    }
    const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count }));
    const durations = agentRuns
      .filter((r) => r.completedAt && r.startedAt)
      .map((r) => (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000);
    const avgDurationSec = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

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
        totalCampaigns: new Set(perfRecords.map((r) => r.campaignId).filter(Boolean)).size,
        activeCampaigns: new Set(perfRecords.filter((r) => r.campaignId).map((r) => r.campaignId)).size,
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

  /**
   * Get agent performance metrics for an organization.
   */
  async getAgentPerformance(organizationId: string, _opts?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const runs = await safePrisma(() => prisma.agentRun.findMany({
      where: { agent: { workspace: { organizationId } } },
      select: {
        status: true,
        tokensUsed: true,
        costCredits: true,
        retryCount: true,
        startedAt: true,
        completedAt: true,
        agent: { select: { name: true, role: true } },
      },
      take: 5000,
    }), [] as any[]);

    const byAgent = new Map<string, { name: string; role: string; runs: number; completed: number; failed: number; tokens: number; credits: number; avgDurationSec: number }>();
    for (const r of runs) {
      const key = r.agent?.name || 'unknown';
      if (!byAgent.has(key)) byAgent.set(key, { name: key, role: r.agent?.role || '', runs: 0, completed: 0, failed: 0, tokens: 0, credits: 0, avgDurationSec: 0 });
      const entry = byAgent.get(key)!;
      entry.runs++;
      if (r.status === 'completed') entry.completed++;
      if (r.status === 'failed') entry.failed++;
      entry.tokens += r.tokensUsed || 0;
      entry.credits += r.costCredits || 0;
      if (r.completedAt && r.startedAt) {
        entry.avgDurationSec += (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000;
      }
    }
    return Array.from(byAgent.values()).map((e) => ({
      ...e,
      avgDurationSec: e.completed > 0 ? Math.round((e.avgDurationSec / e.completed) * 100) / 100 : 0,
      successRate: e.runs > 0 ? Math.round((e.completed / e.runs) * 100) : 0,
    }));
  },

  /**
   * Get dashboard data (aggregated metrics for dashboard widgets).
   */
  async getDashboardData(organizationId: string, _opts?: Record<string, string>): Promise<Record<string, unknown>> {
    const [dashboards, stats, kpis] = await Promise.all([
      this.listDashboards(organizationId),
      this.getDashboardStats(organizationId),
      this.getKPIs(organizationId),
    ]);
    return { dashboards, stats, kpis };
  },

  /**
   * Get goal progress metrics for an organization.
   */
  async getGoalProgress(organizationId: string, _opts?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const goals = await safePrisma(() => prisma.goal.findMany({
      where: { organizationId, status: 'active' },
      select: { id: true, title: true, progress: true, targetValue: true, currentValue: true, unit: true, dueDate: true, priority: true },
      take: 5000,
    }), [] as any[]);

    return goals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress || 0,
      targetValue: g.targetValue || 100,
      currentValue: g.currentValue || 0,
      unit: g.unit || 'count',
      dueDate: g.dueDate?.toISOString() || null,
      priority: g.priority || 'medium',
      onTrack: (g.progress || 0) >= 50,
    }));
  },

  /**
   * Get a KPI summary (compact version of getKPIs).
   */
  async getKpiSummary(organizationId: string, _opts?: Record<string, string>): Promise<Record<string, unknown>> {
    const kpis = await this.getKPIs(organizationId);
    return {
      total: kpis.length,
      kpis: kpis.map((k) => ({ name: k.name, value: k.value, target: k.target, unit: k.unit, trend: k.trend })),
      meetingTarget: kpis.filter((k) => k.value >= k.target).length,
      belowTarget: kpis.filter((k) => k.value < k.target).length,
    };
  },

  /**
   * Get metric time series for an organization.
   */
  async getMetricSeries(organizationId: string, opts?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const metric = (opts?.metric || 'tasks_completed') as TrendMetric;
    const granularity = (opts?.granularity || 'day') as Granularity;
    const endDate = opts?.endDate ? new Date(opts.endDate) : new Date();
    const startDate = opts?.startDate ? new Date(opts.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const points = await this.getTrend(organizationId, metric, { startDate, endDate, granularity });
    return points.map((p) => ({ date: p.date, value: p.value, metric }));
  },

  /**
   * Get system health metrics for an organization.
   */
  async getSystemHealth(organizationId: string, _opts?: Record<string, string>): Promise<Record<string, unknown>> {
    const [tasks, overdueTasks, agentRuns, failedRuns, projects, activeProjects] = await Promise.all([
      safePrisma(() => prisma.task.count({ where: { deletedAt: null, project: { workspace: { organizationId } } } }), 0),
      safePrisma(() => prisma.task.count({ where: { deletedAt: null, dueDate: { lt: new Date() }, status: { notIn: ['done', 'cancelled'] }, project: { workspace: { organizationId } } } }), 0),
      safePrisma(() => prisma.agentRun.count({ where: { agent: { workspace: { organizationId } } } }), 0),
      safePrisma(() => prisma.agentRun.count({ where: { agent: { workspace: { organizationId } }, status: 'failed' } }), 0),
      safePrisma(() => prisma.project.count({ where: { workspace: { organizationId }, deletedAt: null } }), 0),
      safePrisma(() => prisma.project.count({ where: { workspace: { organizationId }, status: 'active', deletedAt: null } }), 0),
    ]);

    const agentFailureRate = agentRuns > 0 ? (failedRuns / agentRuns) * 100 : 0;
    const overdueRate = tasks > 0 ? (overdueTasks / tasks) * 100 : 0;

    return {
      status: agentFailureRate > 20 || overdueRate > 30 ? 'degraded' : 'healthy',
      tasks: { total: tasks, overdue: overdueTasks, overdueRate: Math.round(overdueRate * 100) / 100 },
      agents: { totalRuns: agentRuns, failedRuns, failureRate: Math.round(agentFailureRate * 100) / 100 },
      projects: { total: projects, active: activeProjects },
    };
  },

  // ── Internal helpers ──

  /**
   * Resolve a default workspace ID for an organization.
   */
  async getDefaultWorkspace(organizationId: string): Promise<string> {
    const ws = await safePrisma(() =>
      prisma.workspace.findFirst({
        where: { organizationId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }),
    null);
    if (ws) return ws.id;
    // Fallback: create a sentinel — caller should pass workspaceId
    return `org-${organizationId}`;
  },
};
