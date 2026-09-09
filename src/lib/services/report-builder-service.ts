import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ReportDataSource = 'tasks' | 'projects' | 'invoices' | 'expenses';
export type ReportSchedule = 'none' | 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'csv' | 'json' | 'excel' | 'html' | 'markdown';

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Filter definition for a report column. */
export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

/** A column definition for a report. */
export interface ReportColumn {
  field: string;
  label: string;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

/** Group-by definition for a report. */
export interface ReportGroupBy {
  field: string;
  label?: string;
}

/** Parsed content payload for a custom report Memory. */
interface ReportContent {
  name: string;
  description: string;
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  orderBy: { field: string; direction: 'asc' | 'desc' };
  schedule: ReportSchedule;
  format: ReportFormat;
  isPublic: boolean;
  executions: ReportExecutionRecord[];
}

/** A structured custom report returned to callers. */
export interface CustomReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  orderBy: { field: string; direction: 'asc' | 'desc' };
  schedule: ReportSchedule;
  format: ReportFormat;
  isPublic: boolean;
  executions: ReportExecutionRecord[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Record of a single report execution. */
export interface ReportExecutionRecord {
  id: string;
  executedAt: Date;
  rowCount: number;
  durationMs: number;
  executedBy: string;
}

/** The result of executing a report. */
export interface ReportExecutionResult {
  reportId: string;
  columns: { field: string; label: string }[];
  rows: Record<string, unknown>[];
  totalCount: number;
  executedAt: Date;
  durationMs: number;
}

export interface CreateReportInput {
  name: string;
  description?: string;
  dataSource: ReportDataSource;
  columns?: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  schedule?: ReportSchedule;
  format?: ReportFormat;
  isPublic?: boolean;
  workspaceId?: string;
  createdBy: string;
}

export interface ListReportOpts {
  workspaceId?: string;
  dataSource?: ReportDataSource;
  schedule?: ReportSchedule;
  search?: string;
}

export interface UpdateReportInput {
  name?: string;
  description?: string;
  dataSource?: ReportDataSource;
  columns?: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  schedule?: ReportSchedule;
  format?: ReportFormat;
  isPublic?: boolean;
}

export interface ReportStats {
  totalReports: number;
  byDataSource: Record<string, number>;
  bySchedule: Record<string, number>;
  totalExecutions: number;
  scheduledReports: number;
}

// ── Helpers ──

const fallbackContent: ReportContent = {
  name: '',
  description: '',
  dataSource: 'tasks',
  columns: [],
  filters: [],
  groupBy: [],
  orderBy: { field: 'createdAt', direction: 'desc' },
  schedule: 'none',
  format: 'csv',
  isPublic: false,
  executions: [],
};

function parseReportContent(raw: string): ReportContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      dataSource: (parsed.dataSource as ReportDataSource) ?? 'tasks',
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      filters: Array.isArray(parsed.filters) ? parsed.filters : [],
      groupBy: Array.isArray(parsed.groupBy) ? parsed.groupBy : [],
      orderBy: parsed.orderBy ?? { field: 'createdAt', direction: 'desc' },
      schedule: (parsed.schedule as ReportSchedule) ?? 'none',
      format: (parsed.format as ReportFormat) ?? 'csv',
      isPublic: parsed.isPublic ?? false,
      executions: Array.isArray(parsed.executions) ? parsed.executions : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toReport(row: MemoryRow): CustomReport {
  const content = parseReportContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    description: content.description,
    dataSource: content.dataSource,
    columns: content.columns,
    filters: content.filters,
    groupBy: content.groupBy,
    orderBy: content.orderBy,
    schedule: content.schedule,
    format: content.format,
    isPublic: content.isPublic,
    executions: content.executions,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Data Source Queries ──

async function queryTasks(
  organizationId: string,
  columns: ReportColumn[],
  filters: ReportFilter[],
): Promise<Record<string, unknown>[]> {
  const where: Record<string, unknown> = { organizationId };
  applyFilters(where, filters);
  const rows = await safePrisma(() =>
    prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  [],
  );
  return rows.map((r) => projectRow(r as Record<string, unknown>, columns));
}

async function queryProjects(
  organizationId: string,
  columns: ReportColumn[],
  filters: ReportFilter[],
): Promise<Record<string, unknown>[]> {
  const where: Record<string, unknown> = { organizationId };
  applyFilters(where, filters);
  const rows = await safePrisma(() =>
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  [],
  );
  return rows.map((r) => projectRow(r as Record<string, unknown>, columns));
}

async function queryInvoices(
  organizationId: string,
  columns: ReportColumn[],
  filters: ReportFilter[],
): Promise<Record<string, unknown>[]> {
  const where: Record<string, unknown> = { organizationId };
  applyFilters(where, filters);
  const rows = await safePrisma(() =>
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  [],
  );
  return rows.map((r) => projectRow(r as Record<string, unknown>, columns));
}

async function queryExpenses(
  organizationId: string,
  columns: ReportColumn[],
  filters: ReportFilter[],
): Promise<Record<string, unknown>[]> {
  const where: Record<string, unknown> = { organizationId };
  applyFilters(where, filters);
  const rows = await safePrisma(() =>
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  [],
  );
  return rows.map((r) => projectRow(r as Record<string, unknown>, columns));
}

function applyFilters(where: Record<string, unknown>, filters: ReportFilter[]): void {
  for (const f of filters) {
    switch (f.operator) {
      case 'eq':
        where[f.field] = f.value;
        break;
      case 'neq':
        where[f.field] = { not: f.value };
        break;
      case 'gt':
        where[f.field] = { gt: f.value };
        break;
      case 'lt':
        where[f.field] = { lt: f.value };
        break;
      case 'gte':
        where[f.field] = { gte: f.value };
        break;
      case 'lte':
        where[f.field] = { lte: f.value };
        break;
      case 'contains':
        where[f.field] = { contains: f.value };
        break;
      case 'in':
        where[f.field] = { in: f.value };
        break;
    }
  }
}

function projectRow(row: Record<string, unknown>, columns: ReportColumn[]): Record<string, unknown> {
  if (columns.length === 0) return row;
  const result: Record<string, unknown> = {};
  for (const col of columns) {
    if (col.aggregate) {
      result[col.label || col.field] = row[col.field];
    } else {
      result[col.label || col.field] = row[col.field];
    }
  }
  return result;
}

function applyGroupBy(
  rows: Record<string, unknown>[],
  groupBy: ReportGroupBy[],
): Record<string, unknown>[] {
  if (groupBy.length === 0) return rows;
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = groupBy.map((g) => String(row[g.field] ?? '')).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.values()).map((groupRows) => {
    const first = groupRows[0];
    const result: Record<string, unknown> = {};
    for (const g of groupBy) {
      result[g.label || g.field] = first[g.field];
    }
    result['count'] = groupRows.length;
    return result;
  });
}

function applyOrderBy(
  rows: Record<string, unknown>[],
  orderBy: { field: string; direction: 'asc' | 'desc' },
): Record<string, unknown>[] {
  if (!orderBy?.field) return rows;
  return [...rows].sort((a, b) => {
    const av = a[orderBy.field];
    const bv = b[orderBy.field];
    if (av == null && bv == null) return 0;
    if (av == null) return orderBy.direction === 'asc' ? -1 : 1;
    if (bv == null) return orderBy.direction === 'asc' ? 1 : -1;
    if (av < bv) return orderBy.direction === 'asc' ? -1 : 1;
    if (av > bv) return orderBy.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Report Builder Service ──

export const ReportBuilderService = {
  /**
   * Create a custom report. Stored as a Memory with type='custom_report'.
   */
  async create(organizationId: string, input: CreateReportInput): Promise<CustomReport> {
    const name = input.name.trim();
    const content: ReportContent = {
      name,
      description: input.description ?? '',
      dataSource: input.dataSource,
      columns: input.columns ?? [],
      filters: input.filters ?? [],
      groupBy: input.groupBy ?? [],
      orderBy: input.orderBy ?? { field: 'createdAt', direction: 'desc' },
      schedule: input.schedule ?? 'none',
      format: input.format ?? 'csv',
      isPublic: input.isPublic ?? false,
      executions: [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'custom_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['custom_report', content.dataSource, content.schedule]),
        createdBy: input.createdBy,
      },
    });

    return toReport(row as MemoryRow);
  },

  /**
   * Get a single report by ID.
   */
  async get(id: string): Promise<CustomReport | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  /**
   * List reports for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListReportOpts = {}): Promise<CustomReport[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'custom_report',
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      [],
    );

    let reports = rows.map((r) => toReport(r as MemoryRow));

    if (opts.dataSource) {
      reports = reports.filter((r) => r.dataSource === opts.dataSource);
    }
    if (opts.schedule) {
      reports = reports.filter((r) => r.schedule === opts.schedule);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    return reports;
  },

  /**
   * Update a report.
   */
  async update(id: string, input: UpdateReportInput): Promise<CustomReport | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseReportContent(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.dataSource !== undefined) content.dataSource = input.dataSource;
    if (input.columns !== undefined) content.columns = input.columns;
    if (input.filters !== undefined) content.filters = input.filters;
    if (input.groupBy !== undefined) content.groupBy = input.groupBy;
    if (input.orderBy !== undefined) content.orderBy = input.orderBy;
    if (input.schedule !== undefined) content.schedule = input.schedule;
    if (input.format !== undefined) content.format = input.format;
    if (input.isPublic !== undefined) content.isPublic = input.isPublic;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['custom_report', content.dataSource, content.schedule]),
        },
      }),
      null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  /**
   * Delete a report.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Duplicate a report (creates a copy with a new ID).
   */
  async duplicate(id: string, createdBy: string): Promise<CustomReport | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseReportContent(existing.content);
    content.name = `${content.name} (Copy)`;
    content.executions = [];

