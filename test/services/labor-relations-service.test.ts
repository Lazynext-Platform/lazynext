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
    type: 'labor_union',
    content: JSON.stringify({
      name: 'Local 100',
      type: 'local',
      description: 'Manufacturing workers union',
      status: 'active',
      localNumber: '100',
      affiliate: 'AFL-CIO',
      contactName: 'Jane Doe',
      email: 'jane@local100.org',
      phone: '555-0100',
      memberCount: 500,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['labor_union', 'local', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeGrievanceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-g1',
    type: 'labor_grievance',
    content: JSON.stringify({
      title: 'Overtime pay dispute',
      type: 'wage',
      description: 'Overtime not paid correctly',
      status: 'filed',
      priority: 'medium',
      filedBy: 'John Smith',
      filedDate: '2028-01-15',
      unionId: 'mem-1',
      assignedTo: 'HR Manager',
      department: 'Manufacturing',
      summary: 'Overtime miscalculated',
      resolution: '',
      notes: '',
    }),
    tags: JSON.stringify(['labor_grievance', 'wage', 'filed', 'medium']),
    ...overrides,
  });
}

function makeContractRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'labor_contract',
    content: JSON.stringify({
      title: 'CBA 2028-2030',
      type: 'cba',
      unionId: 'mem-1',
      description: 'Collective bargaining agreement',
      status: 'draft',
      startDate: '2028-01-01',
      endDate: '2030-12-31',
      effectiveDate: '2028-01-01',
      terms: 'Standard terms',
      wageSchedule: 'Tiered wage schedule',
      benefits: 'Health and dental',
      workingConditions: '40 hours per week',
      notes: '',
    }),
    tags: JSON.stringify(['labor_contract', 'cba', 'draft']),
    ...overrides,
  });
}

function makeDisputeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'labor_dispute',
    content: JSON.stringify({
      title: 'Jurisdictional dispute',
      type: 'jurisdictional',
      description: 'Two unions claim same work',
      status: 'open',
      priority: 'high',
      unionId: 'mem-1',
      contractId: 'mem-c1',
      filedBy: 'Operations Manager',
      filedDate: '2028-02-01',
      assignedTo: 'Legal Counsel',
      summary: 'Work assignment conflict',
      resolution: '',
      notes: '',
    }),
    tags: JSON.stringify(['labor_dispute', 'jurisdictional', 'open', 'high']),
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

