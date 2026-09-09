import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TxnFindManyArgs = {
  where: {
    workspaceId: string;
    type?: string;
    category?: string;
    status?: string;
    date?: Record<string, unknown>;
  };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type TxnCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    type: string;
    category: string;
    amount: number;
    currency: string;
    description?: string | null;
    date: Date;
    status: string;
    source?: string | null;
    reference?: string | null;
    createdBy?: string | null;
  };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let txnFindManyImpl: (args: TxnFindManyArgs) => Promise<unknown[]> =
  async () => [];
let txnCreateImpl: (args: TxnCreateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  transaction: {
    findMany: (args: TxnFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'transaction.findMany', args });
      return txnFindManyImpl(args);
    },
    create: (args: TxnCreateArgs): Promise<unknown> => {
      calls.push({ method: 'transaction.create', args });
      return txnCreateImpl(args);
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
  txnFindManyImpl = async () => [];
  txnCreateImpl = async () => ({});
}

const { FinanceService } = await import('@/lib/services/finance');

describe('FinanceService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns transactions for a workspace', async () => {
      txnFindManyImpl = async () =>
        ([{ id: 't1', type: 'income', amount: 100 }]);

      const result = await FinanceService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 't1');
      assert.equal(calls[0].method, 'transaction.findMany');
      const args = calls[0].args as TxnFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies type, category, and status filters', async () => {
      txnFindManyImpl = async () => [];

      await FinanceService.list('ws-1', {
        type: 'income',
        category: 'sales',
        status: 'confirmed',
      });

      const args = calls[0].args as TxnFindManyArgs;
      assert.equal(args.where.type, 'income');
      assert.equal(args.where.category, 'sales');
      assert.equal(args.where.status, 'confirmed');
    });

    it('applies date range filters', async () => {
      txnFindManyImpl = async () => [];

      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      await FinanceService.list('ws-1', { startDate: start, endDate: end });

      const args = calls[0].args as TxnFindManyArgs;
      // The service spreads two `date` keys; the later (endDate/lte) wins.
      assert.deepEqual(args.where.date, { lte: end });
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      txnFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await FinanceService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('create', () => {
    it('creates a transaction with defaults', async () => {
      txnCreateImpl = async (args: TxnCreateArgs) => {
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.status, 'confirmed');
        assert.ok(args.data.date instanceof Date);
        return { id: 't1', ...args.data };
      };

      const result = await FinanceService.create({
        organizationId: 'org-1',
        type: 'income',
        category: 'sales',
        amount: 500,
      });

      assert.ok(result);
      assert.equal(result.id, 't1');
      assert.equal(calls[0].method, 'transaction.create');
    });

    it('truncates long descriptions to 2000 characters', async () => {
      txnCreateImpl = async (args: TxnCreateArgs) => {
        assert.ok(args.data.description!.length <= 2000);
        return { id: 't1' };
      };

      await FinanceService.create({
        organizationId: 'org-1',
        type: 'expense',
        category: 'ops',
        amount: 100,
        description: 'X'.repeat(3000),
      });
    });
  });

  describe('getSummary', () => {
    it('computes income, expense, net, and count', async () => {
      txnFindManyImpl = async () => ([
        { type: 'income', amount: 1000 },
        { type: 'income', amount: 500 },
        { type: 'expense', amount: 300 },
      ]);

      const summary = await FinanceService.getSummary('ws-1');

      assert.equal(summary.income, 1500);
      assert.equal(summary.expense, 300);
      assert.equal(summary.net, 1200);
      assert.equal(summary.count, 3);
    });

    it('returns zeros on error (safePrisma fallback)', async () => {
      txnFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await FinanceService.getSummary('ws-1');
      assert.equal(summary.income, 0);
      assert.equal(summary.expense, 0);
      assert.equal(summary.net, 0);
      assert.equal(summary.count, 0);
    });

    it('ignores transactions that are neither income nor expense', async () => {
      txnFindManyImpl = async () => ([
        { type: 'transfer', amount: 999 },
      ]);

      const summary = await FinanceService.getSummary('ws-1');
      assert.equal(summary.income, 0);
      assert.equal(summary.expense, 0);
      assert.equal(summary.count, 1);
    });
  });

  describe('getByCategory', () => {
    it('groups totals by category', async () => {
      txnFindManyImpl = async () => ([
        { category: 'sales', type: 'income', amount: 200 },
        { category: 'sales', type: 'expense', amount: 50 },
        { category: 'ops', type: 'expense', amount: 100 },
      ]);

      const byCat = await FinanceService.getByCategory('ws-1');

      assert.equal(byCat.sales.income, 200);
      assert.equal(byCat.sales.expense, 50);
      assert.equal(byCat.sales.net, 150);
      assert.equal(byCat.sales.count, 2);
      assert.equal(byCat.ops.income, 0);
      assert.equal(byCat.ops.expense, 100);
      assert.equal(byCat.ops.net, -100);
      assert.equal(byCat.ops.count, 1);
    });

    it('returns empty object on error (safePrisma fallback)', async () => {
      txnFindManyImpl = async () => { throw new Error('fail'); };

      const byCat = await FinanceService.getByCategory('ws-1');
      assert.deepEqual(byCat, {});
    });
  });
});
