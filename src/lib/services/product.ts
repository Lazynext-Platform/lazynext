import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Product Service ──

export const ProductService = {
  /**
   * List products for a workspace.
   */
  async list(workspaceId: string) {
    return safePrisma(() =>
      prisma.product.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { deals: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single product by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.product.findUnique({
        where: { id },
        include: {
          deals: { orderBy: { updatedAt: 'desc' }, take: 20 },
        },
      }),
    null);
  },

  /**
   * Create a new product.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number;
    currency?: string;
    unit?: string;
    sku?: string;
    category?: string;
  }) {
    return prisma.product.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 5000) || null,
        type: input.type || 'product',
        status: input.status || 'active',
        price: input.price ?? 0,
        currency: input.currency || 'USD',
        unit: input.unit?.slice(0, 50) || null,
        sku: input.sku?.slice(0, 100) || null,
        category: input.category?.slice(0, 100) || null,
      },
    });
  },

  /**
   * Update a product.
   */
  async update(id: string, data: {
    name?: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number;
    currency?: string;
    unit?: string;
    sku?: string;
    category?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description?.slice(0, 5000) || null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.unit !== undefined) updateData.unit = data.unit?.slice(0, 50) || null;
    if (data.sku !== undefined) updateData.sku = data.sku?.slice(0, 100) || null;
    if (data.category !== undefined) updateData.category = data.category?.slice(0, 100) || null;

    return prisma.product.update({ where: { id }, data: updateData });
  },
};
