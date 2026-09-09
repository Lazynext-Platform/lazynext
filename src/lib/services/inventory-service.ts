import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type StockMovementType =
  | 'inbound'
  | 'outbound'
  | 'transfer'
  | 'adjustment'
  | 'return';

// ── Input / Options interfaces ──

export interface CreateWarehouseInput {
  name: string;
  code: string;
  location?: string;
  address?: string;
}

export interface UpdateWarehouseInput {
  name?: string;
  code?: string;
  location?: string;
  address?: string;
  isActive?: boolean;
}

export interface ListWarehousesOpts {
  isActive?: boolean;
}

export interface CreateItemInput {
  warehouseId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  quantity?: number;
  reorderPoint?: number;
  reorderQty?: number;
  unitCost?: number;
  unitPrice?: number;
  barcode?: string;
  location?: string;
}

export interface UpdateItemInput {
  warehouseId?: string;
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  quantity?: number;
  reorderPoint?: number;
  reorderQty?: number;
  unitCost?: number;
  unitPrice?: number;
  barcode?: string;
  location?: string;
  isActive?: boolean;
}

export interface ListItemsOpts {
  warehouseId?: string;
  category?: string;
  sku?: string;
  lowStock?: boolean;
  isActive?: boolean;
}

export interface RecordMovementInput {
  warehouseId: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface GetMovementsOpts {
  warehouseId?: string;
  inventoryItemId?: string;
  type?: StockMovementType;
  fromDate?: Date;
  toDate?: Date;
}

export interface InventoryValuationOpts {
  warehouseId?: string;
}

export interface TransferStockInput {
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  notes?: string;
}

export interface InventoryValuation {
  totalValue: number;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
}

export interface StockSummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
}

export interface InventoryStats {
  warehouseCount: number;
  itemCount: number;
  movementCount: number;
  lowStockCount: number;
  totalValue: number;
  byCategory: Record<string, number>;
}

// ── Inventory Service ──

