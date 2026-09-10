import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown> };
type FindFirstArgs = { where: Record<string, unknown> };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord { method: string; args?: unknown }
const calls: CallRecord[] = [];

// Warehouse
let whFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let whFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let whCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let whUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let whDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let whCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// InventoryItem
let itemFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let itemFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let itemFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let itemCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let itemUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let itemDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let itemCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// StockMovement
let mvFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let mvFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let mvCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let mvCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  warehouse: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'warehouse.findMany', args }); return whFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'warehouse.findUnique', args }); return whFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'warehouse.create', args }); return whCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'warehouse.update', args }); return whUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'warehouse.delete', args }); return whDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'warehouse.count', args }); return whCountImpl(args); },
  },
  inventoryItem: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'inventoryItem.findMany', args }); return itemFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'inventoryItem.findUnique', args }); return itemFindUniqueImpl(args); },
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'inventoryItem.findFirst', args }); return itemFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'inventoryItem.create', args }); return itemCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'inventoryItem.update', args }); return itemUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'inventoryItem.delete', args }); return itemDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'inventoryItem.count', args }); return itemCountImpl(args); },
  },
  stockMovement: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'stockMovement.findMany', args }); return mvFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'stockMovement.findUnique', args }); return mvFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'stockMovement.create', args }); return mvCreateImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'stockMovement.count', args }); return mvCountImpl(args); },
  },
};

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  whFindManyImpl = async () => [];
  whFindUniqueImpl = async () => null;
  whCreateImpl = async () => ({});
  whUpdateImpl = async () => ({});
  whDeleteImpl = async () => ({});
  whCountImpl = async () => 0;
  itemFindManyImpl = async () => [];
  itemFindUniqueImpl = async () => null;
  itemFindFirstImpl = async () => null;
  itemCreateImpl = async () => ({});
  itemUpdateImpl = async () => ({});
  itemDeleteImpl = async () => ({});
  itemCountImpl = async () => 0;
  mvFindManyImpl = async () => [];
  mvFindUniqueImpl = async () => null;
  mvCreateImpl = async () => ({});
  mvCountImpl = async () => 0;
}

