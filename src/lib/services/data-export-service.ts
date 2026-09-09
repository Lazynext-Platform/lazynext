import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Data Export Service ──
//
// Stores export records in the Memory table (type='data_export'). Supports
// JSON, CSV, and SQL output formats. Each export record's `content` field
// holds a JSON payload describing the export configuration; the generated
// data is stored in the `tags` field as a JSON string (truncated to fit).

export type ExportFormat = 'json' | 'csv' | 'sql';

export type ExportableEntity =
  | 'task'
  | 'goal'
  | 'project'
  | 'customer'
  | 'deal'
  | 'memory'
  | 'event'
  | 'document';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ExportConfig {
  format: ExportFormat;
  entities: ExportableEntity[];
  filters?: ExportFilters;
}

export interface ExportRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  format: ExportFormat;
  entities: ExportableEntity[];
  filters: ExportFilters;
  status: string; // pending | completed | failed
  recordCount: number;
  sizeBytes: number;
  data: string;
  createdBy: string;
  createdAt: Date;
}

export interface ExportableEntityInfo {
  name: ExportableEntity;
  label: string;
  count: number;
}

export interface ExportStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalSizeBytes: number;
  byFormat: Record<string, number>;
}

/** Map entity names to their Prisma delegates and human-readable labels. */
const ENTITY_LABELS: Record<ExportableEntity, string> = {
  task: 'Tasks',
  goal: 'Goals',
  project: 'Projects',
  customer: 'Customers',
  deal: 'Deals',
  memory: 'Memories',
  event: 'Events',
  document: 'Documents',
};

/** Build a Prisma where-clause for an entity given workspace + filters. */
function buildWhereClause(workspaceId: string, filters?: ExportFilters): Record<string, unknown> {
  const where: Record<string, unknown> = { workspaceId };
  if (filters?.status) where.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    const range: Record<string, Date> = {};
    if (filters.startDate) range.gte = new Date(filters.startDate);
    if (filters.endDate) range.lte = new Date(filters.endDate);
    where.createdAt = range;
  }
  return where;
}

/** Query a single entity and return its rows. */
async function queryEntity(
  entity: ExportableEntity,
  workspaceId: string,
  filters?: ExportFilters,
): Promise<Record<string, unknown>[]> {
  const where = buildWhereClause(workspaceId, filters);
  const take = 10000;

  switch (entity) {
    case 'task':
      return safePrisma(() => prisma.task.findMany({ where, take }), []);
    case 'goal':
      return safePrisma(() => prisma.goal.findMany({ where, take }), []);
    case 'project':
      return safePrisma(() => prisma.project.findMany({ where, take }), []);
    case 'customer':
      return safePrisma(() => prisma.customer.findMany({ where, take }), []);
    case 'deal':
      return safePrisma(() => prisma.deal.findMany({ where, take }), []);
    case 'memory':
      return safePrisma(() => prisma.memory.findMany({ where, take }), []);
    case 'event':
      return safePrisma(() => prisma.event.findMany({ where, take }), []);
    case 'document':
      return safePrisma(() => prisma.document.findMany({ where, take }), []);
    default:
      return [];
  }
}

/** Format rows as a JSON string. */
function formatAsJson(
  data: Record<string, ExportableEntity[] | Record<string, unknown>[]>,
): string {
  return JSON.stringify(data, null, 2);
}

/** Format rows as CSV. */
function formatAsCsv(
  data: Record<string, ExportableEntity[] | Record<string, unknown>[]>,
): string {
  const sections: string[] = [];
  for (const [entity, rows] of Object.entries(data)) {
    sections.push(`# ${entity}`);
    if (!rows || rows.length === 0) {
      sections.push('');
      continue;
    }
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    sections.push(headers.join(','));
    for (const row of rows as Record<string, unknown>[]) {
      const values = headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      });
      sections.push(values.join(','));
    }
    sections.push('');
  }
  return sections.join('\n');
}

