import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type TaxType = 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
export type TaxStatus = 'calculated' | 'filed' | 'paid';

/** Raw TaxRecord row as stored in the database. */
interface TaxRecordRow {
  id: string;
  organizationId: string;
  period: string;
  type: string;
  jurisdiction: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  status: string;
  filedAt: Date | null;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxRecord {
  id: string;
  organizationId: string;
  period: string;
  type: TaxType;
  jurisdiction: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  status: TaxStatus;
  filedAt: Date | null;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxRateSetting {
  id: string;
  organizationId: string;
  workspaceId: string;
  jurisdiction: string;
  type: TaxType;
  rate: number;
  effectiveDate: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilingSchedule {
  id: string;
  organizationId: string;
  workspaceId: string;
  jurisdiction: string;
  type: TaxType;
  frequency: 'monthly' | 'quarterly' | 'annually';
  dueDay: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxCalculationResult {
  amount: number;
  taxAmount: number;
  total: number;
  rate: number;
  breakdown: Record<string, number>;
}

export interface TaxSummary {
  totalTaxableAmount: number;
  totalTaxAmount: number;
  byType: Record<string, { taxableAmount: number; taxAmount: number; count: number }>;
  byJurisdiction: Record<string, { taxableAmount: number; taxAmount: number; count: number }>;
  byStatus: Record<string, { taxableAmount: number; taxAmount: number; count: number }>;
}

export interface TaxObligation {
  id: string;
  period: string;
  type: TaxType;
  jurisdiction: string;
  taxAmount: number;
  status: TaxStatus;
  dueDate: Date | null;
}

export interface TaxStats {
  totalCount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalTaxAmount: number;
  totalTaxableAmount: number;
}

// ── Helpers ──

function toTaxRecord(row: TaxRecordRow): TaxRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    period: row.period,
    type: row.type as TaxType,
    jurisdiction: row.jurisdiction,
    taxableAmount: row.taxableAmount,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    status: row.status as TaxStatus,
    filedAt: row.filedAt,
    paidAt: row.paidAt,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseContent<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

interface TaxRateContent {
  jurisdiction: string;
  type: TaxType;
  rate: number;
  effectiveDate: string;
  notes: string;
}

function toTaxRateSetting(row: MemoryRow): TaxRateSetting {
  const c = parseContent<TaxRateContent>(row.content, {
    jurisdiction: '',
    type: 'sales_tax' as TaxType,
    rate: 0,
    effectiveDate: '',
    notes: '',
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    jurisdiction: c.jurisdiction,
    type: c.type,
    rate: c.rate,
    effectiveDate: c.effectiveDate,
    notes: c.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface FilingScheduleContent {
  jurisdiction: string;
  type: TaxType;
  frequency: 'monthly' | 'quarterly' | 'annually';
  dueDay: number;
  notes: string;
}

function toFilingSchedule(row: MemoryRow): FilingSchedule {
  const c = parseContent<FilingScheduleContent>(row.content, {
    jurisdiction: '',
    type: 'sales_tax' as TaxType,
    frequency: 'monthly',
    dueDay: 1,
    notes: '',
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    jurisdiction: c.jurisdiction,
    type: c.type,
    frequency: c.frequency,
    dueDay: c.dueDay,
    notes: c.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Default tax rates by type (percentage). */
const DEFAULT_RATES: Record<TaxType, number> = {
  sales_tax: 8.5,
  income_tax: 21,
  payroll_tax: 7.65,
  vat: 20,
  gst: 10,
};

// ── Tax Management Service ──

export const TaxManagementService = {
  /**
   * Create a tax record. Auto-calculates taxAmount if not provided.
   */
  async createTaxRecord(
    organizationId: string,
    input: {
      period: string;
      type: TaxType;
      jurisdiction?: string;
      taxableAmount: number;
      taxRate: number;
      taxAmount?: number;
      notes?: string;
    },
  ): Promise<TaxRecord> {
    const taxAmount =
      input.taxAmount ?? Math.round((input.taxableAmount * input.taxRate) / 100 * 100) / 100;
    const row = await prisma.taxRecord.create({
      data: {
        organizationId,
        period: input.period,
        type: input.type,
        jurisdiction: input.jurisdiction ?? '',
        taxableAmount: input.taxableAmount,
        taxRate: input.taxRate,
        taxAmount,
        status: 'calculated',
        notes: input.notes ?? '',
      },
    });
    return toTaxRecord(row as TaxRecordRow);
  },

  /**
   * Get a single tax record by ID.
   */
  async getTaxRecord(id: string): Promise<TaxRecord | null> {
    const row = await safePrisma(
      () => prisma.taxRecord.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toTaxRecord(row as TaxRecordRow);
  },

  /**
   * List tax records for an organization with optional filters.
   */
  async listTaxRecords(
    organizationId: string,
    opts: { period?: string; type?: TaxType; status?: TaxStatus; jurisdiction?: string } = {},
  ): Promise<TaxRecord[]> {
    const rows = await safePrisma(
      () =>
        prisma.taxRecord.findMany({
          where: {
            organizationId,
            ...(opts.period && { period: opts.period }),
            ...(opts.type && { type: opts.type }),
            ...(opts.status && { status: opts.status }),
            ...(opts.jurisdiction && { jurisdiction: opts.jurisdiction }),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    return (rows as TaxRecordRow[]).map(toTaxRecord);
  },

  /**
   * Update a tax record.
   */
  async updateTaxRecord(
    id: string,
    input: Partial<{
      period: string;
      type: TaxType;
      jurisdiction: string;
      taxableAmount: number;
      taxRate: number;
      taxAmount: number;
      status: TaxStatus;
      notes: string;
    }>,
  ): Promise<TaxRecord | null> {
    const data: Record<string, unknown> = {};
    if (input.period !== undefined) data.period = input.period;
    if (input.type !== undefined) data.type = input.type;
    if (input.jurisdiction !== undefined) data.jurisdiction = input.jurisdiction;
    if (input.taxableAmount !== undefined) data.taxableAmount = input.taxableAmount;
    if (input.taxRate !== undefined) data.taxRate = input.taxRate;
    if (input.taxAmount !== undefined) data.taxAmount = input.taxAmount;
    if (input.status !== undefined) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes;

    const row = await safePrisma(
      () => prisma.taxRecord.update({ where: { id }, data }),
      null,
    );
    if (!row) return null;
    return toTaxRecord(row as TaxRecordRow);
  },

  /**
   * Calculate tax amount based on type and jurisdiction.
   */
  async calculateTax(
    organizationId: string,
    input: {
      amount: number;
      type: TaxType;
      jurisdiction?: string;
      rate?: number;
    },
  ): Promise<TaxCalculationResult> {
    let rate = input.rate;
    if (rate === undefined) {
      // Try to fetch a stored rate for this jurisdiction/type
      const settings = await TaxManagementService.getTaxRates(
        organizationId,
        input.jurisdiction ?? '',
      );
      const match = settings.find((s) => s.type === input.type);
      rate = match ? match.rate : DEFAULT_RATES[input.type];
    }
    const taxAmount = Math.round((input.amount * rate) / 100 * 100) / 100;
    const total = Math.round((input.amount + taxAmount) * 100) / 100;
    return {
      amount: input.amount,
      taxAmount,
      total,
      rate,
      breakdown: {
        base: input.amount,
        tax: taxAmount,
        [input.type]: taxAmount,
      },
    };
  },

  /**
   * File a tax record — set status to filed and filedAt.
   */
  async fileTaxRecord(id: string): Promise<TaxRecord | null> {
    const row = await safePrisma(
      () =>
        prisma.taxRecord.update({
          where: { id },
          data: { status: 'filed', filedAt: new Date() },
        }),
      null,
    );
    if (!row) return null;
    return toTaxRecord(row as TaxRecordRow);
  },

  /**
   * Pay a tax record — set status to paid and paidAt.
   */
  async payTaxRecord(id: string): Promise<TaxRecord | null> {
    const row = await safePrisma(
      () =>
        prisma.taxRecord.update({
          where: { id },
          data: { status: 'paid', paidAt: new Date() },
        }),
      null,
    );
    if (!row) return null;
    return toTaxRecord(row as TaxRecordRow);
  },

  /**
   * Get a tax summary — totals by type, jurisdiction, status.
   */
  async getTaxSummary(
    organizationId: string,
    opts: { period?: string; type?: TaxType; fromDate?: Date; toDate?: Date } = {},
  ): Promise<TaxSummary> {
    const where: Record<string, unknown> = { organizationId };
    if (opts.period) where.period = opts.period;
    if (opts.type) where.type = opts.type;
    if (opts.fromDate || opts.toDate) {
      where.createdAt = {};
      if (opts.fromDate) (where.createdAt as Record<string, unknown>).gte = opts.fromDate;
      if (opts.toDate) (where.createdAt as Record<string, unknown>).lte = opts.toDate;
    }

    const rows = await safePrisma(
      () => prisma.taxRecord.findMany({ where, take: 5000 }),
      [],
    );

    const summary: TaxSummary = {
      totalTaxableAmount: 0,
      totalTaxAmount: 0,
      byType: {},
      byJurisdiction: {},
      byStatus: {},
    };

    for (const r of rows as TaxRecordRow[]) {
      summary.totalTaxableAmount += r.taxableAmount;
      summary.totalTaxAmount += r.taxAmount;

      if (!summary.byType[r.type]) {
        summary.byType[r.type] = { taxableAmount: 0, taxAmount: 0, count: 0 };
      }
      summary.byType[r.type].taxableAmount += r.taxableAmount;
      summary.byType[r.type].taxAmount += r.taxAmount;
      summary.byType[r.type].count += 1;

      if (!summary.byJurisdiction[r.jurisdiction]) {
        summary.byJurisdiction[r.jurisdiction] = { taxableAmount: 0, taxAmount: 0, count: 0 };
      }
      summary.byJurisdiction[r.jurisdiction].taxableAmount += r.taxableAmount;
      summary.byJurisdiction[r.jurisdiction].taxAmount += r.taxAmount;
      summary.byJurisdiction[r.jurisdiction].count += 1;

      if (!summary.byStatus[r.status]) {
        summary.byStatus[r.status] = { taxableAmount: 0, taxAmount: 0, count: 0 };
      }
      summary.byStatus[r.status].taxableAmount += r.taxableAmount;
      summary.byStatus[r.status].taxAmount += r.taxAmount;
      summary.byStatus[r.status].count += 1;
    }

    summary.totalTaxableAmount = Math.round(summary.totalTaxableAmount * 100) / 100;
    summary.totalTaxAmount = Math.round(summary.totalTaxAmount * 100) / 100;

    return summary;
  },

  /**
   * Get upcoming/unpaid tax obligations.
   */
  async getTaxObligations(organizationId: string): Promise<TaxObligation[]> {
    const rows = await safePrisma(
      () =>
        prisma.taxRecord.findMany({
          where: {
            organizationId,
            status: { in: ['calculated', 'filed'] },
          },
          orderBy: { period: 'asc' },
          take: 500,
        }),
      [],
    );

    // Fetch filing schedules to compute due dates
    const schedules = await TaxManagementService.getFilingSchedule(organizationId);
    const scheduleMap = new Map<string, FilingSchedule>();
    for (const s of schedules) {
      scheduleMap.set(`${s.jurisdiction}:${s.type}`, s);
    }

    return (rows as TaxRecordRow[]).map((r) => {
      const schedule = scheduleMap.get(`${r.jurisdiction}:${r.type}`);
      let dueDate: Date | null = null;
      if (schedule) {
        // Parse period YYYY-MM or YYYY-Q1
        const period = r.period;
        const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
        const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
        if (monthMatch) {
          const year = parseInt(monthMatch[1], 10);
          const month = parseInt(monthMatch[2], 10);
          dueDate = new Date(year, month, schedule.dueDay);
        } else if (quarterMatch) {
          const year = parseInt(quarterMatch[1], 10);
          const q = parseInt(quarterMatch[2], 10);
          const endMonth = q * 3;
          dueDate = new Date(year, endMonth, schedule.dueDay);
        }
      }
      return {
        id: r.id,
        period: r.period,
        type: r.type as TaxType,
        jurisdiction: r.jurisdiction,
        taxAmount: r.taxAmount,
        status: r.status as TaxStatus,
        dueDate,
      };
    });
  },

  /**
   * Get tax rates stored in Memory for a jurisdiction.
   */
  async getTaxRates(organizationId: string, jurisdiction: string): Promise<TaxRateSetting[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'tax_rate_setting',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    let settings = (rows as MemoryRow[]).map(toTaxRateSetting);
    if (jurisdiction) {
      settings = settings.filter((s) => s.jurisdiction === jurisdiction);
    }
    return settings;
  },

  /**
   * Set a tax rate — stored in Memory.
   */
  async setTaxRate(
    organizationId: string,
    workspaceId: string,
    input: {
      jurisdiction: string;
      type: TaxType;
      rate: number;
      effectiveDate?: string;
      notes?: string;
    },
    createdBy: string,
  ): Promise<TaxRateSetting> {
    const content: TaxRateContent = {
      jurisdiction: input.jurisdiction,
      type: input.type,
      rate: input.rate,
      effectiveDate: input.effectiveDate ?? new Date().toISOString().slice(0, 10),
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'tax_rate_setting',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['tax_rate_setting', input.type, input.jurisdiction]),
        createdBy,
      },
    });

    return toTaxRateSetting(row as MemoryRow);
  },

  /**
   * Get filing schedules stored in Memory.
   */
  async getFilingSchedule(organizationId: string): Promise<FilingSchedule[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'tax_filing_schedule',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    return (rows as MemoryRow[]).map(toFilingSchedule);
  },

  /**
   * Create a filing schedule — stored in Memory.
   */
  async createFilingSchedule(
    organizationId: string,
    workspaceId: string,
    input: {
      jurisdiction: string;
      type: TaxType;
      frequency: 'monthly' | 'quarterly' | 'annually';
      dueDay: number;
      notes?: string;
    },
    createdBy: string,
  ): Promise<FilingSchedule> {
    const content: FilingScheduleContent = {
      jurisdiction: input.jurisdiction,
      type: input.type,
      frequency: input.frequency,
      dueDay: input.dueDay,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'tax_filing_schedule',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['tax_filing_schedule', input.type, input.jurisdiction]),
        createdBy,
      },
    });

    return toFilingSchedule(row as MemoryRow);
  },

  /**
   * Get tax stats for an organization.
   */
  async getStats(organizationId: string): Promise<TaxStats> {
    const [rows, count] = await Promise.all([
      safePrisma(
        () =>
          prisma.taxRecord.findMany({
            where: { organizationId },
            select: { type: true, status: true, taxAmount: true, taxableAmount: true },
            take: 5000,
          }),
        [],
      ),
      safePrisma(
        () => prisma.taxRecord.count({ where: { organizationId } }),
        0,
      ),
    ]);

    const stats: TaxStats = {
      totalCount: count as number,
      byStatus: {},
      byType: {},
      totalTaxAmount: 0,
      totalTaxableAmount: 0,
    };

    for (const r of rows as Array<{ type: string; status: string; taxAmount: number; taxableAmount: number }>) {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      stats.byType[r.type] = (stats.byType[r.type] || 0) + 1;
      stats.totalTaxAmount += r.taxAmount;
      stats.totalTaxableAmount += r.taxableAmount;
    }

    stats.totalTaxAmount = Math.round(stats.totalTaxAmount * 100) / 100;
    stats.totalTaxableAmount = Math.round(stats.totalTaxableAmount * 100) / 100;

    return stats;
  },
};
