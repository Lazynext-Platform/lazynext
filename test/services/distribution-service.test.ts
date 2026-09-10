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
    type: 'dist_center',
    content: JSON.stringify({
      name: 'Main Warehouse',
      type: 'warehouse',
      location: 'New York',
      address: '123 Industrial Blvd',
      capacity: 50000,
      status: 'active',
      manager: 'Jane Doe',
      operatingHours: '9-5',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['dist_center', 'warehouse', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeChannelRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'dist_channel',
    content: JSON.stringify({
      name: 'Direct Sales',
      type: 'direct',
      description: 'Direct to consumer',
      status: 'active',
      partnerId: null,
      partnerName: '',
      commission: 0,
      territory: 'US',
      notes: '',
    }),
    tags: JSON.stringify(['dist_channel', 'direct', 'active']),
    ...overrides,
  });
}

function makeFulfillmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-f1',
    type: 'fulfillment_order',
    content: JSON.stringify({
      orderId: 'ORD-001',
      type: 'standard',
      status: 'pending',
      centerId: null,
      channelId: null,
      customerId: null,
      customerName: 'John Smith',
      items: [{ sku: 'SKU-1', qty: 2 }],
      shipTo: '456 Oak Ave',
      trackingNumber: '',
      carrier: 'FedEx',
      priority: 'normal',
      scheduledDate: '2028-01-15',
      completedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['fulfillment_order', 'standard', 'pending']),
    ...overrides,
  });
}

function makeNetworkRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-n1',
    type: 'dist_network',
    content: JSON.stringify({
      name: 'US Network',
      type: 'domestic',
      description: 'Domestic distribution network',
      status: 'active',
      nodes: ['NYC', 'LA'],
      routes: [{ from: 'NYC', to: 'LA' }],
      coverage: 'United States',
      notes: '',
    }),
    tags: JSON.stringify(['dist_network', 'domestic', 'active']),
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

