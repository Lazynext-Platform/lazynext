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
    type: 'logistics_shipment',
    content: JSON.stringify({
      trackingNumber: 'TRK-001',
      type: 'outbound',
      status: 'draft',
      carrierId: null,
      origin: 'Warehouse A',
      destination: 'Customer B',
      weight: 100,
      cost: 500,
      estimatedDelivery: null,
      actualDelivery: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['logistics_shipment', 'outbound', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCarrierRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'logistics_carrier',
    content: JSON.stringify({
      name: 'FastShip Inc',
      type: 'parcel',
      status: 'active',
      contact: 'Jane Doe',
      phone: '555-0100',
      email: 'ops@fastship.com',
      rating: 4.5,
      notes: '',
    }),
    tags: JSON.stringify(['logistics_carrier', 'parcel', 'active']),
    ...overrides,
  });
}

function makeRouteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'logistics_route',
    content: JSON.stringify({
      name: 'East Coast Express',
      type: 'express',
      origin: 'New York',
      destination: 'Boston',
      distance: 350,
      estimatedTime: 4,
      cost: 1200,
      status: 'active',
      carrierId: null,
      stops: ['Hartford', 'Providence'],
      schedule: 'Daily 8am',
      notes: '',
    }),
    tags: JSON.stringify(['logistics_route', 'express', 'active']),
    ...overrides,
  });
}

function makeFreightRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-f1',
    type: 'freight_record',
    content: JSON.stringify({
      shipmentId: null,
      type: 'general',
      status: 'pending',
      description: 'Pallet of electronics',
      weight: 500,
      volume: 2,
      units: 10,
      notes: '',
    }),
    tags: JSON.stringify(['freight_record', 'general', 'pending']),
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

const { LogisticsService } = await import('@/lib/services/logistics-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Shipments
// ─────────────────────────────────────────────────────────────────────────────

describe('LogisticsService — Shipments', () => {
  beforeEach(() => resetMock());

  it('creates a shipment with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await LogisticsService.createShipment('org-1', 'ws-1', {
      trackingNumber: 'TRK-100', type: 'outbound',
    }, 'user-1');
    assert.equal(s.trackingNumber, 'TRK-100');
    assert.equal(s.status, 'draft');
    assert.equal(s.weight, 0);
    assert.equal(s.cost, 0);
    assert.equal(s.carrierId, null);
  });

  it('creates a shipment with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await LogisticsService.createShipment('org-1', 'ws-1', {
      trackingNumber: 'TRK-200', type: 'inbound', status: 'booked',
      carrierId: 'mem-c1', origin: 'LA', destination: 'SF',
      weight: 250, cost: 750, estimatedDelivery: '2028-01-01',
      notes: 'Fragile goods',
    }, 'user-1');
    assert.equal(s.trackingNumber, 'TRK-200');
    assert.equal(s.type, 'inbound');
    assert.equal(s.status, 'booked');
    assert.equal(s.origin, 'LA');
    assert.equal(s.destination, 'SF');
    assert.equal(s.weight, 250);
    assert.equal(s.cost, 750);
    assert.ok(s.estimatedDelivery);
  });

  it('gets a shipment by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await LogisticsService.getShipment('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.trackingNumber, 'TRK-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'logistics_carrier' });
    const s = await LogisticsService.getShipment('mem-1');
    assert.equal(s, null);
  });

  it('returns null when shipment not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await LogisticsService.getShipment('nope');
    assert.equal(s, null);
  });

  it('lists shipments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'logistics_shipment') return [makeRow()];
      return [];
    };
    const list = await LogisticsService.listShipments('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].trackingNumber, 'TRK-001');
  });

  it('updates a shipment', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await LogisticsService.updateShipment('mem-1', { status: 'in_transit' });
    assert.ok(s);
    assert.equal(s!.status, 'in_transit');
  });

  it('deletes a shipment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await LogisticsService.deleteShipment('mem-1');
    assert.equal(ok, true);
  });

  it('bookShipment sets status to booked', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await LogisticsService.bookShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'booked');
  });

  it('pickUpShipment sets status to picked_up', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await LogisticsService.pickUpShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'picked_up');
  });

  it('deliverShipment sets status to delivered and actualDelivery', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await LogisticsService.deliverShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'delivered');
    assert.ok(s!.actualDelivery);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Carriers
// ─────────────────────────────────────────────────────────────────────────────

