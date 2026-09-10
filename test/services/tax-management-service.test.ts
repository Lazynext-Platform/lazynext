import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let taxFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let taxFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown | null> = async () => null;
let taxCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let taxUpdateImpl: (args: UpdateArgs) => Promise<unknown | null> = async () => null;
let taxCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown | null> = async () => null;
let memFindFirstImpl: (args: FindManyArgs) => Promise<unknown | null> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown | null> = async () => null;
let memDeleteImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  taxRecord: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'taxRecord.findMany', args }); return taxFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown | null> => { calls.push({ method: 'taxRecord.findUnique', args }); return taxFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'taxRecord.create', args }); return taxCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown | null> => { calls.push({ method: 'taxRecord.update', args }); return taxUpdateImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'taxRecord.count', args }); return taxCountImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown | null> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    findFirst: (args: FindManyArgs): Promise<unknown | null> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown | null> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
  taxFindManyImpl = async () => [];
  taxFindUniqueImpl = async () => null;
  taxCreateImpl = async () => ({});
  taxUpdateImpl = async () => null;
  taxCountImpl = async () => 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => null;
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

function makeTaxRow(id: string, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    organizationId: 'org-1',
    period: '2025-01',
    type: 'sales_tax',
    jurisdiction: 'US-CA',
    taxableAmount: 1000,
    taxRate: 8.5,
    taxAmount: 85,
    status: 'calculated',
    filedAt: null,
    paidAt: null,
    notes: '',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeMemoryRow(id: string, content: Record<string, unknown>, type: string, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { TaxManagementService } = await import('@/lib/services/tax-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// TaxManagementService
// ─────────────────────────────────────────────────────────────────────────────

describe('TaxManagementService', () => {
  beforeEach(() => { resetMock(); });

  describe('createTaxRecord', () => {
    it('creates a tax record and auto-calculates taxAmount', async () => {
      let captured: Record<string, unknown> | null = null;
      taxCreateImpl = async (args) => { captured = args.data; return makeTaxRow('tax-1'); };

      const record = await TaxManagementService.createTaxRecord('org-1', {
        period: '2025-01',
        type: 'sales_tax',
        taxableAmount: 1000,
        taxRate: 8.5,
      });

      assert.equal(record.id, 'tax-1');
      assert.equal(captured!.taxAmount, 85);
      assert.equal(captured!.status, 'calculated');
    });

    it('uses provided taxAmount when given', async () => {
      let captured: Record<string, unknown> | null = null;
      taxCreateImpl = async (args) => { captured = args.data; return makeTaxRow('tax-1'); };

      await TaxManagementService.createTaxRecord('org-1', {
        period: '2025-01',
        type: 'vat',
        taxableAmount: 1000,
        taxRate: 20,
        taxAmount: 250,
      });

      assert.equal(captured!.taxAmount, 250);
    });
  });

  describe('getTaxRecord', () => {
    it('returns a tax record by id', async () => {
      taxFindUniqueImpl = async () => makeTaxRow('tax-1');

      const record = await TaxManagementService.getTaxRecord('tax-1');

      assert.equal(record!.id, 'tax-1');
    });

    it('returns null when not found', async () => {
      taxFindUniqueImpl = async () => null;

      const record = await TaxManagementService.getTaxRecord('missing');
      assert.equal(record, null);
    });
  });

  describe('listTaxRecords', () => {
    it('lists tax records for an organization', async () => {
      taxFindManyImpl = async () => [makeTaxRow('tax-1'), makeTaxRow('tax-2')];

      const records = await TaxManagementService.listTaxRecords('org-1');

      assert.equal(records.length, 2);
    });

    it('applies filters', async () => {
      let capturedWhere: Record<string, unknown> | null = null;
      taxFindManyImpl = async (args) => { capturedWhere = args.where; return []; };

      await TaxManagementService.listTaxRecords('org-1', { period: '2025-01', type: 'sales_tax', status: 'calculated', jurisdiction: 'US-CA' });

      assert.equal(capturedWhere!.period, '2025-01');
      assert.equal(capturedWhere!.type, 'sales_tax');
      assert.equal(capturedWhere!.status, 'calculated');
      assert.equal(capturedWhere!.jurisdiction, 'US-CA');
    });

    it('returns empty array on error', async () => {
      taxFindManyImpl = async () => { throw new Error('fail'); };

      const records = await TaxManagementService.listTaxRecords('org-1');
      assert.deepEqual(records, []);
    });
  });

  describe('updateTaxRecord', () => {
    it('updates a tax record', async () => {
      taxUpdateImpl = async () => makeTaxRow('tax-1', { status: 'filed' });

      const record = await TaxManagementService.updateTaxRecord('tax-1', { status: 'filed' });

      assert.equal(record!.status, 'filed');
    });

    it('returns null on error', async () => {
      taxUpdateImpl = async () => { throw new Error('fail'); };

      const record = await TaxManagementService.updateTaxRecord('tax-1', { notes: 'x' });
      assert.equal(record, null);
    });
  });

  describe('calculateTax', () => {
    it('calculates tax with explicit rate', async () => {
      const result = await TaxManagementService.calculateTax('org-1', { amount: 1000, type: 'sales_tax', rate: 8.5 });

      assert.equal(result.taxAmount, 85);
      assert.equal(result.total, 1085);
      assert.equal(result.rate, 8.5);
    });

    it('uses stored rate when rate not provided', async () => {
      memFindManyImpl = async () => [makeMemoryRow('m-1', { jurisdiction: 'US-CA', type: 'sales_tax', rate: 7.5, effectiveDate: '2025-01-01', notes: '' }, 'tax_rate_setting')];

      const result = await TaxManagementService.calculateTax('org-1', { amount: 1000, type: 'sales_tax', jurisdiction: 'US-CA' });

      assert.equal(result.rate, 7.5);
      assert.equal(result.taxAmount, 75);
    });

    it('falls back to default rate when no stored rate', async () => {
      memFindManyImpl = async () => [];

      const result = await TaxManagementService.calculateTax('org-1', { amount: 1000, type: 'vat' });

      assert.equal(result.rate, 20);
      assert.equal(result.taxAmount, 200);
    });
  });

  describe('fileTaxRecord', () => {
    it('sets status to filed and filedAt', async () => {
      let captured: Record<string, unknown> | null = null;
      taxUpdateImpl = async (args) => { captured = args.data; return makeTaxRow('tax-1', { status: 'filed' }); };

      const record = await TaxManagementService.fileTaxRecord('tax-1');

      assert.equal(record!.status, 'filed');
      assert.ok(captured!.filedAt instanceof Date);
    });
  });

  describe('payTaxRecord', () => {
    it('sets status to paid and paidAt', async () => {
      let captured: Record<string, unknown> | null = null;
      taxUpdateImpl = async (args) => { captured = args.data; return makeTaxRow('tax-1', { status: 'paid' }); };

      const record = await TaxManagementService.payTaxRecord('tax-1');

      assert.equal(record!.status, 'paid');
      assert.ok(captured!.paidAt instanceof Date);
    });
  });

  describe('getTaxSummary', () => {
    it('aggregates totals by type, jurisdiction, status', async () => {
      taxFindManyImpl = async () => [
        makeTaxRow('t1', { type: 'sales_tax', jurisdiction: 'US-CA', taxableAmount: 1000, taxAmount: 85, status: 'calculated' }),
        makeTaxRow('t2', { type: 'vat', jurisdiction: 'EU', taxableAmount: 500, taxAmount: 100, status: 'paid' }),
      ];

      const summary = await TaxManagementService.getTaxSummary('org-1');

      assert.equal(summary.totalTaxableAmount, 1500);
      assert.equal(summary.totalTaxAmount, 185);
      assert.equal(summary.byType.sales_tax.count, 1);
      assert.equal(summary.byType.vat.taxAmount, 100);
      assert.equal(summary.byJurisdiction['US-CA'].count, 1);
      assert.equal(summary.byStatus.paid.count, 1);
    });

    it('returns empty summary on error', async () => {
      taxFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await TaxManagementService.getTaxSummary('org-1');
      assert.equal(summary.totalTaxAmount, 0);
    });
  });

  describe('getTaxObligations', () => {
    it('returns calculated and filed records as obligations', async () => {
      taxFindManyImpl = async () => [makeTaxRow('t1', { status: 'calculated', period: '2025-01', jurisdiction: 'US-CA', type: 'sales_tax' })];
      memFindManyImpl = async () => [];

      const obligations = await TaxManagementService.getTaxObligations('org-1');

      assert.equal(obligations.length, 1);
      assert.equal(obligations[0].status, 'calculated');
    });

    it('computes due date from filing schedule for monthly period', async () => {
      taxFindManyImpl = async () => [makeTaxRow('t1', { status: 'calculated', period: '2025-01', jurisdiction: 'US-CA', type: 'sales_tax' })];
      memFindManyImpl = async () => [makeMemoryRow('s1', { jurisdiction: 'US-CA', type: 'sales_tax', frequency: 'monthly', dueDay: 15, notes: '' }, 'tax_filing_schedule')];

      const obligations = await TaxManagementService.getTaxObligations('org-1');

      assert.ok(obligations[0].dueDate);
      assert.equal(obligations[0].dueDate!.getDate(), 15);
    });
  });

  describe('getTaxRates', () => {
    it('returns tax rate settings from memory', async () => {
      memFindManyImpl = async () => [makeMemoryRow('m1', { jurisdiction: 'US-CA', type: 'sales_tax', rate: 7.5, effectiveDate: '2025-01-01', notes: '' }, 'tax_rate_setting')];

      const rates = await TaxManagementService.getTaxRates('org-1', 'US-CA');

      assert.equal(rates.length, 1);
      assert.equal(rates[0].rate, 7.5);
    });

    it('filters by jurisdiction', async () => {
      memFindManyImpl = async () => [
        makeMemoryRow('m1', { jurisdiction: 'US-CA', type: 'sales_tax', rate: 7.5, effectiveDate: '', notes: '' }, 'tax_rate_setting'),
        makeMemoryRow('m2', { jurisdiction: 'US-NY', type: 'sales_tax', rate: 8.0, effectiveDate: '', notes: '' }, 'tax_rate_setting'),
      ];

      const rates = await TaxManagementService.getTaxRates('org-1', 'US-CA');
      assert.equal(rates.length, 1);
      assert.equal(rates[0].jurisdiction, 'US-CA');
    });
  });

  describe('setTaxRate', () => {
    it('stores a tax rate setting in memory', async () => {
      let captured: Record<string, unknown> | null = null;
      memCreateImpl = async (args) => { captured = args.data; return makeMemoryRow('m1', { jurisdiction: 'US-CA', type: 'sales_tax', rate: 7.5, effectiveDate: '2025-01-01', notes: '' }, 'tax_rate_setting'); };

      const rate = await TaxManagementService.setTaxRate('org-1', 'ws-1', { jurisdiction: 'US-CA', type: 'sales_tax', rate: 7.5 }, 'user-1');

      assert.equal(rate.rate, 7.5);
      assert.equal(captured!.type, 'tax_rate_setting');
      assert.equal(captured!.createdBy, 'user-1');
    });
  });

  describe('getFilingSchedule', () => {
    it('returns filing schedules from memory', async () => {
      memFindManyImpl = async () => [makeMemoryRow('s1', { jurisdiction: 'US-CA', type: 'sales_tax', frequency: 'monthly', dueDay: 15, notes: '' }, 'tax_filing_schedule')];

      const schedules = await TaxManagementService.getFilingSchedule('org-1');

      assert.equal(schedules.length, 1);
      assert.equal(schedules[0].frequency, 'monthly');
      assert.equal(schedules[0].dueDay, 15);
    });
  });

  describe('createFilingSchedule', () => {
    it('stores a filing schedule in memory', async () => {
      let captured: Record<string, unknown> | null = null;
      memCreateImpl = async (args) => { captured = args.data; return makeMemoryRow('s1', { jurisdiction: 'US-CA', type: 'sales_tax', frequency: 'monthly', dueDay: 15, notes: '' }, 'tax_filing_schedule'); };

      const schedule = await TaxManagementService.createFilingSchedule('org-1', 'ws-1', { jurisdiction: 'US-CA', type: 'sales_tax', frequency: 'monthly', dueDay: 15 }, 'user-1');

      assert.equal(schedule.dueDay, 15);
      assert.equal(captured!.type, 'tax_filing_schedule');
    });
  });

  describe('getStats', () => {
    it('aggregates tax stats', async () => {
      taxFindManyImpl = async () => [
        { type: 'sales_tax', status: 'calculated', taxAmount: 85, taxableAmount: 1000 },
        { type: 'vat', status: 'paid', taxAmount: 100, taxableAmount: 500 },
      ];
      taxCountImpl = async () => 2;

      const stats = await TaxManagementService.getStats('org-1');

      assert.equal(stats.totalCount, 2);
      assert.equal(stats.totalTaxAmount, 185);
      assert.equal(stats.totalTaxableAmount, 1500);
      assert.equal(stats.byStatus.calculated, 1);
      assert.equal(stats.byType.vat, 1);
    });

    it('returns zero stats on error', async () => {
      taxFindManyImpl = async () => { throw new Error('fail'); };
      taxCountImpl = async () => { throw new Error('fail'); };

      const stats = await TaxManagementService.getStats('org-1');
      assert.equal(stats.totalCount, 0);
      assert.equal(stats.totalTaxAmount, 0);
    });
  });
});
