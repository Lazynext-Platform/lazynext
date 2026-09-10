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
    type: 'relocation_case',
    content: JSON.stringify({
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      type: 'domestic',
      description: 'Domestic relocation',
      status: 'initiated',
      originLocation: 'New York, NY',
      destinationLocation: 'Boston, MA',
      startDate: '2028-01-01',
      endDate: '2028-03-31',
      familySize: 3,
      budget: 50000,
      assignedCoordinator: 'Jane Smith',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['relocation_case', 'domestic', 'initiated']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMoveRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'relocation_move',
    content: JSON.stringify({
      caseId: 'mem-1',
      type: 'full_service',
      description: 'Full service move',
      status: 'scheduled',
      scheduledDate: '2028-02-01',
      completedDate: null,
      originAddress: '123 Main St, New York, NY',
      destinationAddress: '456 Oak Ave, Boston, MA',
      carrier: 'Allied Van Lines',
      trackingNumber: 'AVL-12345',
      cost: 5000,
      notes: '',
    }),
    sourceId: 'mem-1',
    tags: JSON.stringify(['relocation_move', 'full_service', 'scheduled']),
    ...overrides,
  });
}

function makeExpenseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'relocation_expense',
    content: JSON.stringify({
      caseId: 'mem-1',
      type: 'moving',
      amount: 1500,
      currency: 'USD',
      status: 'submitted',
      date: '2028-02-15',
      vendor: 'Allied Van Lines',
      receipt: 'receipt-001.pdf',
      description: 'Moving expense',
      notes: '',
    }),
    sourceId: 'mem-1',
    tags: JSON.stringify(['relocation_expense', 'moving', 'submitted']),
    ...overrides,
  });
}

function makeVendorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'relocation_vendor',
    content: JSON.stringify({
      name: 'Allied Van Lines',
      type: 'moving_company',
      description: 'Full-service moving company',
      status: 'active',
      contactName: 'Bob Johnson',
      email: 'bob@allied.com',
      phone: '555-1234',
      address: '100 Moving Way, Springfield, IL',
      rating: 4.5,
      contractTerms: 'Standard terms',
      notes: '',
    }),
    sourceId: null,
    tags: JSON.stringify(['relocation_vendor', 'moving_company', 'active']),
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

