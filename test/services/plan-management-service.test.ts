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
    type: 'benefit_plan',
    content: JSON.stringify({
      name: 'Health Plan A',
      type: 'health',
      description: 'Comprehensive health plan',
      status: 'draft',
      providerId: 'prov-1',
      eligibility: 'Full-time employees',
      effectiveDate: '2028-01-01',
      endDate: '2028-12-31',
      contribution: '50%',
      coverage: 'Family',
      documents: ['plan-doc.pdf'],
      notes: '',
    }),
    source: 'user',
    sourceId: 'prov-1',
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['benefit_plan', 'health', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeEnrollmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'plan_enrollment',
    content: JSON.stringify({
      planId: 'mem-1',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      type: 'initial',
      description: 'Initial enrollment',
      status: 'pending',
      enrollmentDate: '2028-01-15',
      effectiveDate: '2028-02-01',
      terminationDate: null,
      dependents: ['Jane Doe'],
      contribution: '50%',
      notes: '',
    }),
    tags: JSON.stringify(['plan_enrollment', 'initial', 'pending']),
    ...overrides,
  });
}

function makeProviderRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'plan_provider',
    content: JSON.stringify({
      name: 'BlueCross',
      type: 'insurance',
      description: 'Insurance provider',
      status: 'active',
      contactName: 'Alice',
      email: 'alice@bc.com',
      phone: '555-0100',
      address: '123 Main St',
      contractTerms: 'Annual',
      contractStart: '2028-01-01',
      contractEnd: '2028-12-31',
      rating: 4.5,
      notes: '',
    }),
    tags: JSON.stringify(['plan_provider', 'insurance', 'active']),
    ...overrides,
  });
}

function makeClaimRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-cl1',
    type: 'plan_claim',
    content: JSON.stringify({
      planId: 'mem-1',
      enrollmentId: 'mem-e1',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      type: 'medical',
      amount: 1500,
      currency: 'USD',
      description: 'Doctor visit',
      status: 'submitted',
      submittedDate: '2028-03-01',
      processedDate: null,
      reference: 'REF-001',
      notes: '',
    }),
    tags: JSON.stringify(['plan_claim', 'medical', 'submitted']),
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

