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

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'gift_item',
    content: JSON.stringify({
      name: 'Branded Mug',
      type: 'branded',
      description: 'Company branded mug',
      status: 'active',
      sku: 'MUG-001',
      unitCost: 5,
      retailValue: 15,
      supplier: 'Acme Co',
      imageUrl: '',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['gift_item', 'branded', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRecipientRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'gift_recipient',
    content: JSON.stringify({
      name: 'John Smith',
      type: 'client',
      description: 'Key client',
      status: 'active',
      email: 'john@example.com',
      phone: '555-0100',
      address: '123 Main St',
      company: 'Acme Corp',
      title: 'CEO',
      preferences: 'Coffee lover',
      restrictions: '',
      notes: '',
    }),
    tags: JSON.stringify(['gift_recipient', 'client', 'active']),
    ...overrides,
  });
}

function makeOrderRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-o1',
    type: 'gift_order',
    content: JSON.stringify({
      recipientId: 'mem-r1',
      itemId: 'mem-1',
      type: 'individual',
      quantity: 1,
      description: 'Holiday gift',
      status: 'draft',
      occasion: 'Holiday',
      message: 'Thank you',
      budget: 50,
      orderedDate: null,
      deliveredDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['gift_order', 'individual', 'draft']),
    ...overrides,
  });
}

function makeInventoryRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-i1',
    type: 'gift_inventory',
    content: JSON.stringify({
      itemId: 'mem-1',
      type: 'in_stock',
      quantity: 100,
      description: 'Warehouse stock',
      status: 'available',
      location: 'Warehouse A',
      batchNumber: 'BATCH-001',
      receivedDate: '2028-01-01',
      notes: '',
    }),
    tags: JSON.stringify(['gift_inventory', 'in_stock', 'available']),
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
}

