import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Timesheets ──

export const TimesheetService = {
  async create(organizationId: string, input: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    workspaceId?: string;
    notes?: string;
  }) {
    return prisma.timesheet.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: 'draft',
        totalHours: 0,
        billableHours: 0,
        notes: input.notes?.slice(0, 5000) || '',
      },
    });
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.timesheet.findUnique({ where: { id } }),
    null);
  },

  async list(organizationId: string, opts?: {
    userId?: string;
    status?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.userId) where.userId = opts.userId;
    if (opts?.status) where.status = opts.status;
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.periodStart = range;
    }
    return safePrisma(() =>
      prisma.timesheet.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async update(id: string, input: {
    periodStart?: Date;
    periodEnd?: Date;
    notes?: string;
    status?: string;
    totalHours?: number;
    billableHours?: number;
  }) {
    const data: Record<string, unknown> = {};
    if (input.periodStart !== undefined) data.periodStart = input.periodStart;
    if (input.periodEnd !== undefined) data.periodEnd = input.periodEnd;
    if (input.notes !== undefined) data.notes = input.notes.slice(0, 5000);
    if (input.status !== undefined) data.status = input.status;
    if (input.totalHours !== undefined) data.totalHours = input.totalHours;
    if (input.billableHours !== undefined) data.billableHours = input.billableHours;
    return prisma.timesheet.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.timesheet.delete({ where: { id } });
  },

  async submit(id: string) {
    return prisma.timesheet.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() },
    });
  },

  async approve(id: string, approvedBy: string) {
    return prisma.timesheet.update({
      where: { id },
      data: { status: 'approved', approvedBy, approvedAt: new Date(), rejectedReason: null },
    });
  },

  async reject(id: string, approvedBy: string, reason: string) {
    return prisma.timesheet.update({
      where: { id },
      data: { status: 'rejected', approvedBy, approvedAt: new Date(), rejectedReason: reason.slice(0, 1000) },
    });
  },

  /**
   * Add a time entry linked to a task. We track which time entries belong to a
   * timesheet by querying TimeEntry by userId and startedAt within the
   * timesheet's period (TimeEntry has no timesheetId field).
   */
  async addTimeEntry(timesheetId: string, input: {
    taskId: string;
    userId?: string;
    durationSec: number;
    description?: string;
    startedAt: Date;
    endedAt?: Date;
    billable?: boolean;
  }) {
    const timesheet = await prisma.timesheet.findUnique({ where: { id: timesheetId } });
    if (!timesheet) throw new Error('timesheet_not_found');
    const entry = await prisma.timeEntry.create({
      data: {
        taskId: input.taskId,
        userId: input.userId ?? timesheet.userId,
        durationSec: Math.max(0, Math.round(input.durationSec)),
        description: (input.description?.slice(0, 1000) || '') +
          (input.billable === false ? '' : ' [billable]'),
        startedAt: input.startedAt,
        endedAt: input.endedAt || null,
      },
    });
    await this.recalculateTotals(timesheetId);
    return entry;
  },

  /** Get all time entries for a timesheet by querying within its period + userId. */
  async getTimeEntries(timesheetId: string) {
    const timesheet = await safePrisma(() =>
      prisma.timesheet.findUnique({ where: { id: timesheetId } }),
    null);
    if (!timesheet) return [];
    return safePrisma(() =>
      prisma.timeEntry.findMany({
        where: {
          userId: timesheet.userId,
          startedAt: { gte: timesheet.periodStart, lte: timesheet.periodEnd },
        },
        orderBy: { startedAt: 'asc' },
      }),
    []);
  },

  /** Recalculate totalHours and billableHours from time entries in the period. */
  async recalculateTotals(id: string) {
    const timesheet = await prisma.timesheet.findUnique({ where: { id } });
    if (!timesheet) throw new Error('timesheet_not_found');
    const entries = await safePrisma(() =>
      prisma.timeEntry.findMany({
        where: {
          userId: timesheet.userId,
          startedAt: { gte: timesheet.periodStart, lte: timesheet.periodEnd },
        },
      }),
    []);
    let totalSec = 0;
    let billableSec = 0;
    for (const e of entries as Array<{ durationSec: number; description: string | null }>) {
      totalSec += e.durationSec;
      if (e.description?.includes('[billable]')) billableSec += e.durationSec;
    }
    const totalHours = Math.round((totalSec / 3600) * 100) / 100;
    const billableHours = Math.round((billableSec / 3600) * 100) / 100;
    return prisma.timesheet.update({
      where: { id },
      data: { totalHours, billableHours },
    });
  },

  async getStats(organizationId: string, opts?: {
    userId?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.userId) where.userId = opts.userId;
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.periodStart = range;
    }
    const [total, byStatus, sumAgg] = await Promise.all([
      safePrisma(() => prisma.timesheet.count({ where }), 0),
      safePrisma(() =>
        prisma.timesheet.groupBy({ by: ['status'], where, _count: true }),
      []),
      safePrisma(() =>
        prisma.timesheet.aggregate({ where, _sum: { totalHours: true, billableHours: true } }),
      { _sum: { totalHours: 0, billableHours: 0 } } as { _sum: { totalHours: number; billableHours: number } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const totalHours = sumAgg._sum.totalHours ?? 0;
    const billableHours = sumAgg._sum.billableHours ?? 0;
    return {
      total,
      byStatus: statusCounts,
      totalHours,
      billableHours,
      avgHoursPerTimesheet: total > 0 ? Math.round((totalHours / total) * 100) / 100 : 0,
    };
  },

  async getByUser(userId: string, opts?: { status?: string }) {
    const where: Record<string, unknown> = { userId };
    if (opts?.status) where.status = opts.status;
    return safePrisma(() =>
      prisma.timesheet.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }],
        take: 200,
      }),
    []);
  },
};
