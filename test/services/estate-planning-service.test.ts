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
    type: 'estate_trust',
    content: JSON.stringify({
      name: 'Family Trust',
      type: 'revocable',
      description: 'Family trust',
      status: 'draft',
      settlor: 'John Doe',
      trustee: 'Jane Doe',
      beneficiaryIds: ['b1', 'b2'],
      assets: 'Real estate, stocks',
      value: 1000000,
      createdDate: '2028-01-01',
      terminatedDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['estate_trust', 'revocable', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeWillRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-w1',
    type: 'estate_will',
    content: JSON.stringify({
      title: 'Last Will and Testament',
      type: 'simple',
      description: 'Simple will',
      status: 'draft',
      testator: 'John Doe',
      executorIds: ['e1'],
      beneficiaryIds: ['b1', 'b2'],
      witnesses: ['w1', 'w2'],
      notarized: true,
      executedDate: null,
      probateDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['estate_will', 'simple', 'draft']),
    ...overrides,
  });
}

function makeBeneficiaryRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-b1',
    type: 'estate_beneficiary',
    content: JSON.stringify({
      name: 'Alice Doe',
      type: 'primary',
      description: 'Primary beneficiary',
      status: 'active',
      relationship: 'Daughter',
      dateOfBirth: '1990-05-15',
      contactInfo: 'alice@example.com',
      sharePercentage: 50,
      notes: '',
    }),
    tags: JSON.stringify(['estate_beneficiary', 'primary', 'active']),
    ...overrides,
  });
}

function makeExecutorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'estate_executor',
    content: JSON.stringify({
      name: 'Bob Smith',
      type: 'primary',
      description: 'Primary executor',
      status: 'appointed',
      relationship: 'Friend',
      contactInfo: 'bob@example.com',
      compensation: '$5,000',
      appointmentDate: '2028-01-01',
      notes: '',
    }),
    tags: JSON.stringify(['estate_executor', 'primary', 'appointed']),
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