describe('LogisticsService — Carriers', () => {
  beforeEach(() => resetMock());

  it('creates a carrier with defaults', async () => {
    memCreateImpl = async (args) => makeCarrierRow({ content: args.data.content as string });
    const c = await LogisticsService.createCarrier('org-1', 'ws-1', {
      name: 'DHL', type: 'parcel',
    }, 'user-1');
    assert.equal(c.name, 'DHL');
    assert.equal(c.status, 'active');
    assert.equal(c.rating, 0);
    assert.equal(c.contact, '');
  });

  it('creates a carrier with full input', async () => {
    memCreateImpl = async (args) => makeCarrierRow({ content: args.data.content as string });
    const c = await LogisticsService.createCarrier('org-1', 'ws-1', {
      name: 'FedEx', type: 'ftl', status: 'preferred',
      contact: 'John Smith', phone: '555-0200', email: 'ops@fedex.com',
      rating: 4.8, notes: 'Top carrier',
    }, 'user-1');
    assert.equal(c.name, 'FedEx');
    assert.equal(c.type, 'ftl');
    assert.equal(c.status, 'preferred');
    assert.equal(c.contact, 'John Smith');
    assert.equal(c.rating, 4.8);
  });

  it('gets a carrier by id', async () => {
    memFindUniqueImpl = async () => makeCarrierRow();
    const c = await LogisticsService.getCarrier('mem-c1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-c1');
    assert.equal(c!.name, 'FastShip Inc');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCarrierRow({ type: 'logistics_shipment' });
    const c = await LogisticsService.getCarrier('mem-c1');
    assert.equal(c, null);
  });

  it('lists carriers by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'logistics_carrier') return [makeCarrierRow()];
      return [];
    };
    const list = await LogisticsService.listCarriers('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'FastShip Inc');
  });

  it('updates a carrier', async () => {
    memFindUniqueImpl = async () => makeCarrierRow();
    memUpdateImpl = async (args) => makeCarrierRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LogisticsService.updateCarrier('mem-c1', { status: 'blocked' });
    assert.ok(c);
    assert.equal(c!.status, 'blocked');
  });

  it('deletes a carrier', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await LogisticsService.deleteCarrier('mem-c1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Routes
// ─────────────────────────────────────────────────────────────────────────────

describe('LogisticsService — Routes', () => {
  beforeEach(() => resetMock());

  it('creates a route with defaults', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await LogisticsService.createRoute('org-1', 'ws-1', {
      name: 'Route 66', type: 'standard', origin: 'Chicago', destination: 'LA',
    }, 'user-1');
    assert.equal(r.name, 'Route 66');
    assert.equal(r.status, 'active');
    assert.equal(r.distance, 0);
    assert.equal(r.stops.length, 0);
  });

  it('creates a route with full input', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await LogisticsService.createRoute('org-1', 'ws-1', {
      name: 'West Coast Run', type: 'express', origin: 'Seattle', destination: 'Portland',
      distance: 280, estimatedTime: 3, cost: 900, status: 'seasonal',
      carrierId: 'mem-c1', stops: ['Tacoma', 'Olympia'],
      schedule: 'Mon/Wed/Fri', notes: 'High demand route',
    }, 'user-1');
    assert.equal(r.name, 'West Coast Run');
    assert.equal(r.type, 'express');
    assert.equal(r.distance, 280);
    assert.equal(r.estimatedTime, 3);
    assert.equal(r.stops.length, 2);
    assert.equal(r.carrierId, 'mem-c1');
  });

  it('gets a route by id', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    const r = await LogisticsService.getRoute('mem-r1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-r1');
    assert.equal(r!.name, 'East Coast Express');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRouteRow({ type: 'logistics_shipment' });
    const r = await LogisticsService.getRoute('mem-r1');
    assert.equal(r, null);
  });

  it('lists routes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'logistics_route') return [makeRouteRow()];
      return [];
    };
    const list = await LogisticsService.listRoutes('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'East Coast Express');
  });

  it('updates a route', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await LogisticsService.updateRoute('mem-r1', { status: 'discontinued' });
    assert.ok(r);
    assert.equal(r!.status, 'discontinued');
  });

  it('deletes a route', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await LogisticsService.deleteRoute('mem-r1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Freight
// ─────────────────────────────────────────────────────────────────────────────

describe('LogisticsService — Freight', () => {
  beforeEach(() => resetMock());

  it('creates freight with defaults', async () => {
    memCreateImpl = async (args) => makeFreightRow({ content: args.data.content as string });
    const f = await LogisticsService.createFreight('org-1', 'ws-1', {
      type: 'dry',
    }, 'user-1');
    assert.equal(f.type, 'dry');
    assert.equal(f.status, 'pending');
    assert.equal(f.weight, 0);
    assert.equal(f.shipmentId, null);
  });

  it('creates freight with full input', async () => {
    memCreateImpl = async (args) => makeFreightRow({ content: args.data.content as string });
    const f = await LogisticsService.createFreight('org-1', 'ws-1', {
      shipmentId: 'mem-1', type: 'refrigerated', status: 'loaded',
      description: 'Frozen goods', weight: 800, volume: 4,
      units: 20, notes: 'Keep cold',
    }, 'user-1');
    assert.equal(f.type, 'refrigerated');
    assert.equal(f.status, 'loaded');
    assert.equal(f.shipmentId, 'mem-1');
    assert.equal(f.weight, 800);
    assert.equal(f.units, 20);
  });

  it('gets freight by id', async () => {
    memFindUniqueImpl = async () => makeFreightRow();
    const f = await LogisticsService.getFreight('mem-f1');
    assert.ok(f);
    assert.equal(f!.id, 'mem-f1');
    assert.equal(f!.description, 'Pallet of electronics');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFreightRow({ type: 'logistics_shipment' });
    const f = await LogisticsService.getFreight('mem-f1');
    assert.equal(f, null);
  });

  it('lists freights by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'freight_record') return [makeFreightRow()];
      return [];
    };
    const list = await LogisticsService.listFreights('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].description, 'Pallet of electronics');
  });

  it('updates freight', async () => {
    memFindUniqueImpl = async () => makeFreightRow();
    memUpdateImpl = async (args) => makeFreightRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await LogisticsService.updateFreight('mem-f1', { status: 'in_transit' });
    assert.ok(f);
    assert.equal(f!.status, 'in_transit');
  });

  it('deletes freight', async () => {
    memDeleteImpl = async () => ({ id: 'mem-f1' });
    const ok = await LogisticsService.deleteFreight('mem-f1');
    assert.equal(ok, true);
  });

  it('loadFreight sets status to loaded', async () => {
    memFindUniqueImpl = async () => makeFreightRow();
    memUpdateImpl = async (args) => makeFreightRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await LogisticsService.loadFreight('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'loaded');
  });

  it('unloadFreight sets status to unloaded', async () => {
    memFindUniqueImpl = async () => makeFreightRow();
    memUpdateImpl = async (args) => makeFreightRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await LogisticsService.unloadFreight('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'unloaded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('LogisticsService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getLogisticsMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'logistics_shipment') return [
        makeRow({ id: 's1', content: JSON.stringify({ trackingNumber: 'T1', type: 'outbound', status: 'booked', carrierId: null, origin: '', destination: '', weight: 0, cost: 0, estimatedDelivery: null, actualDelivery: null, notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ trackingNumber: 'T2', type: 'outbound', status: 'in_transit', carrierId: null, origin: '', destination: '', weight: 0, cost: 0, estimatedDelivery: null, actualDelivery: null, notes: '' }) }),
        makeRow({ id: 's3', content: JSON.stringify({ trackingNumber: 'T3', type: 'outbound', status: 'delivered', carrierId: null, origin: '', destination: '', weight: 0, cost: 0, estimatedDelivery: null, actualDelivery: null, notes: '' }) }),
        makeRow({ id: 's4', content: JSON.stringify({ trackingNumber: 'T4', type: 'outbound', status: 'delayed', carrierId: null, origin: '', destination: '', weight: 0, cost: 0, estimatedDelivery: null, actualDelivery: null, notes: '' }) }),
      ];
      if (t === 'logistics_carrier') return [makeCarrierRow(), makeCarrierRow({ id: 'c2' })];
      return [];
    };
    const m = await LogisticsService.getLogisticsMetrics('org-1');
    assert.equal(m.activeShipments, 2);
    assert.equal(m.deliveredShipments, 1);
    assert.equal(m.inTransitShipments, 1);
    assert.equal(m.delayedShipments, 1);
    assert.equal(m.carrierCount, 2);
  });

  it('getLogisticsStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'logistics_shipment') return [makeRow()];
      if (t === 'logistics_carrier') return [makeCarrierRow()];
      if (t === 'logistics_route') return [makeRouteRow()];
      if (t === 'freight_record') return [makeFreightRow()];
      return [];
    };
    const s = await LogisticsService.getLogisticsStats('org-1');
    assert.equal(s.shipmentCount, 1);
    assert.equal(s.carrierCount, 1);
    assert.equal(s.routeCount, 1);
    assert.equal(s.freightCount, 1);
    assert.equal(s.byShipmentType['outbound'], 1);
    assert.equal(s.byShipmentStatus['draft'], 1);
    assert.equal(s.byCarrierType['parcel'], 1);
    assert.equal(s.byCarrierStatus['active'], 1);
    assert.equal(s.byRouteType['express'], 1);
    assert.equal(s.byRouteStatus['active'], 1);
    assert.equal(s.byFreightType['general'], 1);
    assert.equal(s.byFreightStatus['pending'], 1);
  });
});
