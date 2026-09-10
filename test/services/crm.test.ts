import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type CustomerFindManyArgs = {
  where: { workspaceId: string; status?: string; type?: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CustomerFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type CustomerCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    type: string;
    status: string;
    source?: string | null;
    value: number;
    currency: string;
    notes?: string | null;
    ownerId?: string | null;
  };
};

type CustomerUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type DealFindManyArgs = {
  where: { workspaceId: string; stage?: string };
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type DealFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type DealCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    customerId: string;
    productId?: string | null;
    title: string;
    description?: string | null;
    stage: string;
    value: number;
    currency: string;
    probability: number;
    expectedCloseDate?: Date | null;
    ownerId?: string | null;
    source?: string | null;
  };
};

type DealUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let customerFindManyImpl: (args: CustomerFindManyArgs) => Promise<unknown[]> =
  async () => [];
let customerFindUniqueImpl: (args: CustomerFindUniqueArgs) => Promise<unknown> =
  async () => null;
let customerCreateImpl: (args: CustomerCreateArgs) => Promise<unknown> =
  async () => ({});
let customerUpdateImpl: (args: CustomerUpdateArgs) => Promise<unknown> =
  async () => ({});

let dealFindManyImpl: (args: DealFindManyArgs) => Promise<unknown[]> =
  async () => [];
let dealFindUniqueImpl: (args: DealFindUniqueArgs) => Promise<unknown> =
  async () => null;
let dealCreateImpl: (args: DealCreateArgs) => Promise<unknown> =
  async () => ({});
let dealUpdateImpl: (args: DealUpdateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  customer: {
    findMany: (args: CustomerFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'customer.findMany', args });
      return customerFindManyImpl(args);
    },
    findUnique: (args: CustomerFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'customer.findUnique', args });
      return customerFindUniqueImpl(args);
    },
    create: (args: CustomerCreateArgs): Promise<unknown> => {
      calls.push({ method: 'customer.create', args });
      return customerCreateImpl(args);
    },
    update: (args: CustomerUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'customer.update', args });
      return customerUpdateImpl(args);
    },
  },
  deal: {
    findMany: (args: DealFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'deal.findMany', args });
      return dealFindManyImpl(args);
    },
    findUnique: (args: DealFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'deal.findUnique', args });
      return dealFindUniqueImpl(args);
    },
    create: (args: DealCreateArgs): Promise<unknown> => {
      calls.push({ method: 'deal.create', args });
      return dealCreateImpl(args);
    },
    update: (args: DealUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'deal.update', args });
      return dealUpdateImpl(args);
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
  customerFindManyImpl = async () => [];
  customerFindUniqueImpl = async () => null;
  customerCreateImpl = async () => ({});
  customerUpdateImpl = async () => ({});
  dealFindManyImpl = async () => [];
  dealFindUniqueImpl = async () => null;
  dealCreateImpl = async () => ({});
  dealUpdateImpl = async () => ({});
}

const { CustomerService, DealService } = await import('@/lib/services/crm');

// ─────────────────────────────────────────────────────────────────────────────
// CustomerService
// ─────────────────────────────────────────────────────────────────────────────