/** Format rows as SQL INSERT statements. */
function formatAsSql(
  data: Record<string, ExportableEntity[] | Record<string, unknown>[]>,
): string {
  const lines: string[] = ['-- Data Export', `-- Generated: ${new Date().toISOString()}`, ''];
  for (const [entity, rows] of Object.entries(data)) {
    lines.push(`-- Table: ${entity}`);
    if (!rows || rows.length === 0) {
      lines.push('');
      continue;
    }
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    for (const row of rows as Record<string, unknown>[]) {
      const values = headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? '1' : '0';
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      lines.push(
        `INSERT INTO ${entity} (${headers.join(', ')}) VALUES (${values.join(', ')});`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** Parse a Memory row into an ExportRecord. */
function parseExportRecord(mem: {
  id: string;
  workspaceId: string;
  organizationId: string;
  content: string;
  tags: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
}): ExportRecord {
  let config: ExportConfig & { status?: string; recordCount?: number; sizeBytes?: number };
  try {
    config = JSON.parse(mem.content);
  } catch {
    config = { format: 'json', entities: [] };
  }
  return {
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    format: config.format,
    entities: config.entities || [],
    filters: config.filters || {},
    status: config.status || 'pending',
    recordCount: config.recordCount || 0,
    sizeBytes: config.sizeBytes || 0,
    data: mem.tags === '[]' ? '' : mem.tags,
    createdBy: mem.createdBy,
    createdAt: mem.createdAt,
  };
}

export const DataExportService = {
  /**
   * Create a new export record (pending). The actual export is run separately
   * via runExport so large exports can be processed asynchronously.
   */
  async createExport(input: {
    workspaceId: string;
    organizationId: string;
    format: ExportFormat;
    entities: ExportableEntity[];
    filters?: ExportFilters;
    createdBy: string;
  }): Promise<ExportRecord> {
    const config: ExportConfig & { status: string } = {
      format: input.format,
      entities: input.entities,
      filters: input.filters || {},
      status: 'pending',
    };
    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'data_export',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'system',
        sourceId: null,
        confidence: 0.5,
        owner: input.createdBy,
        lifecycle: 'medium',
        tags: '[]',
        createdBy: input.createdBy,
      },
    });
    return parseExportRecord(mem);
  },

  /**
   * Get a single export record by ID.
   */
  async getExport(exportId: string): Promise<ExportRecord | null> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: exportId } }),
    null);
    if (!mem || mem.type !== 'data_export') return null;
    return parseExportRecord(mem);
  },

  /**
   * List export records for a workspace.
   */
  async listExports(workspaceId: string): Promise<ExportRecord[]> {
    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'data_export' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
    return mems.map(parseExportRecord);
  },

  /**
   * Run an export: query each entity, format the data, and update the record.
   */
  async runExport(exportId: string): Promise<ExportRecord | null> {
    const record = await this.getExport(exportId);
    if (!record) return null;

    const data: Record<string, Record<string, unknown>[]> = {};
    let totalRecords = 0;

    for (const entity of record.entities) {
      const rows = await queryEntity(entity, record.workspaceId, record.filters);
      data[entity] = rows;
      totalRecords += rows.length;
    }

    let formatted: string;
    switch (record.format) {
      case 'csv':
        formatted = formatAsCsv(data);
        break;
      case 'sql':
        formatted = formatAsSql(data);
        break;
      default:
        formatted = formatAsJson(data);
    }

    const sizeBytes = Buffer.byteLength(formatted, 'utf8');
    const updatedConfig = {
      format: record.format,
      entities: record.entities,
      filters: record.filters,
      status: 'completed',
      recordCount: totalRecords,
      sizeBytes,
    };

    const mem = await prisma.memory.update({
      where: { id: exportId },
      data: {
        content: JSON.stringify(updatedConfig).slice(0, 10000),
        tags: formatted.slice(0, 10000),
      },
    });
    return parseExportRecord(mem);
  },

  /**
   * Delete an export record.
   */
  async deleteExport(exportId: string): Promise<void> {
    await prisma.memory.delete({ where: { id: exportId } });
  },

  /**
   * Get the list of exportable entities with their current row counts.
   */
  async getExportableEntities(workspaceId: string): Promise<ExportableEntityInfo[]> {
    const entities: ExportableEntity[] = [
      'task', 'goal', 'project', 'customer', 'deal', 'memory', 'event', 'document',
    ];
    const results: ExportableEntityInfo[] = [];
    for (const entity of entities) {
      const count = await this.getEntityCount(entity, workspaceId);
      results.push({ name: entity, label: ENTITY_LABELS[entity], count });
    }
    return results;
  },

  /**
   * Get the row count for a single entity in a workspace.
   */
  async getEntityCount(entity: ExportableEntity, workspaceId: string): Promise<number> {
    const where = { workspaceId };
    switch (entity) {
      case 'task':
        return safePrisma(() => prisma.task.count({ where: { project: { workspaceId } } }), 0);
      case 'goal':
        return safePrisma(() => prisma.goal.count({ where }), 0);
      case 'project':
        return safePrisma(() => prisma.project.count({ where }), 0);
      case 'customer':
        return safePrisma(() => prisma.customer.count({ where }), 0);
      case 'deal':
        return safePrisma(() => prisma.deal.count({ where }), 0);
      case 'memory':
        return safePrisma(() => prisma.memory.count({ where }), 0);
      case 'event':
        return safePrisma(() => prisma.event.count({ where }), 0);
      case 'document':
        return safePrisma(() => prisma.document.count({ where }), 0);
      default:
        return 0;
    }
  },

  /**
   * Get aggregate stats for exports in a workspace.
   */
  async getExportStats(workspaceId: string): Promise<ExportStats> {
    const records = await this.listExports(workspaceId);
    const byFormat: Record<string, number> = {};
    let totalSizeBytes = 0;
    for (const r of records) {
      byFormat[r.format] = (byFormat[r.format] || 0) + 1;
      totalSizeBytes += r.sizeBytes;
    }
    return {
      total: records.length,
      completed: records.filter((r) => r.status === 'completed').length,
      pending: records.filter((r) => r.status === 'pending').length,
      failed: records.filter((r) => r.status === 'failed').length,
      totalSizeBytes,
      byFormat,
    };
  },
};
