import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let expenseFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let expenseCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  expense: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'expense.findMany', args }); return expenseFindManyImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'expense.count', args }); return expenseCountImpl(args); },
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
  expenseFindManyImpl = async () => [];
  expenseCountImpl = async () => 0;
}

function makeExpenseRow(id: string, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    organizationId: 'org-1',
    workspaceId: null,
    vendor: 'Vendor Co',
    description: 'Office supplies',
    category: 'office',
    amount: 500,
    currency: 'USD',
    status: 'approved',
    expenseDate: new Date('2025-01-01'),
    receiptUrl: null,
    approvedBy: 'user-1',
    approvedAt: new Date('2025-01-05'),
    submittedBy: 'user-2',
    tags: '[]',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { APService } = await import('@/lib/services/ap-service');

// ─────────────────────────────────────────────────────────────────────────────
// APService
// ─────────────────────────────────────────────────────────────────────────────

describe('APService', () => {
  beforeEach(() => { resetMock(); });

  describe('getPayables', () => {
    it('returns approved expenses as payables', async () => {
      expenseFindManyImpl = async () => [
        makeExpenseRow('exp-1', { vendor: 'Vendor A', amount: 500 }),
        makeExpenseRow('exp-2', { vendor: 'Vendor B', amount: 300 }),
      ];

      const payables = await APService.getPayables('org-1');

      assert.equal(payables.length, 2);
      assert.equal(payables[0].vendor, 'Vendor A');
      assert.equal(payables[0].amount, 500);
    });

    it('returns empty array on error', async () => {
      expenseFindManyImpl = async () => { throw new Error('fail'); };

      const payables = await APService.getPayables('org-1');
      assert.deepEqual(payables, []);
    });
  });

  describe('getPayablesByVendor', () => {
    it('groups payables by vendor', async () => {
      expenseFindManyImpl = async () => [
        makeExpenseRow('exp-1', { vendor: 'Vendor A', amount: 500 }),
        makeExpenseRow('exp-2', { vendor: 'Vendor B', amount: 300 }),
        makeExpenseRow('exp-3', { vendor: 'Vendor A', amount: 200 }),
      ];

      const grouped = await APService.getPayablesByVendor('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped['Vendor A'].length, 2);
      assert.equal(grouped['Vendor B'].length, 1);
    });
  });

  describe('getAgingReport', () => {
    it('buckets payables by days since approval', async () => {
      const now = new Date();
      expenseFindManyImpl = async () => [
        makeExpenseRow('exp-1', { amount: 100, approvedAt: new Date(now.getTime() - 10 * 86400000) }),
        makeExpenseRow('exp-2', { amount: 200, approvedAt: new Date(now.getTime() - 45 * 86400000) }),
        makeExpenseRow('exp-3', { amount: 300, approvedAt: new Date(now.getTime() - 100 * 86400000) }),
      ];

      const report = await APService.getAgingReport('org-1');

      assert.equal(report.buckets.length, 4);
      const bucket030 = report.buckets.find((b) => b.bucket === '0-30')!;
      const bucket3160 = report.buckets.find((b) => b.bucket === '31-60')!;
      const bucket90 = report.buckets.find((b) => b.bucket === '90+')!;
      assert.equal(bucket030.count, 1);
      assert.equal(bucket3160.count, 1);
      assert.equal(bucket90.count, 1);
      assert.equal(report.totalPayables, 600);
    });

    it('returns zero totals when no payables', async () => {
      expenseFindManyImpl = async () => [];

      const report = await APService.getAgingReport('org-1');

      assert.equal(report.totalPayables, 0);
    });
  });

  describe('getUpcomingPayments', () => {
    it('returns pending expenses', async () => {
      expenseFindManyImpl = async () => [
        makeExpenseRow('exp-1', { status: 'pending', vendor: 'Vendor A', amount: 500 }),
      ];

      const upcoming = await APService.getUpcomingPayments('org-1');

      assert.equal(upcoming.length, 1);
      assert.equal(upcoming[0].vendor, 'Vendor A');
      assert.equal(upcoming[0].status, 'pending');
    });

    it('returns empty array on error', async () => {
      expenseFindManyImpl = async () => { throw new Error('fail'); };

      const upcoming = await APService.getUpcomingPayments('org-1');
      assert.deepEqual(upcoming, []);
    });
  });

  describe('getTotalPayables', () => {
    it('returns total payables amount', async () => {
      expenseFindManyImpl = async () => [
        makeExpenseRow('exp-1', { amount: 500 }),
        makeExpenseRow('exp-2', { amount: 300 }),
      ];

      const total = await APService.getTotalPayables('org-1');

      assert.equal(total, 800);
    });

    it('returns 0 when no payables', async () => {
      expenseFindManyImpl = async () => [];

      const total = await APService.getTotalPayables('org-1');
      assert.equal(total, 0);
    });
  });

  describe('getPaymentTrend', () => {
    it('returns monthly payment trend', async () => {
      const now = new Date();
      expenseFindManyImpl = async () => [
        { amount: 500, updatedAt: new Date(now.getFullYear(), now.getMonth(), 15) },
        { amount: 300, updatedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10) },
      ];

      const trend = await APService.getPaymentTrend('org-1', 3);

      assert.equal(trend.length, 3);
      const currentMonth = trend[2];
      assert.ok(currentMonth.amount >= 500);
    });

    it('returns zero-filled trend when no payments', async () => {
      expenseFindManyImpl = async () => [];

      const trend = await APService.getPaymentTrend('org-1', 6);

      assert.equal(trend.length, 6);
      assert.equal(trend[0].amount, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates AP stats', async () => {
      const now = new Date();
      let callCount = 0;
      expenseFindManyImpl = async () => {
        callCount++;
        if (callCount === 1) {
          // getPayables
          return [
            makeExpenseRow('exp-1', { vendor: 'Vendor A', amount: 500, category: 'office' }),
            makeExpenseRow('exp-2', { vendor: 'Vendor B', amount: 300, category: 'software' }),
          ];
        }
        // reimbursed expenses for avgDaysToPay
        return [
          { approvedAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-15'), category: 'office', amount: 100 },
        ];
      };
      expenseCountImpl = async () => 5;

      const stats = await APService.getStats('org-1');

      assert.equal(stats.payableCount, 2);
      assert.equal(stats.totalPayables, 800);
      assert.equal(stats.pendingApprovalCount, 5);
      assert.ok(stats.avgDaysToPay > 0);
      assert.ok(stats.byCategory.office > 0);
    });
  });
});
