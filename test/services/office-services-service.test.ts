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
    type: 'office_request',
    content: JSON.stringify({
      title: 'Fix office AC',
      type: 'maintenance',
      description: 'AC not cooling',
      status: 'submitted',
      priority: 'medium',
      requestedBy: 'Jane Doe',
      assignedTo: '',
      location: 'HQ',
      scheduledDate: '2028-01-01',
      completedDate: null,
      cost: 0,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['office_request', 'maintenance', 'submitted', 'medium']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMailRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'mail_record',
    content: JSON.stringify({
      type: 'incoming',
      sender: 'John Smith',
      recipient: 'Jane Doe',
      subject: 'Invoice',
      status: 'received',
      receivedDate: '2028-01-01',
      deliveredDate: null,
      trackingNumber: 'TRK123',
      weight: 0.5,
      postage: 5.50,
      notes: '',
    }),
    tags: JSON.stringify(['mail_record', 'incoming', 'received']),
    ...overrides,
  });
}

function makePrintRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'print_job',
    content: JSON.stringify({
      type: 'document',
      title: 'Quarterly Report',
      description: 'Print 10 copies',
      status: 'queued',
      requestedBy: 'Jane Doe',
      copies: 10,
      color: true,
      doubleSided: false,
      paperSize: 'A4',
      binding: '',
      cost: 25.00,
      completedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['print_job', 'document', 'queued']),
    ...overrides,
  });
}

function makeSupplyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'supply_order',
    content: JSON.stringify({
      type: 'stationery',
      description: 'Office stationery order',
      status: 'requested',
      items: ['pens', 'paper', 'folders'],
      requestedBy: 'Jane Doe',
      approvedBy: '',
      supplier: 'Office Depot',
      totalCost: 150.00,
      orderedDate: null,
      receivedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['supply_order', 'stationery', 'requested']),
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

const { OfficeServicesService } = await import('@/lib/services/office-services-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Requests
// ─────────────────────────────────────────────────────────────────────────────

describe('OfficeServicesService — Requests', () => {
  beforeEach(() => resetMock());

  it('creates a request with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await OfficeServicesService.createRequest('org-1', 'ws-1', {
      title: 'Fix printer', type: 'it_support',
    }, 'user-1');
    assert.equal(r.title, 'Fix printer');
    assert.equal(r.status, 'submitted');
    assert.equal(r.priority, 'medium');
    assert.equal(r.cost, 0);
  });

  it('creates a request with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await OfficeServicesService.createRequest('org-1', 'ws-1', {
      title: 'Office move', type: 'move', description: 'Move to new floor',
      status: 'in_progress', priority: 'urgent', requestedBy: 'Alice',
      assignedTo: 'Bob', location: 'Floor 3', scheduledDate: '2028-01-01',
      completedDate: '2028-02-01', cost: 5000, notes: 'High priority',
    }, 'user-1');
    assert.equal(r.title, 'Office move');
    assert.equal(r.type, 'move');
    assert.equal(r.priority, 'urgent');
    assert.equal(r.cost, 5000);
    assert.equal(r.status, 'in_progress');
  });

  it('gets a request by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const r = await OfficeServicesService.getRequest('mem-1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-1');
    assert.equal(r!.title, 'Fix office AC');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'mail_record' });
    const r = await OfficeServicesService.getRequest('mem-1');
    assert.equal(r, null);
  });

  it('returns null when request not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await OfficeServicesService.getRequest('nope');
    assert.equal(r, null);
  });

  it('lists requests by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'office_request') return [makeRow()];
      return [];
    };
    const list = await OfficeServicesService.listRequests('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Fix office AC');
  });

  it('updates a request', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await OfficeServicesService.updateRequest('mem-1', { status: 'completed' });
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('deletes a request', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await OfficeServicesService.deleteRequest('mem-1');
    assert.equal(ok, true);
  });

  it('assignRequest sets status to assigned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await OfficeServicesService.assignRequest('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'assigned');
  });

  it('startRequest sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await OfficeServicesService.startRequest('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'in_progress');
  });

  it('completeRequest sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await OfficeServicesService.completeRequest('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('holdRequest sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await OfficeServicesService.holdRequest('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Mail
// ─────────────────────────────────────────────────────────────────────────────

describe('OfficeServicesService — Mail', () => {
  beforeEach(() => resetMock());

  it('creates mail with defaults', async () => {
    memCreateImpl = async (args) => makeMailRow({ content: args.data.content as string });
    const m = await OfficeServicesService.createMail('org-1', 'ws-1', {
      type: 'incoming',
    }, 'user-1');
    assert.equal(m.type, 'incoming');
    assert.equal(m.status, 'received');
    assert.equal(m.weight, 0);
  });

  it('creates mail with full input', async () => {
    memCreateImpl = async (args) => makeMailRow({ content: args.data.content as string });
    const m = await OfficeServicesService.createMail('org-1', 'ws-1', {
      type: 'certified', sender: 'Alice', recipient: 'Bob', subject: 'Contract',
      status: 'sorted', receivedDate: '2028-01-01', deliveredDate: '2028-01-02',
      trackingNumber: 'TRK456', weight: 1.2, postage: 12.50, notes: 'Important',
    }, 'user-1');
    assert.equal(m.type, 'certified');
    assert.equal(m.sender, 'Alice');
    assert.equal(m.trackingNumber, 'TRK456');
    assert.equal(m.postage, 12.50);
  });

  it('gets mail by id', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    const m = await OfficeServicesService.getMail('mem-m1');
    assert.ok(m);
    assert.equal(m!.subject, 'Invoice');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMailRow({ type: 'office_request' });
    const m = await OfficeServicesService.getMail('mem-m1');
    assert.equal(m, null);
  });

  it('lists mail by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'mail_record') return [makeMailRow()];
      return [];
    };
    const list = await OfficeServicesService.listMail('org-1');
    assert.equal(list.length, 1);
  });

  it('updates mail', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.updateMail('mem-m1', { status: 'sorted' });
    assert.ok(m);
    assert.equal(m!.status, 'sorted');
  });

  it('deletes mail', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await OfficeServicesService.deleteMail('mem-m1');
    assert.equal(ok, true);
  });

  it('sortMail sets status to sorted', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.sortMail('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'sorted');
  });

  it('deliverMail sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.deliverMail('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'delivered');
  });

  it('returnMail sets status to returned', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.returnMail('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'returned');
  });

  it('forwardMail sets status to forwarded', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.forwardMail('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'forwarded');
  });

  it('holdMail sets status to held', async () => {
    memFindUniqueImpl = async () => makeMailRow();
    memUpdateImpl = async (args) => makeMailRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await OfficeServicesService.holdMail('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'held');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Print Jobs
// ─────────────────────────────────────────────────────────────────────────────

describe('OfficeServicesService — Print Jobs', () => {
  beforeEach(() => resetMock());

  it('creates a print job with defaults', async () => {
    memCreateImpl = async (args) => makePrintRow({ content: args.data.content as string });
    const p = await OfficeServicesService.createPrintJob('org-1', 'ws-1', {
      type: 'document', title: 'Report',
    }, 'user-1');
    assert.equal(p.title, 'Report');
    assert.equal(p.status, 'queued');
    assert.equal(p.copies, 1);
    assert.equal(p.color, false);
  });

  it('creates a print job with full input', async () => {
    memCreateImpl = async (args) => makePrintRow({ content: args.data.content as string });
    const p = await OfficeServicesService.createPrintJob('org-1', 'ws-1', {
      type: 'poster', title: 'Conference Poster', description: 'A1 poster',
      status: 'printing', requestedBy: 'Alice', copies: 50, color: true,
      doubleSided: true, paperSize: 'A1', binding: 'spiral', cost: 100.00,
      completedDate: '2028-03-01', notes: 'Urgent',
    }, 'user-1');
    assert.equal(p.title, 'Conference Poster');
    assert.equal(p.type, 'poster');
    assert.equal(p.copies, 50);
    assert.equal(p.color, true);
    assert.equal(p.cost, 100.00);
  });

  it('gets a print job by id', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    const p = await OfficeServicesService.getPrintJob('mem-p1');
    assert.ok(p);
    assert.equal(p!.title, 'Quarterly Report');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePrintRow({ type: 'office_request' });
    const p = await OfficeServicesService.getPrintJob('mem-p1');
    assert.equal(p, null);
  });

  it('lists print jobs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'print_job') return [makePrintRow()];
      return [];
    };
    const list = await OfficeServicesService.listPrintJobs('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a print job', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    memUpdateImpl = async (args) => makePrintRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await OfficeServicesService.updatePrintJob('mem-p1', { status: 'printing' });
    assert.ok(p);
    assert.equal(p!.status, 'printing');
  });

  it('deletes a print job', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await OfficeServicesService.deletePrintJob('mem-p1');
    assert.equal(ok, true);
  });

  it('startPrint sets status to printing', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    memUpdateImpl = async (args) => makePrintRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await OfficeServicesService.startPrint('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'printing');
  });

  it('completePrint sets status to completed', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    memUpdateImpl = async (args) => makePrintRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await OfficeServicesService.completePrint('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('failPrint sets status to failed', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    memUpdateImpl = async (args) => makePrintRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await OfficeServicesService.failPrint('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'failed');
  });

  it('reprint sets status to reprinted', async () => {
    memFindUniqueImpl = async () => makePrintRow();
    memUpdateImpl = async (args) => makePrintRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await OfficeServicesService.reprint('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'reprinted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Supply Orders
// ─────────────────────────────────────────────────────────────────────────────

describe('OfficeServicesService — Supply Orders', () => {
  beforeEach(() => resetMock());

  it('creates a supply order with defaults', async () => {
    memCreateImpl = async (args) => makeSupplyRow({ content: args.data.content as string });
    const s = await OfficeServicesService.createSupplyOrder('org-1', 'ws-1', {
      type: 'stationery',
    }, 'user-1');
    assert.equal(s.type, 'stationery');
    assert.equal(s.status, 'requested');
    assert.equal(s.totalCost, 0);
    assert.equal(s.items.length, 0);
  });

  it('creates a supply order with full input', async () => {
    memCreateImpl = async (args) => makeSupplyRow({ content: args.data.content as string });
    const s = await OfficeServicesService.createSupplyOrder('org-1', 'ws-1', {
      type: 'electronics', description: 'New laptops', status: 'approved',
      items: ['laptop', 'monitor'], requestedBy: 'Alice', approvedBy: 'Bob',
      supplier: 'Dell', totalCost: 5000, orderedDate: '2028-01-01',
      receivedDate: '2028-02-01', notes: 'Priority order',
    }, 'user-1');
    assert.equal(s.type, 'electronics');
    assert.equal(s.supplier, 'Dell');
    assert.equal(s.totalCost, 5000);
    assert.equal(s.items.length, 2);
  });

  it('gets a supply order by id', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    const s = await OfficeServicesService.getSupplyOrder('mem-s1');
    assert.ok(s);
    assert.equal(s!.type, 'stationery');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSupplyRow({ type: 'office_request' });
    const s = await OfficeServicesService.getSupplyOrder('mem-s1');
    assert.equal(s, null);
  });

  it('lists supply orders by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'supply_order') return [makeSupplyRow()];
      return [];
    };
    const list = await OfficeServicesService.listSupplyOrders('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a supply order', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OfficeServicesService.updateSupplyOrder('mem-s1', { status: 'approved' });
    assert.ok(s);
    assert.equal(s!.status, 'approved');
  });

  it('deletes a supply order', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await OfficeServicesService.deleteSupplyOrder('mem-s1');
    assert.equal(ok, true);
  });

  it('approveSupply sets status to approved', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OfficeServicesService.approveSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'approved');
  });

  it('orderSupply sets status to ordered', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OfficeServicesService.orderSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'ordered');
  });

  it('receiveSupply sets status to received', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OfficeServicesService.receiveSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'received');
  });

  it('distributeSupply sets status to distributed', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await OfficeServicesService.distributeSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'distributed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('OfficeServicesService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getOfficeServicesMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'office_request') return [
        makeRow({ content: JSON.stringify({ title: 'R1', type: 'maintenance', status: 'submitted', priority: 'urgent', requestedBy: '', assignedTo: '', location: '', cost: 0, notes: '', description: '', scheduledDate: null, completedDate: null }) }),
        makeRow({ id: 'r2', content: JSON.stringify({ title: 'R2', type: 'repair', status: 'in_progress', priority: 'medium', requestedBy: '', assignedTo: '', location: '', cost: 0, notes: '', description: '', scheduledDate: null, completedDate: null }) }),
        makeRow({ id: 'r3', content: JSON.stringify({ title: 'R3', type: 'cleaning', status: 'completed', priority: 'low', requestedBy: '', assignedTo: '', location: '', cost: 0, notes: '', description: '', scheduledDate: null, completedDate: null }) }),
      ];
      if (t === 'mail_record') return [
        makeMailRow({ content: JSON.stringify({ type: 'incoming', sender: '', recipient: '', subject: '', status: 'received', trackingNumber: '', weight: 0, postage: 0, notes: '', receivedDate: null, deliveredDate: null }) }),
        makeMailRow({ id: 'm2', content: JSON.stringify({ type: 'outgoing', sender: '', recipient: '', subject: '', status: 'delivered', trackingNumber: '', weight: 0, postage: 0, notes: '', receivedDate: null, deliveredDate: null }) }),
      ];
      if (t === 'print_job') return [
        makePrintRow({ content: JSON.stringify({ type: 'document', title: 'P1', status: 'queued', requestedBy: '', copies: 1, color: false, doubleSided: false, paperSize: '', binding: '', cost: 0, completedDate: null, notes: '', description: '' }) }),
      ];
      if (t === 'supply_order') return [
        makeSupplyRow({ content: JSON.stringify({ type: 'stationery', description: '', status: 'requested', items: [], requestedBy: '', approvedBy: '', supplier: '', totalCost: 0, orderedDate: null, receivedDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await OfficeServicesService.getOfficeServicesMetrics('org-1');
    assert.equal(m.openRequests, 2);
    assert.equal(m.urgentRequests, 1);
    assert.equal(m.pendingMail, 1);
    assert.equal(m.queuedPrintJobs, 1);
    assert.equal(m.pendingSupplyOrders, 1);
  });

  it('getOfficeServicesStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'office_request') return [makeRow()];
      if (t === 'mail_record') return [makeMailRow()];
      if (t === 'print_job') return [makePrintRow()];
      if (t === 'supply_order') return [makeSupplyRow()];
      return [];
    };
    const s = await OfficeServicesService.getOfficeServicesStats('org-1');
    assert.equal(s.requestCount, 1);
    assert.equal(s.mailCount, 1);
    assert.equal(s.printJobCount, 1);
    assert.equal(s.supplyOrderCount, 1);
    assert.equal(s.byRequestType['maintenance'], 1);
    assert.equal(s.byRequestStatus['submitted'], 1);
    assert.equal(s.byRequestPriority['medium'], 1);
    assert.equal(s.byMailType['incoming'], 1);
    assert.equal(s.byMailStatus['received'], 1);
    assert.equal(s.byPrintType['document'], 1);
    assert.equal(s.byPrintStatus['queued'], 1);
    assert.equal(s.bySupplyType['stationery'], 1);
    assert.equal(s.bySupplyStatus['requested'], 1);
  });
});
