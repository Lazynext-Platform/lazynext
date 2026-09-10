import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'food_menu',
    content: JSON.stringify({
      name: 'Weekly Lunch Menu',
      type: 'lunch',
      description: 'Standard weekly lunch',
      status: 'draft',
      date: '2028-01-10',
      items: ['salad', 'soup', 'sandwich'],
      dietaryOptions: ['vegetarian', 'vegan'],
      pricePerPerson: 15,
      servings: 50,
      allergens: ['gluten'],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['food_menu', 'lunch', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeOrderRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-o1',
    type: 'food_order',
    content: JSON.stringify({
      menuId: 'mem-1',
      vendorId: 'mem-v1',
      type: 'department',
      description: 'Department lunch order',
      status: 'placed',
      requester: 'Alice',
      department: 'Engineering',
      headcount: 20,
      budget: 300,
      deliveryDate: '2028-02-15',
      deliveryLocation: 'Conf Room A',
      specialRequests: 'Extra vegetarian options',
      dietaryRestrictions: ['vegetarian'],
      notes: '',
    }),
    tags: JSON.stringify(['food_order', 'department', 'placed']),
    ...overrides,
  });
}

function makeVendorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'food_vendor',
    content: JSON.stringify({
      name: 'Gourmet Catering',
      type: 'caterer',
      description: 'Full-service catering',
      status: 'active',
      contactName: 'Bob Chef',
      email: 'bob@gourmet.com',
      phone: '555-0100',
      address: '100 Kitchen St',
      cuisine: 'International',
      rating: 4.5,
      contractTerms: 'Net 30',
      menuLink: 'https://gourmet.com/menu',
      notes: '',
    }),
    tags: JSON.stringify(['food_vendor', 'caterer', 'active']),
    ...overrides,
  });
}

function makeInventoryRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-iv1',
    type: 'food_inventory',
    content: JSON.stringify({
      name: 'Coffee Beans',
      type: 'beverage',
      description: 'Premium coffee beans',
      status: 'in_stock',
      quantity: 100,
      unit: 'kg',
      reorderLevel: 20,
      cost: 15,
      expiryDate: '2028-12-01',
      storageLocation: 'Pantry A',
      supplier: 'Coffee Co',
      notes: '',
    }),
    tags: JSON.stringify(['food_inventory', 'beverage', 'in_stock']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { FoodServicesService } = await import('@/lib/services/food-services-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Menus
// ─────────────────────────────────────────────────────────────────────────────

describe('FoodServicesService — Menus', () => {
  beforeEach(() => resetMock());

  it('creates a menu with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await FoodServicesService.createMenu('org-1', 'ws-1', {
      name: 'Breakfast Menu', type: 'breakfast',
    }, 'user-1');
    assert.equal(m.name, 'Breakfast Menu');
    assert.equal(m.status, 'draft');
    assert.equal(m.pricePerPerson, 0);
    assert.equal(m.servings, 0);
  });

  it('creates a menu with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await FoodServicesService.createMenu('org-1', 'ws-1', {
      name: 'Holiday Buffet', type: 'buffet', description: 'Holiday special',
      status: 'published', date: '2028-12-25',
      items: ['turkey', 'stuffing', 'pie'], dietaryOptions: ['vegetarian', 'gluten_free'],
      pricePerPerson: 35, servings: 100, allergens: ['nuts', 'dairy'],
      notes: 'Order by Dec 20',
    }, 'user-1');
    assert.equal(m.name, 'Holiday Buffet');
    assert.equal(m.type, 'buffet');
    assert.equal(m.pricePerPerson, 35);
    assert.equal(m.servings, 100);
    assert.equal(m.items.length, 3);
  });

  it('gets a menu by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const m = await FoodServicesService.getMenu('mem-1');
    assert.ok(m);
    assert.equal(m!.id, 'mem-1');
    assert.equal(m!.name, 'Weekly Lunch Menu');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'food_order' });
    const m = await FoodServicesService.getMenu('mem-1');
    assert.equal(m, null);
  });

  it('returns null when menu not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await FoodServicesService.getMenu('nope');
    assert.equal(m, null);
  });

  it('lists menus by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_menu') return [makeRow()];
      return [];
    };
    const list = await FoodServicesService.listMenus('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Weekly Lunch Menu');
  });

  it('updates a menu', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await FoodServicesService.updateMenu('mem-1', { status: 'published' });
    assert.ok(m);
    assert.equal(m!.status, 'published');
  });

  it('deletes a menu', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await FoodServicesService.deleteMenu('mem-1');
    assert.equal(ok, true);
  });

  it('publishMenu sets status to published', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await FoodServicesService.publishMenu('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'published');
  });

  it('archiveMenu sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await FoodServicesService.archiveMenu('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'archived');
  });

  it('seasonalMenu sets status to seasonal', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await FoodServicesService.seasonalMenu('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'seasonal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Orders
// ─────────────────────────────────────────────────────────────────────────────

describe('FoodServicesService — Orders', () => {
  beforeEach(() => resetMock());

  it('creates an order with defaults', async () => {
    memCreateImpl = async (args) => makeOrderRow({ content: args.data.content as string });
    const o = await FoodServicesService.createOrder('org-1', 'ws-1', {
      type: 'individual',
    }, 'user-1');
    assert.equal(o.type, 'individual');
    assert.equal(o.status, 'placed');
    assert.equal(o.headcount, 0);
  });

  it('creates an order with full input', async () => {
    memCreateImpl = async (args) => makeOrderRow({ content: args.data.content as string });
    const o = await FoodServicesService.createOrder('org-1', 'ws-1', {
      menuId: 'mem-1', vendorId: 'mem-v1', type: 'catering',
      description: 'Executive luncheon', status: 'confirmed',
      requester: 'CEO Office', department: 'Executive',
      headcount: 50, budget: 2000, deliveryDate: '2028-05-01',
      deliveryLocation: 'Board Room', specialRequests: 'White tablecloths',
      dietaryRestrictions: ['vegetarian', 'kosher'], notes: 'VIP event',
    }, 'user-1');
    assert.equal(o.type, 'catering');
    assert.equal(o.requester, 'CEO Office');
    assert.equal(o.headcount, 50);
    assert.equal(o.budget, 2000);
    assert.equal(o.dietaryRestrictions.length, 2);
  });

  it('gets an order by id', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    const o = await FoodServicesService.getOrder('mem-o1');
    assert.ok(o);
    assert.equal(o!.requester, 'Alice');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeOrderRow({ type: 'food_menu' });
    const o = await FoodServicesService.getOrder('mem-o1');
    assert.equal(o, null);
  });

  it('returns null when order not found', async () => {
    memFindUniqueImpl = async () => null;
    const o = await FoodServicesService.getOrder('nope');
    assert.equal(o, null);
  });

  it('lists orders by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_order') return [makeOrderRow()];
      return [];
    };
    const list = await FoodServicesService.listOrders('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an order', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.updateOrder('mem-o1', { status: 'confirmed' });
    assert.ok(o);
    assert.equal(o!.status, 'confirmed');
  });

  it('deletes an order', async () => {
    memDeleteImpl = async () => ({ id: 'mem-o1' });
    const ok = await FoodServicesService.deleteOrder('mem-o1');
    assert.equal(ok, true);
  });

  it('confirmOrder sets status to confirmed', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.confirmOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'confirmed');
  });

  it('prepareOrder sets status to preparing', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.prepareOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'preparing');
  });

  it('readyOrder sets status to ready', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.readyOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'ready');
  });

  it('deliverOrder sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.deliverOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'delivered');
  });

  it('cancelOrder sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.cancelOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'cancelled');
  });

  it('invoiceOrder sets status to invoiced', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await FoodServicesService.invoiceOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'invoiced');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Vendors
// ─────────────────────────────────────────────────────────────────────────────

