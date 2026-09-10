import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

interface ProcurementItem {
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
}

export const ITProcurementService = {
  async list(organizationId: string, filters?: { status?: string; type?: string }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    return safePrisma(() =>
      prisma.iTProcurement.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.iTProcurement.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    requestName: string;
    description?: string;
    type?: string;
    items?: ProcurementItem[];
    currency?: string;
    vendorId?: string;
    requestedBy: string;
  }) {
    const items = input.items || [];
    const totalCost = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    return prisma.iTProcurement.create({
      data: {
        organizationId: input.organizationId,
        requestName: input.requestName.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        type: input.type || 'purchase',
        status: 'pending',
        items: JSON.stringify(items),
        totalCost,
        currency: input.currency || 'USD',
        vendorId: input.vendorId || null,
        requestedBy: input.requestedBy,
      },
    });
  },

  async update(id: string, data: {
    requestName?: string;
    description?: string;
    type?: string;
    items?: ProcurementItem[];
    currency?: string;
    vendorId?: string;
    status?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.requestName !== undefined) updateData.requestName = data.requestName.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.items !== undefined) {
      updateData.items = JSON.stringify(data.items);
      updateData.totalCost = data.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    }
    return prisma.iTProcurement.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.iTProcurement.delete({ where: { id } });
  },

  async approve(id: string, approvedBy: string) {
    return prisma.iTProcurement.update({
      where: { id },
      data: { status: 'approved', approvedBy },
    });
  },

  async reject(id: string, approvedBy: string) {
    return prisma.iTProcurement.update({
      where: { id },
      data: { status: 'rejected', approvedBy },
    });
  },

  async markOrdered(id: string) {
    return prisma.iTProcurement.update({
      where: { id },
      data: { status: 'ordered', orderedAt: new Date() },
    });
  },

  async markReceived(id: string) {
    return prisma.iTProcurement.update({
      where: { id },
      data: { status: 'received', receivedAt: new Date() },
    });
  },

  async getStats(organizationId: string) {
    const [total, byStatus, totalCost] = await Promise.all([
      safePrisma(() => prisma.iTProcurement.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.iTProcurement.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTProcurement.aggregate({
          where: { organizationId, status: { not: 'rejected' } },
          _sum: { totalCost: true },
        }),
      { _sum: { totalCost: 0 } } as { _sum: { totalCost: number | null } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      totalCost: totalCost._sum.totalCost ?? 0,
    };
  },
};
