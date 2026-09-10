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
    type: 'gov_contact',
    content: JSON.stringify({
      name: 'Sen. Jane Doe',
      contactType: 'legislator',
      level: 'federal',
      title: 'Senator',
      organization: 'U.S. Senate',
      email: 'jane@senate.gov',
      phone: '202-555-0100',
      jurisdiction: 'US',
      relationshipStatus: 'active',
      lastContactDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['gov_contact', 'legislator', 'federal', 'active']),
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

/** Filters rows by the where clause, including AND content-contains conditions. */
function filterByWhere(rows: Record<string, unknown>[], where: Record<string, unknown>): Record<string, unknown>[] {
  let result = rows;
  if (where.type) result = result.filter((r) => r.type === where.type);
  if (where.organizationId) result = result.filter((r) => r.organizationId === where.organizationId);
  const andConditions = where.AND as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(andConditions)) {
    for (const cond of andConditions) {
      const contentCond = cond.content as Record<string, unknown> | undefined;
      if (contentCond && typeof contentCond.contains === 'string') {
        result = result.filter((r) => typeof r.content === 'string' && (r.content as string).includes(contentCond.contains as string));
      }
    }
  }
  return result;
}

const { GovRelationsService } = await import('@/lib/services/gov-relations-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GovRelationsService — Contacts', () => {
  beforeEach(() => resetMock());

  it('creates a contact with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await GovRelationsService.createContact('org-1', 'ws-1', {
      name: 'John Smith', contactType: 'lobbyist', level: 'state',
    }, 'user-1');
    assert.equal(c.name, 'John Smith');
    assert.equal(c.contactType, 'lobbyist');
    assert.equal(c.level, 'state');
    assert.equal(c.relationshipStatus, 'active');
    assert.equal(c.title, '');
    assert.equal(c.organization, '');
  });

  it('creates a contact with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await GovRelationsService.createContact('org-1', 'ws-1', {
      name: 'Jane Roe', contactType: 'regulator', level: 'federal',
      title: 'Commissioner', organization: 'FTC', email: 'jane@ftc.gov',
      phone: '202-555-0200', jurisdiction: 'US-Federal',
      relationshipStatus: 'warm', lastContactDate: '2028-01-01', notes: 'Key contact',
    }, 'user-1');
    assert.equal(c.name, 'Jane Roe');
    assert.equal(c.title, 'Commissioner');
    assert.equal(c.organization, 'FTC');
    assert.equal(c.email, 'jane@ftc.gov');
    assert.equal(c.relationshipStatus, 'warm');
    assert.equal(c.notes, 'Key contact');
    assert.ok(c.lastContactDate);
  });

  it('gets a contact by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await GovRelationsService.getContact('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.name, 'Sen. Jane Doe');
  });

  it('returns null for non-contact type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'something_else' });
    const c = await GovRelationsService.getContact('mem-1');
    assert.equal(c, null);
  });

  it('returns null when contact not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await GovRelationsService.getContact('nope');
    assert.equal(c, null);
  });

  it('lists contacts by organization', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      if ((args.where as Record<string, unknown>).type === 'gov_contact') {
        rows.push(makeRow());
        rows.push(makeRow({ id: 'mem-2', content: JSON.stringify({ name: 'Second', contactType: 'staff', level: 'state', title: '', organization: '', email: '', phone: '', jurisdiction: '', relationshipStatus: 'active', lastContactDate: null, notes: '' }) }));
      }
      return rows;
    };
    const list = await GovRelationsService.listContacts('org-1');
    assert.equal(list.length, 2);
    assert.equal(list[0].name, 'Sen. Jane Doe');
  });

  it('filters contacts by type', async () => {
    const allRows: Record<string, unknown>[] = [
      makeRow({ content: JSON.stringify({ name: 'A', contactType: 'legislator', level: 'federal', title: '', organization: '', email: '', phone: '', jurisdiction: '', relationshipStatus: 'active', lastContactDate: null, notes: '' }) }),
      makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', contactType: 'lobbyist', level: 'state', title: '', organization: '', email: '', phone: '', jurisdiction: '', relationshipStatus: 'active', lastContactDate: null, notes: '' }) }),
    ];
    memFindManyImpl = async (args) => filterByWhere(allRows, args.where as Record<string, unknown>);
    const list = await GovRelationsService.listContacts('org-1', { contactType: 'lobbyist' });
    assert.equal(list.length, 1);
    assert.equal(list[0].contactType, 'lobbyist');
  });

  it('updates a contact', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string, updatedAt: new Date('2024-02-01') });
    const c = await GovRelationsService.updateContact('mem-1', { title: 'Senior Senator' });
    assert.ok(c);
    assert.equal(c!.title, 'Senior Senator');
  });

  it('deletes a contact', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await GovRelationsService.deleteContact('mem-1');
    assert.equal(ok, true);
  });
});