describe('FoodServicesService — Vendors', () => {
  beforeEach(() => resetMock());

  it('creates a vendor with defaults', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await FoodServicesService.createVendor('org-1', 'ws-1', {
      name: 'Local Bakery', type: 'restaurant',
    }, 'user-1');
    assert.equal(v.name, 'Local Bakery');
    assert.equal(v.status, 'active');
    assert.equal(v.rating, 0);
  });

  it('creates a vendor with full input', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await FoodServicesService.createVendor('org-1', 'ws-1', {
      name: 'Premium Caterers', type: 'caterer', description: 'Premium catering service',
      status: 'preferred', contactName: 'Jane Manager', email: 'jane@premium.com',
      phone: '555-0200', address: '200 Gourmet Ave', cuisine: 'French',
      rating: 5, contractTerms: 'Net 15', menuLink: 'https://premium.com',
      notes: 'Top-rated vendor',
    }, 'user-1');
    assert.equal(v.name, 'Premium Caterers');
    assert.equal(v.type, 'caterer');
    assert.equal(v.rating, 5);
    assert.equal(v.cuisine, 'French');
  });

  it('gets a vendor by id', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    const v = await FoodServicesService.getVendor('mem-v1');
    assert.ok(v);
    assert.equal(v!.name, 'Gourmet Catering');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeVendorRow({ type: 'food_menu' });
    const v = await FoodServicesService.getVendor('mem-v1');
    assert.equal(v, null);
  });

  it('returns null when vendor not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await FoodServicesService.getVendor('nope');
    assert.equal(v, null);
  });

  it('lists vendors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_vendor') return [makeVendorRow()];
      return [];
    };
    const list = await FoodServicesService.listVendors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a vendor', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await FoodServicesService.updateVendor('mem-v1', { rating: 5 });
    assert.ok(v);
    assert.equal(v!.rating, 5);
  });

  it('deletes a vendor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await FoodServicesService.deleteVendor('mem-v1');
    assert.equal(ok, true);
  });

  it('preferVendor sets status to preferred', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await FoodServicesService.preferVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'preferred');
  });

  it('reviewVendor sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await FoodServicesService.reviewVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'under_review');
  });

  it('terminateVendor sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await FoodServicesService.terminateVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'terminated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Inventory
// ─────────────────────────────────────────────────────────────────────────────

describe('FoodServicesService — Inventory', () => {
  beforeEach(() => resetMock());

  it('creates an inventory item with defaults', async () => {
    memCreateImpl = async (args) => makeInventoryRow({ content: args.data.content as string });
    const i = await FoodServicesService.createInventory('org-1', 'ws-1', {
      name: 'Paper Plates', type: 'disposable',
    }, 'user-1');
    assert.equal(i.name, 'Paper Plates');
    assert.equal(i.status, 'in_stock');
    assert.equal(i.quantity, 0);
    assert.equal(i.reorderLevel, 0);
  });

  it('creates an inventory item with full input', async () => {
    memCreateImpl = async (args) => makeInventoryRow({ content: args.data.content as string });
    const i = await FoodServicesService.createInventory('org-1', 'ws-1', {
      name: 'Frozen Vegetables', type: 'frozen', description: 'Mixed frozen vegetables',
      status: 'in_stock', quantity: 500, unit: 'lbs',
      reorderLevel: 100, cost: 2.5, expiryDate: '2029-01-01',
      storageLocation: 'Freezer B', supplier: 'Frozen Foods Co',
      notes: 'Keep below 0F',
    }, 'user-1');
    assert.equal(i.name, 'Frozen Vegetables');
    assert.equal(i.type, 'frozen');
    assert.equal(i.quantity, 500);
    assert.equal(i.reorderLevel, 100);
  });

  it('gets an inventory item by id', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    const i = await FoodServicesService.getInventory('mem-iv1');
    assert.ok(i);
    assert.equal(i!.name, 'Coffee Beans');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInventoryRow({ type: 'food_menu' });
    const i = await FoodServicesService.getInventory('mem-iv1');
    assert.equal(i, null);
  });

  it('returns null when inventory item not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await FoodServicesService.getInventory('nope');
    assert.equal(i, null);
  });

  it('lists inventory items by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_inventory') return [makeInventoryRow()];
      return [];
    };
    const list = await FoodServicesService.listInventory('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an inventory item', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.updateInventory('mem-iv1', { quantity: 50 });
    assert.ok(i);
    assert.equal(i!.quantity, 50);
  });

  it('deletes an inventory item', async () => {
    memDeleteImpl = async () => ({ id: 'mem-iv1' });
    const ok = await FoodServicesService.deleteInventory('mem-iv1');
    assert.equal(ok, true);
  });

  it('lowInventory sets status to low', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.lowInventory('mem-iv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'low');
  });

  it('outInventory sets status to out', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.outInventory('mem-iv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'out');
  });

  it('expiredInventory sets status to expired', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.expiredInventory('mem-iv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'expired');
  });

  it('orderedInventory sets status to ordered', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.orderedInventory('mem-iv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'ordered');
  });

  it('receivedInventory sets status to received', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-iv1', content: args.data.content as string });
    const i = await FoodServicesService.receivedInventory('mem-iv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'received');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('FoodServicesService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getFoodServicesMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_menu') return [
        makeRow({ content: JSON.stringify({ name: 'M1', type: 'lunch', status: 'published', description: '', date: null, items: [], dietaryOptions: [], pricePerPerson: 0, servings: 0, allergens: [], notes: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'M2', type: 'lunch', status: 'draft', description: '', date: null, items: [], dietaryOptions: [], pricePerPerson: 0, servings: 0, allergens: [], notes: '' }) }),
      ];
      if (t === 'food_order') return [
        makeOrderRow({ content: JSON.stringify({ menuId: null, vendorId: null, type: 'individual', status: 'placed', description: '', requester: '', department: '', headcount: 0, budget: 0, deliveryDate: null, deliveryLocation: '', specialRequests: '', dietaryRestrictions: [], notes: '' }) }),
        makeOrderRow({ id: 'o2', content: JSON.stringify({ menuId: null, vendorId: null, type: 'individual', status: 'confirmed', description: '', requester: '', department: '', headcount: 0, budget: 0, deliveryDate: null, deliveryLocation: '', specialRequests: '', dietaryRestrictions: [], notes: '' }) }),
      ];
      if (t === 'food_vendor') return [
        makeVendorRow({ content: JSON.stringify({ name: 'V1', type: 'caterer', status: 'active', description: '', contactName: '', email: '', phone: '', address: '', cuisine: '', rating: 0, contractTerms: '', menuLink: '', notes: '' }) }),
      ];
      if (t === 'food_inventory') return [
        makeInventoryRow({ content: JSON.stringify({ name: 'I1', type: 'beverage', status: 'low', description: '', quantity: 0, unit: '', reorderLevel: 0, cost: 0, expiryDate: null, storageLocation: '', supplier: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await FoodServicesService.getFoodServicesMetrics('org-1');
    assert.equal(m.publishedMenus, 1);
    assert.equal(m.pendingOrders, 2);
    assert.equal(m.activeVendors, 1);
    assert.equal(m.lowStockItems, 1);
    assert.equal(m.totalOrders, 2);
  });

  it('getFoodServicesStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'food_menu') return [makeRow()];
      if (t === 'food_order') return [makeOrderRow()];
      if (t === 'food_vendor') return [makeVendorRow()];
      if (t === 'food_inventory') return [makeInventoryRow()];
      return [];
    };
    const s = await FoodServicesService.getFoodServicesStats('org-1');
    assert.equal(s.menuCount, 1);
    assert.equal(s.orderCount, 1);
    assert.equal(s.vendorCount, 1);
    assert.equal(s.inventoryCount, 1);
    assert.equal(s.byMenuType['lunch'], 1);
    assert.equal(s.byOrderStatus['placed'], 1);
    assert.equal(s.byVendorType['caterer'], 1);
    assert.equal(s.byInventoryStatus['in_stock'], 1);
  });
});
