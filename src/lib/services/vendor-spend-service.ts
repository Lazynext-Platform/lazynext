import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

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

/** Parsed content payload for a vendor spend Memory. */
interface SpendContent {
  vendorId: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  description: string;
  invoiceNumber: string;
}

/** A structured vendor spend record returned to callers. */
export interface VendorSpend {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  amount: number;
  currency: string;
  category: string;
  date: Date;
  description: string;
  invoiceNumber: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpendInput {
  vendorId: string;
  amount: number;
  currency?: string;
  category?: string;
  date?: string;
  description?: string;
  invoiceNumber?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface ListSpendOpts {
  vendorId?: string;
  category?: string;
  dateRange?: { start?: string; end?: string };
  minAmount?: number;
}

export interface DateRangeOpts {
  dateRange?: { start?: string; end?: string };
}

export interface SpendStats {
  totalSpend: number;
  byCategory: Record<string, number>;
  byVendor: Record<string, number>;
  trend: { month: string; amount: number }[];
}

// ── Helpers ──

const fallbackContent: SpendContent = {
  vendorId: '',
  amount: 0,
  currency: 'USD',
  category: 'general',
  date: '',
  description: '',
  invoiceNumber: '',
};

function parseSpendContent(raw: string): SpendContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      vendorId: parsed.vendorId ?? '',
      amount: Number(parsed.amount) || 0,
      currency: parsed.currency ?? 'USD',
      category: parsed.category ?? 'general',
      date: parsed.date ?? '',
      description: parsed.description ?? '',
      invoiceNumber: parsed.invoiceNumber ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toSpend(row: MemoryRow): VendorSpend {
  const content = parseSpendContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    vendorId: content.vendorId,
    amount: content.amount,
    currency: content.currency,
    category: content.category,
    date: content.date ? new Date(content.date) : new Date(0),
    description: content.description,
    invoiceNumber: content.invoiceNumber,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function inDateRange(date: Date, range?: { start?: string; end?: string }): boolean {
  if (!range) return true;
  if (range.start) {
    const start = new Date(range.start);
    if (date < start) return false;
  }
  if (range.end) {
    const end = new Date(range.end);
    if (date > end) return false;
  }
  return true;
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── Vendor Spend Service ──

export const VendorSpendService = {
  /**
   * Record spend. Stored as a Memory with type='vendor_spend'.
   */
  async create(organizationId: string, input: CreateSpendInput): Promise<VendorSpend> {
    const content: SpendContent = {
      vendorId: input.vendorId,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      category: input.category ?? 'general',
      date: input.date ?? new Date().toISOString(),
      description: input.description ?? '',
      invoiceNumber: input.invoiceNumber ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'vendor_spend',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.vendorId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['vendor_spend', content.category]),
        createdBy: input.createdBy,
      },
    });

    return toSpend(row as MemoryRow);
  },

  /**
   * Get a single spend record by ID.
   */
  async get(id: string): Promise<VendorSpend | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toSpend(row as MemoryRow);
  },

  /**
   * List spend records for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListSpendOpts = {}): Promise<VendorSpend[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_spend',
          organizationId,
          ...(opts.vendorId ? { sourceId: opts.vendorId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );

    let spends = rows.map((r) => toSpend(r as MemoryRow));

    if (opts.category) {
      spends = spends.filter((s) => s.category === opts.category);
    }
    if (opts.minAmount != null) {
      spends = spends.filter((s) => s.amount >= opts.minAmount!);
    }
    if (opts.dateRange) {
      spends = spends.filter((s) => inDateRange(s.date, opts.dateRange));
    }

    return spends;
  },

  /**
   * Get all spend records for a vendor.
   */
  async getByVendor(vendorId: string): Promise<VendorSpend[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'vendor_spend',
          sourceId: vendorId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      [],
    );
    return rows.map((r) => toSpend(r as MemoryRow));
  },

  /**
   * Get total spend for an organization with optional date range.
   */
  async getTotalSpend(organizationId: string, opts: DateRangeOpts = {}): Promise<number> {
    const spends = await VendorSpendService.list(organizationId, {
      dateRange: opts.dateRange,
    });
    return spends.reduce((acc, s) => acc + s.amount, 0);
  },

  /**
   * Get spend grouped by category.
   */
  async getSpendByCategory(organizationId: string, opts: DateRangeOpts = {}): Promise<Record<string, number>> {
    const spends = await VendorSpendService.list(organizationId, {
      dateRange: opts.dateRange,
    });
    const byCategory: Record<string, number> = {};
    for (const s of spends) {
      byCategory[s.category] = (byCategory[s.category] || 0) + s.amount;
    }
    return byCategory;
  },

  /**
   * Get spend grouped by vendor.
   */
  async getSpendByVendor(organizationId: string, opts: DateRangeOpts = {}): Promise<Record<string, number>> {
    const spends = await VendorSpendService.list(organizationId, {
      dateRange: opts.dateRange,
    });
    const byVendor: Record<string, number> = {};
    for (const s of spends) {
      byVendor[s.vendorId] = (byVendor[s.vendorId] || 0) + s.amount;
    }
    return byVendor;
  },

  /**
   * Get monthly spend trend.
   */
  async getSpendTrend(organizationId: string, opts: DateRangeOpts = {}): Promise<{ month: string; amount: number }[]> {
    const spends = await VendorSpendService.list(organizationId, {
      dateRange: opts.dateRange,
    });
    const byMonth: Record<string, number> = {};
    for (const s of spends) {
      const key = monthKey(s.date);
      byMonth[key] = (byMonth[key] || 0) + s.amount;
    }
    return Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
  },

  /**
   * Get spend stats for an organization.
   */
  async getStats(organizationId: string): Promise<SpendStats> {
    const spends = await VendorSpendService.list(organizationId);
    const byCategory: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let total = 0;
    for (const s of spends) {
      total += s.amount;
      byCategory[s.category] = (byCategory[s.category] || 0) + s.amount;
      byVendor[s.vendorId] = (byVendor[s.vendorId] || 0) + s.amount;
      const key = monthKey(s.date);
      byMonth[key] = (byMonth[key] || 0) + s.amount;
    }
    const trend = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
    return {
      totalSpend: total,
      byCategory,
      byVendor,
      trend,
    };
  },
};
