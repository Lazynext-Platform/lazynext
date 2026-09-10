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
    type: 'lease_property',
    content: JSON.stringify({
      name: 'Sunset Tower',
      type: 'office',
      description: 'Prime office space',
      status: 'available',
      address: '123 Main St',
      size: 50000,
      units: 20,
      marketValue: 10000000,
      monthlyRent: 50000,
      amenities: ['parking', 'gym'],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['lease_property', 'office', 'available']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeContractRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'lease_contract',
    content: JSON.stringify({
      propertyId: 'mem-1',
      tenantId: 'mem-t1',
      type: 'fixed',
      description: '5-year lease',
      status: 'draft',
      startDate: '2028-01-01',
      endDate: '2033-01-01',
      monthlyRent: 50000,
      securityDeposit: 100000,
      terms: 'Standard terms',
      options: ['renewal', 'expansion'],
      notes: '',
    }),
    sourceId: 'mem-1',
    tags: JSON.stringify(['lease_contract', 'fixed', 'draft']),
    ...overrides,
  });
}

function makeTenantRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'lease_tenant',
    content: JSON.stringify({
      name: 'Acme Corp',
      type: 'corporate',
      description: 'Tech company',
      status: 'prospective',
      contactName: 'Jane Doe',
      email: 'jane@acme.com',
      phone: '555-0100',
      address: '456 Business Ave',
      creditScore: 750,
      notes: '',
    }),
    tags: JSON.stringify(['lease_tenant', 'corporate', 'prospective']),
    ...overrides,
  });
}

function makePaymentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'lease_payment',
    content: JSON.stringify({
      contractId: 'mem-c1',
      type: 'rent',
      amount: 50000,
      currency: 'USD',
      status: 'pending',
      dueDate: '2028-02-01',
      paidDate: null,
      method: 'bank_transfer',
      reference: 'INV-001',
      notes: '',
    }),
    sourceId: 'mem-c1',
    tags: JSON.stringify(['lease_payment', 'rent', 'pending']),
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