const { RelocationService } = await import('@/lib/services/relocation-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('RelocationService — Cases', () => {
  beforeEach(() => resetMock());

  it('creates a case with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await RelocationService.createCase('org-1', 'ws-1', {
      employeeId: 'emp-1', employeeName: 'John Doe', type: 'domestic',
    }, 'user-1');
    assert.equal(c.employeeName, 'John Doe');
    assert.equal(c.status, 'initiated');
    assert.equal(c.budget, 0);
    assert.equal(c.familySize, 0);
  });

  it('creates a case with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await RelocationService.createCase('org-1', 'ws-1', {
      employeeId: 'emp-2', employeeName: 'Jane Doe', type: 'international',
      description: 'International relocation', status: 'planning',
      originLocation: 'London, UK', destinationLocation: 'New York, NY',
      startDate: '2028-01-01', endDate: '2028-06-30',
      familySize: 4, budget: 100000, assignedCoordinator: 'Alice',
      notes: 'High priority',
    }, 'user-1');
    assert.equal(c.employeeName, 'Jane Doe');
    assert.equal(c.type, 'international');
    assert.equal(c.originLocation, 'London, UK');
    assert.equal(c.budget, 100000);
    assert.equal(c.status, 'planning');
  });

  it('gets a case by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await RelocationService.getCase('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.employeeName, 'John Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'relocation_move' });
    const c = await RelocationService.getCase('mem-1');
    assert.equal(c, null);
  });

  it('returns null when case not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await RelocationService.getCase('nope');
    assert.equal(c, null);
  });

  it('lists cases by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_case') return [makeRow()];
      return [];
    };
    const list = await RelocationService.listCases('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].employeeName, 'John Doe');
  });

  it('updates a case', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await RelocationService.updateCase('mem-1', { status: 'in_progress' });
    assert.ok(c);
    assert.equal(c!.status, 'in_progress');
  });

  it('deletes a case', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await RelocationService.deleteCase('mem-1');
    assert.equal(ok, true);
  });

  it('planCase sets status to planning', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await RelocationService.planCase('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'planning');
  });

  it('startCase sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await RelocationService.startCase('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'in_progress');
  });

  it('completeCase sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await RelocationService.completeCase('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'completed');
  });

  it('holdCase sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await RelocationService.holdCase('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Moves
// ─────────────────────────────────────────────────────────────────────────────

describe('RelocationService — Moves', () => {
  beforeEach(() => resetMock());

  it('creates a move with defaults', async () => {
    memCreateImpl = async (args) => makeMoveRow({ content: args.data.content as string });
    const m = await RelocationService.createMove('org-1', 'ws-1', {
      caseId: 'mem-1', type: 'full_service',
    }, 'user-1');
    assert.equal(m.caseId, 'mem-1');
    assert.equal(m.status, 'scheduled');
    assert.equal(m.cost, 0);
  });

  it('creates a move with full input', async () => {
    memCreateImpl = async (args) => makeMoveRow({ content: args.data.content as string });
    const m = await RelocationService.createMove('org-1', 'ws-1', {
      caseId: 'mem-1', type: 'auto_transport', description: 'Vehicle shipping',
      status: 'in_transit', scheduledDate: '2028-03-01', completedDate: '2028-03-10',
      originAddress: 'LA, CA', destinationAddress: 'NYC, NY',
      carrier: 'AutoMovers', trackingNumber: 'AM-999', cost: 2500, notes: 'Expedited',
    }, 'user-1');
    assert.equal(m.type, 'auto_transport');
    assert.equal(m.carrier, 'AutoMovers');
    assert.equal(m.cost, 2500);
    assert.equal(m.status, 'in_transit');
  });

  it('gets a move by id', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    const m = await RelocationService.getMove('mem-m1');
    assert.ok(m);
    assert.equal(m!.id, 'mem-m1');
    assert.equal(m!.carrier, 'Allied Van Lines');
  });

  it('returns null for wrong type on move', async () => {
    memFindUniqueImpl = async () => makeMoveRow({ type: 'relocation_case' });
    const m = await RelocationService.getMove('mem-m1');
    assert.equal(m, null);
  });

  it('lists moves by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_move') return [makeMoveRow()];
      return [];
    };
    const list = await RelocationService.listMoves('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a move', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    memUpdateImpl = async (args) => makeMoveRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RelocationService.updateMove('mem-m1', { status: 'delivered' });
    assert.ok(m);
    assert.equal(m!.status, 'delivered');
  });

  it('deletes a move', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await RelocationService.deleteMove('mem-m1');
    assert.equal(ok, true);
  });

  it('dispatchMove sets status to in_transit', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    memUpdateImpl = async (args) => makeMoveRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RelocationService.dispatchMove('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'in_transit');
  });

  it('deliverMove sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    memUpdateImpl = async (args) => makeMoveRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RelocationService.deliverMove('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'delivered');
  });

  it('delayMove sets status to delayed', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    memUpdateImpl = async (args) => makeMoveRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RelocationService.delayMove('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'delayed');
  });

  it('rescheduleMove sets status to rescheduled', async () => {
    memFindUniqueImpl = async () => makeMoveRow();
    memUpdateImpl = async (args) => makeMoveRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await RelocationService.rescheduleMove('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'rescheduled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Expenses
// ─────────────────────────────────────────────────────────────────────────────

describe('RelocationService — Expenses', () => {
  beforeEach(() => resetMock());

  it('creates an expense with defaults', async () => {
    memCreateImpl = async (args) => makeExpenseRow({ content: args.data.content as string });
    const e = await RelocationService.createExpense('org-1', 'ws-1', {
      caseId: 'mem-1', type: 'moving', amount: 1500,
    }, 'user-1');
    assert.equal(e.caseId, 'mem-1');
    assert.equal(e.status, 'submitted');
    assert.equal(e.currency, 'USD');
  });

  it('creates an expense with full input', async () => {
    memCreateImpl = async (args) => makeExpenseRow({ content: args.data.content as string });
    const e = await RelocationService.createExpense('org-1', 'ws-1', {
      caseId: 'mem-1', type: 'travel', amount: 3000, currency: 'EUR',
      status: 'approved', date: '2028-04-01', vendor: 'Delta Airlines',
      receipt: 'delta-receipt.pdf', description: 'Flight tickets', notes: 'Business class',
    }, 'user-1');
    assert.equal(e.type, 'travel');
    assert.equal(e.amount, 3000);
    assert.equal(e.currency, 'EUR');
    assert.equal(e.status, 'approved');
  });

  it('gets an expense by id', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    const e = await RelocationService.getExpense('mem-e1');
    assert.ok(e);
    assert.equal(e!.id, 'mem-e1');
    assert.equal(e!.vendor, 'Allied Van Lines');
  });

  it('returns null for wrong type on expense', async () => {
    memFindUniqueImpl = async () => makeExpenseRow({ type: 'relocation_case' });
    const e = await RelocationService.getExpense('mem-e1');
    assert.equal(e, null);
  });

  it('lists expenses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_expense') return [makeExpenseRow()];
      return [];
    };
    const list = await RelocationService.listExpenses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an expense', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    memUpdateImpl = async (args) => makeExpenseRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RelocationService.updateExpense('mem-e1', { status: 'approved' });
    assert.ok(e);
    assert.equal(e!.status, 'approved');
  });

  it('deletes an expense', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await RelocationService.deleteExpense('mem-e1');
    assert.equal(ok, true);
  });

  it('approveExpense sets status to approved', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    memUpdateImpl = async (args) => makeExpenseRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RelocationService.approveExpense('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'approved');
  });

  it('rejectExpense sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    memUpdateImpl = async (args) => makeExpenseRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RelocationService.rejectExpense('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'rejected');
  });

  it('reimburseExpense sets status to reimbursed', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    memUpdateImpl = async (args) => makeExpenseRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RelocationService.reimburseExpense('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'reimbursed');
  });

  it('disputeExpense sets status to disputed', async () => {
    memFindUniqueImpl = async () => makeExpenseRow();
    memUpdateImpl = async (args) => makeExpenseRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RelocationService.disputeExpense('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'disputed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Vendors
// ─────────────────────────────────────────────────────────────────────────────

describe('RelocationService — Vendors', () => {
  beforeEach(() => resetMock());

  it('creates a vendor with defaults', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await RelocationService.createVendor('org-1', 'ws-1', {
      name: 'Allied Van Lines', type: 'moving_company',
    }, 'user-1');
    assert.equal(v.name, 'Allied Van Lines');
    assert.equal(v.status, 'active');
    assert.equal(v.rating, 0);
  });

  it('creates a vendor with full input', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await RelocationService.createVendor('org-1', 'ws-1', {
      name: 'Global Mobility', type: 'real_estate', description: 'Real estate services',
      status: 'preferred', contactName: 'Sarah Lee', email: 'sarah@globalmob.com',
      phone: '555-9999', address: '200 Realty Rd, Miami, FL', rating: 5,
      contractTerms: 'Premium terms', notes: 'Top vendor',
    }, 'user-1');
    assert.equal(v.name, 'Global Mobility');
    assert.equal(v.type, 'real_estate');
    assert.equal(v.rating, 5);
    assert.equal(v.status, 'preferred');
  });

  it('gets a vendor by id', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    const v = await RelocationService.getVendor('mem-v1');
    assert.ok(v);
    assert.equal(v!.id, 'mem-v1');
    assert.equal(v!.name, 'Allied Van Lines');
  });

  it('returns null for wrong type on vendor', async () => {
    memFindUniqueImpl = async () => makeVendorRow({ type: 'relocation_case' });
    const v = await RelocationService.getVendor('mem-v1');
    assert.equal(v, null);
  });

  it('lists vendors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_vendor') return [makeVendorRow()];
      return [];
    };
    const list = await RelocationService.listVendors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a vendor', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await RelocationService.updateVendor('mem-v1', { rating: 5 });
    assert.ok(v);
    assert.equal(v!.rating, 5);
  });

  it('deletes a vendor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await RelocationService.deleteVendor('mem-v1');
    assert.equal(ok, true);
  });

  it('preferVendor sets status to preferred', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await RelocationService.preferVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'preferred');
  });

  it('blacklistVendor sets status to blacklisted', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await RelocationService.blacklistVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'blacklisted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('RelocationService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getRelocationMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_case') return [
        makeRow({ content: JSON.stringify({ employeeId: 'e1', employeeName: 'E1', type: 'domestic', status: 'initiated', budget: 25000, familySize: 2, description: '', originLocation: '', destinationLocation: '', assignedCoordinator: '', notes: '', startDate: null, endDate: null }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ employeeId: 'e2', employeeName: 'E2', type: 'international', status: 'completed', budget: 75000, familySize: 1, description: '', originLocation: '', destinationLocation: '', assignedCoordinator: '', notes: '', startDate: null, endDate: null }) }),
      ];
      if (t === 'relocation_move') return [
        makeMoveRow({ content: JSON.stringify({ caseId: 'c1', type: 'full_service', status: 'in_transit', cost: 0, description: '', scheduledDate: null, completedDate: null, originAddress: '', destinationAddress: '', carrier: '', trackingNumber: '', notes: '' }) }),
      ];
      if (t === 'relocation_expense') return [
        makeExpenseRow({ content: JSON.stringify({ caseId: 'c1', type: 'moving', amount: 500, status: 'submitted', currency: 'USD', date: null, vendor: '', receipt: '', description: '', notes: '' }) }),
        makeExpenseRow({ id: 'e2', content: JSON.stringify({ caseId: 'c1', type: 'travel', amount: 800, status: 'approved', currency: 'USD', date: null, vendor: '', receipt: '', description: '', notes: '' }) }),
      ];
      if (t === 'relocation_vendor') return [
        makeVendorRow({ content: JSON.stringify({ name: 'V1', type: 'moving_company', status: 'preferred', description: '', contactName: '', email: '', phone: '', address: '', rating: 0, contractTerms: '', notes: '' }) }),
        makeVendorRow({ id: 'v2', content: JSON.stringify({ name: 'V2', type: 'storage', status: 'active', description: '', contactName: '', email: '', phone: '', address: '', rating: 0, contractTerms: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await RelocationService.getRelocationMetrics('org-1');
    assert.equal(m.activeCases, 1);
    assert.equal(m.inTransitMoves, 1);
    assert.equal(m.pendingExpenses, 1);
    assert.equal(m.totalBudget, 100000);
    assert.equal(m.preferredVendors, 1);
  });

  it('getRelocationStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'relocation_case') return [makeRow()];
      if (t === 'relocation_move') return [makeMoveRow()];
      if (t === 'relocation_expense') return [makeExpenseRow()];
      if (t === 'relocation_vendor') return [makeVendorRow()];
      return [];
    };
    const s = await RelocationService.getRelocationStats('org-1');
    assert.equal(s.caseCount, 1);
    assert.equal(s.moveCount, 1);
    assert.equal(s.expenseCount, 1);
    assert.equal(s.vendorCount, 1);
    assert.equal(s.byCaseType['domestic'], 1);
    assert.equal(s.byCaseStatus['initiated'], 1);
    assert.equal(s.byMoveType['full_service'], 1);
    assert.equal(s.byMoveStatus['scheduled'], 1);
    assert.equal(s.byExpenseType['moving'], 1);
    assert.equal(s.byExpenseStatus['submitted'], 1);
    assert.equal(s.byVendorType['moving_company'], 1);
    assert.equal(s.byVendorStatus['active'], 1);
  });
});
