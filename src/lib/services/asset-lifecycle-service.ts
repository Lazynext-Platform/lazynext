import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export interface MaintenanceInput {
  itAssetId: string;
  type?: string;
  status?: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  completedDate?: Date;
  cost?: number;
  performedBy?: string;
  vendorName?: string;
  notes?: string;
}

export interface MaintenanceUpdate {
  type?: string;
  status?: string;
  title?: string;
  description?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  cost?: number;
  performedBy?: string;
  vendorName?: string;
  notes?: string;
}

export interface MaintenanceListOpts {
  itAssetId?: string;
  type?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const AssetLifecycleService = {
  async createMaintenance(organizationId: string, input: MaintenanceInput) {
    return prisma.assetMaintenance.create({
      data: {
        organizationId,
        itAssetId: input.itAssetId,
        type: input.type || 'preventive',
        status: input.status || 'scheduled',
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        scheduledDate: input.scheduledDate,
        completedDate: input.completedDate || null,
        cost: input.cost ?? 0,
        performedBy: input.performedBy || null,
        vendorName: input.vendorName || null,
        notes: input.notes?.slice(0, 5000) || '',
      },
    });
  },

  async getMaintenance(id: string) {
    return safePrisma(() =>
      prisma.assetMaintenance.findUnique({ where: { id } }),
    null);
  },

  async listMaintenance(organizationId: string, opts?: MaintenanceListOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.itAssetId) where.itAssetId = opts.itAssetId;
    if (opts?.type) where.type = opts.type;
    if (opts?.status) where.status = opts.status;
    if (opts?.dateFrom || opts?.dateTo) {
      const range: Record<string, Date> = {};
      if (opts.dateFrom) range.gte = opts.dateFrom;
      if (opts.dateTo) range.lte = opts.dateTo;
      where.scheduledDate = range;
    }
    return safePrisma(() =>
      prisma.assetMaintenance.findMany({
        where,
        orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateMaintenance(id: string, input: MaintenanceUpdate) {
    const data: Record<string, unknown> = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.scheduledDate !== undefined) data.scheduledDate = input.scheduledDate;
    if (input.completedDate !== undefined) data.completedDate = input.completedDate;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.performedBy !== undefined) data.performedBy = input.performedBy || null;
    if (input.vendorName !== undefined) data.vendorName = input.vendorName || null;
    if (input.notes !== undefined) data.notes = input.notes.slice(0, 5000);
    return prisma.assetMaintenance.update({ where: { id }, data });
  },

  async deleteMaintenance(id: string) {
    return prisma.assetMaintenance.delete({ where: { id } });
  },

  async completeMaintenance(id: string, performedBy: string, cost: number, notes: string) {
    return prisma.assetMaintenance.update({
      where: { id },
      data: {
        status: 'completed',
        completedDate: new Date(),
        performedBy: performedBy || null,
        cost: cost ?? 0,
        notes: notes?.slice(0, 5000) || '',
      },
    });
  },

  async getUpcomingMaintenance(organizationId: string, days = 30) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return safePrisma(() =>
      prisma.assetMaintenance.findMany({
        where: {
          organizationId,
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: { gte: now, lte: horizon },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 100,
      }),
    []);
  },

  async getOverdueMaintenance(organizationId: string) {
    const now = new Date();
    return safePrisma(() =>
      prisma.assetMaintenance.findMany({
        where: {
          organizationId,
          status: { in: ['scheduled', 'in_progress'] },
          scheduledDate: { lt: now },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 100,
      }),
    []);
  },

  async getMaintenanceHistory(itAssetId: string) {
    return safePrisma(() =>
      prisma.assetMaintenance.findMany({
        where: { itAssetId },
        orderBy: { scheduledDate: 'desc' },
        take: 100,
      }),
    []);
  },

  async getMaintenanceStats(organizationId: string) {
    const [total, byType, byStatus, overdue, costAgg] = await Promise.all([
      safePrisma(() => prisma.assetMaintenance.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.assetMaintenance.groupBy({
          by: ['type'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.assetMaintenance.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.assetMaintenance.count({
          where: {
            organizationId,
            status: { in: ['scheduled', 'in_progress'] },
            scheduledDate: { lt: new Date() },
          },
        }),
      0),
      safePrisma(() =>
        prisma.assetMaintenance.aggregate({
          where: { organizationId },
          _sum: { cost: true },
        }),
      { _sum: { cost: 0 } }),
    ]);
    const typeCounts: Record<string, number> = {};
    for (const row of byType as Array<{ type: string; _count: number }>) {
      typeCounts[row.type] = row._count;
    }
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const totalCost = (costAgg as { _sum: { cost: number | null } })._sum.cost ?? 0;
    return { total, byType: typeCounts, byStatus: statusCounts, overdue, totalCost };
  },
};