    const row = await prisma.memory.create({
      data: {
        workspaceId: existing.workspaceId,
        organizationId: existing.organizationId,
        type: 'custom_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['custom_report', content.dataSource, content.schedule]),
        createdBy,
      },
    });

    return toReport(row as MemoryRow);
  },

  /**
   * Execute a report — query the data source and return results.
   */
  async execute(
    id: string,
    executedBy: string,
  ): Promise<ReportExecutionResult | null> {
    const report = await ReportBuilderService.get(id);
    if (!report) return null;

    const start = Date.now();
    let rows: Record<string, unknown>[] = [];

    switch (report.dataSource) {
      case 'tasks':
        rows = await queryTasks(report.organizationId, report.columns, report.filters);
        break;
      case 'projects':
        rows = await queryProjects(report.organizationId, report.columns, report.filters);
        break;
      case 'invoices':
        rows = await queryInvoices(report.organizationId, report.columns, report.filters);
        break;
      case 'expenses':
        rows = await queryExpenses(report.organizationId, report.columns, report.filters);
        break;
    }

    rows = applyGroupBy(rows, report.groupBy);
    rows = applyOrderBy(rows, report.orderBy);

    const durationMs = Date.now() - start;
    const executedAt = new Date();

    // Record the execution
    const execution: ReportExecutionRecord = {
      id: `exec-${Date.now()}`,
      executedAt,
      rowCount: rows.length,
      durationMs,
      executedBy,
    };

    await ReportBuilderService.recordExecution(id, execution);

    const columns = report.columns.length > 0
      ? report.columns.map((c) => ({ field: c.field, label: c.label || c.field }))
      : rows.length > 0
        ? Object.keys(rows[0]).map((f) => ({ field: f, label: f }))
        : [];

    return {
      reportId: id,
      columns,
      rows,
      totalCount: rows.length,
      executedAt,
      durationMs,
    };
  },

  /**
   * Record an execution in the report's content (internal helper).
   */
  async recordExecution(id: string, execution: ReportExecutionRecord): Promise<void> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return;

    const content = parseReportContent(existing.content);
    content.executions = [execution, ...content.executions].slice(0, 50);

    await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
        },
      }),
      null,
    );
  },

  /**
   * Get execution history for a report.
   */
  async getExecutions(id: string): Promise<ReportExecutionRecord[]> {
    const report = await ReportBuilderService.get(id);
    if (!report) return [];
    return report.executions;
  },

  /**
   * Get all scheduled reports for an organization.
   */
  async getScheduled(organizationId: string): Promise<CustomReport[]> {
    const reports = await ReportBuilderService.list(organizationId);
    return reports.filter((r) => r.schedule !== 'none');
  },

  /**
   * Get report stats for an organization.
   */
  async getStats(organizationId: string): Promise<ReportStats> {
    const reports = await ReportBuilderService.list(organizationId);

    const byDataSource: Record<string, number> = {};
    const bySchedule: Record<string, number> = {};
    let totalExecutions = 0;
    let scheduledReports = 0;

    for (const r of reports) {
      byDataSource[r.dataSource] = (byDataSource[r.dataSource] || 0) + 1;
      bySchedule[r.schedule] = (bySchedule[r.schedule] || 0) + 1;
      totalExecutions += r.executions.length;
      if (r.schedule !== 'none') scheduledReports += 1;
    }

    return {
      totalReports: reports.length,
      byDataSource,
      bySchedule,
      totalExecutions,
      scheduledReports,
    };
  },
};
