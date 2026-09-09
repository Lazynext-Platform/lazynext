import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Change Requests (ITSM) ──

export const ChangeManagementService = {
  async list(organizationId: string, filters?: {
    status?: string;
    type?: string;
    priority?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.changeRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.changeRequest.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    riskLevel?: string;
    requestedById: string;
    rollbackPlan?: string;
    impactAnalysis?: string;
    affectedSystems?: string[];
    scheduledAt?: Date;
  }) {
    return prisma.changeRequest.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        type: input.type || 'standard',
        status: input.status || 'requested',
        priority: input.priority || 'medium',
        riskLevel: input.riskLevel || 'low',
        requestedById: input.requestedById,
        rollbackPlan: input.rollbackPlan?.slice(0, 5000) || '',
        impactAnalysis: input.impactAnalysis?.slice(0, 5000) || '',
        affectedSystems: JSON.stringify(input.affectedSystems || []),
        scheduledAt: input.scheduledAt || null,
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    riskLevel?: string;
    rollbackPlan?: string;
    impactAnalysis?: string;
    affectedSystems?: string[];
    scheduledAt?: Date;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
    if (data.rollbackPlan !== undefined) updateData.rollbackPlan = data.rollbackPlan.slice(0, 5000);
    if (data.impactAnalysis !== undefined) updateData.impactAnalysis = data.impactAnalysis.slice(0, 5000);
    if (data.affectedSystems !== undefined) updateData.affectedSystems = JSON.stringify(data.affectedSystems);
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
    return prisma.changeRequest.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.changeRequest.delete({ where: { id } });
  },

  async approveChangeRequest(id: string, approvedById: string) {
    return prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById,
        approvedAt: new Date(),
      },
    });
  },

  async rejectChangeRequest(id: string, approvedById?: string) {
    const data: Record<string, unknown> = { status: 'rejected' };
    if (approvedById) {
      data.approvedById = approvedById;
      data.approvedAt = new Date();
    }
    return prisma.changeRequest.update({ where: { id }, data });
  },

  async implementChangeRequest(id: string) {
    return prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'in_progress',
        implementedAt: new Date(),
      },
    });
  },

  async completeChangeRequest(id: string) {
    return prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'implemented',
        completedAt: new Date(),
      },
    });
  },

  async cancelChangeRequest(id: string) {
    return prisma.changeRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  },

  async getByStatus(organizationId: string, status: string) {
    return safePrisma(() =>
      prisma.changeRequest.findMany({
        where: { organizationId, status },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getByType(organizationId: string, type: string) {
    return safePrisma(() =>
      prisma.changeRequest.findMany({
        where: { organizationId, type },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byStatus, byType] = await Promise.all([
      safePrisma(() => prisma.changeRequest.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.changeRequest.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.changeRequest.groupBy({
          by: ['type'],
          where: { organizationId },
          _count: true,
        }),
      []),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const typeCounts: Record<string, number> = {};
    for (const row of byType as Array<{ type: string; _count: number }>) {
      typeCounts[row.type] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      byType: typeCounts,
    };
  },
};
