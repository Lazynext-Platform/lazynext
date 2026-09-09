import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import type {
  ReportColumn,
  ReportDataSource,
  ReportFilter,
  ReportGroupBy,
  ReportSchedule,
  ReportFormat,
} from './report-builder-service';

// ── Types ──

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

/** Parsed content payload for a report template Memory. */
interface TemplateContent {
  name: string;
  description: string;
  category: string;
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  orderBy: { field: string; direction: 'asc' | 'desc' };
  schedule: ReportSchedule;
  format: ReportFormat;
  isBuiltIn: boolean;
  icon: string;
  tags: string[];
}

/** A structured report template returned to callers. */
export interface ReportTemplate {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  orderBy: { field: string; direction: 'asc' | 'desc' };
  schedule: ReportSchedule;
  format: ReportFormat;
  isBuiltIn: boolean;
  icon: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: string;
  dataSource: ReportDataSource;
  columns?: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  schedule?: ReportSchedule;
  format?: ReportFormat;
  isBuiltIn?: boolean;
  icon?: string;
  tags?: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface ListTemplateOpts {
  workspaceId?: string;
  category?: string;
  dataSource?: ReportDataSource;
  search?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  dataSource?: ReportDataSource;
  columns?: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  schedule?: ReportSchedule;
  format?: ReportFormat;
  icon?: string;
  tags?: string[];
}

export interface TemplateStats {
  totalTemplates: number;
  byCategory: Record<string, number>;
  byDataSource: Record<string, number>;
  builtInTemplates: number;
}

// ── Helpers ──

const fallbackContent: TemplateContent = {
  name: '',
  description: '',
  category: 'general',
  dataSource: 'tasks',
  columns: [],
  filters: [],
  groupBy: [],
  orderBy: { field: 'createdAt', direction: 'desc' },
  schedule: 'none',
  format: 'csv',
  isBuiltIn: false,
  icon: 'BarChart3',
  tags: [],
};

function parseTemplateContent(raw: string): TemplateContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      category: parsed.category ?? 'general',
      dataSource: (parsed.dataSource as ReportDataSource) ?? 'tasks',
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      filters: Array.isArray(parsed.filters) ? parsed.filters : [],
      groupBy: Array.isArray(parsed.groupBy) ? parsed.groupBy : [],
      orderBy: parsed.orderBy ?? { field: 'createdAt', direction: 'desc' },
      schedule: (parsed.schedule as ReportSchedule) ?? 'none',
      format: (parsed.format as ReportFormat) ?? 'csv',
      isBuiltIn: parsed.isBuiltIn ?? false,
      icon: parsed.icon ?? 'BarChart3',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toTemplate(row: MemoryRow): ReportTemplate {
  const content = parseTemplateContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    description: content.description,
    category: content.category,
    dataSource: content.dataSource,
    columns: content.columns,
    filters: content.filters,
    groupBy: content.groupBy,
    orderBy: content.orderBy,
    schedule: content.schedule,
    format: content.format,
    isBuiltIn: content.isBuiltIn,
    icon: content.icon,
    tags: content.tags,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Report Template Service ──

export const ReportTemplateService = {
  /**
   * Create a report template. Stored as a Memory with type='report_template'.
   */
  async create(organizationId: string, input: CreateTemplateInput): Promise<ReportTemplate> {
    const name = input.name.trim();
    const content: TemplateContent = {
      name,
      description: input.description ?? '',
      category: input.category ?? 'general',
      dataSource: input.dataSource,
      columns: input.columns ?? [],
      filters: input.filters ?? [],
      groupBy: input.groupBy ?? [],
      orderBy: input.orderBy ?? { field: 'createdAt', direction: 'desc' },
      schedule: input.schedule ?? 'none',
      format: input.format ?? 'csv',
      isBuiltIn: input.isBuiltIn ?? false,
      icon: input.icon ?? 'BarChart3',
      tags: input.tags ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'report_template',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['report_template', content.category, content.dataSource]),
        createdBy: input.createdBy,
      },
    });

    return toTemplate(row as MemoryRow);
  },

  /**
   * Get a single template by ID.
   */
  async get(id: string): Promise<ReportTemplate | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toTemplate(row as MemoryRow);
  },

  /**
   * List templates for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListTemplateOpts = {}): Promise<ReportTemplate[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'report_template',
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let templates = rows.map((r) => toTemplate(r as MemoryRow));

    if (opts.category) {
      templates = templates.filter((t) => t.category === opts.category);
    }
    if (opts.dataSource) {
      templates = templates.filter((t) => t.dataSource === opts.dataSource);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    return templates;
  },

  /**
   * Update a template.
   */
  async update(id: string, input: UpdateTemplateInput): Promise<ReportTemplate | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseTemplateContent(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.dataSource !== undefined) content.dataSource = input.dataSource;
    if (input.columns !== undefined) content.columns = input.columns;
    if (input.filters !== undefined) content.filters = input.filters;
    if (input.groupBy !== undefined) content.groupBy = input.groupBy;
    if (input.orderBy !== undefined) content.orderBy = input.orderBy;
    if (input.schedule !== undefined) content.schedule = input.schedule;
    if (input.format !== undefined) content.format = input.format;
    if (input.icon !== undefined) content.icon = input.icon;
    if (input.tags !== undefined) content.tags = input.tags;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['report_template', content.category, content.dataSource]),
        },
      }),
      null,
    );
    if (!row) return null;
    return toTemplate(row as MemoryRow);
  },

  /**
   * Delete a template.
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
   * Get templates by category.
   */
  async getByCategory(organizationId: string, category: string): Promise<ReportTemplate[]> {
    return ReportTemplateService.list(organizationId, { category });
  },

  /**
   * Instantiate a template into a custom report (returns the report definition).
   * The caller is responsible for saving it via ReportBuilderService.create.
   */
  async instantiate(
    id: string,
    overrides: { name?: string; description?: string; createdBy: string },
  ): Promise<{
    name: string;
    description: string;
    dataSource: ReportDataSource;
    columns: ReportColumn[];
    filters: ReportFilter[];
    groupBy: ReportGroupBy[];
    orderBy: { field: string; direction: 'asc' | 'desc' };
    schedule: ReportSchedule;
    format: ReportFormat;
  } | null> {
    const template = await ReportTemplateService.get(id);
    if (!template) return null;

    return {
      name: overrides.name ?? template.name,
      description: overrides.description ?? template.description,
      dataSource: template.dataSource,
      columns: template.columns,
      filters: template.filters,
      groupBy: template.groupBy,
      orderBy: template.orderBy,
      schedule: template.schedule,
      format: template.format,
    };
  },

  /**
   * Get template stats for an organization.
   */
  async getStats(organizationId: string): Promise<TemplateStats> {
    const templates = await ReportTemplateService.list(organizationId);

    const byCategory: Record<string, number> = {};
    const byDataSource: Record<string, number> = {};
    let builtInTemplates = 0;

    for (const t of templates) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byDataSource[t.dataSource] = (byDataSource[t.dataSource] || 0) + 1;
      if (t.isBuiltIn) builtInTemplates += 1;
    }

    return {
      totalTemplates: templates.length,
      byCategory,
      byDataSource,
      builtInTemplates,
    };
  },
};
