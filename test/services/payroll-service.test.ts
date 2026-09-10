import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type PayrollFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type PayrollFindUniqueArgs = {
  where: { id: string };
};

type PayrollCreateArgs = {
  data: Record<string, unknown>;
};

type PayrollUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type PayrollDeleteArgs = {
  where: { id: string };
};

type EmployeeFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let payrollFindManyImpl: (args: PayrollFindManyArgs) => Promise<unknown[]> =
  async () => [];
let payrollFindUniqueImpl: (args: PayrollFindUniqueArgs) => Promise<unknown> =
  async () => null;
let payrollCreateImpl: (args: PayrollCreateArgs) => Promise<unknown> =
  async () => ({});
let payrollUpdateImpl: (args: PayrollUpdateArgs) => Promise<unknown> =
  async () => ({});
let payrollDeleteImpl: (args: PayrollDeleteArgs) => Promise<unknown> =
  async () => ({});
let employeeFindManyImpl: (args: EmployeeFindManyArgs) => Promise<unknown[]> =
  async () => [];

const prismaMock = {
  payrollRecord: {
    findMany: (args: PayrollFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'payrollRecord.findMany', args });
      return payrollFindManyImpl(args);
    },
    findUnique: (args: PayrollFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'payrollRecord.findUnique', args });
      return payrollFindUniqueImpl(args);
    },
    create: (args: PayrollCreateArgs): Promise<unknown> => {
      calls.push({ method: 'payrollRecord.create', args });
      return payrollCreateImpl(args);
    },
    update: (args: PayrollUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'payrollRecord.update', args });
      return payrollUpdateImpl(args);
    },
    delete: (args: PayrollDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'payrollRecord.delete', args });
      return payrollDeleteImpl(args);
    },
  },
  employee: {
    findMany: (args: EmployeeFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'employee.findMany', args });
      return employeeFindManyImpl(args);
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
  payrollFindManyImpl = async () => [];
  payrollFindUniqueImpl = async () => null;
  payrollCreateImpl = async () => ({});
  payrollUpdateImpl = async () => ({});
  payrollDeleteImpl = async () => ({});
  employeeFindManyImpl = async () => [];
}

const { PayrollService } = await import('@/lib/services/payroll-service');

// ─────────────────────────────────────────────────────────────────────────────
// PayrollService
// ─────────────────────────────────────────────────────────────────────────────