const { LaborRelationsService } = await import('@/lib/services/labor-relations-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Unions
// ─────────────────────────────────────────────────────────────────────────────

describe('LaborRelationsService — Unions', () => {
  beforeEach(() => resetMock());

  it('creates a union with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const u = await LaborRelationsService.createUnion('org-1', 'ws-1', {
      name: 'Local 200', type: 'local',
    }, 'user-1');
    assert.equal(u.name, 'Local 200');
    assert.equal(u.status, 'active');
    assert.equal(u.memberCount, 0);
    assert.equal(u.localNumber, '');
  });

  it('creates a union with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const u = await LaborRelationsService.createUnion('org-1', 'ws-1', {
      name: 'National Union', type: 'national', description: 'National union',
      status: 'pending_certification', localNumber: '500', affiliate: 'Change to Win',
      contactName: 'Bob', email: 'bob@nu.org', phone: '555-0200',
      memberCount: 5000, notes: 'High priority',
    }, 'user-1');
    assert.equal(u.name, 'National Union');
    assert.equal(u.type, 'national');
    assert.equal(u.status, 'pending_certification');
    assert.equal(u.memberCount, 5000);
    assert.equal(u.affiliate, 'Change to Win');
  });

  it('gets a union by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const u = await LaborRelationsService.getUnion('mem-1');
    assert.ok(u);
    assert.equal(u!.id, 'mem-1');
    assert.equal(u!.name, 'Local 100');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'labor_grievance' });
    const u = await LaborRelationsService.getUnion('mem-1');
    assert.equal(u, null);
  });

  it('returns null when union not found', async () => {
    memFindUniqueImpl = async () => null;
    const u = await LaborRelationsService.getUnion('nope');
    assert.equal(u, null);
  });

  it('lists unions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_union') return [makeRow()];
      return [];
    };
    const list = await LaborRelationsService.listUnions('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Local 100');
  });

  it('updates a union', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await LaborRelationsService.updateUnion('mem-1', { status: 'inactive' });
    assert.ok(u);
    assert.equal(u!.status, 'inactive');
  });

  it('deletes a union', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await LaborRelationsService.deleteUnion('mem-1');
    assert.equal(ok, true);
  });

  it('decertifyUnion sets status to decertified', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const u = await LaborRelationsService.decertifyUnion('mem-1', 'user-1');
    assert.ok(u);
    assert.equal(u!.status, 'decertified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Grievances
// ─────────────────────────────────────────────────────────────────────────────

describe('LaborRelationsService — Grievances', () => {
  beforeEach(() => resetMock());

  it('creates a grievance with defaults', async () => {
    memCreateImpl = async (args) => makeGrievanceRow({ content: args.data.content as string });
    const g = await LaborRelationsService.createGrievance('org-1', 'ws-1', {
      title: 'Safety violation', type: 'safety',
    }, 'user-1');
    assert.equal(g.title, 'Safety violation');
    assert.equal(g.status, 'filed');
    assert.equal(g.priority, 'medium');
  });

  it('creates a grievance with full input', async () => {
    memCreateImpl = async (args) => makeGrievanceRow({ content: args.data.content as string });
    const g = await LaborRelationsService.createGrievance('org-1', 'ws-1', {
      title: 'Harassment complaint', type: 'harassment', description: 'Workplace harassment',
      status: 'under_review', priority: 'critical', filedBy: 'Alice',
      filedDate: '2028-03-01', unionId: 'mem-1', assignedTo: 'HR Director',
      department: 'Operations', summary: 'Multiple incidents reported',
      resolution: '', notes: 'Confidential',
    }, 'user-1');
    assert.equal(g.title, 'Harassment complaint');
    assert.equal(g.priority, 'critical');
    assert.equal(g.filedBy, 'Alice');
    assert.equal(g.unionId, 'mem-1');
  });

  it('gets a grievance by id', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    const g = await LaborRelationsService.getGrievance('mem-g1');
    assert.ok(g);
    assert.equal(g!.title, 'Overtime pay dispute');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow({ type: 'labor_union' });
    const g = await LaborRelationsService.getGrievance('mem-g1');
    assert.equal(g, null);
  });

  it('lists grievances by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_grievance') return [makeGrievanceRow()];
      return [];
    };
    const list = await LaborRelationsService.listGrievances('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a grievance', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.updateGrievance('mem-g1', { priority: 'high' });
    assert.ok(g);
    assert.equal(g!.priority, 'high');
  });

  it('deletes a grievance', async () => {
    memDeleteImpl = async () => ({ id: 'mem-g1' });
    const ok = await LaborRelationsService.deleteGrievance('mem-g1');
    assert.equal(ok, true);
  });

  it('reviewGrievance sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.reviewGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'under_review');
  });

  it('investigateGrievance sets status to investigated', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.investigateGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'investigated');
  });

  it('mediateGrievance sets status to mediated', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.mediateGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'mediated');
  });

  it('arbitrateGrievance sets status to arbitrated', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.arbitrateGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'arbitrated');
  });

  it('resolveGrievance sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.resolveGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'resolved');
  });

  it('withdrawGrievance sets status to withdrawn', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.withdrawGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'withdrawn');
  });

  it('dismissGrievance sets status to dismissed', async () => {
    memFindUniqueImpl = async () => makeGrievanceRow();
    memUpdateImpl = async (args) => makeGrievanceRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await LaborRelationsService.dismissGrievance('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'dismissed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Contracts
// ─────────────────────────────────────────────────────────────────────────────

describe('LaborRelationsService — Contracts', () => {
  beforeEach(() => resetMock());

  it('creates a contract with defaults', async () => {
    memCreateImpl = async (args) => makeContractRow({ content: args.data.content as string });
    const c = await LaborRelationsService.createContract('org-1', 'ws-1', {
      title: 'Side Letter 2028', type: 'side_letter',
    }, 'user-1');
    assert.equal(c.title, 'Side Letter 2028');
    assert.equal(c.status, 'draft');
    assert.equal(c.terms, '');
  });

  it('creates a contract with full input', async () => {
    memCreateImpl = async (args) => makeContractRow({ content: args.data.content as string });
    const c = await LaborRelationsService.createContract('org-1', 'ws-1', {
      title: 'CBA 2028', type: 'cba', unionId: 'mem-1', description: 'Main CBA',
      status: 'negotiating', startDate: '2028-01-01', endDate: '2030-12-31',
      effectiveDate: '2028-01-01', terms: 'Full terms', wageSchedule: 'Tiered',
      benefits: 'Full benefits', workingConditions: 'Standard conditions', notes: 'Priority',
    }, 'user-1');
    assert.equal(c.title, 'CBA 2028');
    assert.equal(c.type, 'cba');
    assert.equal(c.unionId, 'mem-1');
    assert.equal(c.status, 'negotiating');
  });

  it('gets a contract by id', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    const c = await LaborRelationsService.getContract('mem-c1');
    assert.ok(c);
    assert.equal(c!.title, 'CBA 2028-2030');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeContractRow({ type: 'labor_union' });
    const c = await LaborRelationsService.getContract('mem-c1');
    assert.equal(c, null);
  });

  it('lists contracts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_contract') return [makeContractRow()];
      return [];
    };
    const list = await LaborRelationsService.listContracts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a contract', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.updateContract('mem-c1', { status: 'ratified' });
    assert.ok(c);
    assert.equal(c!.status, 'ratified');
  });

  it('deletes a contract', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await LaborRelationsService.deleteContract('mem-c1');
    assert.equal(ok, true);
  });

  it('negotiateContract sets status to negotiating', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.negotiateContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'negotiating');
  });

  it('ratifyContract sets status to ratified', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.ratifyContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'ratified');
  });

  it('activateContract sets status to active', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.activateContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('expireContract sets status to expired', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.expireContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'expired');
  });

  it('renegotiateContract sets status to renegotiating', async () => {
    memFindUniqueImpl = async () => makeContractRow();
    memUpdateImpl = async (args) => makeContractRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await LaborRelationsService.renegotiateContract('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'renegotiating');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Disputes
// ─────────────────────────────────────────────────────────────────────────────

describe('LaborRelationsService — Disputes', () => {
  beforeEach(() => resetMock());

  it('creates a dispute with defaults', async () => {
    memCreateImpl = async (args) => makeDisputeRow({ content: args.data.content as string });
    const d = await LaborRelationsService.createDispute('org-1', 'ws-1', {
      title: 'Bargaining dispute', type: 'bargaining',
    }, 'user-1');
    assert.equal(d.title, 'Bargaining dispute');
    assert.equal(d.status, 'open');
    assert.equal(d.priority, 'medium');
  });

  it('creates a dispute with full input', async () => {
    memCreateImpl = async (args) => makeDisputeRow({ content: args.data.content as string });
    const d = await LaborRelationsService.createDispute('org-1', 'ws-1', {
      title: 'ULP charge', type: 'unfair_labor_practice', description: 'ULP filed',
      status: 'mediation', priority: 'critical', unionId: 'mem-1', contractId: 'mem-c1',
      filedBy: 'Steward', filedDate: '2028-04-01', assignedTo: 'Labor Attorney',
      summary: 'Bad faith bargaining', resolution: '', notes: 'Escalate if needed',
    }, 'user-1');
    assert.equal(d.title, 'ULP charge');
    assert.equal(d.priority, 'critical');
    assert.equal(d.contractId, 'mem-c1');
    assert.equal(d.unionId, 'mem-1');
  });

  it('gets a dispute by id', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    const d = await LaborRelationsService.getDispute('mem-d1');
    assert.ok(d);
    assert.equal(d!.title, 'Jurisdictional dispute');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDisputeRow({ type: 'labor_union' });
    const d = await LaborRelationsService.getDispute('mem-d1');
    assert.equal(d, null);
  });

  it('lists disputes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_dispute') return [makeDisputeRow()];
      return [];
    };
    const list = await LaborRelationsService.listDisputes('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a dispute', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.updateDispute('mem-d1', { priority: 'critical' });
    assert.ok(d);
    assert.equal(d!.priority, 'critical');
  });

  it('deletes a dispute', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await LaborRelationsService.deleteDispute('mem-d1');
    assert.equal(ok, true);
  });

  it('mediateDispute sets status to mediation', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.mediateDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'mediation');
  });

  it('arbitrateDispute sets status to arbitration', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.arbitrateDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'arbitration');
  });

  it('resolveDispute sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.resolveDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'resolved');
  });

  it('escalateDispute sets status to escalated', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.escalateDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'escalated');
  });

  it('closeDispute sets status to closed', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.closeDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'closed');
  });

  it('withdrawDispute sets status to withdrawn', async () => {
    memFindUniqueImpl = async () => makeDisputeRow();
    memUpdateImpl = async (args) => makeDisputeRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await LaborRelationsService.withdrawDispute('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'withdrawn');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('LaborRelationsService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getLaborRelationsMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_union') return [
        makeRow({ content: JSON.stringify({ name: 'U1', type: 'local', status: 'active', memberCount: 100 }) }),
        makeRow({ id: 'u2', content: JSON.stringify({ name: 'U2', type: 'local', status: 'inactive', memberCount: 50 }) }),
      ];
      if (t === 'labor_grievance') return [
        makeGrievanceRow({ content: JSON.stringify({ title: 'G1', type: 'wage', status: 'filed', priority: 'critical', filedBy: '', unionId: null, assignedTo: '', department: '', summary: '', resolution: '', notes: '' }) }),
        makeGrievanceRow({ id: 'g2', content: JSON.stringify({ title: 'G2', type: 'safety', status: 'resolved', priority: 'medium', filedBy: '', unionId: null, assignedTo: '', department: '', summary: '', resolution: '', notes: '' }) }),
        makeGrievanceRow({ id: 'g3', content: JSON.stringify({ title: 'G3', type: 'wage', status: 'under_review', priority: 'high', filedBy: '', unionId: null, assignedTo: '', department: '', summary: '', resolution: '', notes: '' }) }),
      ];
      if (t === 'labor_contract') return [
        makeContractRow({ content: JSON.stringify({ title: 'C1', type: 'cba', status: 'active', unionId: null, description: '', startDate: null, endDate: null, effectiveDate: null, terms: '', wageSchedule: '', benefits: '', workingConditions: '', notes: '' }) }),
        makeContractRow({ id: 'c2', content: JSON.stringify({ title: 'C2', type: 'cba', status: 'draft', unionId: null, description: '', startDate: null, endDate: null, effectiveDate: null, terms: '', wageSchedule: '', benefits: '', workingConditions: '', notes: '' }) }),
      ];
      if (t === 'labor_dispute') return [
        makeDisputeRow({ content: JSON.stringify({ title: 'D1', type: 'other', status: 'open', priority: 'medium', unionId: null, contractId: null, filedBy: '', assignedTo: '', summary: '', resolution: '', notes: '' }) }),
        makeDisputeRow({ id: 'd2', content: JSON.stringify({ title: 'D2', type: 'other', status: 'resolved', priority: 'low', unionId: null, contractId: null, filedBy: '', assignedTo: '', summary: '', resolution: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await LaborRelationsService.getLaborRelationsMetrics('org-1');
    assert.equal(m.activeUnions, 1);
    assert.equal(m.openGrievances, 2);
    assert.equal(m.criticalGrievances, 1);
    assert.equal(m.activeContracts, 1);
    assert.equal(m.openDisputes, 1);
  });

  it('getLaborRelationsStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'labor_union') return [makeRow()];
      if (t === 'labor_grievance') return [makeGrievanceRow()];
      if (t === 'labor_contract') return [makeContractRow()];
      if (t === 'labor_dispute') return [makeDisputeRow()];
      return [];
    };
    const s = await LaborRelationsService.getLaborRelationsStats('org-1');
    assert.equal(s.unionCount, 1);
    assert.equal(s.grievanceCount, 1);
    assert.equal(s.contractCount, 1);
    assert.equal(s.disputeCount, 1);
    assert.equal(s.byUnionType['local'], 1);
    assert.equal(s.byUnionStatus['active'], 1);
    assert.equal(s.byGrievanceType['wage'], 1);
    assert.equal(s.byGrievanceStatus['filed'], 1);
    assert.equal(s.byGrievancePriority['medium'], 1);
    assert.equal(s.byContractType['cba'], 1);
    assert.equal(s.byContractStatus['draft'], 1);
    assert.equal(s.byDisputeType['jurisdictional'], 1);
    assert.equal(s.byDisputeStatus['open'], 1);
    assert.equal(s.byDisputePriority['high'], 1);
  });
});