const { PlanManagementService } = await import('@/lib/services/plan-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanManagementService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await PlanManagementService.createPlan('org-1', 'ws-1', {
      name: 'Dental Plan', type: 'dental',
    }, 'user-1');
    assert.equal(p.name, 'Dental Plan');
    assert.equal(p.status, 'draft');
    assert.equal(p.description, '');
    assert.equal(p.providerId, '');
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await PlanManagementService.createPlan('org-1', 'ws-1', {
      name: 'Vision Plan', type: 'vision', description: 'Vision coverage',
      status: 'active', providerId: 'prov-1', eligibility: 'All employees',
      effectiveDate: '2028-01-01', endDate: '2028-12-31', contribution: '75%',
      coverage: 'Individual', documents: ['doc.pdf'], notes: 'Premium plan',
    }, 'user-1');
    assert.equal(p.name, 'Vision Plan');
    assert.equal(p.type, 'vision');
    assert.equal(p.providerId, 'prov-1');
    assert.equal(p.status, 'active');
    assert.equal(p.documents.length, 1);
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await PlanManagementService.getPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Health Plan A');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'plan_enrollment' });
    const p = await PlanManagementService.getPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await PlanManagementService.getPlan('nope');
    assert.equal(p, null);
  });

  it('lists plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'benefit_plan') return [makeRow()];
      return [];
    };
    const list = await PlanManagementService.listPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Health Plan A');
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.updatePlan('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PlanManagementService.deletePlan('mem-1');
    assert.equal(ok, true);
  });

  it('activatePlan sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.activatePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('openEnrollment sets status to open_enrollment', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.openEnrollment('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'open_enrollment');
  });

  it('closeEnrollment sets status to closed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.closeEnrollment('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'closed');
  });

  it('suspendPlan sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.suspendPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'suspended');
  });

  it('terminatePlan sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.terminatePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'terminated');
  });

  it('renewPlan sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await PlanManagementService.renewPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'renewed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Enrollments
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanManagementService — Enrollments', () => {
  beforeEach(() => resetMock());

  it('creates an enrollment with defaults', async () => {
    memCreateImpl = async (args) => makeEnrollmentRow({ content: args.data.content as string });
    const e = await PlanManagementService.createEnrollment('org-1', 'ws-1', {
      planId: 'mem-1', employeeId: 'emp-1', employeeName: 'John', type: 'initial',
    }, 'user-1');
    assert.equal(e.employeeName, 'John');
    assert.equal(e.status, 'pending');
    assert.equal(e.dependents.length, 0);
  });

  it('creates an enrollment with full input', async () => {
    memCreateImpl = async (args) => makeEnrollmentRow({ content: args.data.content as string });
    const e = await PlanManagementService.createEnrollment('org-1', 'ws-1', {
      planId: 'mem-1', employeeId: 'emp-1', employeeName: 'Jane', type: 'open_enrollment',
      description: 'Open enrollment', status: 'active', enrollmentDate: '2028-01-01',
      effectiveDate: '2028-02-01', terminationDate: '2028-12-31',
      dependents: ['Spouse'], contribution: '60%', notes: 'Family plan',
    }, 'user-1');
    assert.equal(e.employeeName, 'Jane');
    assert.equal(e.type, 'open_enrollment');
    assert.equal(e.status, 'active');
    assert.equal(e.dependents.length, 1);
  });

  it('gets an enrollment by id', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    const e = await PlanManagementService.getEnrollment('mem-e1');
    assert.ok(e);
    assert.equal(e!.employeeName, 'John Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow({ type: 'benefit_plan' });
    const e = await PlanManagementService.getEnrollment('mem-e1');
    assert.equal(e, null);
  });

  it('lists enrollments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'plan_enrollment') return [makeEnrollmentRow()];
      return [];
    };
    const list = await PlanManagementService.listEnrollments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an enrollment', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await PlanManagementService.updateEnrollment('mem-e1', { status: 'active' });
    assert.ok(e);
    assert.equal(e!.status, 'active');
  });

  it('deletes an enrollment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await PlanManagementService.deleteEnrollment('mem-e1');
    assert.equal(ok, true);
  });

  it('activateEnrollment sets status to active', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await PlanManagementService.activateEnrollment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'active');
  });

  it('terminateEnrollment sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await PlanManagementService.terminateEnrollment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'terminated');
  });

  it('waiveEnrollment sets status to waived', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await PlanManagementService.waiveEnrollment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'waived');
  });

  it('suspendEnrollment sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeEnrollmentRow();
    memUpdateImpl = async (args) => makeEnrollmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await PlanManagementService.suspendEnrollment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'suspended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Providers
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanManagementService — Providers', () => {
  beforeEach(() => resetMock());

  it('creates a provider with defaults', async () => {
    memCreateImpl = async (args) => makeProviderRow({ content: args.data.content as string });
    const p = await PlanManagementService.createProvider('org-1', 'ws-1', {
      name: 'Aetna', type: 'insurance',
    }, 'user-1');
    assert.equal(p.name, 'Aetna');
    assert.equal(p.status, 'active');
    assert.equal(p.rating, 0);
  });

  it('creates a provider with full input', async () => {
    memCreateImpl = async (args) => makeProviderRow({ content: args.data.content as string });
    const p = await PlanManagementService.createProvider('org-1', 'ws-1', {
      name: 'Cigna', type: 'insurance', description: 'Health insurance',
      status: 'preferred', contactName: 'Bob', email: 'bob@cigna.com',
      phone: '555-0200', address: '456 Oak Ave', contractTerms: '2-year',
      contractStart: '2028-01-01', contractEnd: '2029-12-31', rating: 5, notes: 'Top provider',
    }, 'user-1');
    assert.equal(p.name, 'Cigna');
    assert.equal(p.status, 'preferred');
    assert.equal(p.rating, 5);
    assert.equal(p.contactName, 'Bob');
  });

  it('gets a provider by id', async () => {
    memFindUniqueImpl = async () => makeProviderRow();
    const p = await PlanManagementService.getProvider('mem-p1');
    assert.ok(p);
    assert.equal(p!.name, 'BlueCross');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeProviderRow({ type: 'benefit_plan' });
    const p = await PlanManagementService.getProvider('mem-p1');
    assert.equal(p, null);
  });

  it('lists providers by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'plan_provider') return [makeProviderRow()];
      return [];
    };
    const list = await PlanManagementService.listProviders('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a provider', async () => {
    memFindUniqueImpl = async () => makeProviderRow();
    memUpdateImpl = async (args) => makeProviderRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PlanManagementService.updateProvider('mem-p1', { rating: 3 });
    assert.ok(p);
    assert.equal(p!.rating, 3);
  });

  it('deletes a provider', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await PlanManagementService.deleteProvider('mem-p1');
    assert.equal(ok, true);
  });

  it('preferProvider sets status to preferred', async () => {
    memFindUniqueImpl = async () => makeProviderRow();
    memUpdateImpl = async (args) => makeProviderRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PlanManagementService.preferProvider('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'preferred');
  });

  it('reviewProvider sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeProviderRow();
    memUpdateImpl = async (args) => makeProviderRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PlanManagementService.reviewProvider('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'under_review');
  });

  it('terminateProvider sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeProviderRow();
    memUpdateImpl = async (args) => makeProviderRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PlanManagementService.terminateProvider('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'terminated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Claims
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanManagementService — Claims', () => {
  beforeEach(() => resetMock());

  it('creates a claim with defaults', async () => {
    memCreateImpl = async (args) => makeClaimRow({ content: args.data.content as string });
    const c = await PlanManagementService.createClaim('org-1', 'ws-1', {
      planId: 'mem-1', enrollmentId: 'mem-e1', employeeId: 'emp-1',
      employeeName: 'John', type: 'medical', amount: 500,
    }, 'user-1');
    assert.equal(c.employeeName, 'John');
    assert.equal(c.status, 'submitted');
    assert.equal(c.currency, 'USD');
  });

  it('creates a claim with full input', async () => {
    memCreateImpl = async (args) => makeClaimRow({ content: args.data.content as string });
    const c = await PlanManagementService.createClaim('org-1', 'ws-1', {
      planId: 'mem-1', enrollmentId: 'mem-e1', employeeId: 'emp-1',
      employeeName: 'Jane', type: 'dental', amount: 250, currency: 'EUR',
      description: 'Dental cleaning', status: 'in_review', submittedDate: '2028-03-01',
      processedDate: '2028-03-15', reference: 'REF-002', notes: 'Routine',
    }, 'user-1');
    assert.equal(c.employeeName, 'Jane');
    assert.equal(c.type, 'dental');
    assert.equal(c.amount, 250);
    assert.equal(c.currency, 'EUR');
    assert.equal(c.status, 'in_review');
  });

  it('gets a claim by id', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    const c = await PlanManagementService.getClaim('mem-cl1');
    assert.ok(c);
    assert.equal(c!.type, 'medical');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeClaimRow({ type: 'benefit_plan' });
    const c = await PlanManagementService.getClaim('mem-cl1');
    assert.equal(c, null);
  });

  it('lists claims by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'plan_claim') return [makeClaimRow()];
      return [];
    };
    const list = await PlanManagementService.listClaims('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a claim', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.updateClaim('mem-cl1', { amount: 2000 });
    assert.ok(c);
    assert.equal(c!.amount, 2000);
  });

  it('deletes a claim', async () => {
    memDeleteImpl = async () => ({ id: 'mem-cl1' });
    const ok = await PlanManagementService.deleteClaim('mem-cl1');
    assert.equal(ok, true);
  });

  it('reviewClaim sets status to in_review', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.reviewClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'in_review');
  });

  it('approveClaim sets status to approved', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.approveClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'approved');
  });

  it('denyClaim sets status to denied', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.denyClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'denied');
  });

  it('payClaim sets status to paid', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.payClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'paid');
  });

  it('appealClaim sets status to appealed', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.appealClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'appealed');
  });

  it('partiallyPayClaim sets status to partially_paid', async () => {
    memFindUniqueImpl = async () => makeClaimRow();
    memUpdateImpl = async (args) => makeClaimRow({ id: 'mem-cl1', content: args.data.content as string });
    const c = await PlanManagementService.partiallyPayClaim('mem-cl1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'partially_paid');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPlanManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'benefit_plan') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'health', status: 'active', description: '', providerId: '', eligibility: '', effectiveDate: null, endDate: null, contribution: '', coverage: '', documents: [], notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'dental', status: 'draft', description: '', providerId: '', eligibility: '', effectiveDate: null, endDate: null, contribution: '', coverage: '', documents: [], notes: '' }) }),
      ];
      if (t === 'plan_enrollment') return [
        makeEnrollmentRow({ content: JSON.stringify({ planId: 'p1', employeeId: 'e1', employeeName: 'E1', type: 'initial', status: 'active', description: '', enrollmentDate: null, effectiveDate: null, terminationDate: null, dependents: [], contribution: '', notes: '' }) }),
      ];
      if (t === 'plan_provider') return [
        makeProviderRow({ content: JSON.stringify({ name: 'Prov', type: 'insurance', status: 'active', description: '', contactName: '', email: '', phone: '', address: '', contractTerms: '', contractStart: null, contractEnd: null, rating: 0, notes: '' }) }),
      ];
      if (t === 'plan_claim') return [
        makeClaimRow({ content: JSON.stringify({ planId: 'p1', enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'E1', type: 'medical', amount: 1000, currency: 'USD', status: 'submitted', description: '', submittedDate: null, processedDate: null, reference: '', notes: '' }) }),
        makeClaimRow({ id: 'cl2', content: JSON.stringify({ planId: 'p1', enrollmentId: 'e1', employeeId: 'emp-1', employeeName: 'E1', type: 'dental', amount: 500, currency: 'USD', status: 'in_review', description: '', submittedDate: null, processedDate: null, reference: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await PlanManagementService.getPlanManagementMetrics('org-1');
    assert.equal(m.activePlans, 1);
    assert.equal(m.activeEnrollments, 1);
    assert.equal(m.activeProviders, 1);
    assert.equal(m.pendingClaims, 2);
    assert.equal(m.totalClaimAmount, 1500);
  });

  it('getPlanManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'benefit_plan') return [makeRow()];
      if (t === 'plan_enrollment') return [makeEnrollmentRow()];
      if (t === 'plan_provider') return [makeProviderRow()];
      if (t === 'plan_claim') return [makeClaimRow()];
      return [];
    };
    const s = await PlanManagementService.getPlanManagementStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.enrollmentCount, 1);
    assert.equal(s.providerCount, 1);
    assert.equal(s.claimCount, 1);
    assert.equal(s.byPlanType['health'], 1);
    assert.equal(s.byPlanStatus['draft'], 1);
    assert.equal(s.byEnrollmentType['initial'], 1);
    assert.equal(s.byEnrollmentStatus['pending'], 1);
    assert.equal(s.byProviderType['insurance'], 1);
    assert.equal(s.byProviderStatus['active'], 1);
    assert.equal(s.byClaimType['medical'], 1);
    assert.equal(s.byClaimStatus['submitted'], 1);
  });
});
