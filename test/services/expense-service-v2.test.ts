import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _sum?: Record<string, true>; _count: boolean };
type AggregateArgs = { where: Record<string, unknown>; _sum: Record<string, true> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let expFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let expFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let expCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let expUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let expDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let expCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let expGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let expAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { amount: 0 } });

const prismaMock = {
  expense: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'expense.findMany', args }); return expFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'expense.findUnique', args }); return expFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'expense.create', args }); return expCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'expense.update', args }); return expUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'expense.delete', args }); return expDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'expense.count', args }); return expCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'expense.groupBy', args }); return expGroupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'expense.aggregate', args }); return expAggregateImpl(args); },
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
  expFindManyImpl = async () => [];
  expFindUniqueImpl = async () => null;
  expCreateImpl = async () => ({});
  expUpdateImpl = async () => ({});
  expDeleteImpl = async () => ({});
  expCountImpl = async () => 0;
  expGroupByImpl = async () => [];
  expAggregateImpl = async () => ({ _sum: { amount: 0 } });
}

const { ExpenseServiceV2 } = await import('@/lib/services/expense-service-v2');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ExpenseServiceV2', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an expense with defaults', async () => {
      expCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.tags, JSON.stringify([]));
        return { id: 'e1', ...args.data };
      };
      const result = await ExpenseServiceV2.create('org-1', {
        vendor: 'Acme',
        category: 'software',
        amount: 100,
        expenseDate: new Date('2024-01-01'),
      });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'e1');
    });

    it('serializes tags as JSON array string', async () => {
      expCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['saas', 'annual']));
        return { id: 'e1', ...args.data };
      };
      await ExpenseServiceV2.create('org-1', {
        vendor: 'Acme',
        category: 'software',
        amount: 100,
        expenseDate: new Date('2024-01-01'),
        tags: ['saas', 'annual'],
      });
    });
  });

  describe('get', () => {
    it('returns an expense by id', async () => {
      expFindUniqueImpl = async () => ({ id: 'e1', vendor: 'Acme' });
      const result = await ExpenseServiceV2.get('e1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'e1');
    });

    it('returns null when not found', async () => {
      expFindUniqueImpl = async () => null;
      const result = await ExpenseServiceV2.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns expenses for an organization', async () => {
      expFindManyImpl = async () => [{ id: 'e1', vendor: 'Acme' }];
      const result = await ExpenseServiceV2.list('org-1');
      assert.equal(result.length, 1);
    });

    it('applies category, status, and submittedBy filters', async () => {
      expFindManyImpl = async () => [];
      await ExpenseServiceV2.list('org-1', { category: 'travel', status: 'pending', submittedBy: 'u1' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.category, 'travel');
      assert.equal(args.where.status, 'pending');
      assert.equal(args.where.submittedBy, 'u1');
    });

    it('applies search filter with OR clause', async () => {
      expFindManyImpl = async () => [];
      await ExpenseServiceV2.list('org-1', { search: 'acme' });
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      expFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await ExpenseServiceV2.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      expUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.vendor, 'Updated');
        assert.equal(args.data.amount, undefined);
        return { id: 'e1', ...args.data };
      };
      const result = await ExpenseServiceV2.update('e1', { vendor: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes an expense', async () => {
      expDeleteImpl = async () => ({ id: 'e1' });
      const result = await ExpenseServiceV2.delete('e1');
      assert.ok(result);
      assert.equal(calls[0].method, 'expense.delete');
    });
  });

  describe('approve', () => {
    it('sets status to approved and sets approvedBy', async () => {
      expUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        assert.equal(args.data.approvedBy, 'mgr1');
        return { id: 'e1', ...args.data };
      };
      const result = await ExpenseServiceV2.approve('e1', 'mgr1');
      assert.ok(result);
    });
  });

  describe('reject', () => {
    it('sets status to rejected', async () => {
      expUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        return { id: 'e1', ...args.data };
      };
      const result = await ExpenseServiceV2.reject('e1', 'mgr1');
      assert.ok(result);
    });
  });

  describe('reimburse', () => {
    it('sets status to reimbursed', async () => {
      expUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'reimbursed');
        return { id: 'e1', ...args.data };
      };
      const result = await ExpenseServiceV2.reimburse('e1', 'mgr1');
      assert.ok(result);
    });
  });

  describe('getByCategory', () => {
    it('returns expenses grouped by category', async () => {
      expGroupByImpl = async () => [
        { category: 'software', _sum: { amount: 500 }, _count: 2 },
        { category: 'travel', _sum: { amount: 300 }, _count: 1 },
      ];
      const result = await ExpenseServiceV2.getByCategory('org-1');
      assert.equal(result.software.total, 500);
      assert.equal(result.software.count, 2);
      assert.equal(result.travel.total, 300);
    });
  });

  describe('getByStatus', () => {
    it('returns expenses grouped by status', async () => {
      expGroupByImpl = async () => [
        { status: 'pending', _sum: { amount: 200 }, _count: 3 },
        { status: 'approved', _sum: { amount: 800 }, _count: 4 },
      ];
      const result = await ExpenseServiceV2.getByStatus('org-1');
      assert.equal(result.pending.total, 200);
      assert.equal(result.pending.count, 3);
      assert.equal(result.approved.total, 800);
    });
  });

  describe('getTotalExpenses', () => {
    it('returns total expense amount', async () => {
      expAggregateImpl = async () => ({ _sum: { amount: 1500 } });
      const result = await ExpenseServiceV2.getTotalExpenses('org-1');
      assert.equal(result, 1500);
    });

    it('returns 0 on error', async () => {
      expAggregateImpl = async () => { throw new Error('DB down'); };
      const result = await ExpenseServiceV2.getTotalExpenses('org-1');
      assert.equal(result, 0);
    });
  });

  describe('getExpenseTrend', () => {
    it('returns monthly trend sorted by month', async () => {
      expFindManyImpl = async () => [
        { amount: 100, expenseDate: new Date('2024-02-15') },
        { amount: 200, expenseDate: new Date('2024-01-10') },
        { amount: 50, expenseDate: new Date('2024-02-20') },
      ];
      const result = await ExpenseServiceV2.getExpenseTrend('org-1');
      assert.equal(result.length, 2);
      assert.equal(result[0].month, '2024-01');
      assert.equal(result[0].total, 200);
      assert.equal(result[1].month, '2024-02');
      assert.equal(result[1].total, 150);
    });
  });

  describe('getPendingApprovals', () => {
    it('returns pending expenses', async () => {
      expFindManyImpl = async () => [{ id: 'e1', status: 'pending' }];
      const result = await ExpenseServiceV2.getPendingApprovals('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'pending');
    });
  });

  describe('getStats', () => {
    it('returns total, byCategory, byStatus, totalAmount, pendingAmount, approvedAmount', async () => {
      expCountImpl = async () => 10;
      expGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'category') {
          return [{ category: 'software', _sum: { amount: 500 }, _count: 5 }];
        }
        return [{ status: 'pending', _count: 3 }, { status: 'approved', _count: 7 }];
      };
      expAggregateImpl = async (args: AggregateArgs) => {
        if (args.where.status === 'pending') return { _sum: { amount: 300 } };
        if (args.where.status === 'approved') return { _sum: { amount: 700 } };
        return { _sum: { amount: 1000 } };
      };
      const result = await ExpenseServiceV2.getStats('org-1');
      assert.equal(result.total, 10);
      assert.equal(result.byCategory.software.total, 500);
      assert.equal(result.byStatus.pending, 3);
      assert.equal(result.byStatus.approved, 7);
      assert.equal(result.totalAmount, 1000);
      assert.equal(result.pendingAmount, 300);
      assert.equal(result.approvedAmount, 700);
    });
  });
});
