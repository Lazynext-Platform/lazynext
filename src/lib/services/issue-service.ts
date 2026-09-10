import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type IssueType = 'bug' | 'feature' | 'task' | 'enhancement' | 'epic';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type IssueSeverity = 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
export type IssueStatus = 'open' | 'in_progress' | 'in_review' | 'done' | 'closed';

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

/** Parsed content payload for an issue Memory. */
interface IssueContent {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  severity: IssueSeverity | null;
  status: IssueStatus;
  assigneeId: string | null;
  reporterId: string | null;
  projectId: string | null;
  sprintId: string | null;
  labels: string[];
  estimatedHours: number | null;
  dueDate: string | null;
  resolvedAt: string | null;
}

/** A structured issue returned to callers. */
export interface Issue {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  severity: IssueSeverity | null;
  status: IssueStatus;
  assigneeId: string | null;
  reporterId: string | null;
  projectId: string | null;
  sprintId: string | null;
  labels: string[];
  estimatedHours: number | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  type: IssueType;
  priority: IssuePriority;
  severity?: IssueSeverity;
  status?: IssueStatus;
  assigneeId?: string;
  reporterId?: string;
  projectId?: string;
  sprintId?: string;
  labels?: string[];
  estimatedHours?: number;
  dueDate?: Date | string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  severity?: IssueSeverity | null;
  status?: IssueStatus;
  assigneeId?: string | null;
  reporterId?: string | null;
  projectId?: string | null;
  sprintId?: string | null;
  labels?: string[];
  estimatedHours?: number | null;
  dueDate?: Date | string | null;
}

export interface ListIssueOpts {
  type?: IssueType;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  status?: IssueStatus;
  assigneeId?: string;
  projectId?: string;
  sprintId?: string;
  labels?: string[];
  search?: string;
  dateRange?: { start?: Date | string; end?: Date | string };
}

export interface IssueStats {
  total: number;
  byType: Record<IssueType, number>;
  byPriority: Record<IssuePriority, number>;
  byStatus: Record<IssueStatus, number>;
  openCount: number;
  closedCount: number;
  avgResolutionMs: number;
}

// ── Helpers ──

const fallbackContent: IssueContent = {
  title: '',
  description: '',
  type: 'task',
  priority: 'medium',
  severity: null,
  status: 'open',
  assigneeId: null,
  reporterId: null,
  projectId: null,
  sprintId: null,
  labels: [],
  estimatedHours: null,
  dueDate: null,
  resolvedAt: null,
};

function parseIssueContent(raw: string): IssueContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as IssueType) ?? 'task',
      priority: (parsed.priority as IssuePriority) ?? 'medium',
      severity: (parsed.severity as IssueSeverity | null) ?? null,
      status: (parsed.status as IssueStatus) ?? 'open',
      assigneeId: parsed.assigneeId ?? null,
      reporterId: parsed.reporterId ?? null,
      projectId: parsed.projectId ?? null,
      sprintId: parsed.sprintId ?? null,
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      estimatedHours: parsed.estimatedHours ?? null,
      dueDate: parsed.dueDate ?? null,
      resolvedAt: parsed.resolvedAt ?? null,
    };
  } catch {
    return fallbackContent;
  }
}

