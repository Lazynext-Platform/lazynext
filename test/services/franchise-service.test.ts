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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'franchisee',
    content: JSON.stringify({
      name: 'Test Franchisee',
      contactName: 'John Doe',
      contactEmail: 'john@test.com',
      contactPhone: '555-0100',
      territory: 'North',
      franchiseFee: 50000,
      royaltyRate: 6,
      status: 'prospect',
      joinedDate: '',
      franchiseType: 'single_unit',
      experience: '',
      financialStatus: 'good_standing',
      location: 'New York',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['franchisee', 'prospect', 'single_unit']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { FranchiseService } = await import('@/lib/services/franchise-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseService — Franchisees', () => {
  beforeEach(() => resetMock());

  it('creates a franchisee with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const f = await FranchiseService.createFranchisee('org-1', 'ws-1', { name: 'Acme Franchise' }, 'user-1');
    assert.equal(f.name, 'Acme Franchise');
    assert.equal(f.status, 'prospect');
    assert.equal(f.franchiseType, 'single_unit');
    assert.equal(f.financialStatus, 'good_standing');
    assert.equal(f.franchiseFee, 0);
  });

  it('creates a franchisee with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const f = await FranchiseService.createFranchisee('org-1', 'ws-1', {
      name: 'Beta Franchise',
      contactName: 'Jane',
      contactEmail: 'jane@beta.com',
      franchiseFee: 75000,
      royaltyRate: 7,
      status: 'active',
      franchiseType: 'multi_unit',
      financialStatus: 'good_standing',
      location: 'Chicago',
    }, 'user-1');
    assert.equal(f.name, 'Beta Franchise');
    assert.equal(f.status, 'active');
    assert.equal(f.franchiseType, 'multi_unit');
    assert.equal(f.franchiseFee, 75000);
    assert.equal(f.royaltyRate, 7);
  });

  it('gets a franchisee by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const f = await FranchiseService.getFranchisee('mem-1');
    assert.ok(f);
    assert.equal(f!.id, 'mem-1');
    assert.equal(f!.name, 'Test Franchisee');
  });

  it('returns null for non-franchisee type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'something_else' });
    const f = await FranchiseService.getFranchisee('mem-1');
    assert.equal(f, null);
  });

  it('returns null when franchisee not found', async () => {
    memFindUniqueImpl = async () => null;
    const f = await FranchiseService.getFranchisee('nope');
    assert.equal(f, null);
  });

  it('lists franchisees by organization', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'mem-2', content: JSON.stringify({ name: 'Second', status: 'active', franchiseType: 'single_unit', financialStatus: 'good_standing' }) })];
    const list = await FranchiseService.listFranchisees('org-1');
    assert.equal(list.length, 2);
    assert.equal(list[0].name, 'Test Franchisee');
  });

  it('updates a franchisee', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: JSON.stringify({
      name: 'Updated', contactName: 'John', contactEmail: 'john@test.com', contactPhone: '555-0100',
      territory: 'North', franchiseFee: 50000, royaltyRate: 6, status: 'active', joinedDate: '',
      franchiseType: 'single_unit', experience: '', financialStatus: 'good_standing', location: 'New York', notes: '',
    }), updatedAt: new Date('2024-02-01') });
    const f = await FranchiseService.updateFranchisee('mem-1', { status: 'active' });
    assert.ok(f);
    assert.equal(f!.status, 'active');
  });

  it('deletes a franchisee', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await FranchiseService.deleteFranchisee('mem-1');
    assert.equal(ok, true);
  });

  it('activates a franchisee', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({
      name: 'Test', contactName: '', contactEmail: '', contactPhone: '', territory: '', franchiseFee: 0,
      royaltyRate: 0, status: 'active', joinedDate: '2024-06-01', franchiseType: 'single_unit',
      experience: '', financialStatus: 'good_standing', location: '', notes: '',
    }) });
    const f = await FranchiseService.activateFranchisee('mem-1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'active');
  });

  it('terminates a franchisee with reason', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({
      name: 'Test', contactName: '', contactEmail: '', contactPhone: '', territory: '', franchiseFee: 0,
      royaltyRate: 0, status: 'terminated', joinedDate: '', franchiseType: 'single_unit',
      experience: '', financialStatus: 'good_standing', location: '', notes: 'Breach of contract',
    }) });
    const f = await FranchiseService.terminateFranchisee('mem-1', 'Breach of contract', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'terminated');
    assert.ok(f!.notes.includes('Breach'));
  });
});

