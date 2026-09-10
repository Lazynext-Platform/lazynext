import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  select?: unknown;
  include?: unknown;
};
type FindUniqueArgs = {
  where: Record<string, unknown>;
  include?: unknown;
};
type FindFirstArgs = {
  where: Record<string, unknown>;
};
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type AggregateArgs = { where: Record<string, unknown>; _sum?: unknown };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// PayrollRecord
let payrollFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let payrollFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let payrollCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let payrollUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let payrollCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let payrollAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { grossAmount: 0, netAmount: 0 } });

// Memory
let memoryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memoryFindFirstImpl: (args: FindFirstArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memoryCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  payrollRecord: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'payrollRecord.findMany', args }); return payrollFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'payrollRecord.findUnique', args }); return payrollFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'payrollRecord.create', args }); return payrollCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'payrollRecord.update', args }); return payrollUpdateImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'payrollRecord.count', args }); return payrollCountImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'payrollRecord.aggregate', args }); return payrollAggregateImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memoryFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memoryFindUniqueImpl(args); },
    findFirst: (args: FindFirstArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memoryFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memoryCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memoryUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memoryDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memoryCountImpl(args); },
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
  payrollFindManyImpl = async () => [];
  payrollFindUniqueImpl = async () => null;
  payrollCreateImpl = async () => ({});
  payrollUpdateImpl = async () => ({});
  payrollCountImpl = async () => 0;
  payrollAggregateImpl = async () => ({ _sum: { grossAmount: 0, netAmount: 0 } });
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryCountImpl = async () => 0;
}

