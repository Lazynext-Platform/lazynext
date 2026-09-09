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
    type: 'vendor_spend',
    content: JSON.stringify({
      vendorId: 'mem-v1',
      amount: 5000,
      currency: 'USD',
      category: 'marketing',
      date: '2028-01-15',
      description: 'Q1 marketing services',
      invoiceNumber: 'INV-001',
    }),
    source: 'user',
    sourceId: 'mem-v1',
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['vendor_spend', 'marketing']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRow2(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-2',
    content: JSON.stringify({
      vendorId: 'mem-v2',
      amount: 2500,
      currency: 'USD',
      category: 'software',
      date: '2028-02-15',
      description: 'SaaS subscription',
      invoiceNumber: 'INV-002',
    }),
    sourceId: 'mem-v2',
    tags: JSON.stringify(['vendor_spend', 'software']),
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

const { VendorSpendService } = await import('@/lib/services/vendor-spend-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — VendorSpendService CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorSpendService — CRUD', () => {
  beforeEach(() => resetMock());

  it('creates a spend record with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await VendorSpendService.create('org-1', {
      vendorId: 'mem-v1', amount: 1000, createdBy: 'user-1',
    });
    assert.equal(s.vendorId, 'mem-v1');
    assert.equal(s.amount, 1000);
    assert.equal(s.currency, 'USD');
    assert.equal(s.category, 'general');
    assert.equal(s.description, '');
    assert.equal(s.invoiceNumber, '');
  });

  it('creates a spend record with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await VendorSpendService.create('org-1', {
      vendorId: 'mem-v1', amount: 7500, currency: 'EUR', category: 'consulting',
      date: '2028-03-01', description: 'Consulting services', invoiceNumber: 'INV-999',
      workspaceId: 'ws-1', createdBy: 'user-1',
    });
    assert.equal(s.amount, 7500);
    assert.equal(s.currency, 'EUR');
    assert.equal(s.category, 'consulting');
    assert.equal(s.invoiceNumber, 'INV-999');
    assert.ok(s.date);
  });

  it('gets a spend record by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await VendorSpendService.get('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.amount, 5000);
  });

  it('returns null when spend record not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await VendorSpendService.get('nope');
    assert.equal(s, null);
  });

  it('lists spend records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_spend') return [makeRow(), makeRow2()];
      return [];
    };
    const list = await VendorSpendService.list('org-1');
    assert.equal(list.length, 2);
  });

  it('lists spend records filtered by vendorId', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.sourceId === 'mem-v1') return [makeRow()];
      return [];
    };
    const list = await VendorSpendService.list('org-1', { vendorId: 'mem-v1' });
    assert.equal(list.length, 1);
  });

  it('lists spend records filtered by category', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const list = await VendorSpendService.list('org-1', { category: 'marketing' });
    assert.equal(list.length, 1);
    assert.equal(list[0].category, 'marketing');
  });

  it('lists spend records filtered by minAmount', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const list = await VendorSpendService.list('org-1', { minAmount: 3000 });
    assert.equal(list.length, 1);
    assert.equal(list[0].amount, 5000);
  });

  it('lists spend records filtered by dateRange', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const list = await VendorSpendService.list('org-1', { dateRange: { start: '2028-02-01', end: '2028-02-28' } });
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'mem-2');
  });

  it('getByVendor returns all spend records for a vendor', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.sourceId === 'mem-v1') return [makeRow()];
      return [];
    };
    const list = await VendorSpendService.getByVendor('mem-v1');
    assert.equal(list.length, 1);
    assert.equal(list[0].vendorId, 'mem-v1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — VendorSpendService aggregations
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorSpendService — aggregations', () => {
  beforeEach(() => resetMock());

  it('getTotalSpend sums all amounts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_spend') return [makeRow(), makeRow2()];
      return [];
    };
    const total = await VendorSpendService.getTotalSpend('org-1');
    assert.equal(total, 7500);
  });

  it('getTotalSpend respects date range', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const total = await VendorSpendService.getTotalSpend('org-1', { dateRange: { start: '2028-02-01', end: '2028-02-28' } });
    assert.equal(total, 2500);
  });

  it('getSpendByCategory groups amounts by category', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const byCat = await VendorSpendService.getSpendByCategory('org-1');
    assert.equal(byCat.marketing, 5000);
    assert.equal(byCat.software, 2500);
  });

  it('getSpendByVendor groups amounts by vendor', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const byVendor = await VendorSpendService.getSpendByVendor('org-1');
    assert.equal(byVendor['mem-v1'], 5000);
    assert.equal(byVendor['mem-v2'], 2500);
  });

  it('getSpendTrend returns monthly totals sorted by month', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const trend = await VendorSpendService.getSpendTrend('org-1');
    assert.equal(trend.length, 2);
    assert.equal(trend[0].month, '2028-01');
    assert.equal(trend[0].amount, 5000);
    assert.equal(trend[1].month, '2028-02');
    assert.equal(trend[1].amount, 2500);
  });

  it('getStats returns totalSpend, breakdowns, and trend', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow2()];
    const s = await VendorSpendService.getStats('org-1');
    assert.equal(s.totalSpend, 7500);
    assert.equal(s.byCategory.marketing, 5000);
    assert.equal(s.byCategory.software, 2500);
    assert.equal(s.byVendor['mem-v1'], 5000);
    assert.equal(s.byVendor['mem-v2'], 2500);
    assert.equal(s.trend.length, 2);
  });

  it('getStats returns empty results when no records', async () => {
    memFindManyImpl = async () => [];
    const s = await VendorSpendService.getStats('org-1');
    assert.equal(s.totalSpend, 0);
    assert.equal(s.trend.length, 0);
  });
});
