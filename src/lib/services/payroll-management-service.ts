import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface CreatePayrollRunInput {
  period: string;
  payDate?: Date;
  payPeriodStart?: Date;
  payPeriodEnd?: Date;
}

export interface AddPayrollRecordInput {
  employeeName: string;
  employeeId?: string;
  period: string;
  grossAmount: number;
  taxWithheld?: number;
  netAmount?: number;
  benefits?: number;
  deductions?: number;
  payDate?: Date;
  payPeriodStart?: Date;
  payPeriodEnd?: Date;
  currency?: string;
  workspaceId?: string;
}

export interface UpdatePayrollRecordInput {
  employeeName?: string;
  employeeId?: string;
  period?: string;
  grossAmount?: number;
  taxWithheld?: number;
  netAmount?: number;
  benefits?: number;
  deductions?: number;
  status?: string;
  payDate?: Date | null;
  payPeriodStart?: Date | null;
  payPeriodEnd?: Date | null;
  currency?: string;
}

export interface ListPayrollRecordsOpts {
  period?: string;
  status?: string;
  employeeId?: string;
}

export interface PayrollSummaryOpts {
  period?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface PayrollSummary {
  totalRecords: number;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalBenefits: number;
  totalDeductions: number;
}

export interface PayslipData {
  recordId: string;
  employeeName: string;
  employeeId: string | null;
  period: string;
  payDate: Date | null;
  payPeriodStart: Date | null;
  payPeriodEnd: Date | null;
  currency: string;
  earnings: { grossAmount: number; benefits: number };
  deductions: { taxWithheld: number; deductions: number; totalDeductions: number };
  netPay: number;
}

export interface PayrollStats {
  total: number;
  byStatus: Record<string, number>;
  totalGross: number;
  totalNet: number;
}

export interface CalculateTaxOpts {
  state?: string;
  filingStatus?: string;
}

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PayrollRecordRow {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  employeeName: string;
  employeeId: string | null;
  period: string;
  grossAmount: number;
  taxWithheld: number;
  netAmount: number;
  benefits: number;
  deductions: number;
  status: string;
  payDate: Date | null;
  payPeriodStart: Date | null;
  payPeriodEnd: Date | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryRow {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Payroll Management Service ──

export const PayrollManagementService = {
  /**
   * Create a payroll run record in Memory (type='payroll_run'), status='open'.
   */
  async createPayrollRun(
    organizationId: string,
    workspaceId: string,
    input: CreatePayrollRunInput,
    createdBy: string,
  ) {
    const content = JSON.stringify({
      organizationId,
      period: input.period,
      payDate: input.payDate?.toISOString() ?? null,
      payPeriodStart: input.payPeriodStart?.toISOString() ?? null,
      payPeriodEnd: input.payPeriodEnd?.toISOString() ?? null,
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    return prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'payroll_run',
        content,
        source: 'system',
        tags: JSON.stringify(['payroll', 'payroll_run', input.period]),
        createdBy,
      },
    });
  },

  /**
   * Get a single payroll run by id (from Memory).
   */
  async getPayrollRun(runId: string) {
    const record = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: runId } }),
      null,
    );
    if (!record) return null;
    const row = record as MemoryRow;
    try {
      const data = JSON.parse(row.content) as Record<string, unknown>;
      return { id: row.id, ...data, type: row.type, createdAt: row.createdAt };
    } catch {
      return { id: row.id, type: row.type, content: row.content, createdAt: row.createdAt };
    }
  },

  /**
   * List payroll runs for an organization (from Memory).
   */
  async listPayrollRuns(organizationId: string) {
    const records = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'payroll_run' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      [],
    );
    return (records as MemoryRow[]).map((row) => {
      try {
        const data = JSON.parse(row.content) as Record<string, unknown>;
        return { id: row.id, ...data, type: row.type, createdAt: row.createdAt };
      } catch {
        return { id: row.id, type: row.type, content: row.content, createdAt: row.createdAt };
      }
    });
  },

  /**
   * Add a payroll record with auto-calculated netAmount.
   * netAmount = grossAmount - taxWithheld - deductions + benefits
   */
  async addPayrollRecord(organizationId: string, input: AddPayrollRecordInput) {
    const gross = input.grossAmount;
    const tax = input.taxWithheld ?? 0;
    const benefits = input.benefits ?? 0;
    const deductions = input.deductions ?? 0;
    const net = input.netAmount ?? round2(Math.max(0, gross - tax - deductions + benefits));
    return prisma.payrollRecord.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        employeeName: input.employeeName.slice(0, 300),
        employeeId: input.employeeId || null,
        period: input.period,
        grossAmount: gross,
        taxWithheld: tax,
        netAmount: net,
        benefits,
        deductions,
        status: 'draft',
        payDate: input.payDate || null,
        payPeriodStart: input.payPeriodStart || null,
        payPeriodEnd: input.payPeriodEnd || null,
        currency: input.currency || 'USD',
      },
    });
  },

  /**
   * Get a single payroll record by id.
   */
  async getPayrollRecord(id: string) {
    return safePrisma(() =>
      prisma.payrollRecord.findUnique({ where: { id } }),
      null,
    );
  },

  /**
   * List payroll records with optional filters.
   */
  async listPayrollRecords(organizationId: string, opts?: ListPayrollRecordsOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.period) where.period = opts.period;
    if (opts?.status) where.status = opts.status;
    if (opts?.employeeId) where.employeeId = opts.employeeId;
    return safePrisma(() =>
      prisma.payrollRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      [],
    );
  },

  /**
   * Update a payroll record.
   */
  async updatePayrollRecord(id: string, input: UpdatePayrollRecordInput) {
    const data: Record<string, unknown> = {};
    if (input.employeeName !== undefined) data.employeeName = input.employeeName.slice(0, 300);
    if (input.employeeId !== undefined) data.employeeId = input.employeeId;
    if (input.period !== undefined) data.period = input.period;
    if (input.grossAmount !== undefined) data.grossAmount = input.grossAmount;
    if (input.taxWithheld !== undefined) data.taxWithheld = input.taxWithheld;
    if (input.netAmount !== undefined) data.netAmount = input.netAmount;
    if (input.benefits !== undefined) data.benefits = input.benefits;
    if (input.deductions !== undefined) data.deductions = input.deductions;
    if (input.status !== undefined) data.status = input.status;
    if (input.payDate !== undefined) data.payDate = input.payDate;
    if (input.payPeriodStart !== undefined) data.payPeriodStart = input.payPeriodStart;
    if (input.payPeriodEnd !== undefined) data.payPeriodEnd = input.payPeriodEnd;
    if (input.currency !== undefined) data.currency = input.currency;
    return prisma.payrollRecord.update({ where: { id }, data });
  },

  /**
   * Approve a payroll record — set status to approved.
   */
  async approvePayrollRecord(id: string) {
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'approved' },
    });
  },

  /**
   * Pay a payroll record — set status to paid, set payDate to now if not set.
   */
  async payPayrollRecord(id: string) {
    const existing = await safePrisma(() =>
      prisma.payrollRecord.findUnique({ where: { id } }),
      null,
    );
    const payDate = (existing as PayrollRecordRow | null)?.payDate ?? new Date();
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'paid', payDate },
    });
  },

  /**
   * Finalize a payroll run — set all records in the run's period to approved,
   * and update the run status to 'finalized'.
   */
  async finalizePayrollRun(runId: string, organizationId: string) {
    const run = await PayrollManagementService.getPayrollRun(runId);
    if (!run) throw new Error('payroll_run_not_found');
    const period = (run as { period?: string }).period;
    if (!period) throw new Error('payroll_run_no_period');

    // Approve all draft records in the period
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { organizationId, period, status: { in: ['draft', 'pending'] } },
        select: { id: true },
      }),
      [],
    );
    for (const r of records as Array<{ id: string }>) {
      await prisma.payrollRecord.update({
        where: { id: r.id },
        data: { status: 'approved' },
      }).catch(() => null);
    }

    // Update the run status to finalized
    const runRecord = run as Record<string, unknown>;
    const existingData = typeof runRecord.content === 'string'
      ? (JSON.parse(runRecord.content) as Record<string, unknown>)
      : runRecord;
    const updatedContent = JSON.stringify({
      ...existingData,
      organizationId,
      period,
      status: 'finalized',
      finalizedAt: new Date().toISOString(),
    });
    return prisma.memory.update({
      where: { id: runId },
      data: { content: updatedContent },
    });
  },

  /**
   * Get a payroll summary — totals for gross, tax, net, benefits, deductions.
   */
  async getPayrollSummary(organizationId: string, opts?: PayrollSummaryOpts): Promise<PayrollSummary> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.period) where.period = opts.period;
    if (opts?.fromDate || opts?.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (opts?.fromDate) dateFilter.gte = opts.fromDate;
      if (opts?.toDate) dateFilter.lte = opts.toDate;
      where.payDate = dateFilter;
    }
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where,
        select: {
          grossAmount: true,
          taxWithheld: true,
          netAmount: true,
          benefits: true,
          deductions: true,
        },
      }),
      [],
    );
    const rows = records as Array<{
      grossAmount: number;
      taxWithheld: number;
      netAmount: number;
      benefits: number;
      deductions: number;
    }>;
    return {
      totalRecords: rows.length,
      totalGross: round2(rows.reduce((s, r) => s + r.grossAmount, 0)),
      totalTax: round2(rows.reduce((s, r) => s + r.taxWithheld, 0)),
      totalNet: round2(rows.reduce((s, r) => s + r.netAmount, 0)),
      totalBenefits: round2(rows.reduce((s, r) => s + r.benefits, 0)),
      totalDeductions: round2(rows.reduce((s, r) => s + r.deductions, 0)),
    };
  },

  /**
   * Get all payroll records for a specific employee.
   */
  async getPayrollByEmployee(organizationId: string, employeeId: string) {
    return safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { organizationId, employeeId },
        orderBy: { period: 'desc' },
        take: 200,
      }),
      [],
    );
  },

  /**
   * Calculate tax using progressive tax brackets.
   * 10% up to 10k, 15% 10k-40k, 25% 40k-100k, 35% above 100k.
   */
  calculateTax(grossAmount: number, opts?: CalculateTaxOpts): number {
    const brackets = [
      { threshold: 0, rate: 0.10 },
      { threshold: 10000, rate: 0.15 },
      { threshold: 40000, rate: 0.25 },
      { threshold: 100000, rate: 0.35 },
    ];
    let tax = 0;
    let remaining = grossAmount;
    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const nextThreshold = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity;
      const taxableInBracket = Math.min(remaining, nextThreshold - bracket.threshold);
      if (taxableInBracket <= 0) break;
      tax += taxableInBracket * bracket.rate;
      remaining -= taxableInBracket;
      if (remaining <= 0) break;
    }
    // Filing status adjustment (simplified)
    if (opts?.filingStatus === 'married') {
      tax = tax * 0.9; // 10% reduction for married
    }
    return round2(Math.max(0, tax));
  },

  /**
   * Generate a formatted payslip for a payroll record.
   */
  async generatePayslip(recordId: string): Promise<PayslipData | null> {
    const record = await safePrisma(() =>
      prisma.payrollRecord.findUnique({ where: { id: recordId } }),
      null,
    );
    if (!record) return null;
    const r = record as PayrollRecordRow;
    const totalDeductions = round2(r.taxWithheld + r.deductions);
    return {
      recordId: r.id,
      employeeName: r.employeeName,
      employeeId: r.employeeId,
      period: r.period,
      payDate: r.payDate,
      payPeriodStart: r.payPeriodStart,
      payPeriodEnd: r.payPeriodEnd,
      currency: r.currency,
      earnings: {
        grossAmount: round2(r.grossAmount),
        benefits: round2(r.benefits),
      },
      deductions: {
        taxWithheld: round2(r.taxWithheld),
        deductions: round2(r.deductions),
        totalDeductions,
      },
      netPay: round2(r.netAmount),
    };
  },

  /**
   * Get payroll stats — counts by status, total gross, total net.
   */
  async getStats(organizationId: string): Promise<PayrollStats> {
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { organizationId },
        select: { status: true, grossAmount: true, netAmount: true },
      }),
      [],
    );
    const rows = records as Array<{ status: string; grossAmount: number; netAmount: number }>;
    const byStatus: Record<string, number> = {};
    let totalGross = 0;
    let totalNet = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      totalGross += r.grossAmount;
      totalNet += r.netAmount;
    }
    return {
      total: rows.length,
      byStatus,
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
    };
  },
};
