import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export const ITContractService = {
  async list(organizationId: string, filters?: { status?: string }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    return safePrisma(() =>
      prisma.iTContract.findMany({
        where,
        orderBy: { endDate: 'asc' },
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.iTContract.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    vendorName: string;
    contractType?: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    value?: number;
    currency?: string;
    status?: string;
    renewalDate?: Date;
    terms?: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
  }) {
    return prisma.iTContract.create({
      data: {
        organizationId: input.organizationId,
        vendorName: input.vendorName.slice(0, 300),
        contractType: input.contractType || 'service',
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        startDate: input.startDate,
        endDate: input.endDate,
        value: input.value ?? 0,
        currency: input.currency || 'USD',
        status: input.status || 'active',
        renewalDate: input.renewalDate || null,
        terms: input.terms?.slice(0, 10000) || '',
        metadata: JSON.stringify(input.metadata || {}),
        createdBy: input.createdBy,
      },
    });
  },

  async update(id: string, data: {
    vendorName?: string;
    contractType?: string;
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    value?: number;
    currency?: string;
    status?: string;
    renewalDate?: Date;
    terms?: string;
    metadata?: Record<string, unknown>;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName.slice(0, 300);
    if (data.contractType !== undefined) updateData.contractType = data.contractType;
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.renewalDate !== undefined) updateData.renewalDate = data.renewalDate;
    if (data.terms !== undefined) updateData.terms = data.terms.slice(0, 10000);
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    return prisma.iTContract.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.iTContract.delete({ where: { id } });
  },

  /** Get contracts expiring within the given number of days. */
  async getExpiringContracts(organizationId: string, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return safePrisma(() =>
      prisma.iTContract.findMany({
        where: {
          organizationId,
          endDate: { lte: cutoff },
          status: { in: ['active', 'pending_renewal'] },
        },
        orderBy: { endDate: 'asc' },
      }),
    []);
  },

  /** Get contracts with renewal dates approaching within the given number of days. */
  async getRenewalAlerts(organizationId: string, daysAhead = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return safePrisma(() =>
      prisma.iTContract.findMany({
        where: {
          organizationId,
          renewalDate: { lte: cutoff, not: null },
          status: { in: ['active', 'pending_renewal'] },
        },
        orderBy: { renewalDate: 'asc' },
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byStatus, totalValue] = await Promise.all([
      safePrisma(() => prisma.iTContract.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.iTContract.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTContract.aggregate({
          where: { organizationId, status: 'active' },
          _sum: { value: true },
        }),
      { _sum: { value: 0 } } as { _sum: { value: number | null } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      totalActiveValue: totalValue._sum.value ?? 0,
    };
  },
};
