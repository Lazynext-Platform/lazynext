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
    type: 'giving_donation',
    content: JSON.stringify({
      recipient: 'Red Cross',
      type: 'cash',
      amount: 5000,
      description: 'Annual donation',
      status: 'proposed',
      date: '2028-01-01',
      category: 'Disaster Relief',
      purpose: 'Emergency response',
      restrictions: '',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['giving_donation', 'cash', 'proposed']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeDonationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'giving_donation',
    content: JSON.stringify({
      recipient: 'Red Cross',
      type: 'cash',
      amount: 5000,
      description: 'Annual donation',
      status: 'proposed',
      date: '2028-01-01',
      category: 'Disaster Relief',
      purpose: 'Emergency response',
      restrictions: '',
      notes: '',
    }),
    tags: JSON.stringify(['giving_donation', 'cash', 'proposed']),
    ...overrides,
  });
}

function makeSponsorshipRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'giving_sponsorship',
    content: JSON.stringify({
      name: 'Tech Conference 2028',
      type: 'event',
      recipient: 'TechConf Inc',
      amount: 10000,
      description: 'Platinum sponsorship',
      status: 'proposed',
      startDate: '2028-03-01',
      endDate: '2028-03-03',
      benefits: 'Booth + keynote',
      terms: 'Net 30',
      notes: '',
    }),
    tags: JSON.stringify(['giving_sponsorship', 'event', 'proposed']),
    ...overrides,
  });
}

function makeGrantRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-g1',
    type: 'giving_grant',
    content: JSON.stringify({
      title: 'STEM Education Grant',
      type: 'foundation',
      recipient: 'Education Foundation',
      amount: 50000,
      description: 'STEM education initiative',
      status: 'draft',
      applicationDate: '2028-02-01',
      decisionDate: null,
      disbursementDate: null,
      period: '2028-2029',
      requirements: 'Quarterly reports',
      reportDue: '2028-06-01',
      notes: '',
    }),
    tags: JSON.stringify(['giving_grant', 'foundation', 'draft']),
    ...overrides,
  });
}

function makeProgramRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'volunteer_program',
    content: JSON.stringify({
      name: 'Employee Volunteer Day',
      type: 'employee_volunteer',
      description: 'Annual volunteer day',
      status: 'planned',
      startDate: '2028-05-01',
      endDate: '2028-05-01',
      coordinator: 'Jane Doe',
      participants: 50,
      hours: 400,
      partner: 'Local Food Bank',
      location: 'HQ',
      notes: '',
    }),
    tags: JSON.stringify(['volunteer_program', 'employee_volunteer', 'planned']),
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