describe('GovRelationsService — Policies', () => {
  beforeEach(() => resetMock());

  it('creates a policy with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'policy_monitor', content: args.data.content as string });
    const p = await GovRelationsService.createPolicy('org-1', 'ws-1', {
      title: 'Data Privacy Act', policyType: 'bill', jurisdiction: 'US-Federal',
    }, 'user-1');
    assert.equal(p.title, 'Data Privacy Act');
    assert.equal(p.policyType, 'bill');
    assert.equal(p.status, 'monitoring');
    assert.equal(p.jurisdiction, 'US-Federal');
    assert.equal(p.billNumber, '');
  });

  it('creates a policy with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'policy_monitor', content: args.data.content as string });
    const p = await GovRelationsService.createPolicy('org-1', 'ws-1', {
      title: 'AI Regulation', policyType: 'regulation', status: 'opposing',
      jurisdiction: 'EU', billNumber: 'EU-2028-001', sponsor: 'Commissioner A',
      summary: 'AI act', impactAssessment: 'High impact', position: 'oppose',
      introducedDate: '2028-01-01', lastActionDate: '2028-02-01', nextActionDate: '2028-03-01',
      notes: 'Monitor closely',
    }, 'user-1');
    assert.equal(p.title, 'AI Regulation');
    assert.equal(p.status, 'opposing');
    assert.equal(p.billNumber, 'EU-2028-001');
    assert.equal(p.sponsor, 'Commissioner A');
    assert.equal(p.position, 'oppose');
    assert.ok(p.introducedDate);
  });

  it('gets a policy by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'policy_monitor', content: JSON.stringify({
      title: 'Tech Bill', policyType: 'bill', status: 'monitoring', jurisdiction: 'US',
      billNumber: 'HR-100', sponsor: 'Rep A', summary: '', impactAssessment: '', position: '',
      introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '',
    }) });
    const p = await GovRelationsService.getPolicy('mem-1');
    assert.ok(p);
    assert.equal(p!.title, 'Tech Bill');
    assert.equal(p!.policyType, 'bill');
  });

  it('returns null for non-policy type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_contact' });
    const p = await GovRelationsService.getPolicy('mem-1');
    assert.equal(p, null);
  });

  it('lists policies by organization', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      if ((args.where as Record<string, unknown>).type === 'policy_monitor') {
        rows.push(makeRow({ type: 'policy_monitor', content: JSON.stringify({ title: 'P1', policyType: 'bill', status: 'monitoring', jurisdiction: 'US', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }));
      }
      return rows;
    };
    const list = await GovRelationsService.listPolicies('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'P1');
  });

  it('filters policies by status', async () => {
    const allRows: Record<string, unknown>[] = [
      makeRow({ type: 'policy_monitor', content: JSON.stringify({ title: 'A', policyType: 'bill', status: 'monitoring', jurisdiction: '', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }),
      makeRow({ id: 'm2', type: 'policy_monitor', content: JSON.stringify({ title: 'B', policyType: 'bill', status: 'opposing', jurisdiction: '', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }),
    ];
    memFindManyImpl = async (args) => filterByWhere(allRows, args.where as Record<string, unknown>);
    const list = await GovRelationsService.listPolicies('org-1', { status: 'opposing' });
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'opposing');
  });

  it('updates a policy', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'policy_monitor', content: JSON.stringify({
      title: 'Old Title', policyType: 'bill', status: 'monitoring', jurisdiction: 'US',
      billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '',
      introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'policy_monitor', content: args.data.content as string });
    const p = await GovRelationsService.updatePolicy('mem-1', { title: 'New Title', status: 'supporting' });
    assert.ok(p);
    assert.equal(p!.title, 'New Title');
    assert.equal(p!.status, 'supporting');
  });

  it('deletes a policy', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await GovRelationsService.deletePolicy('mem-1');
    assert.equal(ok, true);
  });

  it('updates a policy position', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'policy_monitor', content: JSON.stringify({
      title: 'Bill X', policyType: 'bill', status: 'monitoring', jurisdiction: 'US',
      billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '',
      introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'policy_monitor', content: args.data.content as string });
    const p = await GovRelationsService.updatePosition('mem-1', 'support', 'user-1');
    assert.ok(p);
    assert.equal(p!.position, 'support');
  });
});