export const InventoryService = {
  // ── Warehouses ──

  async createWarehouse(organizationId: string, input: CreateWarehouseInput) {
    const existing = await safePrisma(
      () =>
        prisma.warehouse.findUnique({
          where: { organizationId_code: { organizationId, code: input.code } },
        }),
      null,
    );
    if (existing) {
      throw new Error('warehouse_code_already_exists');
    }

    return prisma.warehouse.create({
      data: {
        organizationId,
        name: input.name.slice(0, 300),
        code: input.code.slice(0, 100),
        location: input.location?.slice(0, 300) || '',
        address: input.address?.slice(0, 500) || '',
      },
    });
  },

  async getWarehouse(id: string) {
    return safePrisma(() => prisma.warehouse.findUnique({ where: { id } }), null);
  },

  async listWarehouses(organizationId: string, opts: ListWarehousesOpts = {}) {
    const where: Record<string, unknown> = { organizationId };
    if (opts.isActive !== undefined) where.isActive = opts.isActive;
    return safePrisma(
      () =>
        prisma.warehouse.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      [],
    );
  },

  async updateWarehouse(id: string, input: UpdateWarehouseInput) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.slice(0, 300);
    if (input.code !== undefined) updateData.code = input.code.slice(0, 100);
    if (input.location !== undefined) updateData.location = input.location.slice(0, 300);
    if (input.address !== undefined) updateData.address = input.address.slice(0, 500);
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    return prisma.warehouse.update({ where: { id }, data: updateData });
  },

  async deleteWarehouse(id: string) {
    return prisma.warehouse.delete({ where: { id } });
  },

  // ── Inventory Items ──

  async createItem(organizationId: string, input: CreateItemInput) {
    const existing = await safePrisma(
      () =>
        prisma.inventoryItem.findUnique({
          where: { organizationId_sku: { organizationId, sku: input.sku } },
        }),
      null,
    );
    if (existing) {
      throw new Error('item_sku_already_exists');
    }

    return prisma.inventoryItem.create({
      data: {
        organizationId,
        warehouseId: input.warehouseId,
        sku: input.sku.slice(0, 100),
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 2000) || '',
        category: input.category?.slice(0, 100) || 'general',
        quantity: input.quantity ?? 0,
        reorderPoint: input.reorderPoint ?? 0,
        reorderQty: input.reorderQty ?? 0,
        unitCost: input.unitCost ?? 0,
        unitPrice: input.unitPrice ?? 0,
        barcode: input.barcode?.slice(0, 200) || '',
        location: input.location?.slice(0, 200) || '',
      },
    });
  },

  async getItem(id: string) {
    return safePrisma(
      () => prisma.inventoryItem.findUnique({ where: { id } }),
      null,
    );
  },

  async listItems(organizationId: string, opts: ListItemsOpts = {}) {
    const where: Record<string, unknown> = { organizationId };
    if (opts.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts.category) where.category = opts.category;
    if (opts.sku) where.sku = { contains: opts.sku };
    if (opts.isActive !== undefined) where.isActive = opts.isActive;

    const items = await safePrisma(
      () =>
        prisma.inventoryItem.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    if (opts.lowStock) {
      return (items as Array<{ id: string; warehouseId: string; sku: string; name: string; description: string; category: string; quantity: number; reorderPoint: number; reorderQty: number; unitCost: number; unitPrice: number; barcode: string; location: string; isActive: boolean; createdAt: Date; updatedAt: Date }>).filter(
        (i) => i.quantity <= i.reorderPoint,
      );
    }
    return items as Array<{ id: string; warehouseId: string; sku: string; name: string; description: string; category: string; quantity: number; reorderPoint: number; reorderQty: number; unitCost: number; unitPrice: number; barcode: string; location: string; isActive: boolean; createdAt: Date; updatedAt: Date }>;
  },

  async updateItem(id: string, input: UpdateItemInput) {
    const updateData: Record<string, unknown> = {};
    if (input.warehouseId !== undefined) updateData.warehouseId = input.warehouseId;
    if (input.sku !== undefined) updateData.sku = input.sku.slice(0, 100);
    if (input.name !== undefined) updateData.name = input.name.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 2000);
    if (input.category !== undefined) updateData.category = input.category.slice(0, 100);
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.reorderPoint !== undefined) updateData.reorderPoint = input.reorderPoint;
    if (input.reorderQty !== undefined) updateData.reorderQty = input.reorderQty;
    if (input.unitCost !== undefined) updateData.unitCost = input.unitCost;
    if (input.unitPrice !== undefined) updateData.unitPrice = input.unitPrice;
    if (input.barcode !== undefined) updateData.barcode = input.barcode.slice(0, 200);
    if (input.location !== undefined) updateData.location = input.location.slice(0, 200);
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    return prisma.inventoryItem.update({ where: { id }, data: updateData });
  },

  async deleteItem(id: string) {
    return prisma.inventoryItem.delete({ where: { id } });
  },

  // ── Stock Movements ──

  async recordMovement(organizationId: string, input: RecordMovementInput) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
    });
    if (!item) throw new Error('item_not_found');

    let newQuantity = item.quantity;
    if (input.type === 'inbound' || input.type === 'return') {
      newQuantity = item.quantity + input.quantity;
    } else if (input.type === 'outbound') {
      newQuantity = item.quantity - input.quantity;
    } else if (input.type === 'adjustment') {
      newQuantity = input.quantity;
    }
    // 'transfer' handled by transferStock; here we just record the movement

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: input.inventoryItemId },
      data: { quantity: newQuantity },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        organizationId,
        warehouseId: input.warehouseId,
        inventoryItemId: input.inventoryItemId,
        type: input.type,
        quantity: input.quantity,
        reference: input.reference?.slice(0, 200) || '',
        notes: input.notes?.slice(0, 2000) || '',
      },
    });

    return { item: updatedItem, movement };
  },

  async getMovements(organizationId: string, opts: GetMovementsOpts = {}) {
    const where: Record<string, unknown> = { organizationId };
    if (opts.warehouseId) where.warehouseId = opts.warehouseId;
    if (opts.inventoryItemId) where.inventoryItemId = opts.inventoryItemId;
    if (opts.type) where.type = opts.type;
    if (opts.fromDate || opts.toDate) {
      const createdAt: Record<string, unknown> = {};
      if (opts.fromDate) createdAt.gte = opts.fromDate;
      if (opts.toDate) createdAt.lte = opts.toDate;
      where.createdAt = createdAt;
    }
    return safePrisma(
      () =>
        prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
  },

  // ── Analytics ──

  async getLowStockItems(organizationId: string): Promise<Array<{ id: string; warehouseId: string; sku: string; name: string; description: string; category: string; quantity: number; reorderPoint: number; reorderQty: number; unitCost: number; unitPrice: number; barcode: string; location: string; isActive: boolean; createdAt: Date; updatedAt: Date }>> {
    const items = await safePrisma(
      () =>
        prisma.inventoryItem.findMany({
          where: { organizationId, isActive: true },
          orderBy: { quantity: 'asc' },
          take: 1000,
        }),
      [],
    );
    return (items as Array<{ id: string; warehouseId: string; sku: string; name: string; description: string; category: string; quantity: number; reorderPoint: number; reorderQty: number; unitCost: number; unitPrice: number; barcode: string; location: string; isActive: boolean; createdAt: Date; updatedAt: Date }>).filter(
      (i) => i.quantity <= i.reorderPoint,
    );
  },

  async getInventoryValuation(
    organizationId: string,
    opts: InventoryValuationOpts = {},
  ): Promise<InventoryValuation> {
    const warehouses = await safePrisma(
      () =>
        prisma.warehouse.findMany({
          where: { organizationId, isActive: true },
          take: 500,
        }),
      [],
    );

    const itemWhere: Record<string, unknown> = {
      organizationId,
      isActive: true,
    };
    if (opts.warehouseId) itemWhere.warehouseId = opts.warehouseId;

    const items = await safePrisma(
      () =>
        prisma.inventoryItem.findMany({
          where: itemWhere,
          take: 5000,
        }),
      [],
    );

    const byWarehouseMap = new Map<
      string,
      { warehouseId: string; warehouseName: string; itemCount: number; totalQuantity: number; totalValue: number }
    >();

    const warehouseNameMap = new Map<string, string>();
    for (const w of warehouses as Array<{ id: string; name: string }>) {
      warehouseNameMap.set(w.id, w.name);
    }

    let totalValue = 0;
    for (const item of items as Array<{
      warehouseId: string;
      quantity: number;
      unitCost: number;
    }>) {
      const value = item.quantity * item.unitCost;
      totalValue += value;
      const wName = warehouseNameMap.get(item.warehouseId) || 'Unknown';
      const existing = byWarehouseMap.get(item.warehouseId) || {
        warehouseId: item.warehouseId,
        warehouseName: wName,
        itemCount: 0,
        totalQuantity: 0,
        totalValue: 0,
      };
      existing.itemCount += 1;
      existing.totalQuantity += item.quantity;
      existing.totalValue += value;
      byWarehouseMap.set(item.warehouseId, existing);
    }

    return {
      totalValue,
      byWarehouse: Array.from(byWarehouseMap.values()),
    };
  },

  async transferStock(
    organizationId: string,
    input: TransferStockInput,
  ) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: input.itemId },
    });
    if (!item) throw new Error('item_not_found');
    if (item.warehouseId !== input.fromWarehouseId) {
      throw new Error('item_not_in_source_warehouse');
    }
    if (item.quantity < input.quantity) {
      throw new Error('insufficient_stock');
    }

    // Check if an item with the same SKU exists in the destination warehouse
    const destItem = await safePrisma(
      () =>
        prisma.inventoryItem.findFirst({
          where: {
            organizationId,
            sku: item.sku,
            warehouseId: input.toWarehouseId,
          },
        }),
      null,
    );

    const notes = input.notes?.slice(0, 2000) || '';

    if (destItem) {
      // Merge into existing destination item
      const updatedSource = await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity - input.quantity },
      });
      const updatedDest = await prisma.inventoryItem.update({
        where: { id: (destItem as { id: string }).id },
        data: { quantity: (destItem as { quantity: number }).quantity + input.quantity },
      });
      const outboundMovement = await prisma.stockMovement.create({
        data: {
          organizationId,
          warehouseId: input.fromWarehouseId,
          inventoryItemId: item.id,
          type: 'transfer',
          quantity: -input.quantity,
          reference: `transfer:${input.toWarehouseId}`,
          notes,
        },
      });
      const inboundMovement = await prisma.stockMovement.create({
        data: {
          organizationId,
          warehouseId: input.toWarehouseId,
          inventoryItemId: (destItem as { id: string }).id,
          type: 'transfer',
          quantity: input.quantity,
          reference: `transfer:${input.fromWarehouseId}`,
          notes,
        },
      });
      return { sourceItem: updatedSource, destItem: updatedDest, outboundMovement, inboundMovement };
    }

    // No existing item in destination — create one
    const updatedSource = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: item.quantity - input.quantity },
    });
    const newDestItem = await prisma.inventoryItem.create({
      data: {
        organizationId,
        warehouseId: input.toWarehouseId,
        sku: item.sku,
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: input.quantity,
        reorderPoint: item.reorderPoint,
        reorderQty: item.reorderQty,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        barcode: item.barcode,
        location: '',
      },
    });
    const outboundMovement = await prisma.stockMovement.create({
      data: {
        organizationId,
        warehouseId: input.fromWarehouseId,
        inventoryItemId: item.id,
        type: 'transfer',
        quantity: -input.quantity,
        reference: `transfer:${input.toWarehouseId}`,
        notes,
      },
    });
    const inboundMovement = await prisma.stockMovement.create({
      data: {
        organizationId,
        warehouseId: input.toWarehouseId,
        inventoryItemId: newDestItem.id,
        type: 'transfer',
        quantity: input.quantity,
        reference: `transfer:${input.fromWarehouseId}`,
        notes,
      },
    });
    return { sourceItem: updatedSource, destItem: newDestItem, outboundMovement, inboundMovement };
  },

  async getStockSummary(organizationId: string): Promise<StockSummary> {
    const valuation = await this.getInventoryValuation(organizationId);
    const lowStock = await this.getLowStockItems(organizationId);

    const totalQuantity = valuation.byWarehouse.reduce(
      (sum, w) => sum + w.totalQuantity,
      0,
    );
    const totalItems = valuation.byWarehouse.reduce(
      (sum, w) => sum + w.itemCount,
      0,
    );

    return {
      totalItems,
      totalQuantity,
      totalValue: valuation.totalValue,
      lowStockCount: lowStock.length,
      byWarehouse: valuation.byWarehouse,
    };
  },

  async getStats(organizationId: string): Promise<InventoryStats> {
    const [warehouseCount, itemCount, movementCount, lowStockItems, items] = await Promise.all([
      safePrisma(() => prisma.warehouse.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.inventoryItem.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.stockMovement.count({ where: { organizationId } }), 0),
      this.getLowStockItems(organizationId),
      safePrisma(
        () =>
          prisma.inventoryItem.findMany({
            where: { organizationId, isActive: true },
            take: 5000,
          }),
        [],
      ),
    ]);

    const byCategory: Record<string, number> = {};
    let totalValue = 0;
    for (const item of items as Array<{
      category: string;
      quantity: number;
      unitCost: number;
    }>) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      totalValue += item.quantity * item.unitCost;
    }

    return {
      warehouseCount,
      itemCount,
      movementCount,
      lowStockCount: lowStockItems.length,
      totalValue,
      byCategory,
    };
  },
};
