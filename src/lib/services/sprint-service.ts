import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { IssueService, Issue, IssueStatus } from '@/lib/services/issue-service';

// ── Types ──

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

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

/** Parsed content payload for a sprint Memory. */
interface SprintContent {
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  projectId: string | null;
  completedAt: string | null;
}

/** A structured sprint returned to callers. */
export interface Sprint {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  projectId: string | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate: Date | string;
  endDate: Date | string;
  projectId?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string;
  status?: SprintStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  projectId?: string | null;
}

export interface ListSprintOpts {
  status?: SprintStatus;
  projectId?: string;
  dateRange?: { start?: Date | string; end?: Date | string };
}

export interface BurndownPoint {
  day: number;
  remaining: number;
}

export interface BurndownData {
  ideal: BurndownPoint[];
  actual: BurndownPoint[];
  totalPoints: number;
  daysRemaining: number;
}

export interface VelocityEntry {
  sprintId: string;
  sprintName: string;
  points: number;
  issueCount: number;
}

export interface SprintStats {
  total: number;
  byStatus: Record<SprintStatus, number>;
  avgVelocity: number;
  totalIssuesCompleted: number;
}

// ── Helpers ──

const fallbackContent: SprintContent = {
  name: '',
  goal: '',
  status: 'planning',
  startDate: '',
  endDate: '',
  projectId: null,
  completedAt: null,
};

function parseSprintContent(raw: string): SprintContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      goal: parsed.goal ?? '',
      status: (parsed.status as SprintStatus) ?? 'planning',
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? '',
      projectId: parsed.projectId ?? null,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return fallbackContent;
  }
}