describe('FranchiseService — Agreements', () => {
  beforeEach(() => resetMock());

  it('creates an agreement', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'franchise_agreement', content: args.data.content as string });
    const a = await FranchiseService.createAgreement('org-1', 'ws-1', {
      franchiseeId: 'f-1',
      agreementNumber: 'AGR-001',
      type: 'single_unit',
      startDate: '2024-01-01',
      territory: 'North',
      initialFee: 50000,
      royaltyRate: 6,
      advertisingFundRate: 2,
    }, 'user-1');
    assert.equal(a.agreementNumber, 'AGR-001');
    assert.equal(a.type, 'single_unit');
    assert.equal(a.status, 'draft');
  });

  it('gets an agreement by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-001', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'North', initialFee: 50000, royaltyRate: 6, advertisingFundRate: 2,
      renewalTerms: '', terminationConditions: '', status: 'draft', signedDate: null, notes: '',
    }) });
    const a = await FranchiseService.getAgreement('mem-1');
    assert.ok(a);
    assert.equal(a!.agreementNumber, 'AGR-001');
  });

  it('lists agreements', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'active', signedDate: null, notes: '',
    }) })];
    const list = await FranchiseService.listAgreements('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].agreementNumber, 'AGR-1');
  });

  it('signs an agreement', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'pending', signedDate: null, notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'active', signedDate: '2024-06-01', notes: '',
    }) });
    const a = await FranchiseService.signAgreement('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'active');
  });

  it('renews an agreement with new end date', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: '2024-12-31', territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'active', signedDate: '2024-01-01', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: '2025-12-31', territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'renewed', signedDate: '2024-01-01', notes: '',
    }) });
    const a = await FranchiseService.renewAgreement('mem-1', '2025-12-31', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'renewed');
  });

  it('terminates an agreement', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'active', signedDate: '2024-01-01', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_agreement', content: JSON.stringify({
      franchiseeId: 'f-1', agreementNumber: 'AGR-1', type: 'single_unit', startDate: '2024-01-01',
      endDate: null, territory: 'N', initialFee: 0, royaltyRate: 0, advertisingFundRate: 0,
      renewalTerms: '', terminationConditions: '', status: 'terminated', signedDate: '2024-01-01', notes: 'Breach',
    }) });
    const a = await FranchiseService.terminateAgreement('mem-1', 'Breach', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'terminated');
  });
});

describe('FranchiseService — Territories', () => {
  beforeEach(() => resetMock());

  it('creates a territory', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'franchise_territory', content: args.data.content as string });
    const t = await FranchiseService.createTerritory('org-1', 'ws-1', {
      name: 'North Region',
      boundaries: '40N-45N',
      population: 1000000,
    }, 'user-1');
    assert.equal(t.name, 'North Region');
    assert.equal(t.status, 'available');
    assert.equal(t.population, 1000000);
  });

  it('gets a territory', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_territory', content: JSON.stringify({
      name: 'North', description: '', boundaries: '', population: 0, demographics: '',
      marketPotential: '', existingLocations: 0, exclusivity: false, status: 'available', assignedTo: null,
    }) });
    const t = await FranchiseService.getTerritory('mem-1');
    assert.ok(t);
    assert.equal(t!.name, 'North');
  });

  it('lists territories', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'franchise_territory', content: JSON.stringify({
      name: 'T1', description: '', boundaries: '', population: 0, demographics: '',
      marketPotential: '', existingLocations: 0, exclusivity: false, status: 'available', assignedTo: null,
    }) })];
    const list = await FranchiseService.listTerritories('org-1');
    assert.equal(list.length, 1);
  });

  it('assigns a territory', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_territory', content: JSON.stringify({
      name: 'T1', description: '', boundaries: '', population: 0, demographics: '',
      marketPotential: '', existingLocations: 0, exclusivity: false, status: 'available', assignedTo: null,
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_territory', content: JSON.stringify({
      name: 'T1', description: '', boundaries: '', population: 0, demographics: '',
      marketPotential: '', existingLocations: 0, exclusivity: false, status: 'assigned', assignedTo: 'f-1',
    }) });
    const t = await FranchiseService.assignTerritory('mem-1', 'f-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'assigned');
    assert.equal(t!.assignedTo, 'f-1');
  });

  it('deletes a territory', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await FranchiseService.deleteTerritory('mem-1');
    assert.equal(ok, true);
  });
});

