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
    type: 'marketing_campaign',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { MarketingCampaignService } =
  await import('@/lib/services/marketing-campaign-service');

// ─────────────────────────────────────────────────────────────────────────────
// MarketingCampaignService
// ─────────────────────────────────────────────────────────────────────────────

describe('MarketingCampaignService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a campaign with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'marketing_campaign');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'Summer Launch');
        assert.equal(content.type, 'social');
        assert.equal(content.status, 'planned');
        assert.equal(content.budget, 0);
        assert.deepEqual(content.metrics, []);
        return makeRow('camp-1', content);
      };

      const campaign = await MarketingCampaignService.create('org-1', {
        name: 'Summer Launch',
        type: 'social',
        startDate: '2025-06-01',
        createdBy: 'user-1',
      });

      assert.ok(campaign);
      assert.equal(campaign.id, 'camp-1');
      assert.equal(campaign.name, 'Summer Launch');
      assert.equal(campaign.status, 'planned');
      assert.equal(campaign.budget, 0);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates with budget, channels, and status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.budget, 10000);
        assert.equal(content.status, 'active');
        assert.deepEqual(content.channels, ['facebook', 'instagram']);
        assert.equal(content.targetAudience, 'Millennials');
        return makeRow('camp-2', content);
      };

      const campaign = await MarketingCampaignService.create('org-1', {
        name: 'Q1 Ads',
        type: 'paid_ads',
        startDate: '2025-01-01',
        budget: 10000,
        status: 'active',
        channels: ['facebook', 'instagram'],
        targetAudience: 'Millennials',
        createdBy: 'user-1',
      });

      assert.equal(campaign.budget, 10000);
      assert.equal(campaign.status, 'active');
      assert.deepEqual(campaign.channels, ['facebook', 'instagram']);
    });
  });

  describe('get', () => {
    it('returns a campaign by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'Test', description: '', type: 'email', startDate: '2025-01-01', endDate: null, budget: 5000, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] });

      const campaign = await MarketingCampaignService.get('camp-1');

      assert.ok(campaign);
      assert.equal(campaign.id, 'camp-1');
      assert.equal(campaign.name, 'Test');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const campaign = await MarketingCampaignService.get('nope');
      assert.equal(campaign, null);
    });
  });

  describe('list', () => {
    it('returns campaigns for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '2025-01-01', endDate: null, budget: 0, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] }),
        makeRow('camp-2', { name: 'B', description: '', type: 'social', startDate: '2025-01-01', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const campaigns = await MarketingCampaignService.list('org-1');

      assert.equal(campaigns.length, 2);
      assert.equal(campaigns[0].id, 'camp-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] }),
        makeRow('camp-2', { name: 'B', description: '', type: 'social', startDate: '', endDate: null, budget: 0, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const campaigns = await MarketingCampaignService.list('org-1', { status: 'active' });

      assert.equal(campaigns.length, 1);
      assert.equal(campaigns[0].status, 'active');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'Summer Launch', description: '', type: 'social', startDate: '', endDate: null, budget: 0, status: 'planned', channels: [], goals: 'awareness', targetAudience: '', metrics: [] }),
        makeRow('camp-2', { name: 'Other', description: '', type: 'social', startDate: '', endDate: null, budget: 0, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const campaigns = await MarketingCampaignService.list('org-1', { search: 'summer' });

      assert.equal(campaigns.length, 1);
      assert.equal(campaigns[0].name, 'Summer Launch');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const campaigns = await MarketingCampaignService.list('org-1');
      assert.deepEqual(campaigns, []);
    });
  });

  describe('update', () => {
    it('updates a campaign', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'Old', description: '', type: 'email', startDate: '2025-01-01', endDate: null, budget: 5000, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New Name');
        assert.equal(content.budget, 10000);
        return makeRow('camp-1', content);
      };

      const campaign = await MarketingCampaignService.update('camp-1', {
        name: 'New Name',
        budget: 10000,
      });

      assert.ok(campaign);
      assert.equal(campaign.name, 'New Name');
      assert.equal(campaign.budget, 10000);
    });

    it('returns null when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const campaign = await MarketingCampaignService.update('nope', { name: 'x' });
      assert.equal(campaign, null);
    });
  });

  describe('delete', () => {
    it('deletes a campaign', async () => {
      memoryDeleteImpl = async () => ({ id: 'camp-1' });

      const result = await MarketingCampaignService.delete('camp-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };
      const result = await MarketingCampaignService.delete('camp-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the status of a campaign', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'active');
        return makeRow('camp-1', content);
      };

      const campaign = await MarketingCampaignService.changeStatus('camp-1', 'active');

      assert.ok(campaign);
      assert.equal(campaign.status, 'active');
    });

    it('returns null when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const campaign = await MarketingCampaignService.changeStatus('nope', 'active');
      assert.equal(campaign, null);
    });
  });

  describe('recordMetrics', () => {
    it('records metrics for a campaign', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.metrics.length, 1);
        assert.equal(content.metrics[0].impressions, 1000);
        assert.equal(content.metrics[0].clicks, 50);
        assert.equal(content.metrics[0].revenue, 200);
        return makeRow('camp-1', content);
      };

      const campaign = await MarketingCampaignService.recordMetrics('camp-1', {
        date: '2025-01-15',
        impressions: 1000,
        clicks: 50,
        revenue: 200,
      });

      assert.ok(campaign);
      assert.equal(campaign.metrics.length, 1);
      assert.equal(campaign.metrics[0].impressions, 1000);
    });

    it('returns null when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const campaign = await MarketingCampaignService.recordMetrics('nope', { date: '2025-01-01' });
      assert.equal(campaign, null);
    });
  });

  describe('getMetrics', () => {
    it('returns metrics for a campaign', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [
          { date: '2025-01-01', impressions: 100, clicks: 10, conversions: 2, leads: 5, revenue: 100, spend: 50 },
        ] });

      const metrics = await MarketingCampaignService.getMetrics('camp-1');

      assert.equal(metrics.length, 1);
      assert.equal(metrics[0].impressions, 100);
    });

    it('returns empty array when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const metrics = await MarketingCampaignService.getMetrics('nope');
      assert.deepEqual(metrics, []);
    });
  });

  describe('getROI', () => {
    it('calculates ROI = (revenue - spend) / spend * 100', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [
          { date: '2025-01-01', impressions: 0, clicks: 0, conversions: 0, leads: 0, revenue: 300, spend: 100 },
        ] });

      const roi = await MarketingCampaignService.getROI('camp-1');

      // (300 - 100) / 100 * 100 = 200
      assert.equal(roi, 200);
    });

    it('returns 0 when spend is 0', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] });

      const roi = await MarketingCampaignService.getROI('camp-1');
      assert.equal(roi, 0);
    });
  });

  describe('getActiveCampaigns', () => {
    it('returns only active campaigns', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 0, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] }),
        makeRow('camp-2', { name: 'B', description: '', type: 'social', startDate: '', endDate: null, budget: 0, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const active = await MarketingCampaignService.getActiveCampaigns('org-1');

      assert.equal(active.length, 1);
      assert.equal(active[0].status, 'active');
    });
  });

  describe('getBudgetUtilization', () => {
    it('calculates budget vs spend for each campaign', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 1000, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [
          { date: '2025-01-01', impressions: 0, clicks: 0, conversions: 0, leads: 0, revenue: 0, spend: 500 },
        ] }),
        makeRow('camp-2', { name: 'B', description: '', type: 'social', startDate: '', endDate: null, budget: 2000, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const utilization = await MarketingCampaignService.getBudgetUtilization('org-1');

      assert.equal(utilization.length, 2);
      assert.equal(utilization[0].name, 'A');
      assert.equal(utilization[0].budget, 1000);
      assert.equal(utilization[0].spend, 500);
      assert.equal(utilization[0].utilization, 50);
      assert.equal(utilization[1].spend, 0);
      assert.equal(utilization[1].utilization, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates campaign stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('camp-1', { name: 'A', description: '', type: 'email', startDate: '', endDate: null, budget: 1000, status: 'active', channels: [], goals: '', targetAudience: '', metrics: [
          { date: '2025-01-01', impressions: 0, clicks: 0, conversions: 0, leads: 0, revenue: 300, spend: 100 },
        ] }),
        makeRow('camp-2', { name: 'B', description: '', type: 'social', startDate: '', endDate: null, budget: 2000, status: 'planned', channels: [], goals: '', targetAudience: '', metrics: [] }),
      ];

      const stats = await MarketingCampaignService.getStats('org-1');

      assert.equal(stats.totalCampaigns, 2);
      assert.equal(stats.totalBudget, 3000);
      assert.equal(stats.totalSpend, 100);
      assert.equal(stats.totalRevenue, 300);
      assert.equal(stats.avgROI, 200);
      assert.equal(stats.byType.email, 1);
      assert.equal(stats.byType.social, 1);
      assert.equal(stats.byStatus.active, 1);
      assert.equal(stats.byStatus.planned, 1);
    });

    it('returns zero stats when no campaigns', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await MarketingCampaignService.getStats('org-1');

      assert.equal(stats.totalCampaigns, 0);
      assert.equal(stats.avgROI, 0);
    });
  });
});