describe('GovRelationsService — Lobbying', () => {
  beforeEach(() => resetMock());

  it('creates a lobbying activity with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.createLobbying('org-1', 'ws-1', {
      title: 'Q1 Lobbying Campaign',
    }, 'user-1');
    assert.equal(l.title, 'Q1 Lobbying Campaign');
    assert.equal(l.status, 'planned');
    assert.equal(l.budget, 0);
    assert.equal(l.spent, 0);
    assert.equal(l.registrationId, '');
  });

  it('creates a lobbying activity with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.createLobbying('org-1', 'ws-1', {
      title: 'Tech Reform Lobby', description: 'Lobby for tech reform',
      status: 'active', contactIds: ['c1', 'c2'], policyId: 'p1',
      startDate: '2028-01-01', endDate: '2028-06-30',
      budget: 50000, spent: 10000, notes: 'Priority campaign',
    }, 'user-1');
    assert.equal(l.title, 'Tech Reform Lobby');
    assert.equal(l.description, 'Lobby for tech reform');
    assert.equal(l.status, 'active');
    assert.deepEqual(l.contactIds, ['c1', 'c2']);
    assert.equal(l.policyId, 'p1');
    assert.equal(l.budget, 50000);
    assert.equal(l.spent, 10000);
    assert.ok(l.startDate);
  });

  it('gets a lobbying activity by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity', content: JSON.stringify({
      title: 'L1', description: '', status: 'planned', contactIds: [], policyId: null,
      registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null,
      budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null,
      cancelReason: '', notes: '',
    }) });
    const l = await GovRelationsService.getLobbying('mem-1');
    assert.ok(l);
    assert.equal(l!.title, 'L1');
    assert.equal(l!.status, 'planned');
  });

  it('returns null for non-lobbying type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_contact' });
    const l = await GovRelationsService.getLobbying('mem-1');
    assert.equal(l, null);
  });

  it('lists lobbying activities by organization', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      if ((args.where as Record<string, unknown>).type === 'lobbying_activity') {
        rows.push(makeRow({ type: 'lobbying_activity', content: JSON.stringify({ title: 'L1', description: '', status: 'planned', contactIds: [], policyId: null, registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null, budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null, cancelReason: '', notes: '' }) }));
      }
      return rows;
    };
    const list = await GovRelationsService.listLobbying('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'L1');
  });

  it('filters lobbying by status', async () => {
    const allRows: Record<string, unknown>[] = [
      makeRow({ type: 'lobbying_activity', content: JSON.stringify({ title: 'A', description: '', status: 'planned', contactIds: [], policyId: null, registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null, budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null, cancelReason: '', notes: '' }) }),
      makeRow({ id: 'm2', type: 'lobbying_activity', content: JSON.stringify({ title: 'B', description: '', status: 'active', contactIds: [], policyId: null, registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null, budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null, cancelReason: '', notes: '' }) }),
    ];
    memFindManyImpl = async (args) => filterByWhere(allRows, args.where as Record<string, unknown>);
    const list = await GovRelationsService.listLobbying('org-1', { status: 'active' });
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'active');
  });

  it('updates a lobbying activity', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity', content: JSON.stringify({
      title: 'Old', description: '', status: 'planned', contactIds: [], policyId: null,
      registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null,
      budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null,
      cancelReason: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.updateLobbying('mem-1', { budget: 75000, spent: 25000 });
    assert.ok(l);
    assert.equal(l!.budget, 75000);
    assert.equal(l!.spent, 25000);
  });

  it('registers a lobbying activity', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity', content: JSON.stringify({
      title: 'L1', description: '', status: 'planned', contactIds: [], policyId: null,
      registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null,
      budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null,
      cancelReason: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.registerLobbying('mem-1', 'REG-2028-001', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'registered');
    assert.equal(l!.registrationId, 'REG-2028-001');
    assert.equal(l!.registeredBy, 'user-1');
    assert.ok(l!.registeredAt);
  });

  it('completes a lobbying activity', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity', content: JSON.stringify({
      title: 'L1', description: '', status: 'active', contactIds: [], policyId: null,
      registrationId: 'REG-001', registeredBy: 'user-1', registeredAt: '2028-01-01',
      startDate: null, endDate: null, budget: 0, spent: 0, completedBy: '', completedAt: null,
      cancelledBy: '', cancelledAt: null, cancelReason: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.completeLobbying('mem-1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'completed');
    assert.equal(l!.completedBy, 'user-1');
    assert.ok(l!.completedAt);
  });

  it('cancels a lobbying activity with reason', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity', content: JSON.stringify({
      title: 'L1', description: '', status: 'planned', contactIds: [], policyId: null,
      registrationId: '', registeredBy: '', registeredAt: null, startDate: null, endDate: null,
      budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null,
      cancelReason: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'lobbying_activity', content: args.data.content as string });
    const l = await GovRelationsService.cancelLobbying('mem-1', 'Budget cut', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'cancelled');
    assert.equal(l!.cancelReason, 'Budget cut');
    assert.equal(l!.cancelledBy, 'user-1');
    assert.ok(l!.cancelledAt);
  });
});