const { PayrollManagementService } = await import('@/lib/services/payroll-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PayrollManagementService', () => {
  beforeEach(() => { resetMock(); });

  describe('createPayrollRun', () => {
    it('creates a payroll run in memory with status open', async () => {
      memoryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'payroll_run');
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.workspaceId, 'ws-1');
        assert.equal(args.data.createdBy, 'user-1');
        const content = JSON.parse(args.data.content as string) as { status: string; period: string };
        assert.equal(content.status, 'open');
        assert.equal(content.period, '2024-06');
        return { id: 'run-1', ...args.data };
      };

      const result = await PayrollManagementService.createPayrollRun(
        'org-1', 'ws-1', { period: '2024-06' }, 'user-1',
      );
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'run-1');
    });

    it('passes through payDate and period dates', async () => {
      const payDate = new Date('2024-06-30');
      memoryCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string) as { payDate: string; payPeriodStart: string };
        assert.equal(content.payDate, payDate.toISOString());
        assert.ok(content.payPeriodStart);
        return { id: 'run-2' };
      };

      await PayrollManagementService.createPayrollRun(
        'org-1', 'ws-1',
        { period: '2024-06', payDate, payPeriodStart: new Date('2024-06-01') },
        'user-1',
      );
    });
  });

  describe('getPayrollRun', () => {
    it('returns a parsed payroll run', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'run-1',
        type: 'payroll_run',
        content: JSON.stringify({ period: '2024-06', status: 'open' }),
        createdAt: new Date('2024-06-01'),
      });
      const result = await PayrollManagementService.getPayrollRun('run-1');
      assert.ok(result);
      assert.equal((result as unknown as { period: string }).period, '2024-06');
      assert.equal((result as unknown as { status: string }).status, 'open');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await PayrollManagementService.getPayrollRun('nope');
      assert.equal(result, null);
    });
  });

  describe('listPayrollRuns', () => {
    it('lists payroll runs for an organization', async () => {
      memoryFindManyImpl = async () => ([
        { id: 'run-1', type: 'payroll_run', content: JSON.stringify({ period: '2024-06', status: 'open' }), createdAt: new Date() },
        { id: 'run-2', type: 'payroll_run', content: JSON.stringify({ period: '2024-05', status: 'finalized' }), createdAt: new Date() },
      ]);
      const result = await PayrollManagementService.listPayrollRuns('org-1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.type, 'payroll_run');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };
      const result = await PayrollManagementService.listPayrollRuns('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('addPayrollRecord', () => {
    it('auto-calculates netAmount = gross - tax - deductions + benefits', async () => {
      payrollCreateImpl = async (args: CreateArgs) => {
        // net = 5000 - 1000 - 200 + 100 = 3900
        assert.equal(args.data.netAmount, 3900);
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.currency, 'USD');
        return { id: 'p1', ...args.data };
      };

      const result = await PayrollManagementService.addPayrollRecord('org-1', {
        employeeName: 'Alice Smith',
        period: '2024-06',
        grossAmount: 5000,
        taxWithheld: 1000,
        deductions: 200,
        benefits: 100,
      });
      assert.ok(result);
    });

    it('uses provided netAmount when given', async () => {
      payrollCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.netAmount, 4500);
        return { id: 'p2' };
      };

      await PayrollManagementService.addPayrollRecord('org-1', {
        employeeName: 'Bob',
        period: '2024-06',
        grossAmount: 5000,
        taxWithheld: 500,
        netAmount: 4500,
      });
    });

    it('defaults tax, benefits, deductions to 0', async () => {
      payrollCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.taxWithheld, 0);
        assert.equal(args.data.benefits, 0);
        assert.equal(args.data.deductions, 0);
        assert.equal(args.data.netAmount, 5000);
        return { id: 'p3' };
      };

      await PayrollManagementService.addPayrollRecord('org-1', {
        employeeName: 'Carol',
        period: '2024-06',
        grossAmount: 5000,
      });
    });
  });

  describe('getPayrollRecord', () => {
    it('returns a record by id', async () => {
      payrollFindUniqueImpl = async () => ({ id: 'p1', employeeName: 'Alice' });
      const result = await PayrollManagementService.getPayrollRecord('p1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'p1');
    });

    it('returns null when not found', async () => {
      payrollFindUniqueImpl = async () => null;
      const result = await PayrollManagementService.getPayrollRecord('nope');
      assert.equal(result, null);
    });
  });

  describe('listPayrollRecords', () => {
    it('lists records with filters', async () => {
      payrollFindManyImpl = async () => ([{ id: 'p1' }, { id: 'p2' }]);
      const result = await PayrollManagementService.listPayrollRecords('org-1', {
        period: '2024-06', status: 'paid', employeeId: 'e1',
      });
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.period, '2024-06');
      assert.equal(args.where.status, 'paid');
      assert.equal(args.where.employeeId, 'e1');
    });

    it('returns empty array on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };
      const result = await PayrollManagementService.listPayrollRecords('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updatePayrollRecord', () => {
    it('updates only provided fields', async () => {
      payrollUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.grossAmount, 6000);
        assert.equal(args.data.status, undefined);
        return { id: 'p1', ...args.data };
      };
      const result = await PayrollManagementService.updatePayrollRecord('p1', { grossAmount: 6000 });
      assert.ok(result);
    });
  });

  describe('approvePayrollRecord', () => {
    it('sets status to approved', async () => {
      payrollUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        return { id: 'p1', status: 'approved' };
      };
      const result = await PayrollManagementService.approvePayrollRecord('p1');
      assert.equal((result as { status: string }).status, 'approved');
    });
  });

  describe('payPayrollRecord', () => {
    it('sets status to paid and payDate to now when not set', async () => {
      payrollFindUniqueImpl = async () => ({ id: 'p1', payDate: null });
      payrollUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'paid');
        assert.ok(args.data.payDate instanceof Date);
        return { id: 'p1', status: 'paid' };
      };
      const result = await PayrollManagementService.payPayrollRecord('p1');
      assert.equal((result as { status: string }).status, 'paid');
    });

    it('preserves existing payDate when already set', async () => {
      const existingDate = new Date('2024-06-15');
      payrollFindUniqueImpl = async () => ({ id: 'p1', payDate: existingDate });
      payrollUpdateImpl = async (args: UpdateArgs) => {
        assert.deepEqual(args.data.payDate, existingDate);
        return { id: 'p1' };
      };
      await PayrollManagementService.payPayrollRecord('p1');
    });
  });

  describe('finalizePayrollRun', () => {
    it('approves all draft records in the period and finalizes the run', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'run-1',
        type: 'payroll_run',
        content: JSON.stringify({ period: '2024-06', status: 'open', organizationId: 'org-1' }),
        createdAt: new Date(),
      });
      payrollFindManyImpl = async () => ([{ id: 'p1' }, { id: 'p2' }]);
      payrollUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'approved');
        return { id: args.where.id, status: 'approved' };
      };
      memoryUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string) as { status: string; period: string };
        assert.equal(content.status, 'finalized');
        assert.equal(content.period, '2024-06');
        return { id: 'run-1' };
      };

      const result = await PayrollManagementService.finalizePayrollRun('run-1', 'org-1');
      assert.ok(result);
      // Should have updated records
      const updateCalls = calls.filter((c) => c.method === 'payrollRecord.update');
      assert.equal(updateCalls.length, 2);
    });

    it('throws when run not found', async () => {
      memoryFindUniqueImpl = async () => null;
      await assert.rejects(
        () => PayrollManagementService.finalizePayrollRun('nope', 'org-1'),
        /payroll_run_not_found/,
      );
    });
  });

  describe('getPayrollSummary', () => {
    it('aggregates payroll totals', async () => {
      payrollFindManyImpl = async () => ([
        { grossAmount: 5000, taxWithheld: 1000, netAmount: 4000, benefits: 100, deductions: 200 },
        { grossAmount: 3000, taxWithheld: 600, netAmount: 2400, benefits: 0, deductions: 0 },
      ]);
      const summary = await PayrollManagementService.getPayrollSummary('org-1');
      assert.equal(summary.totalRecords, 2);
      assert.equal(summary.totalGross, 8000);
      assert.equal(summary.totalTax, 1600);
      assert.equal(summary.totalNet, 6400);
      assert.equal(summary.totalBenefits, 100);
      assert.equal(summary.totalDeductions, 200);
    });

    it('filters by period', async () => {
      payrollFindManyImpl = async (args: FindManyArgs) => {
        assert.equal(args.where.period, '2024-06');
        return [];
      };
      await PayrollManagementService.getPayrollSummary('org-1', { period: '2024-06' });
    });

    it('applies date range filter', async () => {
      payrollFindManyImpl = async (args: FindManyArgs) => {
        assert.ok(args.where.payDate);
        return [];
      };
      await PayrollManagementService.getPayrollSummary('org-1', {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      });
    });

    it('returns zero summary on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };
      const summary = await PayrollManagementService.getPayrollSummary('org-1');
      assert.equal(summary.totalRecords, 0);
      assert.equal(summary.totalGross, 0);
    });
  });

  describe('getPayrollByEmployee', () => {
    it('returns records for an employee', async () => {
      payrollFindManyImpl = async () => ([{ id: 'p1' }, { id: 'p2' }]);
      const result = await PayrollManagementService.getPayrollByEmployee('org-1', 'e1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.employeeId, 'e1');
    });

    it('returns empty array on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };
      const result = await PayrollManagementService.getPayrollByEmployee('org-1', 'e1');
      assert.deepEqual(result, []);
    });
  });

  describe('calculateTax', () => {
    it('calculates 10% tax for income up to 10k', () => {
      const tax = PayrollManagementService.calculateTax(8000);
      // 8000 * 0.10 = 800
      assert.equal(tax, 800);
    });

    it('calculates progressive tax across brackets', () => {
      const tax = PayrollManagementService.calculateTax(25000);
      // 10000 * 0.10 + 15000 * 0.15 = 1000 + 2250 = 3250
      assert.equal(tax, 3250);
    });

    it('calculates tax for high income across all brackets', () => {
      const tax = PayrollManagementService.calculateTax(150000);
      // 10000*0.10 + 30000*0.15 + 60000*0.25 + 50000*0.35
      // = 1000 + 4500 + 15000 + 17500 = 38000
      assert.equal(tax, 38000);
    });

    it('reduces tax for married filing status', () => {
      const taxSingle = PayrollManagementService.calculateTax(25000);
      const taxMarried = PayrollManagementService.calculateTax(25000, { filingStatus: 'married' });
      assert.ok(taxMarried < taxSingle);
      assert.equal(taxMarried, Math.round(3250 * 0.9 * 100) / 100);
    });

    it('returns 0 for zero gross', () => {
      const tax = PayrollManagementService.calculateTax(0);
      assert.equal(tax, 0);
    });
  });

  describe('generatePayslip', () => {
    it('returns formatted payslip data', async () => {
      payrollFindUniqueImpl = async () => ({
        id: 'p1',
        employeeName: 'Alice Smith',
        employeeId: 'e1',
        period: '2024-06',
        payDate: new Date('2024-06-30'),
        payPeriodStart: new Date('2024-06-01'),
        payPeriodEnd: new Date('2024-06-30'),
        currency: 'USD',
        grossAmount: 5000,
        taxWithheld: 1000,
        netAmount: 3900,
        benefits: 100,
        deductions: 200,
      });
      const payslip = await PayrollManagementService.generatePayslip('p1');
      assert.ok(payslip);
      assert.equal(payslip!.employeeName, 'Alice Smith');
      assert.equal(payslip!.earnings.grossAmount, 5000);
      assert.equal(payslip!.earnings.benefits, 100);
      assert.equal(payslip!.deductions.taxWithheld, 1000);
      assert.equal(payslip!.deductions.deductions, 200);
      assert.equal(payslip!.deductions.totalDeductions, 1200);
      assert.equal(payslip!.netPay, 3900);
    });

    it('returns null when record not found', async () => {
      payrollFindUniqueImpl = async () => null;
      const payslip = await PayrollManagementService.generatePayslip('nope');
      assert.equal(payslip, null);
    });
  });

  describe('getStats', () => {
    it('aggregates payroll stats', async () => {
      payrollFindManyImpl = async () => ([
        { status: 'draft', grossAmount: 5000, netAmount: 4000 },
        { status: 'paid', grossAmount: 3000, netAmount: 2400 },
        { status: 'paid', grossAmount: 2000, netAmount: 1600 },
      ]);
      const stats = await PayrollManagementService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.byStatus.draft, 1);
      assert.equal(stats.byStatus.paid, 2);
      assert.equal(stats.totalGross, 10000);
      assert.equal(stats.totalNet, 8000);
    });

    it('returns zero stats on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };
      const stats = await PayrollManagementService.getStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.totalGross, 0);
    });
  });
});
