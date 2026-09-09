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
    type: 'partner_profile',
    content: JSON.stringify({ name: 'Test', type: 'reseller', tier: 'none', status: 'active', contactName: '', contactEmail: '', contactPhone: '', region: '', industry: '', website: '', dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['partner_profile', 'reseller', 'none', 'active']),
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

const { PartnerService } = await import('@/lib/services/partner-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PartnerService', () => {
  beforeEach(() => { resetMock(); });

  // ── Partners ──

  describe('createPartner', () => {
    it('creates a partner with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_profile', content: args.data.content as string });
      const p = await PartnerService.createPartner('org-1', 'ws-1', { name: 'Acme', type: 'reseller' }, 'user-1');
      assert.equal(p.name, 'Acme');
      assert.equal(p.type, 'reseller');
      assert.equal(p.tier, 'none');
      assert.equal(p.status, 'active');
      assert.equal(p.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_profile', content: args.data.content as string });
      const p = await PartnerService.createPartner('org-1', 'ws-1', {
        name: 'Corp', type: 'technology', tier: 'gold', status: 'active', contactName: 'alice', contactEmail: 'a@b.com', region: 'US', industry: 'tech', dealRegistrationEnabled: true, marginRate: 20,
      }, 'user-1');
      assert.equal(p.tier, 'gold');
      assert.equal(p.contactName, 'alice');
      assert.equal(p.dealRegistrationEnabled, true);
      assert.equal(p.marginRate, 20);
    });
  });

  describe('getPartner', () => {
    it('returns a partner when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      const p = await PartnerService.getPartner('mem-1');
      assert.ok(p);
      assert.equal(p!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await PartnerService.getPartner('nope');
      assert.equal(p, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_program' });
      const p = await PartnerService.getPartner('mem-1');
      assert.equal(p, null);
    });
  });

  describe('listPartners', () => {
    it('lists partners', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'p1' }), makeRow({ id: 'p2' })];
      const list = await PartnerService.listPartners('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type, tier, status, region', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', content: JSON.stringify({ name: 'A', type: 'reseller', tier: 'gold', status: 'active', contactName: '', contactEmail: '', contactPhone: '', region: 'US', industry: '', website: '', dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'B', type: 'referral', tier: 'silver', status: 'inactive', contactName: '', contactEmail: '', contactPhone: '', region: 'EU', industry: '', website: '', dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '' }) }),
      ];
      const list = await PartnerService.listPartners('org-1', { type: 'reseller', tier: 'gold', status: 'active', region: 'US' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updatePartner', () => {
    it('updates partner fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_profile', content: args.data.content as string });
      const p = await PartnerService.updatePartner('mem-1', { name: 'Updated', status: 'suspended' });
      assert.ok(p);
      assert.equal(p!.name, 'Updated');
      assert.equal(p!.status, 'suspended');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await PartnerService.updatePartner('nope', { name: 'X' });
      assert.equal(p, null);
    });
  });

  describe('deletePartner', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PartnerService.deletePartner('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await PartnerService.deletePartner('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('upgradeTier', () => {
    it('upgrades a partner tier', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_profile', content: args.data.content as string });
      const p = await PartnerService.upgradeTier('mem-1', 'platinum', 'admin');
      assert.ok(p);
      assert.equal(p!.tier, 'platinum');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await PartnerService.upgradeTier('nope', 'gold', 'u');
      assert.equal(p, null);
    });
  });

  // ── Programs ──

  describe('createProgram', () => {
    it('creates a program with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_program', content: args.data.content as string });
      const p = await PartnerService.createProgram('org-1', 'ws-1', { name: 'Channel', type: 'channel' }, 'user-1');
      assert.equal(p.name, 'Channel');
      assert.equal(p.type, 'channel');
      assert.equal(p.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_program', content: args.data.content as string });
      const p = await PartnerService.createProgram('org-1', 'ws-1', {
        name: 'Alliance', description: 'd', type: 'alliance', requirements: ['r1'], benefits: ['b1'], marginRate: 15, status: 'inactive', startDate: '2024-01-01',
      }, 'user-1');
      assert.equal(p.type, 'alliance');
      assert.equal(p.requirements.length, 1);
      assert.equal(p.benefits.length, 1);
      assert.equal(p.marginRate, 15);
    });
  });

  describe('getProgram', () => {
    it('returns a program when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_program', content: JSON.stringify({ name: 'P', description: '', type: 'channel', requirements: [], benefits: [], marginRate: null, status: 'active', startDate: null, endDate: null }) });
      const p = await PartnerService.getProgram('mem-1');
      assert.ok(p);
      assert.equal(p!.name, 'P');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      const p = await PartnerService.getProgram('mem-1');
      assert.equal(p, null);
    });
  });

  describe('listPrograms', () => {
    it('lists programs and filters by type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'partner_program', content: JSON.stringify({ name: 'A', description: '', type: 'channel', requirements: [], benefits: [], marginRate: null, status: 'active', startDate: null, endDate: null }) }),
        makeRow({ id: 'p2', type: 'partner_program', content: JSON.stringify({ name: 'B', description: '', type: 'referral', requirements: [], benefits: [], marginRate: null, status: 'archived', startDate: null, endDate: null }) }),
      ];
      const list = await PartnerService.listPrograms('org-1', { type: 'channel', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateProgram', () => {
    it('updates program fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_program', content: JSON.stringify({ name: 'Old', description: '', type: 'channel', requirements: [], benefits: [], marginRate: null, status: 'active', startDate: null, endDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_program', content: args.data.content as string });
      const p = await PartnerService.updateProgram('mem-1', { name: 'New', status: 'archived' });
      assert.ok(p);
      assert.equal(p!.name, 'New');
      assert.equal(p!.status, 'archived');
    });
  });

  describe('deleteProgram', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PartnerService.deleteProgram('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Deals ──

  describe('createDeal', () => {
    it('creates a deal with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_deal', content: args.data.content as string });
      const d = await PartnerService.createDeal('org-1', 'ws-1', { partnerId: 'p1', customerName: 'Cust', dealValue: 5000, stage: 'registered' }, 'user-1');
      assert.equal(d.customerName, 'Cust');
      assert.equal(d.dealValue, 5000);
      assert.equal(d.stage, 'registered');
      assert.equal(d.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_deal', content: args.data.content as string });
      const d = await PartnerService.createDeal('org-1', 'ws-1', {
        partnerId: 'p1', customerName: 'Cust', dealValue: 10000, stage: 'qualified', expectedCloseDate: '2024-12-01', description: 'd', dealType: 'new', margin: 20,
      }, 'user-1');
      assert.equal(d.dealType, 'new');
      assert.equal(d.margin, 20);
    });
  });

  describe('getDeal', () => {
    it('returns a deal when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'C', dealValue: 0, stage: 'registered', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'active', closedBy: '', closedAt: null, closeNotes: '' }) });
      const d = await PartnerService.getDeal('mem-1');
      assert.ok(d);
      assert.equal(d!.customerName, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      const d = await PartnerService.getDeal('mem-1');
      assert.equal(d, null);
    });
  });

  describe('listDeals', () => {
    it('lists deals and filters by partnerId, stage, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'A', dealValue: 100, stage: 'registered', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'active', closedBy: '', closedAt: null, closeNotes: '' }) }),
        makeRow({ id: 'd2', type: 'partner_deal', content: JSON.stringify({ partnerId: 'p2', customerName: 'B', dealValue: 200, stage: 'closed_won', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-02', status: 'inactive', closedBy: '', closedAt: null, closeNotes: '' }) }),
      ];
      const list = await PartnerService.listDeals('org-1', { partnerId: 'p1', stage: 'registered', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].customerName, 'A');
    });
  });

  describe('updateDeal', () => {
    it('updates deal fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'C', dealValue: 0, stage: 'registered', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'active', closedBy: '', closedAt: null, closeNotes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_deal', content: args.data.content as string });
      const d = await PartnerService.updateDeal('mem-1', { dealValue: 5000, stage: 'negotiating' });
      assert.ok(d);
      assert.equal(d!.dealValue, 5000);
      assert.equal(d!.stage, 'negotiating');
    });
  });

  describe('closeDeal', () => {
    it('closes a deal as won', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'C', dealValue: 5000, stage: 'negotiating', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'active', closedBy: '', closedAt: null, closeNotes: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_deal', content: args.data.content as string });
      const d = await PartnerService.closeDeal('mem-1', 'closed_won', 'alice', 'great');
      assert.ok(d);
      assert.equal(d!.stage, 'closed_won');
      assert.equal(d!.status, 'inactive');
      assert.equal(d!.closedBy, 'alice');
      assert.equal(d!.closeNotes, 'great');
      assert.ok(d!.closedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await PartnerService.closeDeal('nope', 'closed_lost', 'u');
      assert.equal(d, null);
    });
  });

  // ── Co-Marketing ──

  describe('createCoMarketing', () => {
    it('creates a co-marketing campaign with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_comarketing', content: args.data.content as string });
      const c = await PartnerService.createCoMarketing('org-1', 'ws-1', { partnerId: 'p1', campaignName: 'Webinar', type: 'webinar' }, 'user-1');
      assert.equal(c.campaignName, 'Webinar');
      assert.equal(c.type, 'webinar');
      assert.equal(c.status, 'planned');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_comarketing', content: args.data.content as string });
      const c = await PartnerService.createCoMarketing('org-1', 'ws-1', {
        partnerId: 'p1', campaignName: 'Event', type: 'event', description: 'd', budget: 5000, costShare: 50, startDate: '2024-06-01', status: 'active', expectedLeads: 100,
      }, 'user-1');
      assert.equal(c.budget, 5000);
      assert.equal(c.costShare, 50);
      assert.equal(c.expectedLeads, 100);
    });
  });

  describe('getCoMarketing', () => {
    it('returns a co-marketing campaign when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_comarketing', content: JSON.stringify({ partnerId: '', campaignName: 'C', type: 'webinar', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'planned', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) });
      const c = await PartnerService.getCoMarketing('mem-1');
      assert.ok(c);
      assert.equal(c!.campaignName, 'C');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      const c = await PartnerService.getCoMarketing('mem-1');
      assert.equal(c, null);
    });
  });

  describe('listCoMarketing', () => {
    it('lists co-marketing and filters by partnerId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'partner_comarketing', content: JSON.stringify({ partnerId: 'p1', campaignName: 'A', type: 'webinar', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'planned', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) }),
        makeRow({ id: 'c2', type: 'partner_comarketing', content: JSON.stringify({ partnerId: 'p2', campaignName: 'B', type: 'event', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'completed', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) }),
      ];
      const list = await PartnerService.listCoMarketing('org-1', { partnerId: 'p1', type: 'webinar', status: 'planned' });
      assert.equal(list.length, 1);
      assert.equal(list[0].campaignName, 'A');
    });
  });

  describe('updateCoMarketing', () => {
    it('updates co-marketing fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_comarketing', content: JSON.stringify({ partnerId: '', campaignName: 'Old', type: 'webinar', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'planned', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_comarketing', content: args.data.content as string });
      const c = await PartnerService.updateCoMarketing('mem-1', { campaignName: 'New', status: 'active' });
      assert.ok(c);
      assert.equal(c!.campaignName, 'New');
      assert.equal(c!.status, 'active');
    });
  });

  describe('completeCoMarketing', () => {
    it('completes a co-marketing campaign', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_comarketing', content: JSON.stringify({ partnerId: '', campaignName: 'C', type: 'webinar', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'active', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_comarketing', content: args.data.content as string });
      const c = await PartnerService.completeCoMarketing('mem-1', 'great results', 'alice');
      assert.ok(c);
      assert.equal(c!.status, 'completed');
      assert.equal(c!.results, 'great results');
      assert.equal(c!.completedBy, 'alice');
      assert.ok(c!.completedAt);
    });
  });

  // ── Tiers ──

  describe('createTier', () => {
    it('creates a tier with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_tier', content: args.data.content as string });
      const t = await PartnerService.createTier('org-1', 'ws-1', { name: 'Gold', level: 'gold', requirements: {}, benefits: {} }, 'user-1');
      assert.equal(t.name, 'Gold');
      assert.equal(t.level, 'gold');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'partner_tier', content: args.data.content as string });
      const t = await PartnerService.createTier('org-1', 'ws-1', {
        name: 'Platinum', level: 'platinum', requirements: { minRevenue: 100000, certificationRequired: true }, benefits: { marginRate: 30, dedicatedSupport: true }, description: 'top tier',
      }, 'user-1');
      assert.equal(t.level, 'platinum');
      assert.equal(t.requirements.minRevenue, 100000);
      assert.equal(t.benefits.marginRate, 30);
      assert.equal(t.description, 'top tier');
    });
  });

  describe('getTier', () => {
    it('returns a tier when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_tier', content: JSON.stringify({ name: 'T', level: 'bronze', requirements: {}, benefits: {}, description: '' }) });
      const t = await PartnerService.getTier('mem-1');
      assert.ok(t);
      assert.equal(t!.name, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_profile' });
      const t = await PartnerService.getTier('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listTiers', () => {
    it('lists tiers', async () => {
      memFindManyImpl = async () => [makeRow({ id: 't1', type: 'partner_tier' }), makeRow({ id: 't2', type: 'partner_tier' })];
      const list = await PartnerService.listTiers('org-1');
      assert.equal(list.length, 2);
    });
  });

  describe('updateTier', () => {
    it('updates tier fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'partner_tier', content: JSON.stringify({ name: 'Old', level: 'bronze', requirements: {}, benefits: {}, description: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'partner_tier', content: args.data.content as string });
      const t = await PartnerService.updateTier('mem-1', { name: 'New', level: 'silver' });
      assert.ok(t);
      assert.equal(t!.name, 'New');
      assert.equal(t!.level, 'silver');
    });
  });

  describe('deleteTier', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PartnerService.deleteTier('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Metrics & Stats ──

  describe('getPartnerMetrics', () => {
    it('computes metrics across partners, deals, co-marketing', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'partner_profile') return [
          makeRow({ id: 'p1', type: 'partner_profile', content: JSON.stringify({ name: 'A', type: 'reseller', tier: 'gold', status: 'active', contactName: '', contactEmail: '', contactPhone: '', region: '', industry: '', website: '', dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '' }) }),
        ];
        if (where.type === 'partner_deal') return [
          makeRow({ id: 'd1', type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'C', dealValue: 5000, stage: 'closed_won', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'inactive', closedBy: '', closedAt: null, closeNotes: '' }) }),
        ];
        if (where.type === 'partner_comarketing') return [
          makeRow({ id: 'c1', type: 'partner_comarketing', content: JSON.stringify({ partnerId: 'p1', campaignName: 'C', type: 'webinar', description: '', budget: 1000, costShare: null, startDate: null, endDate: null, status: 'completed', expectedLeads: null, actualLeads: 50, results: '', completedBy: '', completedAt: null }) }),
        ];
        return [];
      };
      const m = await PartnerService.getPartnerMetrics('org-1');
      assert.equal(m.partnersByTier['gold'], 1);
      assert.equal(m.totalDealValue, 5000);
      assert.equal(m.partnerSourcedRevenue, 5000);
      assert.equal(m.coMarketingROI, 5);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const m = await PartnerService.getPartnerMetrics('org-1');
      assert.equal(m.totalDealValue, 0);
      assert.equal(m.coMarketingROI, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'partner_profile') return [makeRow({ type: 'partner_profile', content: JSON.stringify({ name: 'A', type: 'reseller', tier: 'gold', status: 'active', contactName: '', contactEmail: '', contactPhone: '', region: '', industry: '', website: '', dealRegistrationEnabled: false, marginRate: null, joinedDate: null, notes: '' }) })];
        if (where.type === 'partner_program') return [makeRow({ type: 'partner_program', content: JSON.stringify({ name: 'P', description: '', type: 'channel', requirements: [], benefits: [], marginRate: null, status: 'active', startDate: null, endDate: null }) })];
        if (where.type === 'partner_deal') return [makeRow({ type: 'partner_deal', content: JSON.stringify({ partnerId: 'p1', customerName: 'C', dealValue: 5000, stage: 'closed_won', expectedCloseDate: null, description: '', dealType: '', margin: null, registeredDate: '2024-01-01', status: 'inactive', closedBy: '', closedAt: null, closeNotes: '' }) })];
        if (where.type === 'partner_comarketing') return [makeRow({ type: 'partner_comarketing', content: JSON.stringify({ partnerId: 'p1', campaignName: 'C', type: 'webinar', description: '', budget: null, costShare: null, startDate: null, endDate: null, status: 'active', expectedLeads: null, actualLeads: null, results: '', completedBy: '', completedAt: null }) })];
        if (where.type === 'partner_tier') return [makeRow({ type: 'partner_tier', content: JSON.stringify({ name: 'T', level: 'gold', requirements: {}, benefits: {}, description: '' }) })];
        return [];
      };
      const stats = await PartnerService.getStats('org-1');
      assert.equal(stats.partnerCount, 1);
      assert.equal(stats.activePartnerCount, 1);
      assert.equal(stats.programCount, 1);
      assert.equal(stats.dealCount, 1);
      assert.equal(stats.closedWonDealCount, 1);
      assert.equal(stats.totalDealValue, 5000);
      assert.equal(stats.coMarketingCount, 1);
      assert.equal(stats.activeCoMarketingCount, 1);
      assert.equal(stats.tierCount, 1);
      assert.equal(stats.byPartnerType['reseller'], 1);
      assert.equal(stats.byPartnerTier['gold'], 1);
    });
  });
});
