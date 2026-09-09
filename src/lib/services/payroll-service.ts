import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface PayrollFilters {
  employeeId?: string;
  status?: string;
  dateRange?: { start?: Date; end?: Date };
}

// ── Helpers ──

function periodString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── Payroll Service ──

export const PayrollService = {
  /**
   * Create a new payroll record.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    employeeName: string;
    employeeId?: string;
    hrEmployeeId?: string;
    period?: string;
    grossAmount: number;
    taxWithheld?: number;
    netAmount?: number;
    benefits?: number;
    deductions?: number;
    status?: string;
    payDate?: Date;
    payPeriodStart?: Date;
    payPeriodEnd?: Date;
    currency?: string;
    payType?: string;
    hoursWorked?: number;
    overtimeHours?: number;
    metadata?: Record<string, unknown>;
  }) {
    const gross = input.grossAmount;
    const tax = input.taxWithheld ?? 0;
    const benefits = input.benefits ?? 0;
    const deductions = input.deductions ?? 0;
    const net = input.netAmount ?? Math.max(0, gross - tax - deductions + benefits);
    return prisma.payrollRecord.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        employeeName: input.employeeName.slice(0, 300),
        employeeId: input.employeeId || null,
        hrEmployeeId: input.hrEmployeeId || null,
        period: input.period || periodString(new Date()),
        grossAmount: gross,
        taxWithheld: tax,
        netAmount: net,
        benefits,
        deductions,
        status: input.status || 'draft',
        payDate: input.payDate || null,
        payPeriodStart: input.payPeriodStart || null,
        payPeriodEnd: input.payPeriodEnd || null,
        currency: input.currency || 'USD',
        payType: input.payType || 'salary',
        hoursWorked: input.hoursWorked ?? null,
        overtimeHours: input.overtimeHours ?? null,
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
  },

  /**
   * Get a single payroll record by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.payrollRecord.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * List payroll records with optional filters.
   */
  async list(organizationId: string, filters?: PayrollFilters) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateRange) {
      if (filters.dateRange.start) where.payDate = { gte: filters.dateRange.start };
      if (filters.dateRange.end) {
        where.payDate = { ...(where.payDate as Record<string, unknown> || {}), lte: filters.dateRange.end };
      }
    }
    return safePrisma(() =>
      prisma.payrollRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Update a payroll record.
   */
  async update(id: string, data: {
    employeeName?: string;
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
    payType?: string;
    hoursWorked?: number | null;
    overtimeHours?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.employeeName !== undefined) updateData.employeeName = data.employeeName.slice(0, 300);
    if (data.grossAmount !== undefined) updateData.grossAmount = data.grossAmount;
    if (data.taxWithheld !== undefined) updateData.taxWithheld = data.taxWithheld;
    if (data.netAmount !== undefined) updateData.netAmount = data.netAmount;
    if (data.benefits !== undefined) updateData.benefits = data.benefits;
    if (data.deductions !== undefined) updateData.deductions = data.deductions;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.payDate !== undefined) updateData.payDate = data.payDate;
    if (data.payPeriodStart !== undefined) updateData.payPeriodStart = data.payPeriodStart;
    if (data.payPeriodEnd !== undefined) updateData.payPeriodEnd = data.payPeriodEnd;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.payType !== undefined) updateData.payType = data.payType;
    if (data.hoursWorked !== undefined) updateData.hoursWorked = data.hoursWorked;
    if (data.overtimeHours !== undefined) updateData.overtimeHours = data.overtimeHours;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    return prisma.payrollRecord.update({ where: { id }, data: updateData });
  },

  /**
   * Delete a payroll record.
   */
  async delete(id: string) {
    return prisma.payrollRecord.delete({ where: { id } });
  },

  /**
   * Process a payroll record (transition to processed status).
   */
  async process(id: string) {
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'processed' },
    });
  },

  /**
   * Mark a payroll record as paid.
   */
  async markPaid(id: string, payDate?: Date) {
    return prisma.payrollRecord.update({
      where: { id },
      data: {
        status: 'paid',
        payDate: payDate || new Date(),
      },
    });
  },

  /**
   * Mark a payroll record as failed.
   */
  async markFailed(id: string) {
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'failed' },
    });
  },

  /**
   * Get all payroll records for a specific employee (by employeeId field).
   */
  async getByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { employeeId },
        orderBy: { period: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Auto-generate payroll records for all active employees in an organization.
   */
  async generatePayroll(organizationId: string, period?: string) {
    const employees = await safePrisma(() =>
      prisma.employee.findMany({
        where: { organizationId, status: 'active' },
        select: { id: true, firstName: true, lastName: true, salary: true, salaryCurrency: true, payFrequency: true, workspaceId: true },
      }),
    []);

    const periodStr = period || periodString(new Date());
    const records: unknown[] = [];

    for (const emp of employees) {
      const gross = emp.salary ?? 0;
      const tax = gross * 0.2; // 20% estimated tax withholding
      const net = Math.max(0, gross - tax);
      const record = await this.create({
        organizationId,
        workspaceId: emp.workspaceId || undefined,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        hrEmployeeId: emp.id,
        period: periodStr,
        grossAmount: gross,
        taxWithheld: tax,
        netAmount: net,
        status: 'draft',
        currency: emp.salaryCurrency,
        payType: 'salary',
      });
      records.push(record);
    }

    return records;
  },

  /**
   * Get a payroll summary for an organization (optionally for a specific period).
   */
  async getPayrollSummary(organizationId: string, period?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (period) where.period = period;
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where,
        select: { grossAmount: true, taxWithheld: true, netAmount: true, benefits: true, deductions: true, status: true, currency: true, period: true },
      }),
    []);

    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalBenefits = 0;
    let totalDeductions = 0;
    const byStatus: Record<string, number> = {};
    const byPeriod: Record<string, { gross: number; net: number; count: number }> = {};

    for (const r of records) {
      totalGross += r.grossAmount;
      totalTax += r.taxWithheld;
      totalNet += r.netAmount;
      totalBenefits += r.benefits;
      totalDeductions += r.deductions;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (!byPeriod[r.period]) byPeriod[r.period] = { gross: 0, net: 0, count: 0 };
      byPeriod[r.period].gross += r.grossAmount;
      byPeriod[r.period].net += r.netAmount;
      byPeriod[r.period].count += 1;
    }

    return {
      totalRecords: records.length,
      totalGross,
      totalTax,
      totalNet,
      totalBenefits,
      totalDeductions,
      byStatus,
      byPeriod,
    };
  },

  /**
   * Get aggregate stats for payroll records in an organization.
   */
  async getStats(organizationId: string) {
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { organizationId },
        select: { status: true, payType: true, grossAmount: true, netAmount: true, currency: true, period: true },
      }),
    []);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPeriod: Record<string, number> = {};
    let totalGross = 0;
    let totalNet = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.payType] = (byType[r.payType] || 0) + 1;
      byPeriod[r.period] = (byPeriod[r.period] || 0) + 1;
      totalGross += r.grossAmount;
      totalNet += r.netAmount;
    }

    return {
      total: records.length,
      draft: byStatus['draft'] || 0,
      processed: byStatus['processed'] || 0,
      paid: byStatus['paid'] || 0,
      failed: byStatus['failed'] || 0,
      byStatus,
      byType,
      byPeriod,
      totalGross,
      totalNet,
    };
  },
};
