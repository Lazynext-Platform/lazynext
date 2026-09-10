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
    type: 'mailroom_item',
    content: JSON.stringify({
      trackingNumber: 'TRK001',
      type: 'letter',
      sender: 'Acme Corp',
      recipient: 'John Doe',
      description: 'Invoice',
      status: 'received',
      receivedDate: '2028-01-01',
      weight: 2,
      dimensions: '9x12',
      returnAddress: '123 Sender St',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['mailroom_item', 'letter', 'received']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRouteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-rt1',
    type: 'mailroom_route',
    content: JSON.stringify({
      name: 'Morning Delivery Route',
      type: 'internal',
      description: 'Daily morning route',
      status: 'planned',
      origin: 'Mailroom',
      destination: 'Floor 3',
      carrier: 'Internal',
      scheduledDate: '2028-01-15',
      completedDate: null,
      stops: 5,
      notes: '',
    }),
    tags: JSON.stringify(['mailroom_route', 'internal', 'planned']),
    ...overrides,
  });
}

function makeDeliveryRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-dl1',
    type: 'mailroom_delivery',
    content: JSON.stringify({
      itemId: 'mem-1',
      routeId: 'mem-rt1',
      type: 'desk',
      description: 'Desk delivery',
      status: 'pending',
      recipient: 'John Doe',
      address: 'Desk 42',
      scheduledDate: '2028-01-15',
      attemptedDate: null,
      deliveredDate: null,
      signatureRequired: false,
      notes: '',
    }),
    tags: JSON.stringify(['mailroom_delivery', 'desk', 'pending']),
    ...overrides,
  });
}

function makePostageRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'mailroom_postage',
    content: JSON.stringify({
      itemId: 'mem-1',
      type: 'meter',
      amount: 5.75,
      currency: 'USD',
      description: 'Priority mail',
      status: 'pending',
      date: '2028-01-01',
      meterNumber: 'M123',
      permitNumber: '',
      notes: '',
    }),
    tags: JSON.stringify(['mailroom_postage', 'meter', 'pending']),
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

