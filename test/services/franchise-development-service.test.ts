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
    type: 'franchise_unit',
    content: JSON.stringify({
      name: 'Downtown Store',
      type: 'single',
      description: 'Flagship downtown location',
      status: 'prospective',
      franchiseeName: 'John Smith',
      location: '123 Main St',
      territory: 'Downtown',
      openedDate: '2028-01-01',
      closedDate: null,
      initialFee: 50000,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['franchise_unit', 'single', 'prospective']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAgreementRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'franchise_agreement',
    content: JSON.stringify({
      unitId: 'mem-1',
      franchiseeName: 'John Smith',
      type: 'franchise',
      description: 'Standard franchise agreement',
      status: 'draft',
      startDate: '2028-01-01',
      endDate: '2033-01-01',
      territory: 'Downtown',
      initialFee: 50000,
      royaltyRate: 6,
      advertisingFee: 2,
      termYears: 5,
      renewalTerms: '5 year renewal',
      notes: '',
    }),
    tags: JSON.stringify(['franchise_agreement', 'franchise', 'draft']),
    ...overrides,
  });
}

function makeRoyaltyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'franchise_royalty',
    content: JSON.stringify({
      unitId: 'mem-1',
      agreementId: 'mem-a1',
      type: 'percentage',
      amount: 5000,
      currency: 'USD',
      description: 'Monthly royalty',
      status: 'accrued',
      period: '2028-01',
      dueDate: '2028-02-01',
      paidDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['franchise_royalty', 'percentage', 'accrued']),
    ...overrides,
  });
}

function makeTrainingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'franchise_training',
    content: JSON.stringify({
      unitId: 'mem-1',
      franchiseeName: 'John Smith',
      type: 'initial',
      description: 'New franchisee onboarding',
      status: 'scheduled',
      scheduledDate: '2028-03-01',
      completedDate: null,
      trainer: 'Jane Doe',
      location: 'HQ',
      attendees: ['John Smith'],
      certifications: ['Operations'],
      notes: '',
    }),
    tags: JSON.stringify(['franchise_training', 'initial', 'scheduled']),
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

