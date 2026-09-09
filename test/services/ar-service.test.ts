import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let invoiceFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  invoice: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'invoice.findMany', args }); return invoiceFindManyImpl(args); },
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
  invoiceFindManyImpl = async () => [];
}

function makeInvoiceRow(id: string, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    organizationId: 'org-1',
    customerId: 'cust-1',
    number: `INV-2025-${id}`,
    status: 'sent',
    type: 'sales',
    issueDate: new Date('2025-01-01'),
    dueDate: new Date('2025-02-01'),
    subtotal: 1000,
    taxRate: 0,
    taxAmount: 0,
    discountRate: 0,
    discountAmount: 0,
    total: 1000,
    currency: 'USD',
    paidAmount: 0,
    paidAt: null,
    sentAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { ARService } = await import('@/lib/services/ar-service');

// ─────────────────────────────────────────────────────────────────────────────
// ARService
// ─────────────────────────────────────────────────────────────────────────────

describe('ARService', () => {
  beforeEach(() => { resetMock(); });

  describe('getReceivables', () => {
    it('returns outstanding receivables', async () => {
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { status: 'sent', total: 1000, paidAmount: 0 }),
        makeInvoiceRow('inv-2', { status: 'overdue', total: 500, paidAmount: 100 }),
      ];

      const receivables = await ARService.getReceivables('org-1');

      assert.equal(receivables.length, 2);
      assert.equal(receivables[0].balance, 1000);
      assert.equal(receivables[1].balance, 400);
    });

    it('returns empty array on error', async () => {
      invoiceFindManyImpl = async () => { throw new Error('fail'); };

      const receivables = await ARService.getReceivables('org-1');
      assert.deepEqual(receivables, []);
    });
  });

  describe('getReceivablesByCustomer', () => {
    it('groups receivables by customer', async () => {
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { customerId: 'cust-1', total: 1000 }),
        makeInvoiceRow('inv-2', { customerId: 'cust-2', total: 500 }),
        makeInvoiceRow('inv-3', { customerId: 'cust-1', total: 300 }),
      ];

      const grouped = await ARService.getReceivablesByCustomer('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped['cust-1'].length, 2);
      assert.equal(grouped['cust-2'].length, 1);
    });
  });

  describe('getAgingReport', () => {
    it('buckets receivables by days overdue', async () => {
      const now = new Date();
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { status: 'sent', total: 100, dueDate: new Date(now.getTime() - 10 * 86400000) }), // 10 days overdue
        makeInvoiceRow('inv-2', { status: 'sent', total: 200, dueDate: new Date(now.getTime() - 45 * 86400000) }), // 45 days overdue
        makeInvoiceRow('inv-3', { status: 'sent', total: 300, dueDate: new Date(now.getTime() - 100 * 86400000) }), // 100 days overdue
      ];

      const report = await ARService.getAgingReport('org-1');

      assert.equal(report.buckets.length, 4);
      const bucket030 = report.buckets.find((b) => b.bucket === '0-30')!;
      const bucket3160 = report.buckets.find((b) => b.bucket === '31-60')!;
      const bucket90 = report.buckets.find((b) => b.bucket === '90+')!;
      assert.equal(bucket030.count, 1);
      assert.equal(bucket3160.count, 1);
      assert.equal(bucket90.count, 1);
      assert.ok(report.totalOutstanding > 0);
    });

    it('returns zero totals when no receivables', async () => {
      invoiceFindManyImpl = async () => [];

      const report = await ARService.getAgingReport('org-1');

      assert.equal(report.totalOutstanding, 0);
      assert.equal(report.totalOverdue, 0);
    });
  });

  describe('getDunningList', () => {
    it('returns overdue invoices with dunning levels', async () => {
      const now = new Date();
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { status: 'sent', total: 100, dueDate: new Date(now.getTime() - 10 * 86400000) }),
        makeInvoiceRow('inv-2', { status: 'sent', total: 200, dueDate: new Date(now.getTime() - 70 * 86400000) }),
      ];

      const dunning = await ARService.getDunningList('org-1');

      assert.equal(dunning.length, 2);
      // Sorted by daysOverdue descending, so 70-day comes first
      assert.equal(dunning[0].dunningLevel, 3); // 70 days
      assert.equal(dunning[1].dunningLevel, 1); // 10 days
    });

    it('returns empty list when no overdue invoices', async () => {
      const now = new Date();
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { status: 'sent', total: 100, dueDate: new Date(now.getTime() + 10 * 86400000) }), // not overdue
      ];

      const dunning = await ARService.getDunningList('org-1');

      assert.equal(dunning.length, 0);
    });
  });

  describe('getCollectionRate', () => {
    it('calculates collection rate as percentage', async () => {
      invoiceFindManyImpl = async () => [
        { total: 1000, paidAmount: 800 },
        { total: 500, paidAmount: 500 },
      ];

      const rate = await ARService.getCollectionRate('org-1');

      assert.ok(rate > 0);
      assert.ok(rate <= 100);
    });

    it('returns 0 when no invoices', async () => {
      invoiceFindManyImpl = async () => [];

      const rate = await ARService.getCollectionRate('org-1');
      assert.equal(rate, 0);
    });
  });

  describe('getAvgDaysToPay', () => {
    it('calculates average days to pay', async () => {
      invoiceFindManyImpl = async () => [
        { issueDate: new Date('2025-01-01'), paidAt: new Date('2025-01-15') }, // 14 days
        { issueDate: new Date('2025-02-01'), paidAt: new Date('2025-02-20') }, // 19 days
      ];

      const avg = await ARService.getAvgDaysToPay('org-1');

      assert.ok(avg > 0);
      assert.equal(avg, 17); // (14 + 19) / 2 = 16.5 -> rounded to 17
    });

    it('returns 0 when no paid invoices', async () => {
      invoiceFindManyImpl = async () => [];

      const avg = await ARService.getAvgDaysToPay('org-1');
      assert.equal(avg, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates AR stats', async () => {
      const now = new Date();
      // getReceivables, getCollectionRate, getAvgDaysToPay all call findMany
      // We need to handle multiple calls
      let callCount = 0;
      invoiceFindManyImpl = async () => {
        callCount++;
        if (callCount === 1) {
          // getReceivables
          return [
            makeInvoiceRow('inv-1', { status: 'sent', total: 1000, paidAmount: 0, dueDate: new Date(now.getTime() - 10 * 86400000) }),
          ];
        }
        if (callCount === 2) {
          // getCollectionRate
          return [{ total: 1000, paidAmount: 500 }];
        }
        // getAvgDaysToPay
        return [{ issueDate: new Date('2025-01-01'), paidAt: new Date('2025-01-15') }];
      };

      const stats = await ARService.getStats('org-1');

      assert.equal(stats.invoiceCount, 1);
      assert.equal(stats.overdueCount, 1);
      assert.ok(stats.totalReceivables > 0);
      assert.ok(stats.totalOverdue > 0);
      assert.ok(stats.collectionRate > 0);
      assert.ok(stats.avgDaysToPay > 0);
    });
  });
});