describe('CustomerService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns customers for a workspace', async () => {
      customerFindManyImpl = async () =>
        ([{ id: 'c1', name: 'Alice', _count: { deals: 2 } }]);

      const result = await CustomerService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'customer.findMany');
      const args = calls[0].args as CustomerFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies status and type filters', async () => {
      customerFindManyImpl = async () => [];

      await CustomerService.list('ws-1', { status: 'active', type: 'customer' });

      const args = calls[0].args as CustomerFindManyArgs;
      assert.equal(args.where.status, 'active');
      assert.equal(args.where.type, 'customer');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      customerFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await CustomerService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns a customer by id with deals', async () => {
      customerFindUniqueImpl = async () =>
        ({ id: 'c1', name: 'Alice', deals: [{ id: 'd1' }] });

      const result = await CustomerService.get('c1');

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'customer.findUnique');
    });

    it('returns null when customer not found', async () => {
      customerFindUniqueImpl = async () => null;

      const result = await CustomerService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      customerFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await CustomerService.get('c1');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a customer with defaults', async () => {
      customerCreateImpl = async (args: CustomerCreateArgs) => {
        assert.equal(args.data.type, 'lead');
        assert.equal(args.data.status, 'new');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.value, 0);
        return { id: 'c1', ...args.data };
      };

      const result = await CustomerService.create({
        organizationId: 'org-1',
        name: 'Alice',
      });

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'customer.create');
    });

    it('truncates long names to 300 characters', async () => {
      customerCreateImpl = async (args: CustomerCreateArgs) => {
        assert.ok(args.data.name.length <= 300);
        return { id: 'c1', name: args.data.name };
      };

      await CustomerService.create({
        organizationId: 'org-1',
        name: 'A'.repeat(500),
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      customerUpdateImpl = async (args: CustomerUpdateArgs) => {
        assert.equal(args.data.name, 'New Name');
        assert.equal(args.data.email, undefined);
        return { id: 'c1', ...args.data };
      };

      const result = await CustomerService.update('c1', { name: 'New Name' });
      assert.ok(result);
      assert.equal(calls[0].method, 'customer.update');
    });
  });

  describe('updateStatus', () => {
    it('updates the customer status', async () => {
      customerUpdateImpl = async (args: CustomerUpdateArgs) => {
        assert.equal(args.data.status, 'active');
        return { id: 'c1', status: 'active' };
      };

      const result = await CustomerService.updateStatus('c1', 'active');
      assert.ok(result);
      assert.equal(calls[0].method, 'customer.update');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DealService
// ─────────────────────────────────────────────────────────────────────────────

describe('DealService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns deals for a workspace', async () => {
      dealFindManyImpl = async () =>
        ([{ id: 'd1', title: 'Big Deal', customer: { id: 'c1' } }]);

      const result = await DealService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'd1');
      assert.equal(calls[0].method, 'deal.findMany');
      const args = calls[0].args as DealFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies stage filter', async () => {
      dealFindManyImpl = async () => [];

      await DealService.list('ws-1', { stage: 'won' });

      const args = calls[0].args as DealFindManyArgs;
      assert.equal(args.where.stage, 'won');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      dealFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await DealService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns a deal by id', async () => {
      dealFindUniqueImpl = async () =>
        ({ id: 'd1', title: 'Deal', customer: { id: 'c1' }, product: null });

      const result = await DealService.get('d1');

      assert.ok(result);
      assert.equal(result.id, 'd1');
      assert.equal(calls[0].method, 'deal.findUnique');
    });

    it('returns null when deal not found', async () => {
      dealFindUniqueImpl = async () => null;

      const result = await DealService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a deal with defaults and clamped probability', async () => {
      dealCreateImpl = async (args: DealCreateArgs) => {
        assert.equal(args.data.stage, 'lead');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.value, 0);
        assert.equal(args.data.probability, 0);
        return { id: 'd1', ...args.data };
      };

      const result = await DealService.create({
        organizationId: 'org-1',
        customerId: 'c1',
        title: 'New Deal',
      });

      assert.ok(result);
      assert.equal(result.id, 'd1');
      assert.equal(calls[0].method, 'deal.create');
    });

    it('clamps probability above 100 to 100', async () => {
      dealCreateImpl = async (args: DealCreateArgs) => {
        assert.equal(args.data.probability, 100);
        return { id: 'd1', probability: 100 };
      };

      await DealService.create({
        organizationId: 'org-1',
        customerId: 'c1',
        title: 'Deal',
        probability: 150,
      });
    });

    it('clamps negative probability to 0', async () => {
      dealCreateImpl = async (args: DealCreateArgs) => {
        assert.equal(args.data.probability, 0);
        return { id: 'd1', probability: 0 };
      };

      await DealService.create({
        organizationId: 'org-1',
        customerId: 'c1',
        title: 'Deal',
        probability: -20,
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      dealUpdateImpl = async (args: DealUpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.value, undefined);
        return { id: 'd1', ...args.data };
      };

      const result = await DealService.update('d1', { title: 'Updated' });
      assert.ok(result);
      assert.equal(calls[0].method, 'deal.update');
    });

    it('clamps probability on update', async () => {
      dealUpdateImpl = async (args: DealUpdateArgs) => {
        assert.equal(args.data.probability, 100);
        return { id: 'd1', probability: 100 };
      };

      await DealService.update('d1', { probability: 200 });
    });
  });

  describe('updateStage', () => {
    it('sets actual close date and probability 100 when won', async () => {
      dealUpdateImpl = async (args: DealUpdateArgs) => {
        assert.equal(args.data.stage, 'won');
        assert.equal(args.data.probability, 100);
        assert.ok(args.data.actualCloseDate instanceof Date);
        return { id: 'd1', stage: 'won' };
      };

      const result = await DealService.updateStage('d1', 'won');
      assert.ok(result);
    });

    it('sets probability 0 when lost', async () => {
      dealUpdateImpl = async (args: DealUpdateArgs) => {
        assert.equal(args.data.stage, 'lost');
        assert.equal(args.data.probability, 0);
        return { id: 'd1', stage: 'lost' };
      };

      await DealService.updateStage('d1', 'lost');
    });

    it('does not set actual close date for non-terminal stages', async () => {
      dealUpdateImpl = async (args: DealUpdateArgs) => {
        assert.equal(args.data.stage, 'proposal');
        assert.equal(args.data.actualCloseDate, undefined);
        return { id: 'd1', stage: 'proposal' };
      };

      await DealService.updateStage('d1', 'proposal');
    });
  });

  describe('getPipelineStats', () => {
    it('aggregates deal counts and values by stage', async () => {
      dealFindManyImpl = async () => ([
        { stage: 'lead', value: 100, currency: 'USD' },
        { stage: 'lead', value: 200, currency: 'USD' },
        { stage: 'won', value: 1000, currency: 'USD' },
      ]);

      const stats = await DealService.getPipelineStats('ws-1');

      assert.equal(stats.lead.count, 2);
      assert.equal(stats.lead.totalValue, 300);
      assert.equal(stats.won.count, 1);
      assert.equal(stats.won.totalValue, 1000);
      assert.equal(stats.lost.count, 0);
      assert.equal(stats.lost.totalValue, 0);
    });

    it('returns all stages with zero values when no deals', async () => {
      dealFindManyImpl = async () => [];

      const stats = await DealService.getPipelineStats('ws-1');

      assert.equal(stats.lead.count, 0);
      assert.equal(stats.won.count, 0);
      assert.equal(stats.negotiation.count, 0);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      dealFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await DealService.getPipelineStats('ws-1');
      assert.equal(stats.lead.count, 0);
      assert.equal(stats.won.count, 0);
    });
  });
});