describe('GovRelationsService — Compliance', () => {
  beforeEach(() => resetMock());

  it('creates a compliance record with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'gov_compliance', content: args.data.content as string });
    const c = await GovRelationsService.createCompliance('org-1', 'ws-1', {
      title: 'Q1 Lobbying Report', complianceType: 'lobbying_report',
    }, 'user-1');
    assert.equal(c.title, 'Q1 Lobbying Report');
    assert.equal(c.complianceType, 'lobbying_report');
    assert.equal(c.status, 'pending');
    assert.equal(c.filingId, '');
    assert.equal(c.amount, 0);
  });

  it('creates a compliance record with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'gov_compliance', content: args.data.content as string });
    const c = await GovRelationsService.createCompliance('org-1', 'ws-1', {
      title: 'Ethics Filing 2028', complianceType: 'ethics_filing', status: 'pending',
      dueDate: '2028-03-31', period: '2028-Q1', amount: 5000, notes: 'Annual ethics filing',
    }, 'user-1');
    assert.equal(c.title, 'Ethics Filing 2028');
    assert.equal(c.complianceType, 'ethics_filing');
    assert.equal(c.period, '2028-Q1');
    assert.equal(c.amount, 5000);
    assert.ok(c.dueDate);
    assert.equal(c.notes, 'Annual ethics filing');
  });

  it('gets a compliance record by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_compliance', content: JSON.stringify({
      title: 'C1', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '',
      filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '2028-Q1',
      amount: 0, notes: '',
    }) });
    const c = await GovRelationsService.getCompliance('mem-1');
    assert.ok(c);
    assert.equal(c!.title, 'C1');
    assert.equal(c!.complianceType, 'disclosure');
  });

  it('returns null for non-compliance type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_contact' });
    const c = await GovRelationsService.getCompliance('mem-1');
    assert.equal(c, null);
  });

  it('lists compliance records by organization', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      if ((args.where as Record<string, unknown>).type === 'gov_compliance') {
        rows.push(makeRow({ type: 'gov_compliance', content: JSON.stringify({ title: 'C1', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '', filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '', amount: 0, notes: '' }) }));
      }
      return rows;
    };
    const list = await GovRelationsService.listCompliance('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'C1');
  });

  it('filters compliance by type', async () => {
    const allRows: Record<string, unknown>[] = [
      makeRow({ type: 'gov_compliance', content: JSON.stringify({ title: 'A', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '', filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '', amount: 0, notes: '' }) }),
      makeRow({ id: 'm2', type: 'gov_compliance', content: JSON.stringify({ title: 'B', complianceType: 'gift_report', status: 'pending', filingId: '', filedBy: '', filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '', amount: 0, notes: '' }) }),
    ];
    memFindManyImpl = async (args) => filterByWhere(allRows, args.where as Record<string, unknown>);
    const list = await GovRelationsService.listCompliance('org-1', { complianceType: 'gift_report' });
    assert.equal(list.length, 1);
    assert.equal(list[0].complianceType, 'gift_report');
  });

  it('updates a compliance record', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_compliance', content: JSON.stringify({
      title: 'Old', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '',
      filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '', amount: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'gov_compliance', content: args.data.content as string });
    const c = await GovRelationsService.updateCompliance('mem-1', { title: 'New Title', amount: 10000 });
    assert.ok(c);
    assert.equal(c!.title, 'New Title');
    assert.equal(c!.amount, 10000);
  });

  it('files a compliance record', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_compliance', content: JSON.stringify({
      title: 'C1', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '',
      filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '2028-Q1', amount: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'gov_compliance', content: args.data.content as string });
    const c = await GovRelationsService.fileCompliance('mem-1', 'FILE-2028-001', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'filed');
    assert.equal(c!.filingId, 'FILE-2028-001');
    assert.equal(c!.filedBy, 'user-1');
    assert.ok(c!.filedAt);
  });

  it('approves a compliance record', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'gov_compliance', content: JSON.stringify({
      title: 'C1', complianceType: 'disclosure', status: 'filed', filingId: 'F1', filedBy: 'user-1',
      filedAt: '2028-01-15', approvedBy: '', approvedAt: null, dueDate: null, period: '2028-Q1', amount: 0, notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'gov_compliance', content: args.data.content as string });
    const c = await GovRelationsService.approveCompliance('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'approved');
    assert.equal(c!.approvedBy, 'user-1');
    assert.ok(c!.approvedAt);
  });
});

