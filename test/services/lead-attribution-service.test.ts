import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
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

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
  id: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'lead_attribution',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { LeadAttributionService } =
  await import('@/lib/services/lead-attribution-service');

// ─────────────────────────────────────────────────────────────────────────────
// LeadAttributionService
// ─────────────────────────────────────────────────────────────────────────────

describe('LeadAttributionService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an attribution with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'lead_attribution');
        const content = JSON.parse(args.data.content);
        assert.equal(content.leadId, 'lead-1');
        assert.equal(content.source, 'organic');
        assert.equal(content.conversionValue, 0);
        assert.equal(content.convertedAt, null);
        return makeRow('attr-1', content);
      };

      const attr = await LeadAttributionService.create('org-1', {
        leadId: 'lead-1',
        source: 'organic',
        createdBy: 'user-1',
      });

      assert.ok(attr);
      assert.equal(attr.id, 'attr-1');
      assert.equal(attr.leadId, 'lead-1');
      assert.equal(attr.source, 'organic');
      assert.equal(attr.conversionValue, 0);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates with campaign, channel, and conversion value', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.campaignId, 'camp-1');
        assert.equal(content.channel, 'google');
        assert.equal(content.touchpoint, 'search-ad');
        assert.equal(content.conversionValue, 500);
        assert.equal(content.convertedAt, '2025-01-15');
        return makeRow('attr-2', content);
      };

      const attr = await LeadAttributionService.create('org-1', {
        leadId: 'lead-2',
        campaignId: 'camp-1',
        source: 'paid',
        channel: 'google',
        touchpoint: 'search-ad',
        conversionValue: 500,
        convertedAt: '2025-01-15',
        createdBy: 'user-1',
      });

      assert.equal(attr.campaignId, 'camp-1');
      assert.equal(attr.channel, 'google');
      assert.equal(attr.conversionValue, 500);
      assert.equal(attr.convertedAt, '2025-01-15');
    });
  });

  describe('get', () => {
    it('returns an attribution by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('attr-1', { leadId: 'lead-1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null });

      const attr = await LeadAttributionService.get('attr-1');

      assert.ok(attr);
      assert.equal(attr.id, 'attr-1');
      assert.equal(attr.leadId, 'lead-1');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when attribution not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const attr = await LeadAttributionService.get('nope');
      assert.equal(attr, null);
    });
  });

  describe('list', () => {
    it('returns attributions for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const attrs = await LeadAttributionService.list('org-1');

      assert.equal(attrs.length, 2);
      assert.equal(attrs[0].id, 'attr-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by source', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const attrs = await LeadAttributionService.list('org-1', { source: 'organic' });

      assert.equal(attrs.length, 1);
      assert.equal(attrs[0].source, 'organic');
    });

    it('filters by campaignId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: 'camp-1', source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: 'camp-2', source: 'paid', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const attrs = await LeadAttributionService.list('org-1', { campaignId: 'camp-1' });

      assert.equal(attrs.length, 1);
      assert.equal(attrs[0].campaignId, 'camp-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const attrs = await LeadAttributionService.list('org-1');
      assert.deepEqual(attrs, []);
    });
  });

  describe('delete', () => {
    it('deletes an attribution', async () => {
      memoryDeleteImpl = async () => ({ id: 'attr-1' });

      const result = await LeadAttributionService.delete('attr-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };
      const result = await LeadAttributionService.delete('attr-1');
      assert.equal(result, false);
    });
  });

  describe('getBySource', () => {
    it('groups attributions by source', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-3', { leadId: 'l3', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const grouped = await LeadAttributionService.getBySource('org-1');

      assert.equal(grouped.organic.length, 2);
      assert.equal(grouped.paid.length, 1);
    });
  });

  describe('getByCampaign', () => {
    it('groups attributions by campaign', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: 'camp-1', source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const grouped = await LeadAttributionService.getByCampaign('org-1');

      assert.equal(grouped['camp-1'].length, 1);
      assert.equal(grouped.none.length, 1);
    });
  });

  describe('getConversionBySource', () => {
    it('calculates conversion rate by source', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 100, convertedAt: '2025-01-01' }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
        makeRow('attr-3', { leadId: 'l3', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 200, convertedAt: '2025-01-02' }),
      ];

      const rates = await LeadAttributionService.getConversionBySource('org-1');

      // organic: 1/2 = 50%
      assert.equal(rates.organic, 50);
      // paid: 1/1 = 100%
      assert.equal(rates.paid, 100);
    });
  });

  describe('getTopPerformingSources', () => {
    it('returns sources sorted by conversions', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 100, convertedAt: '2025-01-01' }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 50, convertedAt: '2025-01-02' }),
        makeRow('attr-3', { leadId: 'l3', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 200, convertedAt: '2025-01-03' }),
        makeRow('attr-4', { leadId: 'l4', campaignId: null, source: 'social', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const top = await LeadAttributionService.getTopPerformingSources('org-1');

      assert.equal(top.length, 3);
      // organic has 2 conversions, paid has 1, social has 0
      assert.equal(top[0].source, 'organic');
      assert.equal(top[0].conversions, 2);
      assert.equal(top[0].revenue, 150);
      assert.equal(top[1].source, 'paid');
      assert.equal(top[1].conversions, 1);
    });
  });

  describe('getRevenueBySource', () => {
    it('sums revenue by source', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 100, convertedAt: null }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 50, convertedAt: null }),
        makeRow('attr-3', { leadId: 'l3', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 200, convertedAt: null }),
      ];

      const revenue = await LeadAttributionService.getRevenueBySource('org-1');

      assert.equal(revenue.organic, 150);
      assert.equal(revenue.paid, 200);
    });
  });

  describe('getStats', () => {
    it('aggregates attribution stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('attr-1', { leadId: 'l1', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 100, convertedAt: '2025-01-01' }),
        makeRow('attr-2', { leadId: 'l2', campaignId: null, source: 'paid', channel: '', touchpoint: '', conversionValue: 200, convertedAt: '2025-01-02' }),
        makeRow('attr-3', { leadId: 'l3', campaignId: null, source: 'organic', channel: '', touchpoint: '', conversionValue: 0, convertedAt: null }),
      ];

      const stats = await LeadAttributionService.getStats('org-1');

      assert.equal(stats.totalAttributions, 3);
      assert.equal(stats.bySource.organic, 2);
      assert.equal(stats.bySource.paid, 1);
      // 2/3 converted = 66.67%
      assert.equal(stats.conversionRate, 66.67);
      assert.equal(stats.totalRevenue, 300);
      // avg conversion value = (100 + 200) / 2 = 150
      assert.equal(stats.avgConversionValue, 150);
    });

    it('returns zero stats when no attributions', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await LeadAttributionService.getStats('org-1');

      assert.equal(stats.totalAttributions, 0);
      assert.equal(stats.conversionRate, 0);
      assert.equal(stats.avgConversionValue, 0);
    });
  });
});
