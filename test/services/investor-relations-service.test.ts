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
    type: 'ir_investor',
    content: JSON.stringify({ name: 'Test', type: 'vc', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: '', portfolioCompanies: [], status: 'active', notes: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['ir_investor', 'vc', 'active']),
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

const { InvestorRelationsService } = await import('@/lib/services/investor-relations-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InvestorRelationsService', () => {
  beforeEach(() => { resetMock(); });

  // ── Investors ──

  describe('createInvestor', () => {
    it('creates an investor with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_investor', content: args.data.content as string });
      const inv = await InvestorRelationsService.createInvestor('org-1', 'ws-1', { name: 'Sequoia', type: 'vc' }, 'user-1');
      assert.equal(inv.name, 'Sequoia');
      assert.equal(inv.type, 'vc');
      assert.equal(inv.status, 'active');
      assert.equal(inv.firm, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_investor', content: args.data.content as string });
      const inv = await InvestorRelationsService.createInvestor('org-1', 'ws-1', {
        name: 'Andreessen', type: 'vc', firm: 'a16z', email: 'test@test.com',
        investmentFocus: 'AI', checkSize: '$10M', stage: 'seed',
        portfolioCompanies: ['c1', 'c2'], status: 'invested', notes: 'n',
      }, 'user-1');
      assert.equal(inv.firm, 'a16z');
      assert.equal(inv.checkSize, '$10M');
      assert.equal(inv.portfolioCompanies.length, 2);
      assert.equal(inv.status, 'invested');
    });
  });

  describe('getInvestor', () => {
    it('returns an investor when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      const inv = await InvestorRelationsService.getInvestor('mem-1');
      assert.ok(inv);
      assert.equal(inv!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const inv = await InvestorRelationsService.getInvestor('nope');
      assert.equal(inv, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_funding_round' });
      const inv = await InvestorRelationsService.getInvestor('mem-1');
      assert.equal(inv, null);
    });
  });

  describe('listInvestors', () => {
    it('lists investors and filters by type, status, stage', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'i1', content: JSON.stringify({ name: 'A', type: 'vc', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: 'seed', portfolioCompanies: [], status: 'active', notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ name: 'B', type: 'angel', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: 'pre_seed', portfolioCompanies: [], status: 'passed', notes: '' }) }),
      ];
      const list = await InvestorRelationsService.listInvestors('org-1', { type: 'vc', status: 'active', stage: 'seed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'vc');
    });
  });

  describe('updateInvestor', () => {
    it('updates investor fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      memUpdateImpl = async (args) => makeRow({ type: 'ir_investor', content: args.data.content as string });
      const inv = await InvestorRelationsService.updateInvestor('mem-1', { name: 'Updated', status: 'invested' });
      assert.ok(inv);
      assert.equal(inv!.name, 'Updated');
      assert.equal(inv!.status, 'invested');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const inv = await InvestorRelationsService.updateInvestor('nope', { name: 'X' });
      assert.equal(inv, null);
    });
  });

  describe('deleteInvestor', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InvestorRelationsService.deleteInvestor('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await InvestorRelationsService.deleteInvestor('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Funding Rounds ──

  describe('createFundingRound', () => {
    it('creates a funding round with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_funding_round', content: args.data.content as string });
      const round = await InvestorRelationsService.createFundingRound('org-1', 'ws-1', { name: 'Seed Round', type: 'seed', targetAmount: 5000000 }, 'user-1');
      assert.equal(round.name, 'Seed Round');
      assert.equal(round.type, 'seed');
      assert.equal(round.status, 'planned');
      assert.equal(round.raisedAmount, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_funding_round', content: args.data.content as string });
      const round = await InvestorRelationsService.createFundingRound('org-1', 'ws-1', {
        name: 'Series A', type: 'series_a', targetAmount: 10000000, raisedAmount: 5000000,
        preMoneyValuation: 20000000, postMoneyValuation: 30000000, dilution: 25,
        leadInvestor: 'Sequoia', participants: [{ investorId: 'i1', amount: 1000000 }],
        status: 'open', startDate: '2024-01-01', closeDate: '2024-06-01', terms: 'preferred', notes: 'n',
      }, 'user-1');
      assert.equal(round.raisedAmount, 5000000);
      assert.equal(round.leadInvestor, 'Sequoia');
      assert.equal(round.participants.length, 1);
      assert.equal(round.dilution, 25);
    });
  });

  describe('getFundingRound', () => {
    it('returns a funding round when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_funding_round', content: JSON.stringify({ name: 'R', type: 'seed', targetAmount: 0, raisedAmount: 0, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'planned', startDate: null, closeDate: null, terms: '', notes: '' }) });
      const round = await InvestorRelationsService.getFundingRound('mem-1');
      assert.ok(round);
      assert.equal(round!.name, 'R');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      const round = await InvestorRelationsService.getFundingRound('mem-1');
      assert.equal(round, null);
    });
  });

  describe('listFundingRounds', () => {
    it('lists funding rounds and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'ir_funding_round', content: JSON.stringify({ name: 'A', type: 'seed', targetAmount: 0, raisedAmount: 0, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'open', startDate: null, closeDate: null, terms: '', notes: '' }) }),
        makeRow({ id: 'r2', type: 'ir_funding_round', content: JSON.stringify({ name: 'B', type: 'series_a', targetAmount: 0, raisedAmount: 0, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'closed', startDate: null, closeDate: null, terms: '', notes: '' }) }),
      ];
      const list = await InvestorRelationsService.listFundingRounds('org-1', { type: 'seed', status: 'open' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'seed');
    });
  });

  describe('closeFundingRound', () => {
    it('closes a funding round', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_funding_round', content: JSON.stringify({ name: 'R', type: 'seed', targetAmount: 5000000, raisedAmount: 3000000, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'open', startDate: null, closeDate: null, terms: '', notes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ir_funding_round', content: args.data.content as string });
      const round = await InvestorRelationsService.closeFundingRound('mem-1', 5000000, 'user-1');
      assert.ok(round);
      assert.equal(round!.status, 'closed');
      assert.equal(round!.raisedAmount, 5000000);
      assert.ok(round!.closeDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const round = await InvestorRelationsService.closeFundingRound('nope', 0, 'u');
      assert.equal(round, null);
    });
  });

  // ── Cap Table ──

  describe('createCapTableEntry', () => {
    it('creates a cap table entry with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_cap_table_entry', content: args.data.content as string });
      const entry = await InvestorRelationsService.createCapTableEntry('org-1', 'ws-1', { stakeholderName: 'Founder', stakeholderType: 'founder', shares: 1000000, shareClass: 'common' }, 'user-1');
      assert.equal(entry.stakeholderName, 'Founder');
      assert.equal(entry.stakeholderType, 'founder');
      assert.equal(entry.shares, 1000000);
      assert.equal(entry.shareClass, 'common');
      assert.equal(entry.vestingSchedule, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_cap_table_entry', content: args.data.content as string });
      const entry = await InvestorRelationsService.createCapTableEntry('org-1', 'ws-1', {
        stakeholderName: 'VC', stakeholderType: 'investor', shares: 500000, shareClass: 'preferred_a',
        pricePerShare: 10, ownershipPercent: 25, vestingSchedule: '4yr/1yr', grantDate: '2024-01-01', notes: 'n',
      }, 'user-1');
      assert.equal(entry.pricePerShare, 10);
      assert.equal(entry.ownershipPercent, 25);
      assert.equal(entry.vestingSchedule, '4yr/1yr');
    });
  });

  describe('getCapTableEntry', () => {
    it('returns a cap table entry when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'S', stakeholderType: 'founder', shares: 0, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) });
      const entry = await InvestorRelationsService.getCapTableEntry('mem-1');
      assert.ok(entry);
      assert.equal(entry!.stakeholderName, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      const entry = await InvestorRelationsService.getCapTableEntry('mem-1');
      assert.equal(entry, null);
    });
  });

  describe('listCapTable', () => {
    it('lists cap table entries and filters by stakeholderType and shareClass', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'A', stakeholderType: 'founder', shares: 100, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
        makeRow({ id: 'e2', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'B', stakeholderType: 'investor', shares: 200, shareClass: 'preferred_a', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
      ];
      const list = await InvestorRelationsService.listCapTable('org-1', { stakeholderType: 'founder', shareClass: 'common' });
      assert.equal(list.length, 1);
      assert.equal(list[0].stakeholderType, 'founder');
    });
  });

  describe('deleteCapTableEntry', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InvestorRelationsService.deleteCapTableEntry('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('getCapTableSummary', () => {
    it('returns summary with correct totals', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'A', stakeholderType: 'founder', shares: 600, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
        makeRow({ id: 'e2', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'B', stakeholderType: 'investor', shares: 400, shareClass: 'preferred_a', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
      ];
      const summary = await InvestorRelationsService.getCapTableSummary('org-1');
      assert.equal(summary.totalShares, 1000);
      assert.equal(summary.entries, 2);
      assert.equal(summary.byStakeholderType['founder'], 600);
      assert.equal(summary.byStakeholderType['investor'], 400);
      assert.equal(summary.byShareClass['common'], 600);
      assert.equal(summary.byShareClass['preferred_a'], 400);
    });
  });

  // ── Communications ──

  describe('createCommunication', () => {
    it('creates a communication with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_communication', content: args.data.content as string });
      const comm = await InvestorRelationsService.createCommunication('org-1', 'ws-1', { investorId: 'i1', type: 'email', subject: 'Q1 Update', date: '2024-03-01' }, 'user-1');
      assert.equal(comm.subject, 'Q1 Update');
      assert.equal(comm.type, 'email');
      assert.equal(comm.status, 'sent');
      assert.equal(comm.investorId, 'i1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_communication', content: args.data.content as string });
      const comm = await InvestorRelationsService.createCommunication('org-1', 'ws-1', {
        investorId: 'i1', type: 'meeting', subject: 'Board Meeting', date: '2024-06-01',
        summary: 's', outcome: 'o', followUp: 'f', status: 'scheduled',
      }, 'user-1');
      assert.equal(comm.type, 'meeting');
      assert.equal(comm.status, 'scheduled');
      assert.equal(comm.outcome, 'o');
    });
  });

  describe('getCommunication', () => {
    it('returns a communication when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_communication', content: JSON.stringify({ investorId: 'i1', type: 'email', subject: 'S', date: '', summary: '', outcome: '', followUp: '', status: 'sent' }) });
      const comm = await InvestorRelationsService.getCommunication('mem-1');
      assert.ok(comm);
      assert.equal(comm!.subject, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      const comm = await InvestorRelationsService.getCommunication('mem-1');
      assert.equal(comm, null);
    });
  });

  describe('listCommunications', () => {
    it('lists communications and filters by investorId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'ir_communication', content: JSON.stringify({ investorId: 'i1', type: 'email', subject: 'A', date: '', summary: '', outcome: '', followUp: '', status: 'sent' }) }),
        makeRow({ id: 'c2', type: 'ir_communication', content: JSON.stringify({ investorId: 'i2', type: 'call', subject: 'B', date: '', summary: '', outcome: '', followUp: '', status: 'received' }) }),
      ];
      const list = await InvestorRelationsService.listCommunications('org-1', { investorId: 'i1', type: 'email', status: 'sent' });
      assert.equal(list.length, 1);
      assert.equal(list[0].investorId, 'i1');
    });
  });

  // ── Updates ──

  describe('createUpdate', () => {
    it('creates an update with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_update', content: args.data.content as string });
      const update = await InvestorRelationsService.createUpdate('org-1', 'ws-1', { title: 'Q1 Update', period: 'Q1 2024', content: 'Great quarter' }, 'user-1');
      assert.equal(update.title, 'Q1 Update');
      assert.equal(update.period, 'Q1 2024');
      assert.equal(update.status, 'draft');
      assert.equal(update.highlights.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ir_update', content: args.data.content as string });
      const update = await InvestorRelationsService.createUpdate('org-1', 'ws-1', {
        title: 'Q2', period: 'Q2 2024', content: 'c', metrics: [{ name: 'MRR', value: '100k', unit: '$', trend: 'up' }],
        highlights: ['h1'], challenges: ['c1'], financials: 'f', status: 'published', sentTo: ['i1'], date: '2024-06-01',
      }, 'user-1');
      assert.equal(update.metrics.length, 1);
      assert.equal(update.highlights.length, 1);
      assert.equal(update.status, 'published');
      assert.equal(update.sentTo.length, 1);
    });
  });

  describe('getUpdate', () => {
    it('returns an update when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_update', content: JSON.stringify({ title: 'U', period: '', content: '', metrics: [], highlights: [], challenges: [], financials: '', status: 'draft', sentTo: [], date: '', publishedBy: null, publishedAt: null }) });
      const update = await InvestorRelationsService.getUpdate('mem-1');
      assert.ok(update);
      assert.equal(update!.title, 'U');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_investor' });
      const update = await InvestorRelationsService.getUpdate('mem-1');
      assert.equal(update, null);
    });
  });

  describe('listUpdates', () => {
    it('lists updates and filters by status and period', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'u1', type: 'ir_update', content: JSON.stringify({ title: 'A', period: 'Q1 2024', content: '', metrics: [], highlights: [], challenges: [], financials: '', status: 'published', sentTo: [], date: '', publishedBy: null, publishedAt: null }) }),
        makeRow({ id: 'u2', type: 'ir_update', content: JSON.stringify({ title: 'B', period: 'Q2 2024', content: '', metrics: [], highlights: [], challenges: [], financials: '', status: 'draft', sentTo: [], date: '', publishedBy: null, publishedAt: null }) }),
      ];
      const list = await InvestorRelationsService.listUpdates('org-1', { status: 'published', period: 'Q1 2024' });
      assert.equal(list.length, 1);
      assert.equal(list[0].status, 'published');
    });
  });

  describe('publishUpdate', () => {
    it('publishes an update', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ir_update', content: JSON.stringify({ title: 'U', period: '', content: '', metrics: [], highlights: [], challenges: [], financials: '', status: 'draft', sentTo: [], date: '', publishedBy: null, publishedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ir_update', content: args.data.content as string });
      const update = await InvestorRelationsService.publishUpdate('mem-1', 'user-1');
      assert.ok(update);
      assert.equal(update!.status, 'published');
      assert.equal(update!.publishedBy, 'user-1');
      assert.ok(update!.publishedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const update = await InvestorRelationsService.publishUpdate('nope', 'u');
      assert.equal(update, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getIRMetrics', () => {
    it('returns metrics with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'ir_investor') return [
          makeRow({ id: 'i1', content: JSON.stringify({ name: 'A', type: 'vc', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: '', portfolioCompanies: [], status: 'active', notes: '' }) }),
        ];
        if (where.type === 'ir_funding_round') return [
          makeRow({ id: 'r1', type: 'ir_funding_round', content: JSON.stringify({ name: 'Seed', type: 'seed', targetAmount: 5000000, raisedAmount: 3000000, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'closed', startDate: null, closeDate: null, terms: '', notes: '' }) }),
        ];
        if (where.type === 'ir_cap_table_entry') return [
          makeRow({ id: 'e1', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'A', stakeholderType: 'founder', shares: 1000, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
        ];
        if (where.type === 'ir_update') return [];
        return [];
      };
      const metrics = await InvestorRelationsService.getIRMetrics('org-1');
      assert.equal(metrics.totalRaised, 3000000);
      assert.equal(metrics.investorCountByType['vc'], 1);
      assert.equal(metrics.capTableSummary.totalShares, 1000);
      assert.equal(metrics.fundingProgress.length, 1);
    });
  });

  describe('getStats', () => {
    it('returns stats with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'ir_investor') return [
          makeRow({ id: 'i1', content: JSON.stringify({ name: 'A', type: 'vc', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: '', portfolioCompanies: [], status: 'active', notes: '' }) }),
          makeRow({ id: 'i2', content: JSON.stringify({ name: 'B', type: 'angel', firm: '', email: '', phone: '', investmentFocus: '', checkSize: '', stage: '', portfolioCompanies: [], status: 'invested', notes: '' }) }),
        ];
        if (where.type === 'ir_funding_round') return [
          makeRow({ id: 'r1', type: 'ir_funding_round', content: JSON.stringify({ name: 'Seed', type: 'seed', targetAmount: 5000000, raisedAmount: 3000000, preMoneyValuation: null, postMoneyValuation: null, dilution: null, leadInvestor: '', participants: [], status: 'closed', startDate: null, closeDate: null, terms: '', notes: '' }) }),
        ];
        if (where.type === 'ir_cap_table_entry') return [
          makeRow({ id: 'e1', type: 'ir_cap_table_entry', content: JSON.stringify({ stakeholderName: 'A', stakeholderType: 'founder', shares: 1000, shareClass: 'common', pricePerShare: null, ownershipPercent: null, vestingSchedule: '', grantDate: null, notes: '' }) }),
        ];
        if (where.type === 'ir_communication') return [
          makeRow({ id: 'c1', type: 'ir_communication', content: JSON.stringify({ investorId: 'i1', type: 'email', subject: 'S', date: '', summary: '', outcome: '', followUp: '', status: 'sent' }) }),
        ];
        if (where.type === 'ir_update') return [];
        return [];
      };
      const stats = await InvestorRelationsService.getStats('org-1');
      assert.equal(stats.investorCount, 2);
      assert.equal(stats.fundingRoundCount, 1);
      assert.equal(stats.capTableEntryCount, 1);
      assert.equal(stats.communicationCount, 1);
      assert.equal(stats.totalRaised, 3000000);
      assert.equal(stats.totalTarget, 5000000);
      assert.equal(stats.activeInvestorCount, 2);
      assert.equal(stats.byInvestorType['vc'], 1);
      assert.equal(stats.byInvestorType['angel'], 1);
      assert.equal(stats.byFundingRoundStatus['closed'], 1);
    });
  });
});
