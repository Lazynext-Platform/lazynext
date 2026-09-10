import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

interface ExpenseRow {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  vendor: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  expenseDate: Date;
  receiptUrl: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  submittedBy: string | null;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payable {
  id: string;
  vendor: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  expenseDate: Date;
  approvedAt: Date | null;
  daysSinceApproval: number;
}

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  count: number;
  total: number;
  payables: Payable[];
}

export interface AgingReport {
  totalPayables: number;
  buckets: AgingBucket[];
}

export interface UpcomingPayment {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: Date;
  status: string;
}

export interface PaymentTrendPoint {
  period: string;
  amount: number;
  count: number;
}

export interface APStats {
  totalPayables: number;
  payableCount: number;
  byCategory: Record<string, number>;
  avgDaysToPay: number;
  pendingApprovalCount: number;
}

// ── Helpers ──

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function getAgingBucket(days: number): '0-30' | '31-60' | '61-90' | '90+' {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

function toPayable(row: ExpenseRow, now: Date): Payable {
  const daysSinceApproval = row.approvedAt
    ? Math.max(0, daysBetween(now, row.approvedAt))
    : 0;
  return {
    id: row.id,
    vendor: row.vendor,
    description: row.description,
    category: row.category,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    expenseDate: row.expenseDate,
    approvedAt: row.approvedAt,
    daysSinceApproval,
  };
}

// ── AP Service ──

export const APService = {
  /**
   * Get all payables — approved expenses that have not been reimbursed.
   */
  async getPayables(organizationId: string): Promise<Payable[]> {
    const now = new Date();
    const rows = await safePrisma(() =>
      prisma.expense.findMany({
        where: {
          organizationId,
          status: 'approved',
        },
        orderBy: { approvedAt: 'asc' },
      }),
      [],
    );
    return (rows as ExpenseRow[]).map((r) => toPayable(r, now));
  },

  /**
   * Get payables grouped by vendor.
   */
  async getPayablesByVendor(
    organizationId: string,
  ): Promise<Record<string, Payable[]>> {
    const payables = await APService.getPayables(organizationId);
    const grouped: Record<string, Payable[]> = {};
    for (const p of payables) {
      if (!grouped[p.vendor]) grouped[p.vendor] = [];
      grouped[p.vendor].push(p);
    }
    return grouped;
  },

  /**
   * Get an aging report for payables.
   */
  async getAgingReport(organizationId: string): Promise<AgingReport> {
    const payables = await APService.getPayables(organizationId);

    const buckets: AgingBucket[] = [
      { bucket: '0-30', count: 0, total: 0, payables: [] },
      { bucket: '31-60', count: 0, total: 0, payables: [] },
      { bucket: '61-90', count: 0, total: 0, payables: [] },
      { bucket: '90+', count: 0, total: 0, payables: [] },
    ];

    let totalPayables = 0;

    for (const p of payables) {
      totalPayables += p.amount;
      const bucketKey = getAgingBucket(p.daysSinceApproval);
      const bucket = buckets.find((b) => b.bucket === bucketKey)!;
      bucket.count += 1;
      bucket.total += p.amount;
      bucket.payables.push(p);
    }

    return {
      totalPayables: Math.round(totalPayables * 100) / 100,
      buckets,
    };
  },

  /**
   * Get upcoming payments — pending expenses awaiting approval.
   */
  async getUpcomingPayments(organizationId: string): Promise<UpcomingPayment[]> {
    const rows = await safePrisma(() =>
      prisma.expense.findMany({
        where: {
          organizationId,
          status: 'pending',
        },
        orderBy: { expenseDate: 'asc' },
        take: 50,
      }),
      [],
    );
    return (rows as ExpenseRow[]).map((r) => ({
      id: r.id,
      vendor: r.vendor,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      expenseDate: r.expenseDate,
      status: r.status,
    }));
  },

  /**
   * Get total payables amount.
   */
  async getTotalPayables(organizationId: string): Promise<number> {
    const payables = await APService.getPayables(organizationId);
    let total = 0;
    for (const p of payables) {
      total += p.amount;
    }
    return Math.round(total * 100) / 100;
  },

  /**
   * Get payment trend by month (reimbursed expenses).
   */
  async getPaymentTrend(
    organizationId: string,
    months: number = 12,
  ): Promise<PaymentTrendPoint[]> {
    const rows = await safePrisma(() =>
      prisma.expense.findMany({
        where: {
          organizationId,
          status: 'reimbursed',
        },
        select: { amount: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
      [],
    );

    const now = new Date();
    const trend: Map<string, PaymentTrendPoint> = new Map();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend.set(key, { period: key, amount: 0, count: 0 });
    }

    for (const r of rows as Array<{ amount: number; updatedAt: Date }>) {
      const d = r.updatedAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const point = trend.get(key);
      if (point) {
        point.amount += r.amount;
        point.count += 1;
      }
    }

    return Array.from(trend.values()).map((p) => ({
      period: p.period,
      amount: Math.round(p.amount * 100) / 100,
      count: p.count,
    }));
  },

  /**
   * Get AP stats for an organization.
   */
  async getStats(organizationId: string): Promise<APStats> {
    const [payables, reimbursedRows, pendingRows] = await Promise.all([
      APService.getPayables(organizationId),
      safePrisma(() =>
        prisma.expense.findMany({
          where: {
            organizationId,
            status: 'reimbursed',
          },
          select: { approvedAt: true, updatedAt: true, category: true, amount: true },
        }),
        [],
      ),
      safePrisma(() =>
        prisma.expense.count({
          where: {
            organizationId,
            status: 'pending',
          },
        }),
        0,
      ),
    ]);

    let totalPayables = 0;
    const byCategory: Record<string, number> = {};

    for (const p of payables) {
      totalPayables += p.amount;
      byCategory[p.category] = (byCategory[p.category] || 0) + p.amount;
    }

    // Calculate avg days to pay from reimbursed expenses
    let totalDays = 0;
    let count = 0;
    for (const r of reimbursedRows as Array<{ approvedAt: Date | null; updatedAt: Date; category: string; amount: number }>) {
      if (r.approvedAt) {
        totalDays += daysBetween(r.updatedAt, r.approvedAt);
        count += 1;
      }
    }

    return {
      totalPayables: Math.round(totalPayables * 100) / 100,
      payableCount: payables.length,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
      avgDaysToPay: count > 0 ? Math.round(totalDays / count) : 0,
      pendingApprovalCount: pendingRows as number,
    };
  },
};