function toIssue(row: MemoryRow): Issue {
  const content = parseIssueContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: content.title,
    description: content.description,
    type: content.type,
    priority: content.priority,
    severity: content.severity,
    status: content.status,
    assigneeId: content.assigneeId,
    reporterId: content.reporterId,
    projectId: content.projectId,
    sprintId: content.sprintId,
    labels: content.labels,
    estimatedHours: content.estimatedHours,
    dueDate: content.dueDate ? new Date(content.dueDate) : null,
    resolvedAt: content.resolvedAt ? new Date(content.resolvedAt) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const CLOSED_STATUSES: IssueStatus[] = ['done', 'closed'];

// ── Issue Service ──

export const IssueService = {
  /**
   * Create an issue. Stored as a Memory with type='issue'.
   */
  async create(organizationId: string, input: CreateIssueInput): Promise<Issue> {
    const title = input.title.trim();
    const status: IssueStatus = input.status ?? 'open';
    const content: IssueContent = {
      title,
      description: input.description ?? '',
      type: input.type,
      priority: input.priority,
      severity: input.severity ?? null,
      status,
      assigneeId: input.assigneeId ?? null,
      reporterId: input.reporterId ?? null,
      projectId: input.projectId ?? null,
      sprintId: input.sprintId ?? null,
      labels: input.labels ?? [],
      estimatedHours: input.estimatedHours ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
      resolvedAt: CLOSED_STATUSES.includes(status) ? new Date().toISOString() : null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'issue',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.projectId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['issue', input.type, input.priority]),
        createdBy: input.createdBy,
      },
    });

    return toIssue(row as MemoryRow);
  },

  /**
   * Get a single issue by ID.
   */
  async get(id: string): Promise<Issue | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toIssue(row as MemoryRow);
  },

  /**
   * List issues for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListIssueOpts = {}): Promise<Issue[]> {
    const where: Record<string, unknown> = {
      type: 'issue',
      organizationId,
    };
    if (opts.dateRange?.start || opts.dateRange?.end) {
      const createdAtFilter: Record<string, Date> = {};
      if (opts.dateRange.start) createdAtFilter.gte = new Date(opts.dateRange.start);
      if (opts.dateRange.end) createdAtFilter.lte = new Date(opts.dateRange.end);
      where.createdAt = createdAtFilter;
    }

    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let issues = rows.map((r) => toIssue(r as MemoryRow));

    if (opts.type) issues = issues.filter((i) => i.type === opts.type);
    if (opts.priority) issues = issues.filter((i) => i.priority === opts.priority);
    if (opts.severity) issues = issues.filter((i) => i.severity === opts.severity);
    if (opts.status) issues = issues.filter((i) => i.status === opts.status);
    if (opts.assigneeId) issues = issues.filter((i) => i.assigneeId === opts.assigneeId);
    if (opts.projectId) issues = issues.filter((i) => i.projectId === opts.projectId);
    if (opts.sprintId) issues = issues.filter((i) => i.sprintId === opts.sprintId);
    if (opts.labels && opts.labels.length > 0) {
      issues = issues.filter((i) => opts.labels!.every((l) => i.labels.includes(l)));
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      issues = issues.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }

    return issues;
  },

  /**
   * Update an issue.
   */
  async update(id: string, input: UpdateIssueInput): Promise<Issue | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseIssueContent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.priority !== undefined) content.priority = input.priority;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.status !== undefined) {
      content.status = input.status;
      if (CLOSED_STATUSES.includes(input.status) && !content.resolvedAt) {
        content.resolvedAt = new Date().toISOString();
      }
      if (!CLOSED_STATUSES.includes(input.status)) {
        content.resolvedAt = null;
      }
    }
    if (input.assigneeId !== undefined) content.assigneeId = input.assigneeId;
    if (input.reporterId !== undefined) content.reporterId = input.reporterId;
    if (input.projectId !== undefined) content.projectId = input.projectId;
    if (input.sprintId !== undefined) content.sprintId = input.sprintId;
    if (input.labels !== undefined) content.labels = input.labels;
    if (input.estimatedHours !== undefined) content.estimatedHours = input.estimatedHours;
    if (input.dueDate !== undefined) {
      content.dueDate = input.dueDate ? new Date(input.dueDate).toISOString() : null;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['issue', content.type, content.priority]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toIssue(row as MemoryRow);
  },

  /**
   * Delete an issue.
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
   * Assign an issue to a user.
   */
  async assign(id: string, assigneeId: string): Promise<Issue | null> {
    return IssueService.update(id, { assigneeId });
  },

  /**
   * Change the status of an issue.
   */
  async changeStatus(id: string, status: IssueStatus): Promise<Issue | null> {
    return IssueService.update(id, { status });
  },

  /**
   * Change the priority of an issue.
   */
  async changePriority(id: string, priority: IssuePriority): Promise<Issue | null> {
    return IssueService.update(id, { priority });
  },

  /**
   * Add a label to an issue.
   */
  async addLabel(id: string, label: string): Promise<Issue | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseIssueContent(existing.content);
    const trimmed = label.trim();
    if (trimmed && !content.labels.includes(trimmed)) {
      content.labels.push(trimmed);
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: { content: JSON.stringify(content).slice(0, 10000) },
        }),
      null,
    );
    if (!row) return null;
    return toIssue(row as MemoryRow);
  },

  /**
   * Remove a label from an issue.
   */
  async removeLabel(id: string, label: string): Promise<Issue | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseIssueContent(existing.content);
    content.labels = content.labels.filter((l) => l !== label);

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: { content: JSON.stringify(content).slice(0, 10000) },
        }),
      null,
    );
    if (!row) return null;
    return toIssue(row as MemoryRow);
  },

  /**
   * Get all issues for a project.
   */
  async getByProject(projectId: string): Promise<Issue[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'issue', sourceId: projectId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    return rows
      .map((r) => toIssue(r as MemoryRow))
      .filter((i) => i.projectId === projectId);
  },

  /**
   * Get all issues in a sprint.
   */
  async getBySprint(sprintId: string): Promise<Issue[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'issue' },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    return rows
      .map((r) => toIssue(r as MemoryRow))
      .filter((i) => i.sprintId === sprintId);
  },

  /**
   * Get the backlog — issues not assigned to any sprint.
   */
  async getBacklog(organizationId: string): Promise<Issue[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'issue', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    return rows
      .map((r) => toIssue(r as MemoryRow))
      .filter((i) => !i.sprintId);
  },

  /**
   * Get issues grouped by status (for kanban).
   */
  async getByStatus(organizationId: string): Promise<Record<IssueStatus, Issue[]>> {
    const issues = await IssueService.list(organizationId);
    const grouped: Record<IssueStatus, Issue[]> = {
      open: [],
      in_progress: [],
      in_review: [],
      done: [],
      closed: [],
    };
    for (const issue of issues) {
      grouped[issue.status].push(issue);
    }
    return grouped;
  },

  /**
   * Get issues grouped by priority.
   */
  async getByPriority(organizationId: string): Promise<Record<IssuePriority, Issue[]>> {
    const issues = await IssueService.list(organizationId);
    const grouped: Record<IssuePriority, Issue[]> = {
      low: [],
      medium: [],
      high: [],
      urgent: [],
      critical: [],
    };
    for (const issue of issues) {
      grouped[issue.priority].push(issue);
    }
    return grouped;
  },

  /**
   * Get issues grouped by type.
   */
  async getByType(organizationId: string): Promise<Record<IssueType, Issue[]>> {
    const issues = await IssueService.list(organizationId);
    const grouped: Record<IssueType, Issue[]> = {
      bug: [],
      feature: [],
      task: [],
      enhancement: [],
      epic: [],
    };
    for (const issue of issues) {
      grouped[issue.type].push(issue);
    }
    return grouped;
  },

  /**
   * Get issue stats for an organization.
   */
  async getStats(organizationId: string): Promise<IssueStats> {
    const issues = await IssueService.list(organizationId);

    const byType: Record<IssueType, number> = {
      bug: 0,
      feature: 0,
      task: 0,
      enhancement: 0,
      epic: 0,
    };
    const byPriority: Record<IssuePriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
      critical: 0,
    };
    const byStatus: Record<IssueStatus, number> = {
      open: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      closed: 0,
    };

    let openCount = 0;
    let closedCount = 0;
    let totalResolutionMs = 0;
    let resolvedCount = 0;

    for (const issue of issues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
      byPriority[issue.priority] = (byPriority[issue.priority] || 0) + 1;
      byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;

      if (CLOSED_STATUSES.includes(issue.status)) {
        closedCount += 1;
        if (issue.resolvedAt) {
          totalResolutionMs += issue.resolvedAt.getTime() - issue.createdAt.getTime();
          resolvedCount += 1;
        }
      } else {
        openCount += 1;
      }
    }

    return {
      total: issues.length,
      byType,
      byPriority,
      byStatus,
      openCount,
      closedCount,
      avgResolutionMs: resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount) : 0,
    };
  },
};
