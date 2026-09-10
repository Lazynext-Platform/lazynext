import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface TimeOffFilters {
  employeeId?: string;
  status?: string;
  type?: string;
  dateRange?: { start?: Date; end?: Date };
}

// ── Helpers ──

function calcDays(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  return Math.max(0, diff);
}

// ── Time Off Service ──

export const TimeOffService = {
  /**
   * Create a new time-off request.
   */
  async create(input: {
    organizationId: string;
    employeeId: string;
    type?: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }) {
    const days = calcDays(input.startDate, input.endDate);
    return prisma.timeOffRequest.create({
      data: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        type: input.type || 'vacation',
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        status: 'pending',
        reason: input.reason || '',
      },
    });
  },

  /**
   * Get a single time-off request by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.timeOffRequest.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * List time-off requests with optional filters.
   */
  async list(organizationId: string, filters?: TimeOffFilters) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.dateRange) {
      if (filters.dateRange.start) where.startDate = { gte: filters.dateRange.start };
      if (filters.dateRange.end) where.endDate = { lte: filters.dateRange.end };
    }
    return safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Update a time-off request (reason, type, dates).
   */
  async update(id: string, data: {
    type?: string;
    reason?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate;
      // Recalculate days if both dates are known
      if (data.startDate) {
        updateData.days = calcDays(data.startDate, data.endDate);
      }
    }
    return prisma.timeOffRequest.update({ where: { id }, data: updateData });
  },

  /**
   * Approve a time-off request.
   */
  async approve(id: string, approverId: string) {
    return prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approverId,
        approvedAt: new Date(),
      },
    });
  },

  /**
   * Deny a time-off request.
   */
  async deny(id: string, approverId: string) {
    return prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'denied',
        approverId,
        approvedAt: new Date(),
      },
    });
  },

  /**
   * Cancel a time-off request.
   */
  async cancel(id: string) {
    return prisma.timeOffRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  },

  /**
   * Get all time-off requests for a specific employee.
   */
  async getByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where: { employeeId },
        orderBy: { startDate: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get the time-off balance for an employee.
   * Default annual allowance is 20 days; subtracts approved days in the current year.
   */
  async getBalance(employeeId: string, annualAllowance = 20) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const requests = await safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where: {
          employeeId,
          status: 'approved',
          startDate: { gte: yearStart },
          endDate: { lte: yearEnd },
        },
        select: { days: true, type: true },
      }),
    []);

    const used = requests.reduce((sum, r) => sum + r.days, 0);
    const byType: Record<string, number> = {};
    for (const r of requests) {
      byType[r.type] = (byType[r.type] || 0) + r.days;
    }

    return {
      allowance: annualAllowance,
      used,
      remaining: Math.max(0, annualAllowance - used),
      byType,
    };
  },

  /**
   * Get upcoming time-off requests (start date >= now).
   */
  async getUpcoming(organizationId: string, days = 30) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where: {
          organizationId,
          status: 'approved',
          startDate: { gte: now, lte: horizon },
        },
        orderBy: { startDate: 'asc' },
        take: 100,
      }),
    []);
  },

  /**
   * Get time-off requests formatted as calendar events.
   */
  async getCalendarEvents(organizationId: string, rangeStart?: Date, rangeEnd?: Date) {
    const where: Record<string, unknown> = {
      organizationId,
      status: 'approved',
    };
    if (rangeStart || rangeEnd) {
      where.startDate = {};
      if (rangeStart) (where.startDate as Record<string, unknown>).gte = rangeStart;
      if (rangeEnd) (where.endDate as Record<string, unknown>).lte = rangeEnd;
    }
    const requests = await safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where,
        orderBy: { startDate: 'asc' },
        take: 500,
      }),
    []);

    return requests.map((r) => ({
      id: r.id,
      title: `${r.type} — ${r.days} day(s)`,
      start: r.startDate,
      end: r.endDate,
      type: r.type,
      status: r.status,
    }));
  },

  /**
   * Get aggregate stats for time-off requests in an organization.
   */
  async getStats(organizationId: string) {
    const requests = await safePrisma(() =>
      prisma.timeOffRequest.findMany({
        where: { organizationId },
        select: { status: true, type: true, days: true },
      }),
    []);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalDays = 0;

    for (const r of requests) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      totalDays += r.days;
    }

    return {
      total: requests.length,
      pending: byStatus['pending'] || 0,
      approved: byStatus['approved'] || 0,
      denied: byStatus['denied'] || 0,
      cancelled: byStatus['cancelled'] || 0,
      byStatus,
      byType,
      totalDays,
    };
  },
};