const { CorporateGivingService } = await import('@/lib/services/corporate-giving-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Donations
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateGivingService — Donations', () => {
  beforeEach(() => resetMock());

  it('creates a donation with defaults', async () => {
    memCreateImpl = async (args) => makeDonationRow({ content: args.data.content as string });
    const d = await CorporateGivingService.createDonation('org-1', 'ws-1', {
      recipient: 'Red Cross', type: 'cash',
    }, 'user-1');
    assert.equal(d.recipient, 'Red Cross');
    assert.equal(d.status, 'proposed');
    assert.equal(d.amount, 0);
    assert.equal(d.description, '');
  });

  it('creates a donation with full input', async () => {
    memCreateImpl = async (args) => makeDonationRow({ content: args.data.content as string });
    const d = await CorporateGivingService.createDonation('org-1', 'ws-1', {
      recipient: 'Save the Children', type: 'matching', amount: 25000,
      description: 'Matching gift program', status: 'approved', date: '2028-01-15',
      category: 'Education', purpose: 'Scholarship fund', restrictions: 'Education only',
      notes: 'High priority',
    }, 'user-1');
    assert.equal(d.recipient, 'Save the Children');
    assert.equal(d.type, 'matching');
    assert.equal(d.amount, 25000);
    assert.equal(d.status, 'approved');
    assert.equal(d.category, 'Education');
  });

  it('gets a donation by id', async () => {
    memFindUniqueImpl = async () => makeDonationRow();
    const d = await CorporateGivingService.getDonation('mem-d1');
    assert.ok(d);
    assert.equal(d!.id, 'mem-d1');
    assert.equal(d!.recipient, 'Red Cross');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDonationRow({ type: 'giving_sponsorship' });
    const d = await CorporateGivingService.getDonation('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when donation not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await CorporateGivingService.getDonation('nope');
    assert.equal(d, null);
  });

  it('lists donations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'giving_donation') return [makeDonationRow()];
      return [];
    };
    const list = await CorporateGivingService.listDonations('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].recipient, 'Red Cross');
  });

  it('updates a donation', async () => {
    memFindUniqueImpl = async () => makeDonationRow();
    memUpdateImpl = async (args) => makeDonationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateGivingService.updateDonation('mem-d1', { status: 'approved' });
    assert.ok(d);
    assert.equal(d!.status, 'approved');
  });

  it('deletes a donation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await CorporateGivingService.deleteDonation('mem-d1');
    assert.equal(ok, true);
  });

  it('approveDonation sets status to approved', async () => {
    memFindUniqueImpl = async () => makeDonationRow();
    memUpdateImpl = async (args) => makeDonationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateGivingService.approveDonation('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'approved');
  });

  it('completeDonation sets status to completed', async () => {
    memFindUniqueImpl = async () => makeDonationRow();
    memUpdateImpl = async (args) => makeDonationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateGivingService.completeDonation('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'completed');
  });

  it('rejectDonation sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeDonationRow();
    memUpdateImpl = async (args) => makeDonationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateGivingService.rejectDonation('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'rejected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Sponsorships
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateGivingService — Sponsorships', () => {
  beforeEach(() => resetMock());

  it('creates a sponsorship with defaults', async () => {
    memCreateImpl = async (args) => makeSponsorshipRow({ content: args.data.content as string });
    const s = await CorporateGivingService.createSponsorship('org-1', 'ws-1', {
      name: 'Tech Conference', type: 'event',
    }, 'user-1');
    assert.equal(s.name, 'Tech Conference');
    assert.equal(s.status, 'proposed');
    assert.equal(s.amount, 0);
    assert.equal(s.recipient, '');
  });

  it('creates a sponsorship with full input', async () => {
    memCreateImpl = async (args) => makeSponsorshipRow({ content: args.data.content as string });
    const s = await CorporateGivingService.createSponsorship('org-1', 'ws-1', {
      name: 'Sports Team', type: 'team', recipient: 'City FC', amount: 50000,
      description: 'Jersey sponsor', status: 'active', startDate: '2028-01-01',
      endDate: '2028-12-31', benefits: 'Logo on jersey', terms: 'Annual contract',
      notes: 'Multi-year deal',
    }, 'user-1');
    assert.equal(s.name, 'Sports Team');
    assert.equal(s.type, 'team');
    assert.equal(s.recipient, 'City FC');
    assert.equal(s.amount, 50000);
    assert.equal(s.status, 'active');
  });

  it('gets a sponsorship by id', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow();
    const s = await CorporateGivingService.getSponsorship('mem-s1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-s1');
    assert.equal(s!.name, 'Tech Conference 2028');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow({ type: 'giving_donation' });
    const s = await CorporateGivingService.getSponsorship('mem-s1');
    assert.equal(s, null);
  });

  it('lists sponsorships by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'giving_sponsorship') return [makeSponsorshipRow()];
      return [];
    };
    const list = await CorporateGivingService.listSponsorships('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Tech Conference 2028');
  });

  it('updates a sponsorship', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow();
    memUpdateImpl = async (args) => makeSponsorshipRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await CorporateGivingService.updateSponsorship('mem-s1', { status: 'active' });
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deletes a sponsorship', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await CorporateGivingService.deleteSponsorship('mem-s1');
    assert.equal(ok, true);
  });

  it('activateSponsorship sets status to active', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow();
    memUpdateImpl = async (args) => makeSponsorshipRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await CorporateGivingService.activateSponsorship('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('completeSponsorship sets status to completed', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow();
    memUpdateImpl = async (args) => makeSponsorshipRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await CorporateGivingService.completeSponsorship('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });

  it('cancelSponsorship sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeSponsorshipRow();
    memUpdateImpl = async (args) => makeSponsorshipRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await CorporateGivingService.cancelSponsorship('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Grants
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateGivingService — Grants', () => {
  beforeEach(() => resetMock());

  it('creates a grant with defaults', async () => {
    memCreateImpl = async (args) => makeGrantRow({ content: args.data.content as string });
    const g = await CorporateGivingService.createGrant('org-1', 'ws-1', {
      title: 'Community Grant', type: 'community',
    }, 'user-1');
    assert.equal(g.title, 'Community Grant');
    assert.equal(g.status, 'draft');
    assert.equal(g.amount, 0);
    assert.equal(g.recipient, '');
  });

  it('creates a grant with full input', async () => {
    memCreateImpl = async (args) => makeGrantRow({ content: args.data.content as string });
    const g = await CorporateGivingService.createGrant('org-1', 'ws-1', {
      title: 'Research Grant', type: 'research', recipient: 'State University',
      amount: 100000, description: 'AI research', status: 'submitted',
      applicationDate: '2028-01-01', period: '2028-2030',
      requirements: 'Annual report', reportDue: '2028-12-01', notes: 'Priority',
    }, 'user-1');
    assert.equal(g.title, 'Research Grant');
    assert.equal(g.type, 'research');
    assert.equal(g.recipient, 'State University');
    assert.equal(g.amount, 100000);
    assert.equal(g.status, 'submitted');
  });

  it('gets a grant by id', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    const g = await CorporateGivingService.getGrant('mem-g1');
    assert.ok(g);
    assert.equal(g!.id, 'mem-g1');
    assert.equal(g!.title, 'STEM Education Grant');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeGrantRow({ type: 'giving_donation' });
    const g = await CorporateGivingService.getGrant('mem-g1');
    assert.equal(g, null);
  });

  it('lists grants by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'giving_grant') return [makeGrantRow()];
      return [];
    };
    const list = await CorporateGivingService.listGrants('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'STEM Education Grant');
  });

  it('updates a grant', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.updateGrant('mem-g1', { status: 'submitted' });
    assert.ok(g);
    assert.equal(g!.status, 'submitted');
  });

  it('deletes a grant', async () => {
    memDeleteImpl = async () => ({ id: 'mem-g1' });
    const ok = await CorporateGivingService.deleteGrant('mem-g1');
    assert.equal(ok, true);
  });

  it('submitGrant sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.submitGrant('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'submitted');
  });

  it('approveGrant sets status to approved', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.approveGrant('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'approved');
  });

  it('rejectGrant sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.rejectGrant('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'rejected');
  });

  it('disburseGrant sets status to disbursed', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.disburseGrant('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'disbursed');
  });

  it('completeGrant sets status to completed', async () => {
    memFindUniqueImpl = async () => makeGrantRow();
    memUpdateImpl = async (args) => makeGrantRow({ id: 'mem-g1', content: args.data.content as string });
    const g = await CorporateGivingService.completeGrant('mem-g1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Programs
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateGivingService — Programs', () => {
  beforeEach(() => resetMock());

  it('creates a program with defaults', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await CorporateGivingService.createProgram('org-1', 'ws-1', {
      name: 'Mentoring Program', type: 'mentoring',
    }, 'user-1');
    assert.equal(p.name, 'Mentoring Program');
    assert.equal(p.status, 'planned');
    assert.equal(p.participants, 0);
    assert.equal(p.hours, 0);
  });

  it('creates a program with full input', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await CorporateGivingService.createProgram('org-1', 'ws-1', {
      name: 'Skills Based Volunteering', type: 'skills_based', description: 'Pro bono consulting',
      status: 'active', startDate: '2028-02-01', endDate: '2028-08-01',
      coordinator: 'Alice', participants: 20, hours: 500,
      partner: 'NonProfit Org', location: 'Remote', notes: 'Quarterly review',
    }, 'user-1');
    assert.equal(p.name, 'Skills Based Volunteering');
    assert.equal(p.type, 'skills_based');
    assert.equal(p.coordinator, 'Alice');
    assert.equal(p.participants, 20);
    assert.equal(p.hours, 500);
    assert.equal(p.status, 'active');
  });

  it('gets a program by id', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    const p = await CorporateGivingService.getProgram('mem-p1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-p1');
    assert.equal(p!.name, 'Employee Volunteer Day');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeProgramRow({ type: 'giving_donation' });
    const p = await CorporateGivingService.getProgram('mem-p1');
    assert.equal(p, null);
  });

  it('lists programs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'volunteer_program') return [makeProgramRow()];
      return [];
    };
    const list = await CorporateGivingService.listPrograms('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Employee Volunteer Day');
  });

  it('updates a program', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await CorporateGivingService.updateProgram('mem-p1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a program', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await CorporateGivingService.deleteProgram('mem-p1');
    assert.equal(ok, true);
  });

  it('startProgram sets status to active', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await CorporateGivingService.startProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('pauseProgram sets status to paused', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await CorporateGivingService.pauseProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'paused');
  });

  it('completeProgram sets status to completed', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await CorporateGivingService.completeProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateGivingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCorporateGivingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'giving_donation') return [
        makeDonationRow({ content: JSON.stringify({ recipient: 'D1', type: 'cash', amount: 5000, status: 'completed', date: '2028-01-01', category: '', purpose: '', description: '', restrictions: '', notes: '' }) }),
        makeDonationRow({ id: 'd2', content: JSON.stringify({ recipient: 'D2', type: 'cash', amount: 3000, status: 'proposed', date: '2028-01-01', category: '', purpose: '', description: '', restrictions: '', notes: '' }) }),
      ];
      if (t === 'giving_sponsorship') return [
        makeSponsorshipRow({ content: JSON.stringify({ name: 'S1', type: 'event', recipient: '', amount: 10000, status: 'active', startDate: '2028-01-01', endDate: '2028-12-31', description: '', benefits: '', terms: '', notes: '' }) }),
        makeSponsorshipRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'event', recipient: '', amount: 5000, status: 'completed', startDate: '2028-01-01', endDate: '2028-12-31', description: '', benefits: '', terms: '', notes: '' }) }),
      ];
      if (t === 'giving_grant') return [
        makeGrantRow({ content: JSON.stringify({ title: 'G1', type: 'foundation', recipient: '', amount: 50000, status: 'approved', applicationDate: '2028-01-01', decisionDate: null, disbursementDate: null, period: '', requirements: '', reportDue: null, description: '', notes: '' }) }),
        makeGrantRow({ id: 'g2', content: JSON.stringify({ title: 'G2', type: 'foundation', recipient: '', amount: 25000, status: 'draft', applicationDate: '2028-01-01', decisionDate: null, disbursementDate: null, period: '', requirements: '', reportDue: null, description: '', notes: '' }) }),
      ];
      if (t === 'volunteer_program') return [
        makeProgramRow({ content: JSON.stringify({ name: 'P1', type: 'employee_volunteer', status: 'active', startDate: '2028-01-01', endDate: '2028-12-31', coordinator: '', participants: 10, hours: 200, partner: '', location: '', description: '', notes: '' }) }),
        makeProgramRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'employee_volunteer', status: 'completed', startDate: '2028-01-01', endDate: '2028-12-31', coordinator: '', participants: 20, hours: 400, partner: '', location: '', description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await CorporateGivingService.getCorporateGivingMetrics('org-1');
    assert.equal(m.totalDonations, 5000);
    assert.equal(m.activeSponsorships, 1);
    assert.equal(m.activeGrants, 1);
    assert.equal(m.activePrograms, 1);
    assert.equal(m.totalVolunteerHours, 600);
  });

  it('getCorporateGivingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'giving_donation') return [makeDonationRow()];
      if (t === 'giving_sponsorship') return [makeSponsorshipRow()];
      if (t === 'giving_grant') return [makeGrantRow()];
      if (t === 'volunteer_program') return [makeProgramRow()];
      return [];
    };
    const s = await CorporateGivingService.getCorporateGivingStats('org-1');
    assert.equal(s.donationCount, 1);
    assert.equal(s.sponsorshipCount, 1);
    assert.equal(s.grantCount, 1);
    assert.equal(s.programCount, 1);
    assert.equal(s.byDonationType['cash'], 1);
    assert.equal(s.byDonationStatus['proposed'], 1);
    assert.equal(s.bySponsorshipType['event'], 1);
    assert.equal(s.bySponsorshipStatus['proposed'], 1);
    assert.equal(s.byGrantType['foundation'], 1);
    assert.equal(s.byGrantStatus['draft'], 1);
    assert.equal(s.byProgramType['employee_volunteer'], 1);
    assert.equal(s.byProgramStatus['planned'], 1);
  });
});