const { FranchiseDevelopmentService } = await import('@/lib/services/franchise-development-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Units
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseDevelopmentService — Units', () => {
  beforeEach(() => resetMock());

  it('creates a unit with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const u = await FranchiseDevelopmentService.createUnit('org-1', 'ws-1', {
      name: 'Uptown Store', type: 'single',
    }, 'user-1');
    assert.strictEqual(u.name, 'Uptown Store');
    assert.strictEqual(u.status, 'prospective');
    assert.strictEqual(u.initialFee, 0);
  });

  it('creates a unit with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const u = await FranchiseDevelopmentService.createUnit('org-1', 'ws-1', {
      name: 'Midtown', type: 'multi_unit', description: 'Multi-unit deal',
      status: 'approved', franchiseeName: 'Alice', location: '456 Oak Ave',
      territory: 'Midtown', openedDate: '2028-01-01', initialFee: 75000, notes: 'Priority',
    }, 'user-1');
    assert.strictEqual(u.name, 'Midtown');
    assert.strictEqual(u.type, 'multi_unit');
    assert.strictEqual(u.franchiseeName, 'Alice');
    assert.strictEqual(u.initialFee, 75000);
    assert.strictEqual(u.status, 'approved');
  });

  it('gets a unit by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const u = await FranchiseDevelopmentService.getUnit('mem-1');
    assert.ok(u);
    assert.strictEqual(u!.id, 'mem-1');
    assert.strictEqual(u!.name, 'Downtown Store');
  });

  it('returns null when unit not found', async () => {
    memFindUniqueImpl = async () => null;
    const u = await FranchiseDevelopmentService.getUnit('nope');
    assert.strictEqual(u, null);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'franchise_agreement' });
    const u = await FranchiseDevelopmentService.getUnit('mem-1');
    assert.strictEqual(u, null);
  });

  it('lists units by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_unit') return [makeRow()];
      return [];
    };
    const list = await FranchiseDevelopmentService.listUnits('org-1');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'Downtown Store');
  });

  it('updates a unit', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await FranchiseDevelopmentService.updateUnit('mem-1', { status: 'active' });
    assert.ok(u);
    assert.strictEqual(u!.status, 'active');
  });

  it('deletes a unit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await FranchiseDevelopmentService.deleteUnit('mem-1');
    assert.strictEqual(ok, true);
  });

  it('approveUnit sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await FranchiseDevelopmentService.approveUnit('mem-1', 'user-1');
    assert.ok(u);
    assert.strictEqual(u!.status, 'approved');
  });

  it('activateUnit sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await FranchiseDevelopmentService.activateUnit('mem-1', 'user-1');
    assert.ok(u);
    assert.strictEqual(u!.status, 'active');
  });

  it('suspendUnit sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await FranchiseDevelopmentService.suspendUnit('mem-1', 'user-1');
    assert.ok(u);
    assert.strictEqual(u!.status, 'suspended');
  });

  it('terminateUnit sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await FranchiseDevelopmentService.terminateUnit('mem-1', 'user-1');
    assert.ok(u);
    assert.strictEqual(u!.status, 'terminated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Agreements
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseDevelopmentService — Agreements', () => {
  beforeEach(() => resetMock());

  it('creates an agreement with defaults', async () => {
    memCreateImpl = async (args) => makeAgreementRow({ content: args.data.content as string });
    const a = await FranchiseDevelopmentService.createAgreement('org-1', 'ws-1', {
      unitId: 'mem-1', franchiseeName: 'Bob', type: 'franchise',
    }, 'user-1');
    assert.strictEqual(a.franchiseeName, 'Bob');
    assert.strictEqual(a.status, 'draft');
    assert.strictEqual(a.royaltyRate, 0);
  });

  it('creates an agreement with full input', async () => {
    memCreateImpl = async (args) => makeAgreementRow({ content: args.data.content as string });
    const a = await FranchiseDevelopmentService.createAgreement('org-1', 'ws-1', {
      unitId: 'mem-1', franchiseeName: 'Carol', type: 'master_franchise',
      description: 'Master agreement', status: 'pending', startDate: '2028-01-01',
      endDate: '2038-01-01', territory: 'West Coast', initialFee: 100000,
      royaltyRate: 5, advertisingFee: 1.5, termYears: 10, renewalTerms: '10 year',
      notes: 'Master deal',
    }, 'user-1');
    assert.strictEqual(a.franchiseeName, 'Carol');
    assert.strictEqual(a.type, 'master_franchise');
    assert.strictEqual(a.royaltyRate, 5);
    assert.strictEqual(a.termYears, 10);
  });

  it('gets an agreement by id', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    const a = await FranchiseDevelopmentService.getAgreement('mem-a1');
    assert.ok(a);
    assert.strictEqual(a!.franchiseeName, 'John Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAgreementRow({ type: 'franchise_unit' });
    const a = await FranchiseDevelopmentService.getAgreement('mem-a1');
    assert.strictEqual(a, null);
  });

  it('lists agreements by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_agreement') return [makeAgreementRow()];
      return [];
    };
    const list = await FranchiseDevelopmentService.listAgreements('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates an agreement', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.updateAgreement('mem-a1', { status: 'executed' });
    assert.ok(a);
    assert.strictEqual(a!.status, 'executed');
  });

  it('deletes an agreement', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await FranchiseDevelopmentService.deleteAgreement('mem-a1');
    assert.strictEqual(ok, true);
  });

  it('executeAgreement sets status to executed', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.executeAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'executed');
  });

  it('activateAgreement sets status to active', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.activateAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'active');
  });

  it('expireAgreement sets status to expired', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.expireAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'expired');
  });

  it('terminateAgreement sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.terminateAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'terminated');
  });

  it('renewAgreement sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.renewAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'renewed');
  });

  it('amendAgreement sets status to amended', async () => {
    memFindUniqueImpl = async () => makeAgreementRow();
    memUpdateImpl = async (args) => makeAgreementRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FranchiseDevelopmentService.amendAgreement('mem-a1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'amended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Royalties
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseDevelopmentService — Royalties', () => {
  beforeEach(() => resetMock());

  it('creates a royalty with defaults', async () => {
    memCreateImpl = async (args) => makeRoyaltyRow({ content: args.data.content as string });
    const r = await FranchiseDevelopmentService.createRoyalty('org-1', 'ws-1', {
      unitId: 'mem-1', agreementId: 'mem-a1', type: 'percentage', amount: 3000,
    }, 'user-1');
    assert.strictEqual(r.amount, 3000);
    assert.strictEqual(r.status, 'accrued');
    assert.strictEqual(r.currency, 'USD');
  });

  it('creates a royalty with full input', async () => {
    memCreateImpl = async (args) => makeRoyaltyRow({ content: args.data.content as string });
    const r = await FranchiseDevelopmentService.createRoyalty('org-1', 'ws-1', {
      unitId: 'mem-1', agreementId: 'mem-a1', type: 'fixed', amount: 10000,
      currency: 'EUR', description: 'Fixed monthly', status: 'billed',
      period: '2028-02', dueDate: '2028-03-01', paidDate: '2028-02-15', notes: 'On time',
    }, 'user-1');
    assert.strictEqual(r.type, 'fixed');
    assert.strictEqual(r.currency, 'EUR');
    assert.strictEqual(r.period, '2028-02');
  });

  it('gets a royalty by id', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    const r = await FranchiseDevelopmentService.getRoyalty('mem-r1');
    assert.ok(r);
    assert.strictEqual(r!.amount, 5000);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow({ type: 'franchise_unit' });
    const r = await FranchiseDevelopmentService.getRoyalty('mem-r1');
    assert.strictEqual(r, null);
  });

  it('lists royalties by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_royalty') return [makeRoyaltyRow()];
      return [];
    };
    const list = await FranchiseDevelopmentService.listRoyalties('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a royalty', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.updateRoyalty('mem-r1', { amount: 7000 });
    assert.ok(r);
    assert.strictEqual(r!.amount, 7000);
  });

  it('deletes a royalty', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await FranchiseDevelopmentService.deleteRoyalty('mem-r1');
    assert.strictEqual(ok, true);
  });

  it('billRoyalty sets status to billed', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.billRoyalty('mem-r1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'billed');
  });

  it('payRoyalty sets status to paid', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.payRoyalty('mem-r1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'paid');
    assert.ok(r!.paidDate);
  });

  it('overdueRoyalty sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.overdueRoyalty('mem-r1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'overdue');
  });

  it('waiveRoyalty sets status to waived', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.waiveRoyalty('mem-r1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'waived');
  });

  it('disputeRoyalty sets status to disputed', async () => {
    memFindUniqueImpl = async () => makeRoyaltyRow();
    memUpdateImpl = async (args) => makeRoyaltyRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await FranchiseDevelopmentService.disputeRoyalty('mem-r1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'disputed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Training
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseDevelopmentService — Training', () => {
  beforeEach(() => resetMock());

  it('creates training with defaults', async () => {
    memCreateImpl = async (args) => makeTrainingRow({ content: args.data.content as string });
    const t = await FranchiseDevelopmentService.createTraining('org-1', 'ws-1', {
      unitId: 'mem-1', franchiseeName: 'Dave', type: 'initial',
    }, 'user-1');
    assert.strictEqual(t.franchiseeName, 'Dave');
    assert.strictEqual(t.status, 'scheduled');
    assert.strictEqual(t.attendees.length, 0);
  });

  it('creates training with full input', async () => {
    memCreateImpl = async (args) => makeTrainingRow({ content: args.data.content as string });
    const t = await FranchiseDevelopmentService.createTraining('org-1', 'ws-1', {
      unitId: 'mem-1', franchiseeName: 'Eve', type: 'certification',
      description: 'Food safety cert', status: 'in_progress', scheduledDate: '2028-04-01',
      trainer: 'Bob', location: 'Training Center', attendees: ['Eve', 'Frank'],
      certifications: ['Food Safety'], notes: 'Mandatory',
    }, 'user-1');
    assert.strictEqual(t.type, 'certification');
    assert.strictEqual(t.trainer, 'Bob');
    assert.strictEqual(t.attendees.length, 2);
  });

  it('gets training by id', async () => {
    memFindUniqueImpl = async () => makeTrainingRow();
    const t = await FranchiseDevelopmentService.getTraining('mem-t1');
    assert.ok(t);
    assert.strictEqual(t!.trainer, 'Jane Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTrainingRow({ type: 'franchise_unit' });
    const t = await FranchiseDevelopmentService.getTraining('mem-t1');
    assert.strictEqual(t, null);
  });

  it('lists training by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_training') return [makeTrainingRow()];
      return [];
    };
    const list = await FranchiseDevelopmentService.listTraining('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates training', async () => {
    memFindUniqueImpl = async () => makeTrainingRow();
    memUpdateImpl = async (args) => makeTrainingRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await FranchiseDevelopmentService.updateTraining('mem-t1', { status: 'in_progress' });
    assert.ok(t);
    assert.strictEqual(t!.status, 'in_progress');
  });

  it('deletes training', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await FranchiseDevelopmentService.deleteTraining('mem-t1');
    assert.strictEqual(ok, true);
  });

  it('startTraining sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeTrainingRow();
    memUpdateImpl = async (args) => makeTrainingRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await FranchiseDevelopmentService.startTraining('mem-t1', 'user-1');
    assert.ok(t);
    assert.strictEqual(t!.status, 'in_progress');
  });

  it('completeTraining sets status to completed', async () => {
    memFindUniqueImpl = async () => makeTrainingRow();
    memUpdateImpl = async (args) => makeTrainingRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await FranchiseDevelopmentService.completeTraining('mem-t1', 'user-1');
    assert.ok(t);
    assert.strictEqual(t!.status, 'completed');
    assert.ok(t!.completedDate);
  });

  it('overdueTraining sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeTrainingRow();
    memUpdateImpl = async (args) => makeTrainingRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await FranchiseDevelopmentService.overdueTraining('mem-t1', 'user-1');
    assert.ok(t);
    assert.strictEqual(t!.status, 'overdue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('FranchiseDevelopmentService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getFranchiseDevelopmentMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_unit') return [
        makeRow({ content: JSON.stringify({ name: 'U1', type: 'single', status: 'active', description: '', franchiseeName: '', location: '', territory: '', openedDate: null, closedDate: null, initialFee: 0, notes: '' }) }),
        makeRow({ id: 'u2', content: JSON.stringify({ name: 'U2', type: 'single', status: 'prospective', description: '', franchiseeName: '', location: '', territory: '', openedDate: null, closedDate: null, initialFee: 0, notes: '' }) }),
      ];
      if (t === 'franchise_agreement') return [
        makeAgreementRow({ content: JSON.stringify({ unitId: 'u1', franchiseeName: '', type: 'franchise', description: '', status: 'executed', startDate: null, endDate: null, territory: '', initialFee: 0, royaltyRate: 0, advertisingFee: 0, termYears: 0, renewalTerms: '', notes: '' }) }),
        makeAgreementRow({ id: 'a2', content: JSON.stringify({ unitId: 'u2', franchiseeName: '', type: 'franchise', description: '', status: 'draft', startDate: null, endDate: null, territory: '', initialFee: 0, royaltyRate: 0, advertisingFee: 0, termYears: 0, renewalTerms: '', notes: '' }) }),
      ];
      if (t === 'franchise_royalty') return [
        makeRoyaltyRow({ content: JSON.stringify({ unitId: 'u1', agreementId: 'a1', type: 'percentage', amount: 0, currency: 'USD', description: '', status: 'accrued', period: '', dueDate: null, paidDate: null, notes: '' }) }),
        makeRoyaltyRow({ id: 'r2', content: JSON.stringify({ unitId: 'u1', agreementId: 'a1', type: 'percentage', amount: 0, currency: 'USD', description: '', status: 'overdue', period: '', dueDate: null, paidDate: null, notes: '' }) }),
      ];
      if (t === 'franchise_training') return [
        makeTrainingRow({ content: JSON.stringify({ unitId: 'u1', franchiseeName: '', type: 'initial', description: '', status: 'scheduled', scheduledDate: null, completedDate: null, trainer: '', location: '', attendees: [], certifications: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await FranchiseDevelopmentService.getFranchiseDevelopmentMetrics('org-1');
    assert.strictEqual(m.activeUnits, 1);
    assert.strictEqual(m.executedAgreements, 1);
    assert.strictEqual(m.pendingRoyalties, 1);
    assert.strictEqual(m.overdueRoyalties, 1);
    assert.strictEqual(m.scheduledTraining, 1);
  });

  it('getFranchiseDevelopmentStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'franchise_unit') return [makeRow()];
      if (t === 'franchise_agreement') return [makeAgreementRow()];
      if (t === 'franchise_royalty') return [makeRoyaltyRow()];
      if (t === 'franchise_training') return [makeTrainingRow()];
      return [];
    };
    const s = await FranchiseDevelopmentService.getFranchiseDevelopmentStats('org-1');
    assert.strictEqual(s.unitCount, 1);
    assert.strictEqual(s.agreementCount, 1);
    assert.strictEqual(s.royaltyCount, 1);
    assert.strictEqual(s.trainingCount, 1);
    assert.strictEqual(s.byUnitType['single'], 1);
    assert.strictEqual(s.byAgreementStatus['draft'], 1);
    assert.strictEqual(s.byRoyaltyStatus['accrued'], 1);
    assert.strictEqual(s.byTrainingStatus['scheduled'], 1);
  });
});
