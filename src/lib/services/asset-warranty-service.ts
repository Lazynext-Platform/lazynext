import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export interface WarrantyInput {
  itAssetId: string;
  type?: string;
  provider: string;
  startDate: Date;
  endDate: Date;
  coverage?: string;
  terms?: string;
  status?: string;
}

export interface WarrantyUpdate {
  type?: string;
  provider?: string;
  startDate?: Date;
  endDate?: Date;
  coverage?: string;
  terms?: string;
  status?: string;
}

export interface WarrantyListOpts {
  itAssetId?: string;
  status?: string;
  provider?: string;
}

export const AssetWarrantyService = {
  async create(organizationId: string, input: WarrantyInput) {
    return prisma.assetWarranty.create({
      data: {
        organizationId,
        itAssetId: input.itAssetId,
        type: input.type || 'standard',
        provider: input.provider.slice(0, 300),
        startDate: input.startDate,
        endDate: input.endDate,
        coverage: input.coverage?.slice(0, 5000) || '',
        terms: input.terms?.slice(0, 10000) || '',
        status: input.status || 'active',
      },
    });
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.assetWarranty.findUnique({ where: { id } }),
    null);
  },

  async list(organizationId: string, opts?: WarrantyListOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.itAssetId) where.itAssetId = opts.itAssetId;
    if (opts?.status) where.status = opts.status;
    if (opts?.provider) where.provider = { contains: opts.provider };
    return safePrisma(() =>
      prisma.assetWarranty.findMany({
        where,
        orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async update(id: string, input: WarrantyUpdate) {
    const data: Record<string, unknown> = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.provider !== undefined) data.provider = input.provider.slice(0, 300);
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.endDate !== undefined) data.endDate = input.endDate;
    if (input.coverage !== undefined) data.coverage = input.coverage.slice(0, 5000);
    if (input.terms !== undefined) data.terms = input.terms.slice(0, 10000);
    if (input.status !== undefined) data.status = input.status;
    return prisma.assetWarranty.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.assetWarranty.delete({ where: { id } });
  },

  async getExpiring(organizationId: string, days = 30) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return safePrisma(() =>
      prisma.assetWarranty.findMany({
        where: {
          organizationId,
          status: 'active',
          endDate: { gte: now, lte: horizon },
        },
        orderBy: { endDate: 'asc' },
        take: 100,
      }),
    []);
  },

  async getExpired(organizationId: string) {
    const now = new Date();
    return safePrisma(() =>
      prisma.assetWarranty.findMany({
        where: {
          organizationId,
          status: { in: ['active', 'expired'] },
          endDate: { lt: now },
        },
        orderBy: { endDate: 'desc' },
        take: 100,
      }),
    []);
  },

  async getByAsset(itAssetId: string) {
    return safePrisma(() =>
      prisma.assetWarranty.findMany({
        where: { itAssetId },
        orderBy: { endDate: 'desc' },
        take: 50,
      }),
    []);
  },

  async getStats(organizationId: string) {
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [total, byStatus, activeCount, expiringCount] = await Promise.all([
      safePrisma(() => prisma.assetWarranty.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.assetWarranty.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.assetWarranty.count({
          where: { organizationId, status: 'active', endDate: { gte: now } },
        }),
      0),
      safePrisma(() =>
        prisma.assetWarranty.count({
          where: {
            organizationId,
            status: 'active',
            endDate: { gte: now, lte: horizon },
          },
        }),
      0),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return { total, byStatus: statusCounts, activeCount, expiringCount };
  },
};
