import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Plan Service ──

export const PlanService = {
  /**
   * List plans for a workspace.
   */
  async list(workspaceId: string, filters?: { status?: string; goalId?: string }) {
    return safePrisma(() =>
      prisma.plan.findMany({
        where: {
          workspaceId,
          ...(filters?.status && { status: filters.status }),
          ...(filters?.goalId && { goalId: filters.goalId }),
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
    []);
  },

  /**
   * Get a single plan by ID.
   */
  async get(planId: string) {
    return safePrisma(() =>
      prisma.plan.findUnique({
        where: { id: planId },
        include: { goal: true },
      }),
    null);
  },

  /**
   * Create a new plan.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    goalId?: string;
    title: string;
    objective: string;
    reasoning?: string;
    priority?: string;
    riskLevel?: string;
    estimatedCost?: number;
    createdById?: string;
    agentId?: string;
  }) {
    return prisma.plan.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        goalId: input.goalId || null,
        title: input.title.slice(0, 300),
        objective: input.objective.slice(0, 5000),
        reasoning: input.reasoning?.slice(0, 5000) || null,
        priority: input.priority || 'medium',
        riskLevel: input.riskLevel || 'low',
        estimatedCost: input.estimatedCost || 0,
        createdById: input.createdById || null,
        agentId: input.agentId || null,
      },
    });
  },

  /**
   * Update a plan.
   */
  async update(planId: string, input: {
    title?: string;
    objective?: string;
    reasoning?: string;
    status?: string;
    priority?: string;
    riskLevel?: string;
    estimatedCost?: number;
    approvedById?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.objective !== undefined) data.objective = input.objective.slice(0, 5000);
    if (input.reasoning !== undefined) data.reasoning = input.reasoning?.slice(0, 5000) || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.riskLevel !== undefined) data.riskLevel = input.riskLevel;
    if (input.estimatedCost !== undefined) data.estimatedCost = input.estimatedCost;
    if (input.approvedById !== undefined) {
      data.approvedById = input.approvedById;
      data.approvedAt = new Date();
    }

    return prisma.plan.update({ where: { id: planId }, data });
  },

  /**
   * Approve a plan.
   */
  async approve(planId: string, approverId: string) {
    return prisma.plan.update({
      where: { id: planId },
      data: {
        status: 'active',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
  },
};