const { DistributionService } = await import('@/lib/services/distribution-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Centers
// ─────────────────────────────────────────────────────────────────────────────

describe('DistributionService — Centers', () => {
  beforeEach(() => resetMock());

  it('creates a center with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await DistributionService.createCenter('org-1', 'ws-1', {
      name: 'East Warehouse', type: 'warehouse',
    }, 'user-1');
    assert.equal(c.name, 'East Warehouse');
    assert.equal(c.status, 'active');
    assert.equal(c.capacity, 0);
    assert.equal(c.manager, '');
  });

  it('creates a center with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await DistributionService.createCenter('org-1', 'ws-1', {
      name: 'Central Hub', type: 'hub', location: 'Chicago', address: '789 Logistics Way',
      capacity: 100000, status: 'maintenance', manager: 'Bob', operatingHours: '24/7', notes: 'Main hub',
    }, 'user-1');
    assert.equal(c.name, 'Central Hub');
    assert.equal(c.type, 'hub');
    assert.equal(c.location, 'Chicago');
    assert.equal(c.capacity, 100000);
    assert.equal(c.status, 'maintenance');
    assert.equal(c.manager, 'Bob');
  });

  it('gets a center by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await DistributionService.getCenter('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.name, 'Main Warehouse');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'dist_channel' });
    const c = await DistributionService.getCenter('mem-1');
    assert.equal(c, null);
  });

  it('returns null when center not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await DistributionService.getCenter('nope');
    assert.equal(c, null);
  });

  it('lists centers by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dist_center') return [makeRow()];
      return [];
    };
    const list = await DistributionService.listCenters('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Main Warehouse');
  });

  it('updates a center', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await DistributionService.updateCenter('mem-1', { status: 'closed' });
    assert.ok(c);
    assert.equal(c!.status, 'closed');
  });

  it('deletes a center', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DistributionService.deleteCenter('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Channels
// ─────────────────────────────────────────────────────────────────────────────

describe('DistributionService — Channels', () => {
  beforeEach(() => resetMock());

  it('creates a channel with defaults', async () => {
    memCreateImpl = async (args) => makeChannelRow({ content: args.data.content as string });
    const c = await DistributionService.createChannel('org-1', 'ws-1', {
      name: 'Wholesale Channel', type: 'wholesale',
    }, 'user-1');
    assert.equal(c.name, 'Wholesale Channel');
    assert.equal(c.status, 'active');
    assert.equal(c.commission, 0);
    assert.equal(c.partnerName, '');
  });

  it('creates a channel with full input', async () => {
    memCreateImpl = async (args) => makeChannelRow({ content: args.data.content as string });
    const c = await DistributionService.createChannel('org-1', 'ws-1', {
      name: 'Amazon Store', type: 'marketplace', description: 'Amazon marketplace',
      status: 'paused', partnerId: 'partner-1', partnerName: 'Amazon', commission: 15,
      territory: 'Global', notes: 'Prime eligible',
    }, 'user-1');
    assert.equal(c.name, 'Amazon Store');
    assert.equal(c.type, 'marketplace');
    assert.equal(c.partnerName, 'Amazon');
    assert.equal(c.commission, 15);
    assert.equal(c.status, 'paused');
  });

  it('gets a channel by id', async () => {
    memFindUniqueImpl = async () => makeChannelRow();
    const c = await DistributionService.getChannel('mem-c1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-c1');
    assert.equal(c!.name, 'Direct Sales');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeChannelRow({ type: 'dist_center' });
    const c = await DistributionService.getChannel('mem-c1');
    assert.equal(c, null);
  });

  it('lists channels by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dist_channel') return [makeChannelRow()];
      return [];
    };
    const list = await DistributionService.listChannels('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Direct Sales');
  });

  it('updates a channel', async () => {
    memFindUniqueImpl = async () => makeChannelRow();
    memUpdateImpl = async (args) => makeChannelRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await DistributionService.updateChannel('mem-c1', { status: 'inactive' });
    assert.ok(c);
    assert.equal(c!.status, 'inactive');
  });

  it('deletes a channel', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await DistributionService.deleteChannel('mem-c1');
    assert.equal(ok, true);
  });

  it('pauseChannel sets status to paused', async () => {
    memFindUniqueImpl = async () => makeChannelRow();
    memUpdateImpl = async (args) => makeChannelRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await DistributionService.pauseChannel('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'paused');
  });

  it('activateChannel sets status to active', async () => {
    memFindUniqueImpl = async () => makeChannelRow({ content: JSON.stringify({ name: 'Direct Sales', type: 'direct', description: '', status: 'paused', partnerId: null, partnerName: '', commission: 0, territory: '', notes: '' }) });
    memUpdateImpl = async (args) => makeChannelRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await DistributionService.activateChannel('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Fulfillments
// ─────────────────────────────────────────────────────────────────────────────

describe('DistributionService — Fulfillments', () => {
  beforeEach(() => resetMock());

  it('creates a fulfillment with defaults', async () => {
    memCreateImpl = async (args) => makeFulfillmentRow({ content: args.data.content as string });
    const f = await DistributionService.createFulfillment('org-1', 'ws-1', {
      orderId: 'ORD-002', type: 'standard',
    }, 'user-1');
    assert.equal(f.orderId, 'ORD-002');
    assert.equal(f.status, 'pending');
    assert.equal(f.customerName, '');
    assert.equal(f.carrier, '');
  });

  it('creates a fulfillment with full input', async () => {
    memCreateImpl = async (args) => makeFulfillmentRow({ content: args.data.content as string });
    const f = await DistributionService.createFulfillment('org-1', 'ws-1', {
      orderId: 'ORD-003', type: 'express', status: 'allocated',
      centerId: 'mem-1', channelId: 'mem-c1', customerId: 'cust-1', customerName: 'Alice',
      items: [{ sku: 'SKU-2', qty: 1 }], shipTo: '123 Pine St', trackingNumber: 'TRK-001',
      carrier: 'UPS', priority: 'high', scheduledDate: '2028-02-01', completedDate: '2028-02-05', notes: 'Rush order',
    }, 'user-1');
    assert.equal(f.orderId, 'ORD-003');
    assert.equal(f.type, 'express');
    assert.equal(f.customerName, 'Alice');
    assert.equal(f.carrier, 'UPS');
    assert.equal(f.status, 'allocated');
    assert.equal(f.trackingNumber, 'TRK-001');
  });

  it('gets a fulfillment by id', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    const f = await DistributionService.getFulfillment('mem-f1');
    assert.ok(f);
    assert.equal(f!.id, 'mem-f1');
    assert.equal(f!.orderId, 'ORD-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow({ type: 'dist_center' });
    const f = await DistributionService.getFulfillment('mem-f1');
    assert.equal(f, null);
  });

  it('lists fulfillments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'fulfillment_order') return [makeFulfillmentRow()];
      return [];
    };
    const list = await DistributionService.listFulfillments('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].orderId, 'ORD-001');
  });

  it('updates a fulfillment', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.updateFulfillment('mem-f1', { status: 'shipped' });
    assert.ok(f);
    assert.equal(f!.status, 'shipped');
  });

  it('deletes a fulfillment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-f1' });
    const ok = await DistributionService.deleteFulfillment('mem-f1');
    assert.equal(ok, true);
  });

  it('allocateFulfillment sets status to allocated', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.allocateFulfillment('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'allocated');
  });

  it('pickFulfillment sets status to picked', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.pickFulfillment('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'picked');
  });

  it('packFulfillment sets status to packed', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.packFulfillment('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'packed');
  });

  it('shipFulfillment sets status to shipped', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.shipFulfillment('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'shipped');
  });

  it('deliverFulfillment sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeFulfillmentRow();
    memUpdateImpl = async (args) => makeFulfillmentRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await DistributionService.deliverFulfillment('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'delivered');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Networks
// ─────────────────────────────────────────────────────────────────────────────

describe('DistributionService — Networks', () => {
  beforeEach(() => resetMock());

  it('creates a network with defaults', async () => {
    memCreateImpl = async (args) => makeNetworkRow({ content: args.data.content as string });
    const n = await DistributionService.createNetwork('org-1', 'ws-1', {
      name: 'Global Network', type: 'global',
    }, 'user-1');
    assert.equal(n.name, 'Global Network');
    assert.equal(n.status, 'active');
    assert.equal(n.coverage, '');
    assert.equal(n.description, '');
  });

  it('creates a network with full input', async () => {
    memCreateImpl = async (args) => makeNetworkRow({ content: args.data.content as string });
    const n = await DistributionService.createNetwork('org-1', 'ws-1', {
      name: 'EU Network', type: 'regional', description: 'European network',
      status: 'planned', nodes: ['Paris', 'Berlin'], routes: [{ from: 'Paris', to: 'Berlin' }],
      coverage: 'Europe', notes: 'Expanding',
    }, 'user-1');
    assert.equal(n.name, 'EU Network');
    assert.equal(n.type, 'regional');
    assert.equal(n.description, 'European network');
    assert.equal(n.coverage, 'Europe');
    assert.equal(n.status, 'planned');
  });

  it('gets a network by id', async () => {
    memFindUniqueImpl = async () => makeNetworkRow();
    const n = await DistributionService.getNetwork('mem-n1');
    assert.ok(n);
    assert.equal(n!.id, 'mem-n1');
    assert.equal(n!.name, 'US Network');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeNetworkRow({ type: 'dist_center' });
    const n = await DistributionService.getNetwork('mem-n1');
    assert.equal(n, null);
  });

  it('lists networks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dist_network') return [makeNetworkRow()];
      return [];
    };
    const list = await DistributionService.listNetworks('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'US Network');
  });

  it('updates a network', async () => {
    memFindUniqueImpl = async () => makeNetworkRow();
    memUpdateImpl = async (args) => makeNetworkRow({ id: 'mem-n1', content: args.data.content as string });
    const n = await DistributionService.updateNetwork('mem-n1', { status: 'deprecated' });
    assert.ok(n);
    assert.equal(n!.status, 'deprecated');
  });

  it('deletes a network', async () => {
    memDeleteImpl = async () => ({ id: 'mem-n1' });
    const ok = await DistributionService.deleteNetwork('mem-n1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('DistributionService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getDistributionMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dist_center') return [
        makeRow({ content: JSON.stringify({ name: 'C1', type: 'warehouse', location: '', address: '', capacity: 0, status: 'active', manager: '', operatingHours: '', notes: '' }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ name: 'C2', type: 'warehouse', location: '', address: '', capacity: 0, status: 'inactive', manager: '', operatingHours: '', notes: '' }) }),
      ];
      if (t === 'dist_channel') return [
        makeChannelRow({ content: JSON.stringify({ name: 'Ch1', type: 'direct', description: '', status: 'active', partnerId: null, partnerName: '', commission: 0, territory: '', notes: '' }) }),
        makeChannelRow({ id: 'ch2', content: JSON.stringify({ name: 'Ch2', type: 'direct', description: '', status: 'paused', partnerId: null, partnerName: '', commission: 0, territory: '', notes: '' }) }),
      ];
      if (t === 'fulfillment_order') return [
        makeFulfillmentRow({ content: JSON.stringify({ orderId: 'O1', type: 'standard', status: 'pending', centerId: null, channelId: null, customerId: null, customerName: '', items: null, shipTo: '', trackingNumber: '', carrier: '', priority: '', scheduledDate: null, completedDate: null, notes: '' }) }),
        makeFulfillmentRow({ id: 'f2', content: JSON.stringify({ orderId: 'O2', type: 'standard', status: 'shipped', centerId: null, channelId: null, customerId: null, customerName: '', items: null, shipTo: '', trackingNumber: '', carrier: '', priority: '', scheduledDate: null, completedDate: null, notes: '' }) }),
        makeFulfillmentRow({ id: 'f3', content: JSON.stringify({ orderId: 'O3', type: 'standard', status: 'delivered', centerId: null, channelId: null, customerId: null, customerName: '', items: null, shipTo: '', trackingNumber: '', carrier: '', priority: '', scheduledDate: null, completedDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await DistributionService.getDistributionMetrics('org-1');
    assert.equal(m.activeCenters, 1);
    assert.equal(m.activeChannels, 1);
    assert.equal(m.pendingFulfillments, 1);
    assert.equal(m.deliveredFulfillments, 1);
    assert.equal(m.fulfillmentRate, 33);
  });

  it('getDistributionStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dist_center') return [makeRow()];
      if (t === 'dist_channel') return [makeChannelRow()];
      if (t === 'fulfillment_order') return [makeFulfillmentRow()];
      if (t === 'dist_network') return [makeNetworkRow()];
      return [];
    };
    const s = await DistributionService.getDistributionStats('org-1');
    assert.equal(s.centerCount, 1);
    assert.equal(s.channelCount, 1);
    assert.equal(s.fulfillmentCount, 1);
    assert.equal(s.networkCount, 1);
    assert.equal(s.activeCenterCount, 1);
    assert.equal(s.activeChannelCount, 1);
    assert.equal(s.pendingFulfillmentCount, 1);
    assert.equal(s.deliveredFulfillmentCount, 0);
    assert.equal(s.byCenterType['warehouse'], 1);
    assert.equal(s.byCenterStatus['active'], 1);
    assert.equal(s.byChannelType['direct'], 1);
    assert.equal(s.byChannelStatus['active'], 1);
    assert.equal(s.byFulfillmentStatus['pending'], 1);
    assert.equal(s.byNetworkType['domestic'], 1);
  });
});