function toSprint(row: MemoryRow): Sprint {
  const content = parseSprintContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    goal: content.goal,
    status: content.status,
    startDate: content.startDate ? new Date(content.startDate) : new Date(0),
    endDate: content.endDate ? new Date(content.endDate) : new Date(0),
    projectId: content.projectId,
    completedAt: content.completedAt ? new Date(content.completedAt) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const CLOSED_ISSUE_STATUSES: IssueStatus[] = ['done', 'closed'];

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

// ── Sprint Service ──

export const SprintService = {
  /**
   * Create a sprint. Stored as a Memory with type='sprint'.
   */
  async create(organizationId: string, input: CreateSprintInput): Promise<Sprint> {
    const name = input.name.trim();
    const content: SprintContent = {
      name,
      goal: input.goal ?? '',
      status: 'planning',
      startDate: new Date(input.startDate).toISOString(),
      endDate: new Date(input.endDate).toISOString(),
      projectId: input.projectId ?? null,
      completedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'sprint',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.projectId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sprint', 'planning']),
        createdBy: input.createdBy,
      },
    });

    return toSprint(row as MemoryRow);
  },

  /**
   * Get a single sprint by ID.
   */
  async get(id: string): Promise<Sprint | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toSprint(row as MemoryRow);
  },

  /**
   * List sprints for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListSprintOpts = {}): Promise<Sprint[]> {
    const where: Record<string, unknown> = {
      type: 'sprint',
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
          take: 500,
        }),
      [],
    );

    let sprints = rows.map((r) => toSprint(r as MemoryRow));

    if (opts.status) sprints = sprints.filter((s) => s.status === opts.status);
    if (opts.projectId) sprints = sprints.filter((s) => s.projectId === opts.projectId);

    return sprints;
  },

  /**
   * Update a sprint.
   */
  async update(id: string, input: UpdateSprintInput): Promise<Sprint | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseSprintContent(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.goal !== undefined) content.goal = input.goal;
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = new Date(input.startDate).toISOString();
    if (input.endDate !== undefined) content.endDate = new Date(input.endDate).toISOString();
    if (input.projectId !== undefined) content.projectId = input.projectId;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sprint', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSprint(row as MemoryRow);
  },

  /**
   * Delete a sprint.
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
   * Start a sprint (status → active).
   */
  async start(id: string): Promise<Sprint | null> {
    return SprintService.update(id, { status: 'active' });
  },

  /**
   * Complete a sprint (status → completed).
   */
  async complete(id: string): Promise<Sprint | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseSprintContent(existing.content);
    content.status = 'completed';
    content.completedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sprint', 'completed']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSprint(row as MemoryRow);
  },

  /**
   * Add an issue to a sprint (update issue's sprintId).
   */
  async addIssue(sprintId: string, issueId: string): Promise<Issue | null> {
    return IssueService.update(issueId, { sprintId });
  },

  /**
   * Remove an issue from a sprint.
   */
  async removeIssue(sprintId: string, issueId: string): Promise<Issue | null> {
    const issue = await IssueService.get(issueId);
    if (!issue || issue.sprintId !== sprintId) return null;
    return IssueService.update(issueId, { sprintId: null });
  },

  /**
   * Get all issues in a sprint.
   */
  async getIssues(sprintId: string): Promise<Issue[]> {
    return IssueService.getBySprint(sprintId);
  },

  /**
   * Get velocity across completed sprints.
   */
  async getVelocity(
    organizationId: string,
    opts: ListSprintOpts = {},
  ): Promise<VelocityEntry[]> {
    const sprints = await SprintService.list(organizationId, {
      ...opts,
      status: 'completed',
    });

    const entries: VelocityEntry[] = [];
    for (const sprint of sprints) {
      const issues = await IssueService.getBySprint(sprint.id);
      const completed = issues.filter((i) => CLOSED_ISSUE_STATUSES.includes(i.status));
      const points = completed.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0);
      entries.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        points,
        issueCount: completed.length,
      });
    }

    return entries;
  },

  /**
   * Get burndown data for a sprint.
   * Calculates ideal burndown line (linear from total to 0)
   * and actual burndown from issue status changes.
   */
  async getBurndown(sprintId: string): Promise<BurndownData> {
    const sprint = await SprintService.get(sprintId);
    if (!sprint) {
      return { ideal: [], actual: [], totalPoints: 0, daysRemaining: 0 };
    }

    const issues = await IssueService.getBySprint(sprintId);
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0);
    const totalDays = daysBetween(sprint.startDate, sprint.endDate);
    const now = new Date();
    const elapsedDays = Math.min(
      totalDays,
      Math.max(0, daysBetween(sprint.startDate, now)),
    );
    const daysRemaining = Math.max(0, totalDays - elapsedDays);

    // Ideal burndown — linear from total to 0
    const ideal: BurndownPoint[] = [];
    for (let day = 0; day <= totalDays; day++) {
      const remaining = totalPoints * (1 - day / totalDays);
      ideal.push({ day, remaining: Math.round(remaining * 100) / 100 });
    }

    // Actual burndown — based on issue resolution times
    const actual: BurndownPoint[] = [];
    for (let day = 0; day <= elapsedDays; day++) {
      const dayDate = new Date(sprint.startDate.getTime() + day * 24 * 60 * 60 * 1000);
      const remaining = issues.reduce((sum, issue) => {
        if (!CLOSED_ISSUE_STATUSES.includes(issue.status)) return sum + (issue.estimatedHours ?? 0);
        if (issue.resolvedAt && issue.resolvedAt > dayDate) {
          return sum + (issue.estimatedHours ?? 0);
        }
        return sum;
      }, 0);
      actual.push({ day, remaining: Math.round(remaining * 100) / 100 });
    }

    return { ideal, actual, totalPoints, daysRemaining };
  },

  /**
   * Snapshot the current burndown state for a sprint.
   * Stored as a Memory with type='burndown_snapshot'.
   */
  async captureBurndownSnapshot(sprintId: string): Promise<boolean> {
    const sprint = await SprintService.get(sprintId);
    if (!sprint) return false;

    const burndown = await SprintService.getBurndown(sprintId);
    const content = {
      sprintId,
      sprintName: sprint.name,
      ...burndown,
      capturedAt: new Date().toISOString(),
    };

    try {
      await prisma.memory.create({
        data: {
          workspaceId: sprint.workspaceId,
          organizationId: sprint.organizationId,
          type: 'burndown_snapshot',
          content: JSON.stringify(content).slice(0, 10000),
          source: 'system',
          sourceId: sprintId,
          confidence: 1.0,
          lifecycle: 'long',
          tags: JSON.stringify(['burndown_snapshot', sprintId]),
          createdBy: sprint.createdBy,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get currently active sprint(s).
   */
  async getActive(organizationId: string): Promise<Sprint[]> {
    return SprintService.list(organizationId, { status: 'active' });
  },

  /**
   * Get upcoming planned sprints.
   */
  async getUpcoming(organizationId: string): Promise<Sprint[]> {
    return SprintService.list(organizationId, { status: 'planning' });
  },

  /**
   * Get sprint stats for an organization.
   */
  async getStats(organizationId: string): Promise<SprintStats> {
    const sprints = await SprintService.list(organizationId);

    const byStatus: Record<SprintStatus, number> = {
      planning: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalIssuesCompleted = 0;
    let totalVelocity = 0;
    let completedCount = 0;

    for (const sprint of sprints) {
      byStatus[sprint.status] = (byStatus[sprint.status] || 0) + 1;
      if (sprint.status === 'completed') {
        completedCount += 1;
        const issues = await IssueService.getBySprint(sprint.id);
        const completed = issues.filter((i) => CLOSED_ISSUE_STATUSES.includes(i.status));
        totalIssuesCompleted += completed.length;
        totalVelocity += completed.reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0);
      }
    }

    return {
      total: sprints.length,
      byStatus,
      avgVelocity: completedCount > 0 ? Math.round(totalVelocity / completedCount) : 0,
      totalIssuesCompleted,
    };
  },
};