const { GiftManagementService } = await import('@/lib/services/gift-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Items
// ─────────────────────────────────────────────────────────────────────────────

describe('GiftManagementService — Items', () => {
  beforeEach(() => resetMock());

  it('creates an item with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const item = await GiftManagementService.createItem('org-1', 'ws-1', {
      name: 'Branded Pen', type: 'stationery',
    }, 'user-1');
    assert.equal(item.name, 'Branded Pen');
    assert.equal(item.status, 'active');
    assert.equal(item.unitCost, 0);
    assert.equal(item.retailValue, 0);
  });

  it('creates an item with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const item = await GiftManagementService.createItem('org-1', 'ws-1', {
      name: 'Premium Notebook', type: 'stationery', description: 'Leather notebook',
      status: 'limited', sku: 'NBK-001', unitCost: 25, retailValue: 60,
      supplier: 'Stationery Co', imageUrl: 'https://example.com/nb.png', notes: 'Premium line',
    }, 'user-1');
    assert.equal(item.name, 'Premium Notebook');
    assert.equal(item.type, 'stationery');
    assert.equal(item.sku, 'NBK-001');
    assert.equal(item.unitCost, 25);
    assert.equal(item.status, 'limited');
  });

  it('gets an item by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const item = await GiftManagementService.getItem('mem-1');
    assert.ok(item);
    assert.equal(item!.id, 'mem-1');
    assert.equal(item!.name, 'Branded Mug');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gift_recipient' });
    const item = await GiftManagementService.getItem('mem-1');
    assert.equal(item, null);
  });

  it('returns null when item not found', async () => {
    memFindUniqueImpl = async () => null;
    const item = await GiftManagementService.getItem('nope');
    assert.equal(item, null);
  });

  it('lists items by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_item') return [makeRow()];
      return [];
    };
    const list = await GiftManagementService.listItems('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Branded Mug');
  });

  it('updates an item', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const item = await GiftManagementService.updateItem('mem-1', { status: 'discontinued' });
    assert.ok(item);
    assert.equal(item!.status, 'discontinued');
  });

  it('deletes an item', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await GiftManagementService.deleteItem('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recipients
// ─────────────────────────────────────────────────────────────────────────────

describe('GiftManagementService — Recipients', () => {
  beforeEach(() => resetMock());

  it('creates a recipient with defaults', async () => {
    memCreateImpl = async (args) => makeRecipientRow({ content: args.data.content as string });
    const r = await GiftManagementService.createRecipient('org-1', 'ws-1', {
      name: 'Jane Doe', type: 'employee',
    }, 'user-1');
    assert.equal(r.name, 'Jane Doe');
    assert.equal(r.status, 'active');
    assert.equal(r.email, '');
  });

  it('creates a recipient with full input', async () => {
    memCreateImpl = async (args) => makeRecipientRow({ content: args.data.content as string });
    const r = await GiftManagementService.createRecipient('org-1', 'ws-1', {
      name: 'Alice Wong', type: 'executive', description: 'CFO',
      status: 'vip', email: 'alice@corp.com', phone: '555-0200',
      address: '456 Oak Ave', company: 'Tech Inc', title: 'CFO',
      preferences: 'Wine enthusiast', restrictions: 'No alcohol', notes: 'VIP client',
    }, 'user-1');
    assert.equal(r.name, 'Alice Wong');
    assert.equal(r.type, 'executive');
    assert.equal(r.email, 'alice@corp.com');
    assert.equal(r.status, 'vip');
  });

  it('gets a recipient by id', async () => {
    memFindUniqueImpl = async () => makeRecipientRow();
    const r = await GiftManagementService.getRecipient('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'John Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRecipientRow({ type: 'gift_item' });
    const r = await GiftManagementService.getRecipient('mem-r1');
    assert.equal(r, null);
  });

  it('lists recipients by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_recipient') return [makeRecipientRow()];
      return [];
    };
    const list = await GiftManagementService.listRecipients('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recipient', async () => {
    memFindUniqueImpl = async () => makeRecipientRow();
    memUpdateImpl = async (args) => makeRecipientRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GiftManagementService.updateRecipient('mem-r1', { status: 'inactive' });
    assert.ok(r);
    assert.equal(r!.status, 'inactive');
  });

  it('deletes a recipient', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await GiftManagementService.deleteRecipient('mem-r1');
    assert.equal(ok, true);
  });

  it('markVIP sets status to vip', async () => {
    memFindUniqueImpl = async () => makeRecipientRow();
    memUpdateImpl = async (args) => makeRecipientRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GiftManagementService.markVIP('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'vip');
  });

  it('markDoNotGift sets status to do_not_gift', async () => {
    memFindUniqueImpl = async () => makeRecipientRow();
    memUpdateImpl = async (args) => makeRecipientRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GiftManagementService.markDoNotGift('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'do_not_gift');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Orders
// ─────────────────────────────────────────────────────────────────────────────

describe('GiftManagementService — Orders', () => {
  beforeEach(() => resetMock());

  it('creates an order with defaults', async () => {
    memCreateImpl = async (args) => makeOrderRow({ content: args.data.content as string });
    const o = await GiftManagementService.createOrder('org-1', 'ws-1', {
      recipientId: 'mem-r1', itemId: 'mem-1', type: 'individual',
    }, 'user-1');
    assert.equal(o.type, 'individual');
    assert.equal(o.status, 'draft');
    assert.equal(o.quantity, 1);
  });

  it('creates an order with full input', async () => {
    memCreateImpl = async (args) => makeOrderRow({ content: args.data.content as string });
    const o = await GiftManagementService.createOrder('org-1', 'ws-1', {
      recipientId: 'mem-r1', itemId: 'mem-1', type: 'holiday', quantity: 10,
      description: 'Holiday gifts', status: 'approved', occasion: 'Christmas',
      message: 'Season greetings', budget: 500, orderedDate: '2028-01-01',
      deliveredDate: '2028-01-15', notes: 'Bulk order',
    }, 'user-1');
    assert.equal(o.type, 'holiday');
    assert.equal(o.quantity, 10);
    assert.equal(o.budget, 500);
    assert.equal(o.status, 'approved');
  });

  it('gets an order by id', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    const o = await GiftManagementService.getOrder('mem-o1');
    assert.ok(o);
    assert.equal(o!.type, 'individual');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeOrderRow({ type: 'gift_item' });
    const o = await GiftManagementService.getOrder('mem-o1');
    assert.equal(o, null);
  });

  it('lists orders by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_order') return [makeOrderRow()];
      return [];
    };
    const list = await GiftManagementService.listOrders('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an order', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.updateOrder('mem-o1', { status: 'shipped' });
    assert.ok(o);
    assert.equal(o!.status, 'shipped');
  });

  it('deletes an order', async () => {
    memDeleteImpl = async () => ({ id: 'mem-o1' });
    const ok = await GiftManagementService.deleteOrder('mem-o1');
    assert.equal(ok, true);
  });

  it('approveOrder sets status to approved', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.approveOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'approved');
  });

  it('placeOrder sets status to ordered', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.placeOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'ordered');
  });

  it('shipOrder sets status to shipped', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.shipOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'shipped');
  });

  it('deliverOrder sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.deliverOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'delivered');
  });

  it('cancelOrder sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeOrderRow();
    memUpdateImpl = async (args) => makeOrderRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await GiftManagementService.cancelOrder('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Inventory
// ─────────────────────────────────────────────────────────────────────────────

describe('GiftManagementService — Inventory', () => {
  beforeEach(() => resetMock());

  it('creates inventory with defaults', async () => {
    memCreateImpl = async (args) => makeInventoryRow({ content: args.data.content as string });
    const inv = await GiftManagementService.createInventory('org-1', 'ws-1', {
      itemId: 'mem-1', type: 'in_stock', quantity: 50,
    }, 'user-1');
    assert.equal(inv.type, 'in_stock');
    assert.equal(inv.status, 'available');
    assert.equal(inv.quantity, 50);
  });

  it('creates inventory with full input', async () => {
    memCreateImpl = async (args) => makeInventoryRow({ content: args.data.content as string });
    const inv = await GiftManagementService.createInventory('org-1', 'ws-1', {
      itemId: 'mem-1', type: 'in_stock', quantity: 200, description: 'Large batch',
      status: 'available', location: 'Warehouse B', batchNumber: 'BATCH-002',
      receivedDate: '2028-02-01', notes: 'New stock',
    }, 'user-1');
    assert.equal(inv.quantity, 200);
    assert.equal(inv.location, 'Warehouse B');
    assert.equal(inv.batchNumber, 'BATCH-002');
  });

  it('gets inventory by id', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    const inv = await GiftManagementService.getInventory('mem-i1');
    assert.ok(inv);
    assert.equal(inv!.quantity, 100);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInventoryRow({ type: 'gift_item' });
    const inv = await GiftManagementService.getInventory('mem-i1');
    assert.equal(inv, null);
  });

  it('lists inventory by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_inventory') return [makeInventoryRow()];
      return [];
    };
    const list = await GiftManagementService.listInventory('org-1');
    assert.equal(list.length, 1);
  });

  it('updates inventory', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-i1', content: args.data.content as string });
    const inv = await GiftManagementService.updateInventory('mem-i1', { quantity: 75 });
    assert.ok(inv);
    assert.equal(inv!.quantity, 75);
  });

  it('deletes inventory', async () => {
    memDeleteImpl = async () => ({ id: 'mem-i1' });
    const ok = await GiftManagementService.deleteInventory('mem-i1');
    assert.equal(ok, true);
  });

  it('reserveInventory sets status to low', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-i1', content: args.data.content as string });
    const inv = await GiftManagementService.reserveInventory('mem-i1', 'user-1');
    assert.ok(inv);
    assert.equal(inv!.status, 'low');
  });

  it('markOut sets status to out', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-i1', content: args.data.content as string });
    const inv = await GiftManagementService.markOut('mem-i1', 'user-1');
    assert.ok(inv);
    assert.equal(inv!.status, 'out');
  });

  it('markOverstock sets status to overstock', async () => {
    memFindUniqueImpl = async () => makeInventoryRow();
    memUpdateImpl = async (args) => makeInventoryRow({ id: 'mem-i1', content: args.data.content as string });
    const inv = await GiftManagementService.markOverstock('mem-i1', 'user-1');
    assert.ok(inv);
    assert.equal(inv!.status, 'overstock');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('GiftManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getGiftManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_item') return [
        makeRow({ content: JSON.stringify({ name: 'I1', type: 'branded', status: 'active', unitCost: 0, retailValue: 0, sku: '', supplier: '', imageUrl: '', notes: '', description: '' }) }),
      ];
      if (t === 'gift_recipient') return [
        makeRecipientRow({ content: JSON.stringify({ name: 'R1', type: 'client', status: 'active', email: '', phone: '', address: '', company: '', title: '', preferences: '', restrictions: '', notes: '', description: '' }) }),
        makeRecipientRow({ id: 'r2', content: JSON.stringify({ name: 'R2', type: 'executive', status: 'vip', email: '', phone: '', address: '', company: '', title: '', preferences: '', restrictions: '', notes: '', description: '' }) }),
        makeRecipientRow({ id: 'r3', content: JSON.stringify({ name: 'R3', type: 'employee', status: 'do_not_gift', email: '', phone: '', address: '', company: '', title: '', preferences: '', restrictions: '', notes: '', description: '' }) }),
      ];
      if (t === 'gift_order') return [
        makeOrderRow({ content: JSON.stringify({ recipientId: 'r1', itemId: 'i1', type: 'individual', quantity: 1, status: 'draft', occasion: '', message: '', budget: 0, orderedDate: null, deliveredDate: null, notes: '', description: '' }) }),
        makeOrderRow({ id: 'o2', content: JSON.stringify({ recipientId: 'r2', itemId: 'i1', type: 'holiday', quantity: 1, status: 'delivered', occasion: '', message: '', budget: 0, orderedDate: null, deliveredDate: null, notes: '', description: '' }) }),
        makeOrderRow({ id: 'o3', content: JSON.stringify({ recipientId: 'r3', itemId: 'i1', type: 'milestone', quantity: 1, status: 'shipped', occasion: '', message: '', budget: 0, orderedDate: null, deliveredDate: null, notes: '', description: '' }) }),
      ];
      if (t === 'gift_inventory') return [
        makeInventoryRow({ content: JSON.stringify({ itemId: 'i1', type: 'in_stock', quantity: 50, status: 'available', location: '', batchNumber: '', receivedDate: null, notes: '', description: '' }) }),
      ];
      return [];
    };
    const m = await GiftManagementService.getGiftManagementMetrics('org-1');
    assert.equal(m.totalItems, 1);
    assert.equal(m.activeRecipients, 2);
    assert.equal(m.pendingOrders, 2);
    assert.equal(m.deliveredOrders, 1);
    assert.equal(m.availableInventoryCount, 50);
  });

  it('getGiftManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'gift_item') return [makeRow()];
      if (t === 'gift_recipient') return [makeRecipientRow()];
      if (t === 'gift_order') return [makeOrderRow()];
      if (t === 'gift_inventory') return [makeInventoryRow()];
      return [];
    };
    const s = await GiftManagementService.getGiftManagementStats('org-1');
    assert.equal(s.itemCount, 1);
    assert.equal(s.recipientCount, 1);
    assert.equal(s.orderCount, 1);
    assert.equal(s.inventoryCount, 1);
    assert.equal(s.byItemType['branded'], 1);
    assert.equal(s.byItemStatus['active'], 1);
    assert.equal(s.byRecipientType['client'], 1);
    assert.equal(s.byRecipientStatus['active'], 1);
    assert.equal(s.byOrderType['individual'], 1);
    assert.equal(s.byOrderStatus['draft'], 1);
    assert.equal(s.byInventoryType['in_stock'], 1);
    assert.equal(s.byInventoryStatus['available'], 1);
  });
});
