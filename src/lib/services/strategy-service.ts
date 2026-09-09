import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Strategy & OKRs ──

export const StrategyService = {
  // ── Strategic Initiatives ──

  async createInitiative(organizationId: string, input: {
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate: Date;
    endDate?: Date;
    owner?: string;
    budget?: number;
    progress?: number;
    tags?: string[];
    workspaceId?: string;
  }) {
    return prisma.strategicInitiative.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        status: input.status || 'planning',
        priority: input.priority || 'medium',
        startDate: input.startDate,
        endDate: input.endDate || null,
        owner: input.owner || null,
        budget: input.budget ?? 0,
        progress: clamp(input.progress ?? 0, 0, 100),
        tags: JSON.stringify(input.tags || []),
      },
    });
  },

  async getInitiative(id: string) {
    return safePrisma(() =>
      prisma.strategicInitiative.findUnique({ where: { id } }),
    null);
  },

  async listInitiatives(organizationId: string, opts?: {
    status?: string;
    priority?: string;
    owner?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.priority) where.priority = opts.priority;
    if (opts?.owner) where.owner = opts.owner;
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search } },
        { description: { contains: opts.search } },
      ];
    }
    return safePrisma(() =>
      prisma.strategicInitiative.findMany({
        where,
        orderBy: [{ startDate: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateInitiative(id: string, input: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    owner?: string;
    budget?: number;
    progress?: number;
    tags?: string[];
  }) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 5000);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.owner !== undefined) updateData.owner = input.owner || null;
    if (input.budget !== undefined) updateData.budget = input.budget;
    if (input.progress !== undefined) updateData.progress = clamp(input.progress, 0, 100);
    if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
    return prisma.strategicInitiative.update({ where: { id }, data: updateData });
  },

  async deleteInitiative(id: string) {
    return prisma.strategicInitiative.delete({ where: { id } });
  },

  // ── Milestones ──

  async createMilestone(organizationId: string, input: {
    name: string;
    description?: string;
    targetDate: Date;
    initiativeId?: string;
    status?: string;
    progress?: number;
    owner?: string;
  }) {
    return prisma.milestone.create({
      data: {
        organizationId,
        initiativeId: input.initiativeId || null,
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        targetDate: input.targetDate,
        status: input.status || 'planned',
        progress: clamp(input.progress ?? 0, 0, 100),
        owner: input.owner || null,
      },
    });
  },

  async getMilestone(id: string) {
    return safePrisma(() =>
      prisma.milestone.findUnique({ where: { id } }),
    null);
  },

  async listMilestones(organizationId: string, opts?: {
    initiativeId?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.initiativeId) where.initiativeId = opts.initiativeId;
    if (opts?.status) where.status = opts.status;
    if (opts?.dateRange) {
      where.targetDate = { gte: opts.dateRange.start, lte: opts.dateRange.end };
    }
    return safePrisma(() =>
      prisma.milestone.findMany({
        where,
        orderBy: [{ targetDate: 'asc' }],
        take: 200,
      }),
    []);
  },

  async updateMilestone(id: string, input: {
    name?: string;
    description?: string;
    targetDate?: Date;
    achievedDate?: Date;
    status?: string;
    progress?: number;
    owner?: string;
    initiativeId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 5000);
    if (input.targetDate !== undefined) updateData.targetDate = input.targetDate;
    if (input.achievedDate !== undefined) updateData.achievedDate = input.achievedDate;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.progress !== undefined) updateData.progress = clamp(input.progress, 0, 100);
    if (input.owner !== undefined) updateData.owner = input.owner || null;
    if (input.initiativeId !== undefined) updateData.initiativeId = input.initiativeId || null;
    return prisma.milestone.update({ where: { id }, data: updateData });
  },

  async deleteMilestone(id: string) {
    return prisma.milestone.delete({ where: { id } });
  },

  // ── OKRs (Goals + KPIs) ──

  async getOkRs(organizationId: string) {
    const goals = await safePrisma(() =>
      prisma.goal.findMany({
        where: { organizationId, type: 'objective' },
        include: { kpis: true, childGoals: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 100,
      }),
    []);
    return goals;
  },

  async createOkR(organizationId: string, input: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date;
    createdById: string;
    workspaceId?: string;
    keyResults?: Array<{
      name: string;
      description?: string;
      target?: number;
      current?: number;
      unit?: string;
      period?: string;
      direction?: string;
    }>;
  }) {
    const goal = await prisma.goal.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || null,
        type: 'objective',
        status: 'active',
        priority: input.priority || 'medium',
        progress: 0,
        dueDate: input.dueDate || null,
        createdById: input.createdById,
      },
    });

    const kpis: unknown[] = [];
    if (input.keyResults && input.keyResults.length > 0) {
      for (const kr of input.keyResults) {
        const kpi = await prisma.kpi.create({
          data: {
            organizationId,
            workspaceId: input.workspaceId || null,
            goalId: goal.id,
            name: kr.name.slice(0, 300),
            description: kr.description?.slice(0, 5000) || null,
            target: kr.target ?? 0,
            current: kr.current ?? 0,
            unit: kr.unit || 'count',
            period: kr.period || 'monthly',
            direction: kr.direction || 'up',
          },
        });
        kpis.push(kpi);
      }
    }

    // Recalculate progress from KPIs
    const progress = computeOkRProgress(kpis as Array<Record<string, unknown>>);
    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: { progress },
      include: { kpis: true },
    });
    return updatedGoal;
  },

  async updateOkR(goalId: string, input: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: Date;
    keyResults?: Array<{
      id?: string;
      name: string;
      description?: string;
      target?: number;
      current?: number;
      unit?: string;
      period?: string;
      direction?: string;
    }>;
  }) {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 5000);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: { kpis: true },
    });

    if (input.keyResults) {
      const existingKpiIds = goal.kpis.map((k) => k.id);
      const inputKpiIds = input.keyResults.filter((kr) => kr.id).map((kr) => kr.id!);
      // Delete KPIs not in the input
      const toDelete = existingKpiIds.filter((id) => !inputKpiIds.includes(id));
      for (const id of toDelete) {
        await prisma.kpi.delete({ where: { id } }).catch(() => null);
      }
      // Update or create KPIs
      for (const kr of input.keyResults) {
        if (kr.id && existingKpiIds.includes(kr.id)) {
          await prisma.kpi.update({
            where: { id: kr.id },
            data: {
              name: kr.name.slice(0, 300),
              description: kr.description?.slice(0, 5000) || null,
              target: kr.target ?? 0,
              current: kr.current ?? 0,
              unit: kr.unit || 'count',
              period: kr.period || 'monthly',
              direction: kr.direction || 'up',
            },
          });
        } else {
          await prisma.kpi.create({
            data: {
              organizationId: goal.organizationId,
              workspaceId: goal.workspaceId,
              goalId: goal.id,
              name: kr.name.slice(0, 300),
              description: kr.description?.slice(0, 5000) || null,
              target: kr.target ?? 0,
              current: kr.current ?? 0,
              unit: kr.unit || 'count',
              period: kr.period || 'monthly',
              direction: kr.direction || 'up',
            },
          });
        }
      }
    }

    // Recalculate progress
    const progress = await this.getOkRProgress(goalId);
    return prisma.goal.update({
      where: { id: goalId },
      data: { progress },
      include: { kpis: true },
    });
  },

  async getOkRProgress(goalId: string): Promise<number> {
    const kpis = await safePrisma(() =>
      prisma.kpi.findMany({
        where: { goalId },
        select: { target: true, current: true, direction: true },
      }),
    []);
    if (kpis.length === 0) return 0;
    return computeOkRProgress(kpis as Array<Record<string, unknown>>);
  },

  async getAlignmentMatrix(organizationId: string) {
    const [initiatives, goals, milestones] = await Promise.all([
      safePrisma(() =>
        prisma.strategicInitiative.findMany({
          where: { organizationId },
          select: { id: true, name: true, status: true, progress: true, owner: true },
          take: 100,
        }),
      []),
      safePrisma(() =>
        prisma.goal.findMany({
          where: { organizationId, type: 'objective' },
          include: { kpis: true },
          take: 100,
        }),
      []),
      // Get milestones linked to initiatives
      safePrisma(() =>
        prisma.milestone.findMany({
          where: { organizationId },
          select: { id: true, initiativeId: true, name: true, status: true, progress: true },
          take: 200,
        }),
      []),
    ]);

    const milestoneList = milestones as Array<Record<string, unknown>>;
    const matrix = (initiatives as Array<Record<string, unknown>>).map((init) => {
      const initMilestones = milestoneList.filter(
        (m) => m.initiativeId === init.id,
      );
      return {
        initiative: init,
        milestones: initMilestones,
        alignedGoals: (goals as Array<Record<string, unknown>>).filter(
          (g) => g.status === 'active',
        ),
      };
    });

    return { initiatives: matrix, totalGoals: (goals as unknown[]).length };
  },

  async getStats(organizationId: string) {
    const [
      totalInitiatives,
      initiativesByStatus,
      initiativesByPriority,
      totalMilestones,
      achievedMilestones,
      initiatives,
    ] = await Promise.all([
      safePrisma(() => prisma.strategicInitiative.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.strategicInitiative.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.strategicInitiative.groupBy({
          by: ['priority'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() => prisma.milestone.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.milestone.count({ where: { organizationId, status: 'achieved' } }), 0),
      safePrisma(() =>
        prisma.strategicInitiative.findMany({
          where: { organizationId },
          select: { progress: true },
        }),
      []),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of initiativesByStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const priorityCounts: Record<string, number> = {};
    for (const row of initiativesByPriority as Array<{ priority: string; _count: number }>) {
      priorityCounts[row.priority] = row._count;
    }

    const progressValues = (initiatives as Array<{ progress: number }>).map((i) => i.progress);
    const avgProgress = progressValues.length > 0
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : 0;

    return {
      totalInitiatives,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      totalMilestones,
      achievedMilestones,
      avgProgress,
    };
  },

  async getRoadmap(organizationId: string) {
    const [initiatives, milestones] = await Promise.all([
      safePrisma(() =>
        prisma.strategicInitiative.findMany({
          where: { organizationId },
          orderBy: [{ startDate: 'asc' }],
          take: 100,
        }),
      []),
      safePrisma(() =>
        prisma.milestone.findMany({
          where: { organizationId },
          orderBy: [{ targetDate: 'asc' }],
          take: 200,
        }),
      []),
    ]);
    return { initiatives, milestones };
  },
};

// ── Helpers ──

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function computeOkRProgress(kpis: Array<Record<string, unknown>>): number {
  if (kpis.length === 0) return 0;
  let totalProgress = 0;
  for (const kpi of kpis) {
    const target = Number(kpi.target || 0);
    const current = Number(kpi.current || 0);
    const direction = String(kpi.direction || 'up');
    if (target === 0) {
      totalProgress += current > 0 ? 1 : 0;
      continue;
    }
    let ratio: number;
    if (direction === 'down') {
      // Lower is better — if current is 0, that's 100%
      ratio = target === 0 ? 1 : Math.max(0, (target - current) / target);
    } else {
      ratio = Math.max(0, Math.min(1, current / target));
    }
    totalProgress += ratio;
  }
  return Math.round((totalProgress / kpis.length) * 100) / 100;
}