describe('GovRelationsService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      const where = args.where as Record<string, unknown>;
      if (where.type === 'policy_monitor') {
        rows.push(makeRow({ type: 'policy_monitor', content: JSON.stringify({ title: 'P1', policyType: 'bill', status: 'monitoring', jurisdiction: '', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }));
        rows.push(makeRow({ id: 'm2', type: 'policy_monitor', content: JSON.stringify({ title: 'P2', policyType: 'bill', status: 'supporting', jurisdiction: '', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }));
      }
      if (where.type === 'lobbying_activity') {
        rows.push(makeRow({ type: 'lobbying_activity', content: JSON.stringify({ title: 'L1', description: '', status: 'registered', contactIds: [], policyId: null, registrationId: 'R1', registeredBy: '', registeredAt: null, startDate: null, endDate: null, budget: 0, spent: 0, completedBy: '', completedAt: null, cancelledBy: '', cancelledAt: null, cancelReason: '', notes: '' }) }));
      }
      if (where.type === 'gov_compliance') {
        rows.push(makeRow({ type: 'gov_compliance', content: JSON.stringify({ title: 'C1', complianceType: 'disclosure', status: 'pending', filingId: '', filedBy: '', filedAt: null, approvedBy: '', approvedAt: null, dueDate: null, period: '', amount: 0, notes: '' }) }));
      }
      if (where.type === 'gov_contact') {
        rows.push(makeRow({ type: 'gov_contact', content: JSON.stringify({ name: 'A', contactType: 'legislator', level: 'federal', title: '', organization: '', email: '', phone: '', jurisdiction: '', relationshipStatus: 'active', lastContactDate: null, notes: '' }) }));
      }
      return rows;
    };
    const m = await GovRelationsService.getGovRelationsMetrics('org-1');
    assert.equal(m.activePolicies, 2);
    assert.equal(m.registeredLobbying, 1);
    assert.equal(m.pendingCompliance, 1);
    assert.equal(m.totalContacts, 1);
    assert.equal(m.overdueCompliance, 0);
  });

  it('returns stats with counts', async () => {
    memFindManyImpl = async (args) => {
      const rows: Record<string, unknown>[] = [];
      const where = args.where as Record<string, unknown>;
      if (where.type === 'gov_contact') {
        rows.push(makeRow({ type: 'gov_contact', content: JSON.stringify({ name: 'A', contactType: 'legislator', level: 'federal', title: '', organization: '', email: '', phone: '', jurisdiction: '', relationshipStatus: 'active', lastContactDate: null, notes: '' }) }));
      }
      if (where.type === 'policy_monitor') {
        rows.push(makeRow({ type: 'policy_monitor', content: JSON.stringify({ title: 'P1', policyType: 'bill', status: 'monitoring', jurisdiction: '', billNumber: '', sponsor: '', summary: '', impactAssessment: '', position: '', introducedDate: null, lastActionDate: null, nextActionDate: null, notes: '' }) }));
      }
      return rows;
    };
    const s = await GovRelationsService.getGovRelationsStats('org-1');
    assert.equal(s.contactCount, 1);
    assert.equal(s.policyCount, 1);
    assert.ok(typeof s.byContactType === 'object');
    assert.ok(typeof s.byPolicyStatus === 'object');
    assert.equal(s.byContactType['legislator'], 1);
    assert.equal(s.byPolicyStatus['monitoring'], 1);
  });
});