const { InventoryService } = await import('@/lib/services/inventory-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryService', () => {
  beforeEach(() => { resetMock(); });

  // ── Warehouses ──

  describe('createWarehouse', () => {
    it('creates a warehouse with defaults', async () => {
      whFindUniqueImpl = async () => null;
      whCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.name, 'Main WH');
        assert.equal(args.data.code, 'WH01');
        assert.equal(args.data.location, '');
        assert.equal(args.data.address, '');
        return { id: 'w1', ...args.data };
      };
      const result = await InventoryService.createWarehouse('org-1', { name: 'Main WH', code: 'WH01' });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'w1');
    });

    it('throws if code already exists', async () => {
      whFindUniqueImpl = async () => ({ id: 'w1', code: 'WH01' });
      await assert.rejects(
        () => InventoryService.createWarehouse('org-1', { name: 'Dup', code: 'WH01' }),
        /warehouse_code_already_exists/,
      );
    });

    it('passes location and address through', async () => {
      whFindUniqueImpl = async () => null;
      whCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.location, 'NYC');
        assert.equal(args.data.address, '123 Main St');
        return { id: 'w1', ...args.data };
      };
      await InventoryService.createWarehouse('org-1', { name: 'Main', code: 'WH01', location: 'NYC', address: '123 Main St' });
    });
  });

  describe('getWarehouse', () => {
    it('returns a warehouse by id', async () => {
      whFindUniqueImpl = async () => ({ id: 'w1', name: 'Main' });
      const result = await InventoryService.getWarehouse('w1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'w1');
    });

    it('returns null when not found', async () => {
      whFindUniqueImpl = async () => null;
      const result = await InventoryService.getWarehouse('nope');
      assert.equal(result, null);
    });
  });

  describe('listWarehouses', () => {
    it('lists warehouses for an organization', async () => {
      whFindManyImpl = async () => [{ id: 'w1' }, { id: 'w2' }];
      const result = await InventoryService.listWarehouses('org-1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies isActive filter', async () => {
      whFindManyImpl = async () => [];
      await InventoryService.listWarehouses('org-1', { isActive: true });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.isActive, true);
    });

    it('returns empty array on error', async () => {
      whFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await InventoryService.listWarehouses('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateWarehouse', () => {
    it('updates only provided fields', async () => {
      whUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.name, 'Updated');
        assert.equal(args.data.code, undefined);
        return { id: 'w1', ...args.data };
      };
      const result = await InventoryService.updateWarehouse('w1', { name: 'Updated' });
      assert.ok(result);
    });
  });

  describe('deleteWarehouse', () => {
    it('deletes a warehouse', async () => {
      whDeleteImpl = async () => ({ id: 'w1' });
      const result = await InventoryService.deleteWarehouse('w1');
      assert.ok(result);
    });
  });

  // ── Items ──

  describe('createItem', () => {
    it('creates an item with defaults', async () => {
      itemFindUniqueImpl = async () => null;
      itemCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.sku, 'SKU001');
        assert.equal(args.data.name, 'Widget');
        assert.equal(args.data.category, 'general');
        assert.equal(args.data.quantity, 0);
        assert.equal(args.data.unitCost, 0);
        return { id: 'i1', ...args.data };
      };
      const result = await InventoryService.createItem('org-1', { warehouseId: 'w1', sku: 'SKU001', name: 'Widget' });
      assert.ok(result);
    });

    it('throws if sku already exists', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', sku: 'SKU001' });
      await assert.rejects(
        () => InventoryService.createItem('org-1', { warehouseId: 'w1', sku: 'SKU001', name: 'Dup' }),
        /item_sku_already_exists/,
      );
    });

    it('passes optional fields through', async () => {
      itemFindUniqueImpl = async () => null;
      itemCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.quantity, 100);
        assert.equal(args.data.reorderPoint, 10);
        assert.equal(args.data.unitCost, 5.5);
        assert.equal(args.data.barcode, 'BC123');
        return { id: 'i1', ...args.data };
      };
      await InventoryService.createItem('org-1', {
        warehouseId: 'w1', sku: 'SKU001', name: 'Widget',
        quantity: 100, reorderPoint: 10, unitCost: 5.5, barcode: 'BC123',
      });
    });
  });

  describe('getItem', () => {
    it('returns an item by id', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', name: 'Widget' });
      const result = await InventoryService.getItem('i1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'i1');
    });

    it('returns null when not found', async () => {
      itemFindUniqueImpl = async () => null;
      const result = await InventoryService.getItem('nope');
      assert.equal(result, null);
    });
  });

  describe('listItems', () => {
    it('lists items for an organization', async () => {
      itemFindManyImpl = async () => [{ id: 'i1' }];
      const result = await InventoryService.listItems('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies warehouseId and category filters', async () => {
      itemFindManyImpl = async () => [];
      await InventoryService.listItems('org-1', { warehouseId: 'w1', category: 'electronics' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.warehouseId, 'w1');
      assert.equal(args.where.category, 'electronics');
    });

    it('filters low stock items in memory', async () => {
      itemFindManyImpl = async () => [
        { id: 'i1', quantity: 5, reorderPoint: 10 },
        { id: 'i2', quantity: 20, reorderPoint: 10 },
        { id: 'i3', quantity: 10, reorderPoint: 10 },
      ];
      const result = await InventoryService.listItems('org-1', { lowStock: true });
      assert.equal(result.length, 2);
    });

    it('returns empty array on error', async () => {
      itemFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await InventoryService.listItems('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateItem', () => {
    it('updates only provided fields', async () => {
      itemUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.quantity, 50);
        assert.equal(args.data.name, undefined);
        return { id: 'i1', ...args.data };
      };
      const result = await InventoryService.updateItem('i1', { quantity: 50 });
      assert.ok(result);
    });
  });

  describe('deleteItem', () => {
    it('deletes an item', async () => {
      itemDeleteImpl = async () => ({ id: 'i1' });
      const result = await InventoryService.deleteItem('i1');
      assert.ok(result);
    });
  });

  // ── Movements ──

  describe('recordMovement', () => {
    it('increments quantity on inbound', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', quantity: 10 });
      itemUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.quantity, 25);
        return { id: 'i1', quantity: 25 };
      };
      mvCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'inbound');
        assert.equal(args.data.quantity, 15);
        return { id: 'm1', ...args.data };
      };
      const result = await InventoryService.recordMovement('org-1', {
        warehouseId: 'w1', inventoryItemId: 'i1', type: 'inbound', quantity: 15,
      });
      assert.ok((result as { item: { id: string } }).item);
      assert.ok((result as { movement: { id: string } }).movement);
    });

    it('decrements quantity on outbound', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', quantity: 20 });
      itemUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.quantity, 5);
        return { id: 'i1', quantity: 5 };
      };
      mvCreateImpl = async () => ({ id: 'm1' });
      await InventoryService.recordMovement('org-1', {
        warehouseId: 'w1', inventoryItemId: 'i1', type: 'outbound', quantity: 15,
      });
    });

    it('sets quantity directly on adjustment', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', quantity: 20 });
      itemUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.quantity, 30);
        return { id: 'i1', quantity: 30 };
      };
      mvCreateImpl = async () => ({ id: 'm1' });
      await InventoryService.recordMovement('org-1', {
        warehouseId: 'w1', inventoryItemId: 'i1', type: 'adjustment', quantity: 30,
      });
    });

    it('throws if item not found', async () => {
      itemFindUniqueImpl = async () => null;
      await assert.rejects(
        () => InventoryService.recordMovement('org-1', {
          warehouseId: 'w1', inventoryItemId: 'nope', type: 'inbound', quantity: 5,
        }),
        /item_not_found/,
      );
    });
  });

  describe('getMovements', () => {
    it('lists movements with filters', async () => {
      mvFindManyImpl = async () => [{ id: 'm1' }];
      const result = await InventoryService.getMovements('org-1', { warehouseId: 'w1', type: 'inbound' });
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.warehouseId, 'w1');
      assert.equal(args.where.type, 'inbound');
    });

    it('applies date range filter', async () => {
      mvFindManyImpl = async () => [];
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      await InventoryService.getMovements('org-1', { fromDate: from, toDate: to });
      const args = calls[0].args as FindManyArgs;
      const createdAt = args.where.createdAt as { gte: Date; lte: Date };
      assert.equal(createdAt.gte, from);
      assert.equal(createdAt.lte, to);
    });

    it('returns empty array on error', async () => {
      mvFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await InventoryService.getMovements('org-1');
      assert.deepEqual(result, []);
    });
  });

  // ── Analytics ──

  describe('getLowStockItems', () => {
    it('returns items where quantity <= reorderPoint', async () => {
      itemFindManyImpl = async () => [
        { id: 'i1', quantity: 2, reorderPoint: 10 },
        { id: 'i2', quantity: 50, reorderPoint: 10 },
      ];
      const result = await InventoryService.getLowStockItems('org-1');
      assert.equal(result.length, 1);
      assert.equal((result[0] as unknown as { id: string }).id, 'i1');
    });
  });

  describe('getInventoryValuation', () => {
    it('computes total value and by-warehouse breakdown', async () => {
      whFindManyImpl = async () => [{ id: 'w1', name: 'Main' }];
      itemFindManyImpl = async () => [
        { warehouseId: 'w1', quantity: 10, unitCost: 5 },
        { warehouseId: 'w1', quantity: 2, unitCost: 25 },
      ];
      const result = await InventoryService.getInventoryValuation('org-1');
      assert.equal(result.totalValue, 100);
      assert.equal(result.byWarehouse.length, 1);
      assert.equal(result.byWarehouse[0].warehouseName, 'Main');
      assert.equal(result.byWarehouse[0].itemCount, 2);
      assert.equal(result.byWarehouse[0].totalQuantity, 12);
      assert.equal(result.byWarehouse[0].totalValue, 100);
    });

    it('filters by warehouseId when provided', async () => {
      whFindManyImpl = async () => [{ id: 'w1', name: 'Main' }];
      itemFindManyImpl = async () => [];
      await InventoryService.getInventoryValuation('org-1', { warehouseId: 'w1' });
      const args = calls.find((c) => c.method === 'inventoryItem.findMany')?.args as FindManyArgs;
      assert.equal(args.where.warehouseId, 'w1');
    });
  });

  describe('transferStock', () => {
    it('merges into existing destination item', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', warehouseId: 'w1', sku: 'SKU1', name: 'W', quantity: 10 });
      itemFindFirstImpl = async () => ({ id: 'i2', quantity: 5 });
      itemUpdateImpl = async (args: UpdateArgs) => ({ id: (args.where as { id: string }).id, ...args.data });
      mvCreateImpl = async (args: CreateArgs) => ({ id: 'm1', ...args.data });
      const result = await InventoryService.transferStock('org-1', {
        itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 4,
      });
      assert.ok((result as { sourceItem: unknown }).sourceItem);
      assert.ok((result as { destItem: unknown }).destItem);
    });

    it('creates new destination item when none exists', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', warehouseId: 'w1', sku: 'SKU1', name: 'W', quantity: 10, description: '', category: 'general', reorderPoint: 0, reorderQty: 0, unitCost: 5, unitPrice: 10, barcode: '' });
      itemFindFirstImpl = async () => null;
      itemUpdateImpl = async (args: UpdateArgs) => ({ id: 'i1', ...args.data });
      itemCreateImpl = async (args: CreateArgs) => ({ id: 'i2', ...args.data });
      mvCreateImpl = async (args: CreateArgs) => ({ id: 'm1', ...args.data });
      const result = await InventoryService.transferStock('org-1', {
        itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 4,
      });
      assert.ok((result as { destItem: { id: string } }).destItem);
      assert.equal((result as { destItem: { id: string } }).destItem.id, 'i2');
    });

    it('throws if item not in source warehouse', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', warehouseId: 'wX', sku: 'SKU1', name: 'W', quantity: 10 });
      await assert.rejects(
        () => InventoryService.transferStock('org-1', {
          itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 4,
        }),
        /item_not_in_source_warehouse/,
      );
    });

    it('throws if insufficient stock', async () => {
      itemFindUniqueImpl = async () => ({ id: 'i1', warehouseId: 'w1', sku: 'SKU1', name: 'W', quantity: 2 });
      await assert.rejects(
        () => InventoryService.transferStock('org-1', {
          itemId: 'i1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 10,
        }),
        /insufficient_stock/,
      );
    });
  });

  describe('getStockSummary', () => {
    it('aggregates totals from valuation and low stock', async () => {
      whFindManyImpl = async () => [{ id: 'w1', name: 'Main' }];
      itemFindManyImpl = async () => [
        { warehouseId: 'w1', quantity: 10, unitCost: 5, reorderPoint: 20 },
      ];
      const result = await InventoryService.getStockSummary('org-1');
      assert.equal(result.totalItems, 1);
      assert.equal(result.totalQuantity, 10);
      assert.equal(result.totalValue, 50);
      assert.equal(result.lowStockCount, 1);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      whCountImpl = async () => 3;
      itemCountImpl = async () => 50;
      mvCountImpl = async () => 120;
      whFindManyImpl = async () => [];
      itemFindManyImpl = async () => [
        { category: 'electronics', quantity: 10, unitCost: 5 },
        { category: 'electronics', quantity: 2, unitCost: 25 },
      ];
      const result = await InventoryService.getStats('org-1');
      assert.equal(result.warehouseCount, 3);
      assert.equal(result.itemCount, 50);
      assert.equal(result.movementCount, 120);
      assert.equal(result.totalValue, 100);
      assert.equal(result.byCategory.electronics, 2);
    });
  });
});