const { MailroomOperationsService } = await import('@/lib/services/mailroom-operations-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Items
// ─────────────────────────────────────────────────────────────────────────────

describe('MailroomOperationsService — Items', () => {
  beforeEach(() => resetMock());

  it('creates an item with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await MailroomOperationsService.createItem('org-1', 'ws-1', {
      type: 'package',
    }, 'user-1');
    assert.strictEqual(i.type, 'package');
    assert.strictEqual(i.status, 'received');
    assert.strictEqual(i.trackingNumber, '');
    assert.strictEqual(i.weight, 0);
  });

  it('creates an item with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await MailroomOperationsService.createItem('org-1', 'ws-1', {
      trackingNumber: 'TRK999', type: 'certified', sender: 'IRS',
      recipient: 'Finance Dept', description: 'Tax notice', status: 'sorted',
      receivedDate: '2028-01-01', weight: 16, dimensions: '12x9x2',
      returnAddress: 'IRS Building', notes: 'Signature required',
    }, 'user-1');
    assert.strictEqual(i.trackingNumber, 'TRK999');
    assert.strictEqual(i.type, 'certified');
    assert.strictEqual(i.sender, 'IRS');
    assert.strictEqual(i.weight, 16);
    assert.strictEqual(i.status, 'sorted');
  });

  it('gets an item by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const i = await MailroomOperationsService.getItem('mem-1');
    assert.ok(i);
    assert.strictEqual(i!.id, 'mem-1');
    assert.strictEqual(i!.trackingNumber, 'TRK001');
  });

  it('returns null when item not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await MailroomOperationsService.getItem('nope');
    assert.strictEqual(i, null);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'mailroom_route' });
    const i = await MailroomOperationsService.getItem('mem-1');
    assert.strictEqual(i, null);
  });

  it('lists items by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_item') return [makeRow()];
      return [];
    };
    const list = await MailroomOperationsService.listItems('org-1');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].trackingNumber, 'TRK001');
  });

  it('updates an item', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.updateItem('mem-1', { status: 'sorted' });
    assert.ok(i);
    assert.strictEqual(i!.status, 'sorted');
  });

  it('deletes an item', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await MailroomOperationsService.deleteItem('mem-1');
    assert.strictEqual(ok, true);
  });

  it('sortItem sets status to sorted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.sortItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'sorted');
  });

  it('routeItem sets status to routed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.routeItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'routed');
  });

  it('deliverItem sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.deliverItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'delivered');
  });

  it('returnItem sets status to returned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.returnItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'returned');
  });

  it('forwardItem sets status to forwarded', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.forwardItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'forwarded');
  });

  it('holdItem sets status to held', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await MailroomOperationsService.holdItem('mem-1', 'user-1');
    assert.ok(i);
    assert.strictEqual(i!.status, 'held');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Routes
// ─────────────────────────────────────────────────────────────────────────────

describe('MailroomOperationsService — Routes', () => {
  beforeEach(() => resetMock());

  it('creates a route with defaults', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await MailroomOperationsService.createRoute('org-1', 'ws-1', {
      name: 'Evening Route', type: 'courier',
    }, 'user-1');
    assert.strictEqual(r.name, 'Evening Route');
    assert.strictEqual(r.status, 'planned');
    assert.strictEqual(r.stops, 0);
  });

  it('creates a route with full input', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await MailroomOperationsService.createRoute('org-1', 'ws-1', {
      name: 'Express Route', type: 'same_day', description: 'Same-day delivery',
      status: 'active', origin: 'HQ', destination: 'Branch Office',
      carrier: 'FedEx', scheduledDate: '2028-02-01',
      stops: 10, notes: 'Priority',
    }, 'user-1');
    assert.strictEqual(r.name, 'Express Route');
    assert.strictEqual(r.type, 'same_day');
    assert.strictEqual(r.carrier, 'FedEx');
    assert.strictEqual(r.stops, 10);
  });

  it('gets a route by id', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    const r = await MailroomOperationsService.getRoute('mem-rt1');
    assert.ok(r);
    assert.strictEqual(r!.name, 'Morning Delivery Route');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRouteRow({ type: 'mailroom_item' });
    const r = await MailroomOperationsService.getRoute('mem-rt1');
    assert.strictEqual(r, null);
  });

  it('lists routes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_route') return [makeRouteRow()];
      return [];
    };
    const list = await MailroomOperationsService.listRoutes('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a route', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await MailroomOperationsService.updateRoute('mem-rt1', { status: 'active' });
    assert.ok(r);
    assert.strictEqual(r!.status, 'active');
  });

  it('deletes a route', async () => {
    memDeleteImpl = async () => ({ id: 'mem-rt1' });
    const ok = await MailroomOperationsService.deleteRoute('mem-rt1');
    assert.strictEqual(ok, true);
  });

  it('activateRoute sets status to active', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await MailroomOperationsService.activateRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'active');
  });

  it('completeRoute sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await MailroomOperationsService.completeRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'completed');
    assert.ok(r!.completedDate);
  });

  it('delayRoute sets status to delayed', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await MailroomOperationsService.delayRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'delayed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Deliveries
// ─────────────────────────────────────────────────────────────────────────────

describe('MailroomOperationsService — Deliveries', () => {
  beforeEach(() => resetMock());

  it('creates a delivery with defaults', async () => {
    memCreateImpl = async (args) => makeDeliveryRow({ content: args.data.content as string });
    const d = await MailroomOperationsService.createDelivery('org-1', 'ws-1', {
      itemId: 'mem-1', type: 'desk',
    }, 'user-1');
    assert.strictEqual(d.type, 'desk');
    assert.strictEqual(d.status, 'pending');
    assert.strictEqual(d.signatureRequired, false);
  });

  it('creates a delivery with full input', async () => {
    memCreateImpl = async (args) => makeDeliveryRow({ content: args.data.content as string });
    const d = await MailroomOperationsService.createDelivery('org-1', 'ws-1', {
      itemId: 'mem-1', routeId: 'mem-rt1', type: 'secure', description: 'Secure delivery',
      status: 'out_for_delivery', recipient: 'CEO Office', address: 'Top Floor',
      scheduledDate: '2028-03-01',
      signatureRequired: true, notes: 'Confidential',
    }, 'user-1');
    assert.strictEqual(d.type, 'secure');
    assert.strictEqual(d.recipient, 'CEO Office');
    assert.strictEqual(d.signatureRequired, true);
  });

  it('gets a delivery by id', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    const d = await MailroomOperationsService.getDelivery('mem-dl1');
    assert.ok(d);
    assert.strictEqual(d!.type, 'desk');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow({ type: 'mailroom_item' });
    const d = await MailroomOperationsService.getDelivery('mem-dl1');
    assert.strictEqual(d, null);
  });

  it('lists deliveries by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_delivery') return [makeDeliveryRow()];
      return [];
    };
    const list = await MailroomOperationsService.listDeliveries('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a delivery', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.updateDelivery('mem-dl1', { status: 'out_for_delivery' });
    assert.ok(d);
    assert.strictEqual(d!.status, 'out_for_delivery');
  });

  it('deletes a delivery', async () => {
    memDeleteImpl = async () => ({ id: 'mem-dl1' });
    const ok = await MailroomOperationsService.deleteDelivery('mem-dl1');
    assert.strictEqual(ok, true);
  });

  it('dispatchDelivery sets status to out_for_delivery', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.dispatchDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'out_for_delivery');
  });

  it('completeDelivery sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.completeDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'delivered');
    assert.ok(d!.deliveredDate);
  });

  it('failDelivery sets status to failed', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.failDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'failed');
  });

  it('attemptDelivery sets status to attempted', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.attemptDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'attempted');
    assert.ok(d!.attemptedDate);
  });

  it('returnDelivery sets status to returned', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.returnDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'returned');
  });

  it('holdDelivery sets status to held', async () => {
    memFindUniqueImpl = async () => makeDeliveryRow();
    memUpdateImpl = async (args) => makeDeliveryRow({ id: 'mem-dl1', content: args.data.content as string });
    const d = await MailroomOperationsService.holdDelivery('mem-dl1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'held');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Postage
// ─────────────────────────────────────────────────────────────────────────────

describe('MailroomOperationsService — Postage', () => {
  beforeEach(() => resetMock());

  it('creates postage with defaults', async () => {
    memCreateImpl = async (args) => makePostageRow({ content: args.data.content as string });
    const p = await MailroomOperationsService.createPostage('org-1', 'ws-1', {
      itemId: 'mem-1', type: 'stamp', amount: 1.50,
    }, 'user-1');
    assert.strictEqual(p.type, 'stamp');
    assert.strictEqual(p.amount, 1.50);
    assert.strictEqual(p.status, 'pending');
    assert.strictEqual(p.currency, 'USD');
  });

  it('creates postage with full input', async () => {
    memCreateImpl = async (args) => makePostageRow({ content: args.data.content as string });
    const p = await MailroomOperationsService.createPostage('org-1', 'ws-1', {
      itemId: 'mem-1', type: 'permit', amount: 250.00, currency: 'EUR',
      description: 'Bulk mailing', status: 'paid', date: '2028-01-01',
      meterNumber: 'M456', permitNumber: 'P789', notes: 'Monthly bulk',
    }, 'user-1');
    assert.strictEqual(p.type, 'permit');
    assert.strictEqual(p.currency, 'EUR');
    assert.strictEqual(p.permitNumber, 'P789');
  });

  it('gets postage by id', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    const p = await MailroomOperationsService.getPostage('mem-p1');
    assert.ok(p);
    assert.strictEqual(p!.amount, 5.75);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePostageRow({ type: 'mailroom_item' });
    const p = await MailroomOperationsService.getPostage('mem-p1');
    assert.strictEqual(p, null);
  });

  it('lists postage by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_postage') return [makePostageRow()];
      return [];
    };
    const list = await MailroomOperationsService.listPostage('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates postage', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    memUpdateImpl = async (args) => makePostageRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MailroomOperationsService.updatePostage('mem-p1', { amount: 10.00 });
    assert.ok(p);
    assert.strictEqual(p!.amount, 10.00);
  });

  it('deletes postage', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await MailroomOperationsService.deletePostage('mem-p1');
    assert.strictEqual(ok, true);
  });

  it('payPostage sets status to paid', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    memUpdateImpl = async (args) => makePostageRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MailroomOperationsService.payPostage('mem-p1', 'user-1');
    assert.ok(p);
    assert.strictEqual(p!.status, 'paid');
    assert.ok(p!.date);
  });

  it('refundPostage sets status to refunded', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    memUpdateImpl = async (args) => makePostageRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MailroomOperationsService.refundPostage('mem-p1', 'user-1');
    assert.ok(p);
    assert.strictEqual(p!.status, 'refunded');
  });

  it('adjustPostage sets status to adjusted', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    memUpdateImpl = async (args) => makePostageRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MailroomOperationsService.adjustPostage('mem-p1', 'user-1');
    assert.ok(p);
    assert.strictEqual(p!.status, 'adjusted');
  });

  it('disputePostage sets status to disputed', async () => {
    memFindUniqueImpl = async () => makePostageRow();
    memUpdateImpl = async (args) => makePostageRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MailroomOperationsService.disputePostage('mem-p1', 'user-1');
    assert.ok(p);
    assert.strictEqual(p!.status, 'disputed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('MailroomOperationsService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getMailroomOperationsMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_item') return [
        makeRow({ content: JSON.stringify({ trackingNumber: 'T1', type: 'letter', sender: '', recipient: '', description: '', status: 'received', receivedDate: null, weight: 0, dimensions: '', returnAddress: '', notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ trackingNumber: 'T2', type: 'letter', sender: '', recipient: '', description: '', status: 'sorted', receivedDate: null, weight: 0, dimensions: '', returnAddress: '', notes: '' }) }),
      ];
      if (t === 'mailroom_delivery') return [
        makeDeliveryRow({ content: JSON.stringify({ itemId: 'i1', routeId: null, type: 'desk', description: '', status: 'out_for_delivery', recipient: '', address: '', scheduledDate: null, attemptedDate: null, deliveredDate: null, signatureRequired: false, notes: '' }) }),
      ];
      if (t === 'mailroom_route') return [
        makeRouteRow({ content: JSON.stringify({ name: 'R1', type: 'internal', description: '', status: 'active', origin: '', destination: '', carrier: '', scheduledDate: null, completedDate: null, stops: 0, notes: '' }) }),
      ];
      if (t === 'mailroom_postage') return [
        makePostageRow({ content: JSON.stringify({ itemId: 'i1', type: 'meter', amount: 0, currency: 'USD', description: '', status: 'pending', date: null, meterNumber: '', permitNumber: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await MailroomOperationsService.getMailroomOperationsMetrics('org-1');
    assert.strictEqual(m.pendingItems, 2);
    assert.strictEqual(m.inTransitDeliveries, 1);
    assert.strictEqual(m.activeRoutes, 1);
    assert.strictEqual(m.pendingPostage, 1);
  });

  it('getMailroomOperationsStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mailroom_item') return [makeRow()];
      if (t === 'mailroom_route') return [makeRouteRow()];
      if (t === 'mailroom_delivery') return [makeDeliveryRow()];
      if (t === 'mailroom_postage') return [makePostageRow()];
      return [];
    };
    const s = await MailroomOperationsService.getMailroomOperationsStats('org-1');
    assert.strictEqual(s.itemCount, 1);
    assert.strictEqual(s.routeCount, 1);
    assert.strictEqual(s.deliveryCount, 1);
    assert.strictEqual(s.postageCount, 1);
    assert.strictEqual(s.byItemType['letter'], 1);
    assert.strictEqual(s.byItemStatus['received'], 1);
    assert.strictEqual(s.byRouteStatus['planned'], 1);
    assert.strictEqual(s.byDeliveryStatus['pending'], 1);
    assert.strictEqual(s.byPostageStatus['pending'], 1);
  });
});