const { LeaseManagementService } = await import('@/lib/services/lease-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Properties
// ─────────────────────────────────────────────────────────────────────────────

describe('LeaseManagementService — Properties', () => {
  beforeEach(() => resetMock());

  it('creates a property with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await LeaseManagementService.createProperty('org-1', 'ws-1', {
      name: 'Warehouse 7', type: 'warehouse',
    }, 'user-1');
    assert.equal(p.name, 'Warehouse 7');
    assert.equal(p.status, 'available');
    assert.equal(p.size, 0);
    assert.equal(p.amenities.length, 0);
  });

  it('creates a property with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await LeaseManagementService.createProperty('org-1', 'ws-1', {
      name: 'Mall Plaza', type: 'retail', description: 'Shopping mall',
      status: 'leased', address: '789 Retail Blvd', size: 200000, units: 80,
      marketValue: 50000000, monthlyRent: 120000,
      amenities: ['parking', 'food_court', 'security'], notes: 'High traffic',
    }, 'user-1');
    assert.equal(p.name, 'Mall Plaza');
    assert.equal(p.type, 'retail');
    assert.equal(p.status, 'leased');
    assert.equal(p.size, 200000);
    assert.equal(p.units, 80);
    assert.equal(p.marketValue, 50000000);
    assert.equal(p.monthlyRent, 120000);
    assert.equal(p.amenities.length, 3);
  });

  it('gets a property by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await LeaseManagementService.getProperty('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Sunset Tower');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lease_contract' });
    const p = await LeaseManagementService.getProperty('mem-1');
    assert.equal(p, null);
  });

  it('returns null when property not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await LeaseManagementService.getProperty('nope');
    assert.equal(p, null);
  });

  it('lists properties by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_property') return [makeRow()];
      return [];
    };
    const list = await LeaseManagementService.listProperties('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Sunset Tower');
  });

  it('updates a property', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await LeaseManagementService.updateProperty('mem-1', { status: 'leased' });
    assert.ok(p);
    assert.equal(p!.status, 'leased');
  });

  it('deletes a property', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await LeaseManagementService.deleteProperty('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Contracts
// ─────────────────────────────────────────────────────────────────────────────

describe('LeaseManagementService — Contracts', () => {
  beforeEach(() => resetMock());

  it('creates a contract with defaults', async () => {
    memCreateImpl = async (args) => makeContractRow({ content: args.data.content as string });
    const c = await LeaseManagementService.createContract('org-1', 'ws-1', {
      propertyId: 'mem-1', tenantId: 'mem-t1', type: 'gross',
    }, 'user-1');
    assert.equal(c.propertyId, 'mem-1');
    assert.equal(c.tenantId, 'mem-t1');
    assert.equal(c.type, 'gross');
    assert.equal(c.status, 'draft');
    assert.equal(c.monthlyRent, 0);
    assert.equal(c.options.length, 0);
  });

  it('creates a contract with full input', async () => {
    memCreateImpl = async (args) => makeContractRow({ content: args.data.content as string });
    const c = await LeaseManagementService.createContract('org-1', 'ws-1', {
      propertyId: 'mem-1', tenantId: 'mem-t1', type: 'triple_net',
      description: 'NNN lease', status: 'active',
      startDate: '2028-01-01', endDate: '2033-01-01',
      monthlyRent: 75000, securityDeposit: 150000,
      terms: 'Triple net terms', options: ['renewal', 'expansion', 'purchase'],
      notes: 'Premium tenant',
    }, 'user-1');
    assert.equal(c.type, 'triple_net');
    assert.equal(c.status, 'active');
    assert.equal(c.monthlyRent, 75000);
    assert.equal(c.securityDeposit, 150000);
    assert.equal(c.options.length, 3);
    assert.ok(c.startDate);
    assert.ok(c.endDate);
  });

  it('gets a contract by id', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    const c = await LeaseManagementService.getContract('mem-c1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-c1');
    assert.equal(c!.propertyId, 'mem-1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeContractRow({ type: 'lease_property' });
    const c = await LeaseManagementService.getContract('mem-c1');
    assert.equal(c, null);
  });

  it('lists contracts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_contract') return [makeContractRow()];
      return [];
    };
    const list = await LeaseManagementService.listContracts('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].propertyId, 'mem-1');
  });

  it('updates a contract', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LeaseManagementService.updateContract('mem-c1', { monthlyRent: 90000 });
    assert.ok(c);
    assert.equal(c!.monthlyRent, 90000);
  });

  it('deletes a contract', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await LeaseManagementService.deleteContract('mem-c1');
    assert.equal(ok, true);
  });

  it('activateContract sets status to active', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LeaseManagementService.activateContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('expireContract sets status to expired', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LeaseManagementService.expireContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'expired');
  });

  it('terminateContract sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LeaseManagementService.terminateContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'terminated');
  });

  it('renewContract sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LeaseManagementService.renewContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'renewed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tenants
// ─────────────────────────────────────────────────────────────────────────────

describe('LeaseManagementService — Tenants', () => {
  beforeEach(() => resetMock());

  it('creates a tenant with defaults', async () => {
    memCreateImpl = async (args) => makeTenantRow({ content: args.data.content as string });
    const t = await LeaseManagementService.createTenant('org-1', 'ws-1', {
      name: 'Beta LLC', type: 'corporate',
    }, 'user-1');
    assert.equal(t.name, 'Beta LLC');
    assert.equal(t.status, 'prospective');
    assert.equal(t.creditScore, 0);
    assert.equal(t.email, '');
  });

  it('creates a tenant with full input', async () => {
    memCreateImpl = async (args) => makeTenantRow({ content: args.data.content as string });
    const t = await LeaseManagementService.createTenant('org-1', 'ws-1', {
      name: 'Gamma Inc', type: 'corporate', description: 'Manufacturing',
      status: 'active', contactName: 'John Smith', email: 'john@gamma.com',
      phone: '555-0200', address: '321 Industrial Way', creditScore: 820,
      notes: 'Long-term client',
    }, 'user-1');
    assert.equal(t.name, 'Gamma Inc');
    assert.equal(t.type, 'corporate');
    assert.equal(t.status, 'active');
    assert.equal(t.contactName, 'John Smith');
    assert.equal(t.email, 'john@gamma.com');
    assert.equal(t.creditScore, 820);
  });

  it('gets a tenant by id', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    const t = await LeaseManagementService.getTenant('mem-t1');
    assert.ok(t);
    assert.equal(t!.id, 'mem-t1');
    assert.equal(t!.name, 'Acme Corp');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTenantRow({ type: 'lease_property' });
    const t = await LeaseManagementService.getTenant('mem-t1');
    assert.equal(t, null);
  });

  it('lists tenants by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_tenant') return [makeTenantRow()];
      return [];
    };
    const list = await LeaseManagementService.listTenants('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Acme Corp');
  });

  it('updates a tenant', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await LeaseManagementService.updateTenant('mem-t1', { creditScore: 800 });
    assert.ok(t);
    assert.equal(t!.creditScore, 800);
  });

  it('deletes a tenant', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await LeaseManagementService.deleteTenant('mem-t1');
    assert.equal(ok, true);
  });

  it('activateTenant sets status to active', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await LeaseManagementService.activateTenant('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deactivateTenant sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await LeaseManagementService.deactivateTenant('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'inactive');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Payments
// ─────────────────────────────────────────────────────────────────────────────

describe('LeaseManagementService — Payments', () => {
  beforeEach(() => resetMock());

  it('creates a payment with defaults', async () => {
    memCreateImpl = async (args) => makePaymentRow({ content: args.data.content as string });
    const p = await LeaseManagementService.createPayment('org-1', 'ws-1', {
      contractId: 'mem-c1', type: 'rent', amount: 50000,
    }, 'user-1');
    assert.equal(p.contractId, 'mem-c1');
    assert.equal(p.type, 'rent');
    assert.equal(p.amount, 50000);
    assert.equal(p.currency, 'USD');
    assert.equal(p.status, 'pending');
    assert.equal(p.method, '');
  });

  it('creates a payment with full input', async () => {
    memCreateImpl = async (args) => makePaymentRow({ content: args.data.content as string });
    const p = await LeaseManagementService.createPayment('org-1', 'ws-1', {
      contractId: 'mem-c1', type: 'deposit', amount: 100000, currency: 'EUR',
      status: 'paid', dueDate: '2028-01-15', paidDate: '2028-01-10',
      method: 'wire', reference: 'DEP-002', notes: 'Security deposit',
    }, 'user-1');
    assert.equal(p.type, 'deposit');
    assert.equal(p.amount, 100000);
    assert.equal(p.currency, 'EUR');
    assert.equal(p.status, 'paid');
    assert.equal(p.method, 'wire');
    assert.equal(p.reference, 'DEP-002');
    assert.ok(p.dueDate);
    assert.ok(p.paidDate);
  });

  it('gets a payment by id', async () => {
    memFindUniqueImpl = async () => makePaymentRow();
    const p = await LeaseManagementService.getPayment('mem-p1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-p1');
    assert.equal(p!.amount, 50000);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePaymentRow({ type: 'lease_contract' });
    const p = await LeaseManagementService.getPayment('mem-p1');
    assert.equal(p, null);
  });

  it('lists payments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_payment') return [makePaymentRow()];
      return [];
    };
    const list = await LeaseManagementService.listPayments('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].amount, 50000);
  });

  it('updates a payment', async () => {
    memFindUniqueImpl = async () => makePaymentRow();
    memUpdateImpl = async (args) => makePaymentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await LeaseManagementService.updatePayment('mem-p1', { amount: 55000 });
    assert.ok(p);
    assert.equal(p!.amount, 55000);
  });

  it('deletes a payment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await LeaseManagementService.deletePayment('mem-p1');
    assert.equal(ok, true);
  });

  it('markPaid sets status to paid', async () => {
    memFindUniqueImpl = async () => makePaymentRow();
    memUpdateImpl = async (args) => makePaymentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await LeaseManagementService.markPaid('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'paid');
    assert.ok(p!.paidDate);
  });

  it('markOverdue sets status to overdue', async () => {
    memFindUniqueImpl = async () => makePaymentRow();
    memUpdateImpl = async (args) => makePaymentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await LeaseManagementService.markOverdue('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'overdue');
  });

  it('refundPayment sets status to refunded', async () => {
    memFindUniqueImpl = async () => makePaymentRow();
    memUpdateImpl = async (args) => makePaymentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await LeaseManagementService.refundPayment('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'refunded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('LeaseManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getLeaseManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_contract') return [
        makeContractRow({ content: JSON.stringify({ propertyId: 'mem-1', tenantId: 'mem-t1', type: 'fixed', status: 'active', monthlyRent: 50000, securityDeposit: 0, terms: '', options: [], notes: '', description: '' }) }),
        makeContractRow({ id: 'c2', content: JSON.stringify({ propertyId: 'mem-1', tenantId: 'mem-t1', type: 'fixed', status: 'draft', monthlyRent: 30000, securityDeposit: 0, terms: '', options: [], notes: '', description: '' }) }),
      ];
      if (t === 'lease_payment') return [
        makePaymentRow({ content: JSON.stringify({ contractId: 'mem-c1', type: 'rent', amount: 50000, currency: 'USD', status: 'pending', dueDate: '2028-02-01', paidDate: null, method: '', reference: '', notes: '' }) }),
        makePaymentRow({ id: 'p2', content: JSON.stringify({ contractId: 'mem-c1', type: 'rent', amount: 50000, currency: 'USD', status: 'overdue', dueDate: '2028-01-01', paidDate: null, method: '', reference: '', notes: '' }) }),
      ];
      if (t === 'lease_property') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'office', status: 'available', address: '', size: 0, units: 0, marketValue: 0, monthlyRent: 0, amenities: [], notes: '', description: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'office', status: 'leased', address: '', size: 0, units: 0, marketValue: 0, monthlyRent: 0, amenities: [], notes: '', description: '' }) }),
      ];
      if (t === 'lease_tenant') return [
        makeTenantRow({ content: JSON.stringify({ name: 'T1', type: 'corporate', status: 'active', contactName: '', email: '', phone: '', address: '', creditScore: 0, notes: '', description: '' }) }),
        makeTenantRow({ id: 't2', content: JSON.stringify({ name: 'T2', type: 'corporate', status: 'prospective', contactName: '', email: '', phone: '', address: '', creditScore: 0, notes: '', description: '' }) }),
      ];
      return [];
    };
    const m = await LeaseManagementService.getLeaseManagementMetrics('org-1');
    assert.equal(m.activeContracts, 1);
    assert.equal(m.totalMonthlyRent, 50000);
    assert.equal(m.pendingPayments, 1);
    assert.equal(m.overduePayments, 1);
    assert.equal(m.availableProperties, 1);
    assert.equal(m.leasedProperties, 1);
    assert.equal(m.activeTenants, 1);
  });

  it('getLeaseManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lease_property') return [makeRow()];
      if (t === 'lease_contract') return [makeContractRow()];
      if (t === 'lease_tenant') return [makeTenantRow()];
      if (t === 'lease_payment') return [makePaymentRow()];
      return [];
    };
    const s = await LeaseManagementService.getLeaseManagementStats('org-1');
    assert.equal(s.propertyCount, 1);
    assert.equal(s.contractCount, 1);
    assert.equal(s.tenantCount, 1);
    assert.equal(s.paymentCount, 1);
    assert.equal(s.byPropertyType['office'], 1);
    assert.equal(s.byPropertyStatus['available'], 1);
    assert.equal(s.byContractType['fixed'], 1);
    assert.equal(s.byContractStatus['draft'], 1);
    assert.equal(s.byTenantType['corporate'], 1);
    assert.equal(s.byTenantStatus['prospective'], 1);
    assert.equal(s.byPaymentType['rent'], 1);
    assert.equal(s.byPaymentStatus['pending'], 1);
  });
});