describe('PayrollService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a payroll record with defaults', async () => {
      payrollCreateImpl = async (args: PayrollCreateArgs) => {
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.payType, 'salary');
        return { id: 'p1', ...args.data };
      };

      const result = await PayrollService.create({
        organizationId: 'org-1',
        employeeName: 'Alice Smith',
        grossAmount: 5000,
      });

      assert.ok(result);
      assert.equal(result.id, 'p1');
    });

    it('auto-calculates net amount from gross, tax, and deductions', async () => {
      payrollCreateImpl = async (args: PayrollCreateArgs) => {
        // net = gross - tax - deductions + benefits = 5000 - 1000 - 200 + 100 = 3900
        assert.equal(args.data.netAmount, 3900);
        return { id: 'p1' };
      };

      await PayrollService.create({
        organizationId: 'org-1',
        employeeName: 'Alice',
        grossAmount: 5000,
        taxWithheld: 1000,
        deductions: 200,
        benefits: 100,
      });
    });

    it('generates period string from current date when not provided', async () => {
      payrollCreateImpl = async (args: PayrollCreateArgs) => {
        assert.match(args.data.period as string, /^\d{4}-\d{2}$/);
        return { id: 'p1' };
      };

      await PayrollService.create({
        organizationId: 'org-1',
        employeeName: 'Alice',
        grossAmount: 5000,
      });
    });
  });

  describe('get', () => {
    it('returns a record by id', async () => {
      payrollFindUniqueImpl = async () => ({ id: 'p1', employeeName: 'Alice' });

      const result = await PayrollService.get('p1');
      assert.ok(result);
      assert.equal(result.id, 'p1');
    });

    it('returns null when not found', async () => {
      payrollFindUniqueImpl = async () => null;

      const result = await PayrollService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error', async () => {
      payrollFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await PayrollService.get('p1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns records for an organization', async () => {
      payrollFindManyImpl = async () => ([{ id: 'p1' }]);

      const result = await PayrollService.list('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as PayrollFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies employeeId and status filters', async () => {
      payrollFindManyImpl = async () => [];

      await PayrollService.list('org-1', { employeeId: 'e1', status: 'paid' });

      const args = calls[0].args as PayrollFindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
      assert.equal(args.where.status, 'paid');
    });

    it('applies date range filter', async () => {
      payrollFindManyImpl = async () => [];

      await PayrollService.list('org-1', { dateRange: { start: new Date('2024-01-01') } });

      const args = calls[0].args as PayrollFindManyArgs;
      assert.ok(args.where.payDate);
    });

    it('returns empty array on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };

      const result = await PayrollService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      payrollUpdateImpl = async (args: PayrollUpdateArgs) => {
        assert.equal(args.data.grossAmount, 6000);
        assert.equal(args.data.status, undefined);
        return { id: 'p1', ...args.data };
      };

      const result = await PayrollService.update('p1', { grossAmount: 6000 });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a record', async () => {
      payrollDeleteImpl = async () => ({ id: 'p1' });

      await PayrollService.delete('p1');
      assert.equal(calls[0].method, 'payrollRecord.delete');
    });
  });

  describe('process', () => {
    it('sets status to processed', async () => {
      payrollUpdateImpl = async (args: PayrollUpdateArgs) => {
        assert.equal(args.data.status, 'processed');
        return { id: 'p1', status: 'processed' };
      };

      await PayrollService.process('p1');
    });
  });

  describe('markPaid', () => {
    it('sets status to paid with pay date', async () => {
      payrollUpdateImpl = async (args: PayrollUpdateArgs) => {
        assert.equal(args.data.status, 'paid');
        assert.ok(args.data.payDate instanceof Date);
        return { id: 'p1', status: 'paid' };
      };

      await PayrollService.markPaid('p1');
    });

    it('uses provided pay date', async () => {
      const customDate = new Date('2024-06-15');
      payrollUpdateImpl = async (args: PayrollUpdateArgs) => {
        assert.deepEqual(args.data.payDate, customDate);
        return { id: 'p1' };
      };

      await PayrollService.markPaid('p1', customDate);
    });
  });

  describe('markFailed', () => {
    it('sets status to failed', async () => {
      payrollUpdateImpl = async (args: PayrollUpdateArgs) => {
        assert.equal(args.data.status, 'failed');
        return { id: 'p1', status: 'failed' };
      };

      await PayrollService.markFailed('p1');
    });
  });

  describe('getByEmployee', () => {
    it('returns records for an employee', async () => {
      payrollFindManyImpl = async () => ([{ id: 'p1' }, { id: 'p2' }]);

      const result = await PayrollService.getByEmployee('e1');
      assert.equal(result.length, 2);
    });

    it('returns empty array on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };

      const result = await PayrollService.getByEmployee('e1');
      assert.deepEqual(result, []);
    });
  });

  describe('generatePayroll', () => {
    it('generates records for all active employees', async () => {
      employeeFindManyImpl = async () => ([
        { id: 'e1', firstName: 'Alice', lastName: 'Smith', salary: 5000, salaryCurrency: 'USD', payFrequency: 'monthly', workspaceId: null },
        { id: 'e2', firstName: 'Bob', lastName: 'Jones', salary: 4000, salaryCurrency: 'USD', payFrequency: 'monthly', workspaceId: null },
      ]);
      payrollCreateImpl = async (args: PayrollCreateArgs) => ({ id: 'p-new', ...args.data });

      const records = await PayrollService.generatePayroll('org-1', '2024-06');
      assert.equal(records.length, 2);
      // Verify it queried active employees
      const empArgs = calls.find((c) => c.method === 'employee.findMany')?.args as EmployeeFindManyArgs;
      assert.equal(empArgs.where.organizationId, 'org-1');
      assert.equal(empArgs.where.status, 'active');
    });

    it('returns empty array when no active employees', async () => {
      employeeFindManyImpl = async () => [];

      const records = await PayrollService.generatePayroll('org-1');
      assert.equal(records.length, 0);
    });
  });

  describe('getPayrollSummary', () => {
    it('aggregates payroll summary', async () => {
      payrollFindManyImpl = async () => ([
        { grossAmount: 5000, taxWithheld: 1000, netAmount: 4000, benefits: 0, deductions: 0, status: 'paid', currency: 'USD', period: '2024-06' },
        { grossAmount: 3000, taxWithheld: 600, netAmount: 2400, benefits: 0, deductions: 0, status: 'draft', currency: 'USD', period: '2024-06' },
      ]);

      const summary = await PayrollService.getPayrollSummary('org-1');
      assert.equal(summary.totalRecords, 2);
      assert.equal(summary.totalGross, 8000);
      assert.equal(summary.totalNet, 6400);
      assert.equal(summary.byStatus.paid, 1);
      assert.equal(summary.byStatus.draft, 1);
    });

    it('filters by period when provided', async () => {
      payrollFindManyImpl = async (args: PayrollFindManyArgs) => {
        assert.equal(args.where.period, '2024-06');
        return [];
      };

      await PayrollService.getPayrollSummary('org-1', '2024-06');
    });

    it('returns zero summary on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await PayrollService.getPayrollSummary('org-1');
      assert.equal(summary.totalRecords, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates payroll stats', async () => {
      payrollFindManyImpl = async () => ([
        { status: 'draft', payType: 'salary', grossAmount: 5000, netAmount: 4000, currency: 'USD', period: '2024-06' },
        { status: 'paid', payType: 'salary', grossAmount: 3000, netAmount: 2400, currency: 'USD', period: '2024-06' },
      ]);

      const stats = await PayrollService.getStats('org-1');
      assert.equal(stats.total, 2);
      assert.equal(stats.draft, 1);
      assert.equal(stats.paid, 1);
      assert.equal(stats.totalGross, 8000);
      assert.equal(stats.totalNet, 6400);
    });

    it('returns zero stats on error', async () => {
      payrollFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await PayrollService.getStats('org-1');
      assert.equal(stats.total, 0);
    });
  });
});
