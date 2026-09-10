import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Initiative Service ──

export const InitiativeService = {
  /**
   * List initiatives for a workspace.
   */
  async list(workspaceId: string) {
    return safePrisma(() =>
      prisma.initiative.findMany({
        where: { workspaceId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  /**
   * Get a single initiative by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.initiative.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * Create a new initiative.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    currency?: string;
    ownerId?: string;
  }) {
    return prisma.initiative.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 5000) || null,
        status: input.status || 'active',
        priority: input.priority || 'medium',
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        budget: input.budget ?? 0,
        currency: input.currency || 'USD',
        ownerId: input.ownerId || null,
      },
    });
  },

  /**
   * Update an initiative.
   */
  async update(id: string, data: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    budget?: number;
    currency?: string;
    ownerId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description?.slice(0, 5000) || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId || null;

    return prisma.initiative.update({ where: { id }, data: updateData });
  },
};
