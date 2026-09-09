import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export const ITAssetService = {
  async list(organizationId: string, filters?: {
    type?: string;
    status?: string;
    category?: string;
    assignedToId?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { assetTag: { contains: filters.search } },
        { serialNumber: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.iTAsset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.iTAsset.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    assetTag?: string;
    name: string;
    type?: string;
    category?: string;
    status?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: Date;
    purchaseCost?: number;
    currentValue?: number;
    currency?: string;
    assignedToId?: string;
    assignedToType?: string;
    location?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    warrantyExpiry?: Date;
    licenseExpiry?: Date;
    licenseKey?: string;
    licenseSeats?: number;
    licenseUsed?: number;
    vendorId?: string;
  }) {
    return prisma.iTAsset.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        assetTag: input.assetTag?.slice(0, 100) || '',
        name: input.name.slice(0, 300),
        type: input.type || 'hardware',
        category: input.category?.slice(0, 100) || '',
        status: input.status || 'active',
        serialNumber: input.serialNumber?.slice(0, 200) || '',
        manufacturer: input.manufacturer?.slice(0, 200) || '',
        model: input.model?.slice(0, 200) || '',
        purchaseDate: input.purchaseDate || null,
        purchaseCost: input.purchaseCost ?? null,
        currentValue: input.currentValue ?? null,
        currency: input.currency || 'USD',
        assignedToId: input.assignedToId || null,
        assignedToType: input.assignedToType || 'employee',
        location: input.location?.slice(0, 300) || '',
        notes: input.notes?.slice(0, 5000) || '',
        metadata: JSON.stringify(input.metadata || {}),
        warrantyExpiry: input.warrantyExpiry || null,
        licenseExpiry: input.licenseExpiry || null,
        licenseKey: input.licenseKey?.slice(0, 500) || null,
        licenseSeats: input.licenseSeats ?? null,
        licenseUsed: input.licenseUsed ?? 0,
        vendorId: input.vendorId || null,
      },
    });
  },

  async update(id: string, data: {
    assetTag?: string;
    name?: string;
    type?: string;
    category?: string;
    status?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: Date;
    purchaseCost?: number;
    currentValue?: number;
    currency?: string;
    assignedToId?: string;
    assignedToType?: string;
    location?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    warrantyExpiry?: Date;
    licenseExpiry?: Date;
    licenseKey?: string;
    licenseSeats?: number;
    licenseUsed?: number;
    vendorId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.assetTag !== undefined) updateData.assetTag = data.assetTag.slice(0, 100);
    if (data.name !== undefined) updateData.name = data.name.slice(0, 300);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category.slice(0, 100);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber.slice(0, 200);
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer.slice(0, 200);
    if (data.model !== undefined) updateData.model = data.model.slice(0, 200);
    if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate;
    if (data.purchaseCost !== undefined) updateData.purchaseCost = data.purchaseCost;
    if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
    if (data.assignedToType !== undefined) updateData.assignedToType = data.assignedToType;
    if (data.location !== undefined) updateData.location = data.location.slice(0, 300);
    if (data.notes !== undefined) updateData.notes = data.notes.slice(0, 5000);
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry;
    if (data.licenseExpiry !== undefined) updateData.licenseExpiry = data.licenseExpiry;
    if (data.licenseKey !== undefined) updateData.licenseKey = data.licenseKey?.slice(0, 500) || null;
    if (data.licenseSeats !== undefined) updateData.licenseSeats = data.licenseSeats;
    if (data.licenseUsed !== undefined) updateData.licenseUsed = data.licenseUsed;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId || null;
    return prisma.iTAsset.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.iTAsset.delete({ where: { id } });
  },

  /** Assign an asset to a person/workspace. */
  async assign(id: string, assignedToId: string, assignedToType: string = 'employee') {
    return prisma.iTAsset.update({
      where: { id },
      data: { assignedToId, assignedToType, status: 'assigned' },
    });
  },

  /** Unassign an asset (return to storage). */
  async unassign(id: string) {
    return prisma.iTAsset.update({
      where: { id },
      data: { assignedToId: null, status: 'in_storage' },
    });
  },

  /** Get all assets assigned to a specific person/workspace. */
  async getAssignedAssets(assignedToId: string) {
    return safePrisma(() =>
      prisma.iTAsset.findMany({
        where: { assignedToId },
        orderBy: { updatedAt: 'desc' },
      }),
    []);
  },

  /** Get assets with licenses expiring within the given number of days. */
  async getExpiringLicenses(organizationId: string, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return safePrisma(() =>
      prisma.iTAsset.findMany({
        where: {
          organizationId,
          licenseExpiry: { lte: cutoff, not: null },
          status: { not: 'retired' },
        },
        orderBy: { licenseExpiry: 'asc' },
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byType, byStatus] = await Promise.all([
      safePrisma(() => prisma.iTAsset.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.iTAsset.groupBy({
          by: ['type'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTAsset.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
    ]);
    const typeCounts: Record<string, number> = {};
    for (const row of byType as Array<{ type: string; _count: number }>) {
      typeCounts[row.type] = row._count;
    }
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return { total, byType: typeCounts, byStatus: statusCounts };
  },

  /** Get a depreciation report — calculates current value vs purchase cost. */
  async getDepreciationReport(organizationId: string) {
    const assets = await safePrisma(() =>
      prisma.iTAsset.findMany({
        where: {
          organizationId,
          purchaseCost: { not: null },
          status: { not: 'retired' },
        },
      }),
    []);

    const items = (assets as Array<{
      id: string; name: string; purchaseCost: number | null; currentValue: number | null;
      purchaseDate: Date | null; currency: string;
    }>).map((a) => {
      const purchaseCost = a.purchaseCost ?? 0;
      const currentValue = a.currentValue ?? 0;
      const depreciation = purchaseCost - currentValue;
      const depreciationPct = purchaseCost > 0 ? (depreciation / purchaseCost) * 100 : 0;
      return {
        id: a.id,
        name: a.name,
        purchaseCost,
        currentValue,
        depreciation,
        depreciationPct: Math.round(depreciationPct * 100) / 100,
        currency: a.currency,
        purchaseDate: a.purchaseDate,
      };
    });

    const totalPurchase = items.reduce((sum, i) => sum + i.purchaseCost, 0);
    const totalCurrent = items.reduce((sum, i) => sum + i.currentValue, 0);
    return {
      items,
      totalPurchaseCost: totalPurchase,
      totalCurrentValue: totalCurrent,
      totalDepreciation: totalPurchase - totalCurrent,
    };
  },
};