describe('FranchiseService — Royalties', () => {
  beforeEach(() => resetMock());

  it('creates a royalty record', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'franchise_royalty', content: args.data.content as string });
    const r = await FranchiseService.createRoyalty('org-1', 'ws-1', {
      franchiseeId: 'f-1',
      period: '2024-Q1',
      grossSales: 100000,
      royaltyRate: 6,
      totalAmount: 6000,
    }, 'user-1');
    assert.equal(r.franchiseeId, 'f-1');
    assert.equal(r.period, '2024-Q1');
    assert.equal(r.grossSales, 100000);
    assert.equal(r.status, 'pending');
  });

  it('lists royalties', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'franchise_royalty', content: JSON.stringify({
      franchiseeId: 'f-1', period: '2024-Q1', grossSales: 100000, royaltyRate: 6, royaltyAmount: 6000,
      advertisingFundAmount: 0, additionalFees: 0, totalAmount: 6000, dueDate: null, paidDate: null,
      status: 'pending', notes: '',
    }) })];
    const list = await FranchiseService.listRoyalties('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].period, '2024-Q1');
  });

  it('records a royalty payment', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_royalty', content: JSON.stringify({
      franchiseeId: 'f-1', period: '2024-Q1', grossSales: 100000, royaltyRate: 6, royaltyAmount: 6000,
      advertisingFundAmount: 0, additionalFees: 0, totalAmount: 6000, dueDate: null, paidDate: null,
      status: 'pending', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_royalty', content: JSON.stringify({
      franchiseeId: 'f-1', period: '2024-Q1', grossSales: 100000, royaltyRate: 6, royaltyAmount: 6000,
      advertisingFundAmount: 0, additionalFees: 0, totalAmount: 6000, dueDate: null, paidDate: '2024-04-15',
      status: 'paid', notes: '',
    }) });
    const r = await FranchiseService.recordPayment('mem-1', '2024-04-15', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'paid');
  });
});

describe('FranchiseService — Compliance', () => {
  beforeEach(() => resetMock());

  it('creates a compliance check', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'franchise_compliance', content: args.data.content as string });
    const c = await FranchiseService.createCompliance('org-1', 'ws-1', {
      franchiseeId: 'f-1',
      type: 'operational',
      checkDate: '2024-06-01',
      checker: 'Auditor',
      result: 'pass',
    }, 'user-1');
    assert.equal(c.franchiseeId, 'f-1');
    assert.equal(c.type, 'operational');
    assert.equal(c.result, 'pass');
    assert.equal(c.status, 'closed');
  });

  it('lists compliance checks', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'franchise_compliance', content: JSON.stringify({
      franchiseeId: 'f-1', type: 'operational', checkDate: '2024-06-01', checker: 'A', result: 'pass',
      findings: '', correctiveActions: '', followUpDate: null, status: 'open', resolution: '', resolvedBy: '', resolvedAt: null,
    }) })];
    const list = await FranchiseService.listCompliance('org-1');
    assert.equal(list.length, 1);
  });

  it('resolves a compliance check', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_compliance', content: JSON.stringify({
      franchiseeId: 'f-1', type: 'operational', checkDate: '2024-06-01', checker: 'A', result: 'fail',
      findings: '', correctiveActions: '', followUpDate: null, status: 'open', resolution: '', resolvedBy: '', resolvedAt: null,
    }) });
    memUpdateImpl = async () => makeRow({ type: 'franchise_compliance', content: JSON.stringify({
      franchiseeId: 'f-1', type: 'operational', checkDate: '2024-06-01', checker: 'A', result: 'fail',
      findings: '', correctiveActions: '', followUpDate: null, status: 'resolved', resolution: 'Fixed', resolvedBy: 'user-1', resolvedAt: new Date('2024-06-15'),
    }) });
    const c = await FranchiseService.resolveCompliance('mem-1', 'Fixed', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'resolved');
    assert.equal(c!.resolution, 'Fixed');
  });
});

describe('FranchiseService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    memFindManyImpl = async () => [
      makeRow({ type: 'franchisee', content: JSON.stringify({ name: 'A', status: 'active', franchiseType: 'single_unit', financialStatus: 'good_standing' }) }),
      makeRow({ type: 'franchise_royalty', content: JSON.stringify({ franchiseeId: 'f-1', period: '2024-Q1', grossSales: 100000, royaltyRate: 6, royaltyAmount: 6000, advertisingFundAmount: 0, additionalFees: 0, totalAmount: 6000, dueDate: null, paidDate: null, status: 'paid', notes: '' }) }),
    ];
    const m = await FranchiseService.getFranchiseMetrics('org-1');
    assert.equal(m.activeFranchisees, 1);
    assert.equal(m.totalRoyalties, 6000);
  });

  it('returns stats with counts', async () => {
    memCountImpl = async () => 5;
    memFindManyImpl = async () => [
      makeRow({ type: 'franchisee', content: JSON.stringify({ name: 'A', status: 'active', franchiseType: 'single_unit', financialStatus: 'good_standing' }) }),
    ];
    const s = await FranchiseService.getStats('org-1');
    assert.ok(s.franchiseeCount >= 0);
    assert.ok(typeof s.activeFranchiseeCount === 'number');
    assert.ok(typeof s.complianceRate === 'number');
  });
});
