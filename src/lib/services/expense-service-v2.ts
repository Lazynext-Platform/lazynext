import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Expense Service v2 (extends existing Expense model) ──

export const ExpenseServiceV2 = {
  async create(organizationId: string, input: {
    vendor: string;
    description?: string;
    category: string;
    amount: number;
    currency?: string;
    expenseDate: Date;
    receiptUrl?: string;
    submittedBy?: string;
    workspaceId?: string;
    tags?: string[];
  }) {
    return prisma.expense.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        vendor: input.vendor.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        category: input.category,
        amount: input.amount,
        currency: input.currency || 'USD',
        expenseDate: input.expenseDate,
        receiptUrl: input.receiptUrl || null,
        submittedBy: input.submittedBy || null,
        tags: JSON.stringify(input.tags || []),
        status: 'pending',
      },
    });
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.expense.findUnique({ where: { id } }),
    null);
  },

  async list(organizationId: string, opts?: {
    category?: string;
    status?: string;
    submittedBy?: string;
    dateStart?: Date;
    dateEnd?: Date;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.category) where.category = opts.category;
    if (opts?.status) where.status = opts.status;
    if (opts?.submittedBy) where.submittedBy = opts.submittedBy;
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.expenseDate = range;
    }
    if (opts?.search) {
      where.OR = [
        { vendor: { contains: opts.search } },
        { description: { contains: opts.search } },
      ];
    }
    return safePrisma(() =>
      prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async update(id: string, input: {
    vendor?: string;
    description?: string;
    category?: string;
    amount?: number;
    currency?: string;
    expenseDate?: Date;
    receiptUrl?: string;
    tags?: string[];
  }) {
    const data: Record<string, unknown> = {};
    if (input.vendor !== undefined) data.vendor = input.vendor.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.category !== undefined) data.category = input.category;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.expenseDate !== undefined) data.expenseDate = input.expenseDate;
    if (input.receiptUrl !== undefined) data.receiptUrl = input.receiptUrl || null;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    return prisma.expense.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.expense.delete({ where: { id } });
  },

  async approve(id: string, approvedBy: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'approved', approvedBy, approvedAt: new Date() },
    });
  },

  async reject(id: string, approvedBy: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'rejected', approvedBy, approvedAt: new Date() },
    });
  },

  async reimburse(id: string, approvedBy: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'reimbursed', approvedBy, approvedAt: new Date() },
    });
  },

  async getByCategory(organizationId: string, opts?: {
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.expenseDate = range;
    }
    const rows = await safePrisma(() =>
      prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    []);
    const result: Record<string, { total: number; count: number }> = {};
    for (const row of rows as Array<{ category: string; _sum: { amount: number | null }; _count: number }>) {
      result[row.category] = { total: row._sum.amount ?? 0, count: row._count };
    }
    return result;
  },

  async getByStatus(organizationId: string) {
    const rows = await safePrisma(() =>
      prisma.expense.groupBy({
        by: ['status'],
        where: { organizationId },
        _sum: { amount: true },
        _count: true,
      }),
    []);
    const result: Record<string, { total: number; count: number }> = {};
    for (const row of rows as Array<{ status: string; _sum: { amount: number | null }; _count: number }>) {
      result[row.status] = { total: row._sum.amount ?? 0, count: row._count };
    }
    return result;
  },

  async getTotalExpenses(organizationId: string, opts?: {
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.expenseDate = range;
    }
    const agg = await safePrisma(() =>
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    { _sum: { amount: 0 } } as { _sum: { amount: number | null } });
    return agg._sum.amount ?? 0;
  },

  async getExpenseTrend(organizationId: string, opts?: {
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.expenseDate = range;
    }
    const expenses = await safePrisma(() =>
      prisma.expense.findMany({
        where,
        select: { amount: true, expenseDate: true },
        orderBy: { expenseDate: 'asc' },
        take: 1000,
      }),
    []);
    const byMonth: Record<string, number> = {};
    for (const e of expenses as Array<{ amount: number; expenseDate: Date }>) {
      const d = new Date(e.expenseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + e.amount;
    }
    return Object.entries(byMonth)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  async getPendingApprovals(organizationId: string) {
    return safePrisma(() =>
      prisma.expense.findMany({
        where: { organizationId, status: 'pending' },
        orderBy: [{ expenseDate: 'asc' }],
        take: 200,
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byCategory, byStatusRows, sumAgg, pendingAgg, approvedAgg] = await Promise.all([
      safePrisma(() => prisma.expense.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.expense.groupBy({
          by: ['category'],
          where: { organizationId },
          _sum: { amount: true },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.expense.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.expense.aggregate({ where: { organizationId }, _sum: { amount: true } }),
      { _sum: { amount: 0 } } as { _sum: { amount: number | null } }),
      safePrisma(() =>
        prisma.expense.aggregate({ where: { organizationId, status: 'pending' }, _sum: { amount: true } }),
      { _sum: { amount: 0 } } as { _sum: { amount: number | null } }),
      safePrisma(() =>
        prisma.expense.aggregate({ where: { organizationId, status: 'approved' }, _sum: { amount: true } }),
      { _sum: { amount: 0 } } as { _sum: { amount: number | null } }),
    ]);
    const categoryTotals: Record<string, { total: number; count: number }> = {};
    for (const row of byCategory as Array<{ category: string; _sum: { amount: number | null }; _count: number }>) {
      categoryTotals[row.category] = { total: row._sum.amount ?? 0, count: row._count };
    }
    const statusCounts: Record<string, number> = {};
    for (const row of byStatusRows as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return {
      total,
      byCategory: categoryTotals,
      byStatus: statusCounts,
      totalAmount: sumAgg._sum.amount ?? 0,
      pendingAmount: pendingAgg._sum.amount ?? 0,
      approvedAmount: approvedAgg._sum.amount ?? 0,
    };
  },
};
