import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Goal Service ──

export const GoalService = {
  /**
   * List goals for a company.
   */
  async list(companyId: string, filters?: { status?: string; workspaceId?: string }) {
    return safePrisma(() =>
      prisma.goal.findMany({
        where: {
          organizationId: companyId,
          ...(filters?.status && { status: filters.status }),
          ...(filters?.workspaceId && { workspaceId: filters.workspaceId }),
        },
        include: {
          _count: { select: { kpis: true, plans: true, childGoals: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
    []);
  },

  /**
   * Get a single goal by ID.
   */
  async get(goalId: string) {
    return safePrisma(() =>
      prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          kpis: true,
          plans: { orderBy: { createdAt: 'desc' }, take: 10 },
          childGoals: true,
          parentGoal: true,
        },
      }),
    null);
  },

  /**
   * Create a new goal.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    dueDate?: Date;
    parentGoalId?: string;
    createdById: string;
  }) {
    return prisma.goal.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || null,
        type: input.type || 'objective',
        priority: input.priority || 'medium',
        dueDate: input.dueDate || null,
        parentGoalId: input.parentGoalId || null,
        createdById: input.createdById,
      },
    });
  },

  /**
   * Update a goal.
   */
  async update(goalId: string, input: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    progress?: number;
    dueDate?: Date | null;
  }) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.description !== undefined) data.description = input.description?.slice(0, 5000) || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.progress !== undefined) data.progress = Math.max(0, Math.min(1, input.progress));
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;

    return prisma.goal.update({ where: { id: goalId }, data });
  },

  /**
   * Delete a goal (soft delete by setting status to cancelled).
   */
  async delete(goalId: string) {
    return prisma.goal.update({
      where: { id: goalId },
      data: { status: 'cancelled' },
    });
  },
};

// ── KPI Service ──

export const KpiService = {
  async list(companyId: string, filters?: { goalId?: string; workspaceId?: string }) {
    return safePrisma(() =>
      prisma.kpi.findMany({
        where: {
          organizationId: companyId,
          ...(filters?.goalId && { goalId: filters.goalId }),
          ...(filters?.workspaceId && { workspaceId: filters.workspaceId }),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    goalId?: string;
    name: string;
    description?: string;
    target?: number;
    unit?: string;
    period?: string;
    direction?: string;
  }) {
    return prisma.kpi.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        goalId: input.goalId || null,
        name: input.name.slice(0, 200),
        description: input.description?.slice(0, 2000) || null,
        target: input.target || 0,
        unit: input.unit || 'count',
        period: input.period || 'monthly',
        direction: input.direction || 'up',
      },
    });
  },

  async update(kpiId: string, input: {
    name?: string;
    target?: number;
    current?: number;
    unit?: string;
    period?: string;
  }) {
    const data: Record<string, unknown> = { lastUpdated: new Date() };
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.target !== undefined) data.target = input.target;
    if (input.current !== undefined) data.current = input.current;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.period !== undefined) data.period = input.period;

    return prisma.kpi.update({ where: { id: kpiId }, data });
  },

  async recordValue(kpiId: string, value: number) {
    return prisma.kpi.update({
      where: { id: kpiId },
      data: { current: value, lastUpdated: new Date() },
    });
  },
};