const { EstatePlanningService } = await import('@/lib/services/estate-planning-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Trusts
// ─────────────────────────────────────────────────────────────────────────────

describe('EstatePlanningService — Trusts', () => {
  beforeEach(() => resetMock());

  it('creates a trust with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const t = await EstatePlanningService.createTrust('org-1', 'ws-1', {
      name: 'Simple Trust', type: 'revocable',
    }, 'user-1');
    assert.equal(t.name, 'Simple Trust');
    assert.equal(t.status, 'draft');
    assert.equal(t.value, 0);
    assert.equal(t.beneficiaryIds.length, 0);
  });

  it('creates a trust with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const t = await EstatePlanningService.createTrust('org-1', 'ws-1', {
      name: 'Living Trust', type: 'living', description: 'Living trust',
      status: 'active', settlor: 'John', trustee: 'Jane',
      beneficiaryIds: ['b1', 'b2'], assets: 'Real estate', value: 500000,
      createdDate: '2028-01-01', terminatedDate: '2028-12-31',
      notes: 'High priority',
    }, 'user-1');
    assert.equal(t.name, 'Living Trust');
    assert.equal(t.type, 'living');
    assert.equal(t.settlor, 'John');
    assert.equal(t.value, 500000);
    assert.equal(t.status, 'active');
  });

  it('gets a trust by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const t = await EstatePlanningService.getTrust('mem-1');
    assert.ok(t);
    assert.equal(t!.id, 'mem-1');
    assert.equal(t!.name, 'Family Trust');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'estate_will' });
    const t = await EstatePlanningService.getTrust('mem-1');
    assert.equal(t, null);
  });

  it('returns null when trust not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await EstatePlanningService.getTrust('nope');
    assert.equal(t, null);
  });

  it('lists trusts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_trust') return [makeRow()];
      return [];
    };
    const list = await EstatePlanningService.listTrusts('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Family Trust');
  });

  it('updates a trust', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.updateTrust('mem-1', { status: 'active' });
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deletes a trust', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EstatePlanningService.deleteTrust('mem-1');
    assert.equal(ok, true);
  });

  it('activateTrust sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.activateTrust('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('amendTrust sets status to amended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.amendTrust('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'amended');
  });

  it('suspendTrust sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.suspendTrust('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'suspended');
  });

  it('terminateTrust sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.terminateTrust('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'terminated');
  });

  it('fundTrust sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const t = await EstatePlanningService.fundTrust('mem-1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Wills
// ─────────────────────────────────────────────────────────────────────────────

describe('EstatePlanningService — Wills', () => {
  beforeEach(() => resetMock());

  it('creates a will with defaults', async () => {
    memCreateImpl = async (args) => makeWillRow({ content: args.data.content as string });
    const w = await EstatePlanningService.createWill('org-1', 'ws-1', {
      title: 'My Will', type: 'simple',
    }, 'user-1');
    assert.equal(w.title, 'My Will');
    assert.equal(w.status, 'draft');
    assert.equal(w.notarized, false);
    assert.equal(w.witnesses.length, 0);
  });

  it('creates a will with full input', async () => {
    memCreateImpl = async (args) => makeWillRow({ content: args.data.content as string });
    const w = await EstatePlanningService.createWill('org-1', 'ws-1', {
      title: 'Complex Will', type: 'complex', description: 'Complex will',
      status: 'executed', testator: 'John', executorIds: ['e1', 'e2'],
      beneficiaryIds: ['b1'], witnesses: ['w1', 'w2'],
      notarized: true, executedDate: '2028-01-01', probateDate: '2028-06-01',
      notes: 'Priority',
    }, 'user-1');
    assert.equal(w.title, 'Complex Will');
    assert.equal(w.type, 'complex');
    assert.equal(w.testator, 'John');
    assert.equal(w.notarized, true);
    assert.equal(w.status, 'executed');
  });

  it('gets a will by id', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    const w = await EstatePlanningService.getWill('mem-w1');
    assert.ok(w);
    assert.equal(w!.title, 'Last Will and Testament');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeWillRow({ type: 'estate_trust' });
    const w = await EstatePlanningService.getWill('mem-w1');
    assert.equal(w, null);
  });

  it('lists wills by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_will') return [makeWillRow()];
      return [];
    };
    const list = await EstatePlanningService.listWills('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a will', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.updateWill('mem-w1', { status: 'executed' });
    assert.ok(w);
    assert.equal(w!.status, 'executed');
  });

  it('deletes a will', async () => {
    memDeleteImpl = async () => ({ id: 'mem-w1' });
    const ok = await EstatePlanningService.deleteWill('mem-w1');
    assert.equal(ok, true);
  });

  it('executeWill sets status to executed', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.executeWill('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'executed');
  });

  it('amendWill sets status to amended', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.amendWill('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'amended');
  });

  it('revokeWill sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.revokeWill('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'revoked');
  });

  it('probateWill sets status to probated', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.probateWill('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'probated');
  });

  it('contestWill sets status to contested', async () => {
    memFindUniqueImpl = async () => makeWillRow();
    memUpdateImpl = async (args) => makeWillRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EstatePlanningService.contestWill('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'contested');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Beneficiaries
// ─────────────────────────────────────────────────────────────────────────────

describe('EstatePlanningService — Beneficiaries', () => {
  beforeEach(() => resetMock());

  it('creates a beneficiary with defaults', async () => {
    memCreateImpl = async (args) => makeBeneficiaryRow({ content: args.data.content as string });
    const b = await EstatePlanningService.createBeneficiary('org-1', 'ws-1', {
      name: 'Jane Doe', type: 'primary',
    }, 'user-1');
    assert.equal(b.name, 'Jane Doe');
    assert.equal(b.status, 'active');
    assert.equal(b.sharePercentage, 0);
  });

  it('creates a beneficiary with full input', async () => {
    memCreateImpl = async (args) => makeBeneficiaryRow({ content: args.data.content as string });
    const b = await EstatePlanningService.createBeneficiary('org-1', 'ws-1', {
      name: 'Charlie Doe', type: 'contingent', description: 'Contingent beneficiary',
      status: 'minor', relationship: 'Son', dateOfBirth: '2010-03-20',
      contactInfo: 'charlie@example.com', sharePercentage: 25, notes: 'Minor',
    }, 'user-1');
    assert.equal(b.name, 'Charlie Doe');
    assert.equal(b.type, 'contingent');
    assert.equal(b.relationship, 'Son');
    assert.equal(b.sharePercentage, 25);
    assert.equal(b.status, 'minor');
  });

  it('gets a beneficiary by id', async () => {
    memFindUniqueImpl = async () => makeBeneficiaryRow();
    const b = await EstatePlanningService.getBeneficiary('mem-b1');
    assert.ok(b);
    assert.equal(b!.name, 'Alice Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeBeneficiaryRow({ type: 'estate_trust' });
    const b = await EstatePlanningService.getBeneficiary('mem-b1');
    assert.equal(b, null);
  });

  it('lists beneficiaries by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_beneficiary') return [makeBeneficiaryRow()];
      return [];
    };
    const list = await EstatePlanningService.listBeneficiaries('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a beneficiary', async () => {
    memFindUniqueImpl = async () => makeBeneficiaryRow();
    memUpdateImpl = async (args) => makeBeneficiaryRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await EstatePlanningService.updateBeneficiary('mem-b1', { sharePercentage: 75 });
    assert.ok(b);
    assert.equal(b!.sharePercentage, 75);
  });

  it('deletes a beneficiary', async () => {
    memDeleteImpl = async () => ({ id: 'mem-b1' });
    const ok = await EstatePlanningService.deleteBeneficiary('mem-b1');
    assert.equal(ok, true);
  });

  it('removeBeneficiary sets status to removed', async () => {
    memFindUniqueImpl = async () => makeBeneficiaryRow();
    memUpdateImpl = async (args) => makeBeneficiaryRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await EstatePlanningService.removeBeneficiary('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'removed');
  });

  it('disclaimBeneficiary sets status to disclaimed', async () => {
    memFindUniqueImpl = async () => makeBeneficiaryRow();
    memUpdateImpl = async (args) => makeBeneficiaryRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await EstatePlanningService.disclaimBeneficiary('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'disclaimed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Executors
// ─────────────────────────────────────────────────────────────────────────────

describe('EstatePlanningService — Executors', () => {
  beforeEach(() => resetMock());

  it('creates an executor with defaults', async () => {
    memCreateImpl = async (args) => makeExecutorRow({ content: args.data.content as string });
    const e = await EstatePlanningService.createExecutor('org-1', 'ws-1', {
      name: 'Jane Smith', type: 'primary',
    }, 'user-1');
    assert.equal(e.name, 'Jane Smith');
    assert.equal(e.status, 'appointed');
    assert.equal(e.compensation, '');
  });

  it('creates an executor with full input', async () => {
    memCreateImpl = async (args) => makeExecutorRow({ content: args.data.content as string });
    const e = await EstatePlanningService.createExecutor('org-1', 'ws-1', {
      name: 'Carol Jones', type: 'professional', description: 'Professional executor',
      status: 'active', relationship: 'Attorney', contactInfo: 'carol@example.com',
      compensation: '$10,000', appointmentDate: '2028-01-01', notes: 'Experienced',
    }, 'user-1');
    assert.equal(e.name, 'Carol Jones');
    assert.equal(e.type, 'professional');
    assert.equal(e.relationship, 'Attorney');
    assert.equal(e.compensation, '$10,000');
    assert.equal(e.status, 'active');
  });

  it('gets an executor by id', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    const e = await EstatePlanningService.getExecutor('mem-e1');
    assert.ok(e);
    assert.equal(e!.name, 'Bob Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeExecutorRow({ type: 'estate_trust' });
    const e = await EstatePlanningService.getExecutor('mem-e1');
    assert.equal(e, null);
  });

  it('lists executors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_executor') return [makeExecutorRow()];
      return [];
    };
    const list = await EstatePlanningService.listExecutors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an executor', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    memUpdateImpl = async (args) => makeExecutorRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EstatePlanningService.updateExecutor('mem-e1', { compensation: '$7,500' });
    assert.ok(e);
    assert.equal(e!.compensation, '$7,500');
  });

  it('deletes an executor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await EstatePlanningService.deleteExecutor('mem-e1');
    assert.equal(ok, true);
  });

  it('activateExecutor sets status to active', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    memUpdateImpl = async (args) => makeExecutorRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EstatePlanningService.activateExecutor('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'active');
  });

  it('declineExecutor sets status to declined', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    memUpdateImpl = async (args) => makeExecutorRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EstatePlanningService.declineExecutor('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'declined');
  });

  it('removeExecutor sets status to removed', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    memUpdateImpl = async (args) => makeExecutorRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EstatePlanningService.removeExecutor('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'removed');
  });

  it('resignExecutor sets status to resigned', async () => {
    memFindUniqueImpl = async () => makeExecutorRow();
    memUpdateImpl = async (args) => makeExecutorRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EstatePlanningService.resignExecutor('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'resigned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EstatePlanningService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getEstatePlanningMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_trust') return [
        makeRow({ content: JSON.stringify({ name: 'T1', type: 'revocable', status: 'active', value: 500000, settlor: '', trustee: '', beneficiaryIds: [], assets: '', description: '', notes: '', createdDate: null, terminatedDate: null }) }),
        makeRow({ id: 't2', content: JSON.stringify({ name: 'T2', type: 'irrevocable', status: 'draft', value: 250000, settlor: '', trustee: '', beneficiaryIds: [], assets: '', description: '', notes: '', createdDate: null, terminatedDate: null }) }),
      ];
      if (t === 'estate_will') return [
        makeWillRow({ content: JSON.stringify({ title: 'W1', type: 'simple', status: 'executed', testator: '', executorIds: [], beneficiaryIds: [], witnesses: [], notarized: false, description: '', notes: '', executedDate: null, probateDate: null }) }),
      ];
      if (t === 'estate_beneficiary') return [
        makeBeneficiaryRow({ content: JSON.stringify({ name: 'B1', type: 'primary', status: 'active', relationship: '', dateOfBirth: null, contactInfo: '', sharePercentage: 0, description: '', notes: '' }) }),
        makeBeneficiaryRow({ id: 'b2', content: JSON.stringify({ name: 'B2', type: 'contingent', status: 'disclaimed', relationship: '', dateOfBirth: null, contactInfo: '', sharePercentage: 0, description: '', notes: '' }) }),
      ];
      if (t === 'estate_executor') return [
        makeExecutorRow({ content: JSON.stringify({ name: 'E1', type: 'primary', status: 'active', relationship: '', contactInfo: '', compensation: '', appointmentDate: null, description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await EstatePlanningService.getEstatePlanningMetrics('org-1');
    assert.equal(m.activeTrusts, 1);
    assert.equal(m.executedWills, 1);
    assert.equal(m.activeBeneficiaries, 1);
    assert.equal(m.activeExecutors, 1);
    assert.equal(m.totalTrustValue, 750000);
  });

  it('getEstatePlanningStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'estate_trust') return [makeRow()];
      if (t === 'estate_will') return [makeWillRow()];
      if (t === 'estate_beneficiary') return [makeBeneficiaryRow()];
      if (t === 'estate_executor') return [makeExecutorRow()];
      return [];
    };
    const s = await EstatePlanningService.getEstatePlanningStats('org-1');
    assert.equal(s.trustCount, 1);
    assert.equal(s.willCount, 1);
    assert.equal(s.beneficiaryCount, 1);
    assert.equal(s.executorCount, 1);
    assert.equal(s.byTrustType['revocable'], 1);
    assert.equal(s.byWillStatus['draft'], 1);
    assert.equal(s.byBeneficiaryType['primary'], 1);
    assert.equal(s.byExecutorStatus['appointed'], 1);
  });
});
