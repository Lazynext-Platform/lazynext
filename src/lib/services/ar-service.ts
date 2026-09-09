import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import type { InvoiceWithLineItems } from './invoice-service';

// ── Types ──

interface InvoiceRow {
  id: string;
  organizationId: string;
  customerId: string | null;
  number: string;
  status: string;
  type: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  currency: string;
  paidAmount: number;
  paidAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receivable {
  id: string;
  number: string;
  customerId: string | null;
  total: number;
  paidAmount: number;
  balance: number;
  dueDate: Date;
  daysOverdue: number;
  status: string;
  currency: string;
}

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  count: number;
  total: number;
  invoices: Receivable[];
}

export interface AgingReport {
  totalOutstanding: number;
  totalOverdue: number;
  buckets: AgingBucket[];
}

export interface DunningEntry {
  invoiceId: string;
  number: string;
  customerId: string | null;
  balance: number;
  daysOverdue: number;
  dunningLevel: 1 | 2 | 3;
  currency: string;
}

export interface ARStats {
  totalReceivables: number;
  totalOverdue: number;
  collectionRate: number;
  avgDaysToPay: number;
  invoiceCount: number;
  overdueCount: number;
}

// ── Helpers ──

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function getAgingBucket(daysOverdue: number): '0-30' | '31-60' | '61-90' | '90+' {
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

function toReceivable(row: InvoiceRow, now: Date): Receivable {
  const balance = row.total - (row.paidAmount || 0);
  const daysOverdue = row.dueDate < now ? Math.max(0, daysBetween(now, row.dueDate)) : 0;
  return {
    id: row.id,
    number: row.number,
    customerId: row.customerId,
    total: row.total,
    paidAmount: row.paidAmount || 0,
    balance,
    dueDate: row.dueDate,
    daysOverdue,
    status: row.status,
    currency: row.currency,
  };
}

// ── AR Service ──

export const ARService = {
  /**
   * Get all outstanding receivables (sent + overdue invoices).
   */
  async getReceivables(organizationId: string): Promise<Receivable[]> {
    const now = new Date();
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['sent', 'overdue'] },
        },
        orderBy: { dueDate: 'asc' },
      }),
      [],
    );
    return (rows as InvoiceRow[]).map((r) => toReceivable(r, now));
  },

  /**
   * Get receivables grouped by customer.
   */
  async getReceivablesByCustomer(
    organizationId: string,
  ): Promise<Record<string, Receivable[]>> {
    const receivables = await ARService.getReceivables(organizationId);
    const grouped: Record<string, Receivable[]> = {};
    for (const r of receivables) {
      const key = r.customerId ?? 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
    return grouped;
  },

  /**
   * Get an aging report bucketing receivables by days overdue.
   */
  async getAgingReport(organizationId: string): Promise<AgingReport> {
    const receivables = await ARService.getReceivables(organizationId);
    const now = new Date();

    const buckets: AgingBucket[] = [
      { bucket: '0-30', count: 0, total: 0, invoices: [] },
      { bucket: '31-60', count: 0, total: 0, invoices: [] },
      { bucket: '61-90', count: 0, total: 0, invoices: [] },
      { bucket: '90+', count: 0, total: 0, invoices: [] },
    ];

    let totalOutstanding = 0;
    let totalOverdue = 0;

    for (const r of receivables) {
      totalOutstanding += r.balance;
      const bucketKey = getAgingBucket(r.daysOverdue);
      const bucket = buckets.find((b) => b.bucket === bucketKey)!;
      bucket.count += 1;
      bucket.total += r.balance;
      bucket.invoices.push(r);
      if (r.daysOverdue > 0) {
        totalOverdue += r.balance;
      }
    }

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      buckets,
    };
  },

  /**
   * Get a dunning list — overdue invoices with dunning levels.
   * Level 1: 0-30 days, Level 2: 31-60 days, Level 3: 60+ days.
   */
  async getDunningList(organizationId: string): Promise<DunningEntry[]> {
    const receivables = await ARService.getReceivables(organizationId);
    return receivables
      .filter((r) => r.daysOverdue > 0)
      .map((r) => ({
        invoiceId: r.id,
        number: r.number,
        customerId: r.customerId,
        balance: r.balance,
        daysOverdue: r.daysOverdue,
        dunningLevel: (r.daysOverdue > 60 ? 3 : r.daysOverdue > 30 ? 2 : 1) as 1 | 2 | 3,
        currency: r.currency,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  },

  /**
   * Get the collection rate — percentage of invoiced amounts that have been collected.
   */
  async getCollectionRate(organizationId: string): Promise<number> {
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['sent', 'paid', 'overdue'] },
        },
        select: { total: true, paidAmount: true },
      }),
      [],
    );

    let totalInvoiced = 0;
    let totalCollected = 0;
    for (const r of rows as Array<{ total: number; paidAmount: number }>) {
      totalInvoiced += r.total;
      totalCollected += r.paidAmount || 0;
    }

    if (totalInvoiced === 0) return 0;
    return Math.round((totalCollected / totalInvoiced) * 10000) / 100;
  },

  /**
   * Get the average days to pay for paid invoices.
   */
  async getAvgDaysToPay(organizationId: string): Promise<number> {
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: 'paid',
          paidAt: { not: null },
        },
        select: { issueDate: true, paidAt: true },
      }),
      [],
    );

    if (rows.length === 0) return 0;
    let totalDays = 0;
    let count = 0;
    for (const r of rows as Array<{ issueDate: Date; paidAt: Date | null }>) {
      if (r.paidAt) {
        totalDays += daysBetween(r.paidAt, r.issueDate);
        count += 1;
      }
    }
    if (count === 0) return 0;
    return Math.round(totalDays / count);
  },

  /**
   * Get AR stats for an organization.
   */
  async getStats(organizationId: string): Promise<ARStats> {
    const [receivables, collectionRate, avgDaysToPay] = await Promise.all([
      ARService.getReceivables(organizationId),
      ARService.getCollectionRate(organizationId),
      ARService.getAvgDaysToPay(organizationId),
    ]);

    let totalReceivables = 0;
    let totalOverdue = 0;
    let overdueCount = 0;

    for (const r of receivables) {
      totalReceivables += r.balance;
      if (r.daysOverdue > 0) {
        totalOverdue += r.balance;
        overdueCount += 1;
      }
    }

    return {
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      collectionRate,
      avgDaysToPay,
      invoiceCount: receivables.length,
      overdueCount,
    };
  },
};
