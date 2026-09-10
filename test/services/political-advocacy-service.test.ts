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
    type: 'advocacy_campaign',
    content: JSON.stringify({
      name: 'Tax Reform Campaign',
      type: 'grassroots',
      description: 'Grassroots campaign for tax reform',
      status: 'draft',
      issueArea: 'taxation',
      targetOfficial: 'Senator Smith',
      targetBody: 'Senate',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      budget: 50000,
      coordinator: 'Jane Doe',
      participants: ['Alice', 'Bob'],
      talkingPoints: 'Lower taxes',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['advocacy_campaign', 'grassroots', 'draft', 'taxation']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeLobbyingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'lobbying_activity',
    content: JSON.stringify({
      title: 'Senate Lobbying Meeting',
      type: 'direct',
      description: 'Direct lobbying on tax bill',
      status: 'planned',
      issueArea: 'taxation',
      targetOfficial: 'Senator Smith',
      targetBody: 'Senate',
      lobbyist: 'John Doe',
      date: '2028-03-15',
      duration: 60,
      expenses: 500,
      outcome: '',
      notes: '',
    }),
    tags: JSON.stringify(['lobbying_activity', 'direct', 'planned', 'taxation']),
    ...overrides,
  });
}

function makePositionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-pos1',
    type: 'policy_position',
    content: JSON.stringify({
      title: 'Support Tax Reform Bill',
      type: 'support',
      issueArea: 'taxation',
      description: 'Support the tax reform bill',
      status: 'draft',
      billNumber: 'HR-1234',
      summary: 'Comprehensive tax reform',
      rationale: 'Reduces burden on middle class',
      recommendations: 'Vote yes',
      publishedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['policy_position', 'support', 'draft', 'taxation']),
    ...overrides,
  });
}

function makeContributionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-con1',
    type: 'pac_contribution',
    content: JSON.stringify({
      recipient: 'Campaign for Smith',
      type: 'pac',
      amount: 5000,
      currency: 'USD',
      description: 'PAC contribution',
      status: 'pending_approval',
      date: '2028-06-01',
      recipientType: 'candidate',
      committee: 'Our PAC',
      purpose: 'General support',
      approvalRequired: true,
      approvedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['pac_contribution', 'pac', 'pending_approval']),
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

const { PoliticalAdvocacyService } = await import('@/lib/services/political-advocacy-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Campaigns
// ─────────────────────────────────────────────────────────────────────────────

describe('PoliticalAdvocacyService — Campaigns', () => {
  beforeEach(() => resetMock());

  it('creates a campaign with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await PoliticalAdvocacyService.createCampaign('org-1', 'ws-1', {
      name: 'Env Campaign', type: 'grassroots',
    }, 'user-1');
    assert.equal(c.name, 'Env Campaign');
    assert.equal(c.status, 'draft');
    assert.equal(c.budget, 0);
    assert.equal(c.participants.length, 0);
  });

  it('creates a campaign with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await PoliticalAdvocacyService.createCampaign('org-1', 'ws-1', {
      name: 'Healthcare Reform', type: 'direct_lobbying', description: 'Lobbying for healthcare',
      status: 'active', issueArea: 'healthcare', targetOfficial: 'Rep. Jones',
      targetBody: 'House', startDate: '2028-01-01', endDate: '2028-06-30',
      budget: 100000, coordinator: 'Jane', participants: ['A', 'B'],
      talkingPoints: 'Expand coverage', notes: 'High priority',
    }, 'user-1');
    assert.equal(c.name, 'Healthcare Reform');
    assert.equal(c.type, 'direct_lobbying');
    assert.equal(c.status, 'active');
    assert.equal(c.budget, 100000);
    assert.equal(c.coordinator, 'Jane');
  });

  it('gets a campaign by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await PoliticalAdvocacyService.getCampaign('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.name, 'Tax Reform Campaign');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'lobbying_activity' });
    const c = await PoliticalAdvocacyService.getCampaign('mem-1');
    assert.equal(c, null);
  });

  it('returns null when campaign not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await PoliticalAdvocacyService.getCampaign('nope');
    assert.equal(c, null);
  });

  it('lists campaigns by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'advocacy_campaign') return [makeRow()];
      return [];
    };
    const list = await PoliticalAdvocacyService.listCampaigns('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Tax Reform Campaign');
  });

  it('updates a campaign', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.updateCampaign('mem-1', { status: 'active' });
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('deletes a campaign', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PoliticalAdvocacyService.deleteCampaign('mem-1');
    assert.equal(ok, true);
  });

  it('planCampaign sets status to planned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.planCampaign('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'planned');
  });

  it('activateCampaign sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.activateCampaign('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('pauseCampaign sets status to paused', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.pauseCampaign('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'paused');
  });

  it('completeCampaign sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.completeCampaign('mem-1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Lobbying
// ─────────────────────────────────────────────────────────────────────────────

describe('PoliticalAdvocacyService — Lobbying', () => {
  beforeEach(() => resetMock());

  it('creates a lobbying activity with defaults', async () => {
    memCreateImpl = async (args) => makeLobbyingRow({ content: args.data.content as string });
    const l = await PoliticalAdvocacyService.createLobbying('org-1', 'ws-1', {
      title: 'House Meeting', type: 'direct',
    }, 'user-1');
    assert.equal(l.title, 'House Meeting');
    assert.equal(l.status, 'planned');
    assert.equal(l.duration, 0);
    assert.equal(l.expenses, 0);
  });

  it('creates a lobbying activity with full input', async () => {
    memCreateImpl = async (args) => makeLobbyingRow({ content: args.data.content as string });
    const l = await PoliticalAdvocacyService.createLobbying('org-1', 'ws-1', {
      title: 'Senate Lobbying', type: 'federal', description: 'Federal lobbying effort',
      status: 'active', issueArea: 'finance', targetOfficial: 'Senator Doe',
      targetBody: 'Senate', lobbyist: 'Jane', date: '2028-04-01',
      duration: 120, expenses: 1500, outcome: 'Positive', notes: 'Follow up needed',
    }, 'user-1');
    assert.equal(l.title, 'Senate Lobbying');
    assert.equal(l.type, 'federal');
    assert.equal(l.status, 'active');
    assert.equal(l.duration, 120);
    assert.equal(l.expenses, 1500);
    assert.equal(l.outcome, 'Positive');
  });

  it('gets a lobbying activity by id', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow();
    const l = await PoliticalAdvocacyService.getLobbying('mem-l1');
    assert.ok(l);
    assert.equal(l!.title, 'Senate Lobbying Meeting');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow({ type: 'advocacy_campaign' });
    const l = await PoliticalAdvocacyService.getLobbying('mem-l1');
    assert.equal(l, null);
  });

  it('lists lobbying activities by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'lobbying_activity') return [makeLobbyingRow()];
      return [];
    };
    const list = await PoliticalAdvocacyService.listLobbying('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a lobbying activity', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow();
    memUpdateImpl = async (args) => makeLobbyingRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PoliticalAdvocacyService.updateLobbying('mem-l1', { status: 'active' });
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('deletes a lobbying activity', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await PoliticalAdvocacyService.deleteLobbying('mem-l1');
    assert.equal(ok, true);
  });

  it('activateLobbying sets status to active', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow();
    memUpdateImpl = async (args) => makeLobbyingRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PoliticalAdvocacyService.activateLobbying('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('completeLobbying sets status to completed', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow();
    memUpdateImpl = async (args) => makeLobbyingRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PoliticalAdvocacyService.completeLobbying('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'completed');
  });

  it('holdLobbying sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeLobbyingRow();
    memUpdateImpl = async (args) => makeLobbyingRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PoliticalAdvocacyService.holdLobbying('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'on_hold');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Positions
// ─────────────────────────────────────────────────────────────────────────────

describe('PoliticalAdvocacyService — Positions', () => {
  beforeEach(() => resetMock());

  it('creates a position with defaults', async () => {
    memCreateImpl = async (args) => makePositionRow({ content: args.data.content as string });
    const p = await PoliticalAdvocacyService.createPosition('org-1', 'ws-1', {
      title: 'Position on Bill X', type: 'support', issueArea: 'taxation',
    }, 'user-1');
    assert.equal(p.title, 'Position on Bill X');
    assert.equal(p.status, 'draft');
    assert.equal(p.billNumber, '');
  });

  it('creates a position with full input', async () => {
    memCreateImpl = async (args) => makePositionRow({ content: args.data.content as string });
    const p = await PoliticalAdvocacyService.createPosition('org-1', 'ws-1', {
      title: 'Oppose Bill Y', type: 'oppose', issueArea: 'environment',
      description: 'Oppose environmental deregulation', status: 'published',
      billNumber: 'S-5678', summary: 'Deregulation bill', rationale: 'Harms environment',
      recommendations: 'Vote no', publishedDate: '2028-02-01', notes: 'Priority',
    }, 'user-1');
    assert.equal(p.title, 'Oppose Bill Y');
    assert.equal(p.type, 'oppose');
    assert.equal(p.status, 'published');
    assert.equal(p.billNumber, 'S-5678');
  });

  it('gets a position by id', async () => {
    memFindUniqueImpl = async () => makePositionRow();
    const p = await PoliticalAdvocacyService.getPosition('mem-pos1');
    assert.ok(p);
    assert.equal(p!.title, 'Support Tax Reform Bill');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePositionRow({ type: 'advocacy_campaign' });
    const p = await PoliticalAdvocacyService.getPosition('mem-pos1');
    assert.equal(p, null);
  });

  it('lists positions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'policy_position') return [makePositionRow()];
      return [];
    };
    const list = await PoliticalAdvocacyService.listPositions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a position', async () => {
    memFindUniqueImpl = async () => makePositionRow();
    memUpdateImpl = async (args) => makePositionRow({ id: 'mem-pos1', content: args.data.content as string });
    const p = await PoliticalAdvocacyService.updatePosition('mem-pos1', { status: 'published' });
    assert.ok(p);
    assert.equal(p!.status, 'published');
  });

  it('deletes a position', async () => {
    memDeleteImpl = async () => ({ id: 'mem-pos1' });
    const ok = await PoliticalAdvocacyService.deletePosition('mem-pos1');
    assert.equal(ok, true);
  });

  it('publishPosition sets status to published', async () => {
    memFindUniqueImpl = async () => makePositionRow();
    memUpdateImpl = async (args) => makePositionRow({ id: 'mem-pos1', content: args.data.content as string });
    const p = await PoliticalAdvocacyService.publishPosition('mem-pos1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'published');
  });

  it('archivePosition sets status to archived', async () => {
    memFindUniqueImpl = async () => makePositionRow();
    memUpdateImpl = async (args) => makePositionRow({ id: 'mem-pos1', content: args.data.content as string });
    const p = await PoliticalAdvocacyService.archivePosition('mem-pos1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });

  it('updatePositionStatus sets status to updated', async () => {
    memFindUniqueImpl = async () => makePositionRow();
    memUpdateImpl = async (args) => makePositionRow({ id: 'mem-pos1', content: args.data.content as string });
    const p = await PoliticalAdvocacyService.updatePositionStatus('mem-pos1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'updated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Contributions
// ─────────────────────────────────────────────────────────────────────────────

describe('PoliticalAdvocacyService — Contributions', () => {
  beforeEach(() => resetMock());

  it('creates a contribution with defaults', async () => {
    memCreateImpl = async (args) => makeContributionRow({ content: args.data.content as string });
    const c = await PoliticalAdvocacyService.createContribution('org-1', 'ws-1', {
      recipient: 'Smith Campaign', type: 'pac', amount: 1000,
    }, 'user-1');
    assert.equal(c.recipient, 'Smith Campaign');
    assert.equal(c.status, 'pending_approval');
    assert.equal(c.currency, 'USD');
    assert.equal(c.approvalRequired, false);
  });

  it('creates a contribution with full input', async () => {
    memCreateImpl = async (args) => makeContributionRow({ content: args.data.content as string });
    const c = await PoliticalAdvocacyService.createContribution('org-1', 'ws-1', {
      recipient: 'Jones Campaign', type: 'direct', amount: 2500, currency: 'EUR',
      description: 'Direct contribution', status: 'pledged', date: '2028-05-01',
      recipientType: 'candidate', committee: 'Our Committee', purpose: 'Ad buy',
      approvalRequired: true, approvedBy: 'Jane', notes: 'Approved',
    }, 'user-1');
    assert.equal(c.recipient, 'Jones Campaign');
    assert.equal(c.type, 'direct');
    assert.equal(c.amount, 2500);
    assert.equal(c.status, 'pledged');
    assert.equal(c.approvalRequired, true);
    assert.equal(c.approvedBy, 'Jane');
  });

  it('gets a contribution by id', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    const c = await PoliticalAdvocacyService.getContribution('mem-con1');
    assert.ok(c);
    assert.equal(c!.recipient, 'Campaign for Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeContributionRow({ type: 'advocacy_campaign' });
    const c = await PoliticalAdvocacyService.getContribution('mem-con1');
    assert.equal(c, null);
  });

  it('lists contributions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'pac_contribution') return [makeContributionRow()];
      return [];
    };
    const list = await PoliticalAdvocacyService.listContributions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a contribution', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.updateContribution('mem-con1', { amount: 10000 });
    assert.ok(c);
    assert.equal(c!.amount, 10000);
  });

  it('deletes a contribution', async () => {
    memDeleteImpl = async () => ({ id: 'mem-con1' });
    const ok = await PoliticalAdvocacyService.deleteContribution('mem-con1');
    assert.equal(ok, true);
  });

  it('pledgeContribution sets status to pledged', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.pledgeContribution('mem-con1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'pledged');
  });

  it('receiveContribution sets status to received', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.receiveContribution('mem-con1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'received');
  });

  it('disburseContribution sets status to disbursed', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.disburseContribution('mem-con1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'disbursed');
  });

  it('cancelContribution sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.cancelContribution('mem-con1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'cancelled');
  });

  it('refundContribution sets status to refunded', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.refundContribution('mem-con1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'refunded');
  });

  it('approveContribution sets status to received and approvedBy', async () => {
    memFindUniqueImpl = async () => makeContributionRow();
    memUpdateImpl = async (args) => makeContributionRow({ id: 'mem-con1', content: args.data.content as string });
    const c = await PoliticalAdvocacyService.approveContribution('mem-con1', 'Jane');
    assert.ok(c);
    assert.equal(c!.status, 'received');
    assert.equal(c!.approvedBy, 'Jane');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PoliticalAdvocacyService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPoliticalAdvocacyMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'advocacy_campaign') return [
        makeRow({ content: JSON.stringify({ name: 'C1', type: 'grassroots', status: 'active', description: '', issueArea: '', targetOfficial: '', targetBody: '', startDate: null, endDate: null, budget: 0, coordinator: '', participants: [], talkingPoints: '', notes: '' }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ name: 'C2', type: 'digital', status: 'draft', description: '', issueArea: '', targetOfficial: '', targetBody: '', startDate: null, endDate: null, budget: 0, coordinator: '', participants: [], talkingPoints: '', notes: '' }) }),
      ];
      if (t === 'lobbying_activity') return [
        makeLobbyingRow({ content: JSON.stringify({ title: 'L1', type: 'direct', status: 'active', description: '', issueArea: '', targetOfficial: '', targetBody: '', lobbyist: '', date: null, duration: 0, expenses: 0, outcome: '', notes: '' }) }),
      ];
      if (t === 'policy_position') return [
        makePositionRow({ content: JSON.stringify({ title: 'P1', type: 'support', issueArea: 'taxation', status: 'published', description: '', billNumber: '', summary: '', rationale: '', recommendations: '', publishedDate: null, notes: '' }) }),
      ];
      if (t === 'pac_contribution') return [
        makeContributionRow({ content: JSON.stringify({ recipient: 'R1', type: 'pac', amount: 1000, currency: 'USD', status: 'pending_approval', description: '', date: null, recipientType: '', committee: '', purpose: '', approvalRequired: false, approvedBy: '', notes: '' }) }),
        makeContributionRow({ id: 'con2', content: JSON.stringify({ recipient: 'R2', type: 'direct', amount: 2000, currency: 'USD', status: 'received', description: '', date: null, recipientType: '', committee: '', purpose: '', approvalRequired: false, approvedBy: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await PoliticalAdvocacyService.getPoliticalAdvocacyMetrics('org-1');
    assert.equal(m.activeCampaigns, 1);
    assert.equal(m.activeLobbying, 1);
    assert.equal(m.publishedPositions, 1);
    assert.equal(m.pendingContributions, 1);
    assert.equal(m.totalContributionAmount, 3000);
  });

  it('getPoliticalAdvocacyStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'advocacy_campaign') return [makeRow()];
      if (t === 'lobbying_activity') return [makeLobbyingRow()];
      if (t === 'policy_position') return [makePositionRow()];
      if (t === 'pac_contribution') return [makeContributionRow()];
      return [];
    };
    const s = await PoliticalAdvocacyService.getPoliticalAdvocacyStats('org-1');
    assert.equal(s.campaignCount, 1);
    assert.equal(s.lobbyingCount, 1);
    assert.equal(s.positionCount, 1);
    assert.equal(s.contributionCount, 1);
    assert.equal(s.byCampaignType['grassroots'], 1);
    assert.equal(s.byCampaignStatus['draft'], 1);
    assert.equal(s.byLobbyingType['direct'], 1);
    assert.equal(s.byLobbyingStatus['planned'], 1);
    assert.equal(s.byPositionType['support'], 1);
    assert.equal(s.byPositionStatus['draft'], 1);
    assert.equal(s.byContributionType['pac'], 1);
    assert.equal(s.byContributionStatus['pending_approval'], 1);
  });
});
