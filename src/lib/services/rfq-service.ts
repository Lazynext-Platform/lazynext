import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { randomUUID } from 'crypto';

// ── Types ──

export type RFQStatus = 'open' | 'closed' | 'cancelled';

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

export interface RFQItem {
  description: string;
  quantity: number;
  specs?: string;
}

export interface QuoteItem {
  description: string;
  unitPrice: number;
  leadTime?: string;
}

export interface Quote {
  id: string;
  vendorId: string;
  vendorName: string;
  items: QuoteItem[];
  totalQuote: number;
  validUntil: string | null;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
}

/** Parsed content payload for an RFQ Memory. */
interface RFQContent {
  rfqNumber: string;
  title: string;
  description: string;
  items: RFQItem[];
  status: RFQStatus;
  dueDate: string | null;
  quotes: Quote[];
}

/** A structured RFQ returned to callers. */
export interface RFQ {
  id: string;
  organizationId: string;
  workspaceId: string;
  rfqNumber: string;
  title: string;
  description: string;
  items: RFQItem[];
  status: RFQStatus;
  dueDate: string | null;
  quotes: Quote[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRFQInput {
  title: string;
  description?: string;
  items: RFQItem[];
  dueDate?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateRFQInput {
  title?: string;
  description?: string;
  items?: RFQItem[];
  dueDate?: string;
}

export interface AddQuoteInput {
  vendorId: string;
  vendorName: string;
  items: QuoteItem[];
  totalQuote: number;
  validUntil?: string;
  notes?: string;
}

export interface ListRFQOpts {
  status?: RFQStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface RFQStats {
  totalRFQs: number;
  byStatus: Record<RFQStatus, number>;
  totalQuotesReceived: number;
  acceptedCount: number;
}

// ── Helpers ──

const fallbackContent: RFQContent = {
  rfqNumber: '',
  title: '',
  description: '',
  items: [],
  status: 'open',
  dueDate: null,
  quotes: [],
};

/** Generate an RFQ number: RFQ-YYYY-NNNN. */
export async function generateRFQNumber(
  organizationId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await safePrisma(
    () =>
      prisma.memory.findMany({
        where: { type: 'rfq', organizationId },
        take: 10000,
      }),
    [],
  );
  const seq = rows.length + 1;
  return `RFQ-${year}-${String(seq).padStart(4, '0')}`;
}

function parseRFQContent(raw: string): RFQContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      rfqNumber: parsed.rfqNumber ?? '',
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      status: (parsed.status as RFQStatus) ?? 'open',
      dueDate: parsed.dueDate ?? null,
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toRFQ(row: MemoryRow): RFQ {
  const content = parseRFQContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    rfqNumber: content.rfqNumber,
    title: content.title,
    description: content.description,
    items: content.items,
    status: content.status,
    dueDate: content.dueDate,
    quotes: content.quotes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── RFQ Service ──

export const RFQService = {
  /**
   * Create an RFQ. Stored as a Memory with type='rfq'.
   */
  async create(organizationId: string, input: CreateRFQInput): Promise<RFQ> {
    const rfqNumber = await generateRFQNumber(organizationId);
    const content: RFQContent = {
      rfqNumber,
      title: input.title,
      description: input.description ?? '',
      items: input.items,
      status: 'open',
      dueDate: input.dueDate ?? null,
      quotes: [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'rfq',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['rfq', 'open']),
        createdBy: input.createdBy,
      },
    });

    return toRFQ(row as MemoryRow);
  },

  /**
   * Get a single RFQ by ID.
   */
  async get(id: string): Promise<RFQ | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /**
   * List RFQs for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListRFQOpts = {}): Promise<RFQ[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'rfq',
            organizationId,
            ...(opts.startDate || opts.endDate
              ? {
                  createdAt: {
                    ...(opts.startDate ? { gte: new Date(opts.startDate) } : {}),
                    ...(opts.endDate ? { lte: new Date(opts.endDate) } : {}),
                  },
                }
              : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let rfqs = rows.map((r) => toRFQ(r as MemoryRow));

    if (opts.status) {
      rfqs = rfqs.filter((r) => r.status === opts.status);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      rfqs = rfqs.filter(
        (r) =>
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    return rfqs;
  },

  /**
   * Update an RFQ.
   */
  async update(id: string, input: UpdateRFQInput): Promise<RFQ | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRFQContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.items !== undefined) content.items = input.items;
    if (input.dueDate !== undefined) content.dueDate = input.dueDate;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['rfq', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /**
   * Delete an RFQ.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** Close an RFQ (status → closed). */
  async close(id: string): Promise<RFQ | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseRFQContent(existing.content);
    content.status = 'closed';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['rfq', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /** Cancel an RFQ (status → cancelled). */
  async cancel(id: string): Promise<RFQ | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseRFQContent(existing.content);
    content.status = 'cancelled';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['rfq', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /**
   * Add a supplier quote to an RFQ. Quotes are stored within the RFQ's content JSON.
   */
  async addQuote(rfqId: string, input: AddQuoteInput): Promise<RFQ | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: rfqId } }),
      null,
    );
    if (!existing) return null;

    const content = parseRFQContent(existing.content);
    const quote: Quote = {
      id: randomUUID(),
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      items: input.items,
      totalQuote: input.totalQuote,
      validUntil: input.validUntil ?? null,
      notes: input.notes ?? '',
      status: 'pending',
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    };
    content.quotes.push(quote);

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id: rfqId },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /** Get all quotes for an RFQ. */
  async getQuotes(rfqId: string): Promise<Quote[]> {
    const rfq = await RFQService.get(rfqId);
    if (!rfq) return [];
    return rfq.quotes;
  },

  /**
   * Accept a quote — marks the quote accepted and creates a PO from the quote.
   */
  async acceptQuote(
    rfqId: string,
    quoteId: string,
  ): Promise<{ rfq: RFQ | null; po: import('./purchase-order-service').PurchaseOrder | null }> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: rfqId } }),
      null,
    );
    if (!existing) return { rfq: null, po: null };

    const content = parseRFQContent(existing.content);
    const quote = content.quotes.find((q) => q.id === quoteId);
    if (!quote) return { rfq: toRFQ(existing as MemoryRow), po: null };

    // Mark this quote accepted, others remain as-is
    quote.status = 'accepted';
    quote.rejectionReason = null;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id: rfqId },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    const rfq = row ? toRFQ(row as MemoryRow) : null;

    // Create a PO from the accepted quote
    const { PurchaseOrderService } = await import('./purchase-order-service');
    const poItems = quote.items.map((qi) => ({
      description: qi.description,
      quantity: 1,
      unitPrice: qi.unitPrice,
    }));
    // Match RFQ item quantities where possible
    for (const poItem of poItems) {
      const match = content.items.find(
        (ri) => ri.description === poItem.description,
      );
      if (match) poItem.quantity = match.quantity;
    }
    const po = await PurchaseOrderService.create(
      (existing as MemoryRow).organizationId,
      {
        vendorId: quote.vendorId,
        vendorName: quote.vendorName,
        items: poItems,
        notes: `Created from RFQ ${content.rfqNumber}`,
        createdBy: (existing as MemoryRow).createdBy,
      },
    );

    return { rfq, po };
  },

  /** Reject a quote. */
  async rejectQuote(
    rfqId: string,
    quoteId: string,
    reason?: string,
  ): Promise<RFQ | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: rfqId } }),
      null,
    );
    if (!existing) return null;

    const content = parseRFQContent(existing.content);
    const quote = content.quotes.find((q) => q.id === quoteId);
    if (!quote) return toRFQ(existing as MemoryRow);

    quote.status = 'rejected';
    quote.rejectionReason = reason ?? null;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id: rfqId },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRFQ(row as MemoryRow);
  },

  /** Open RFQs. */
  async getOpen(organizationId: string): Promise<RFQ[]> {
    return RFQService.list(organizationId, { status: 'open' });
  },

  /** Get stats for an organization. */
  async getStats(organizationId: string): Promise<RFQStats> {
    const rfqs = await RFQService.list(organizationId);
    const byStatus: Record<RFQStatus, number> = {
      open: 0,
      closed: 0,
      cancelled: 0,
    };
    let totalQuotesReceived = 0;
    let acceptedCount = 0;
    for (const r of rfqs) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      totalQuotesReceived += r.quotes.length;
      acceptedCount += r.quotes.filter((q) => q.status === 'accepted').length;
    }
    return {
      totalRFQs: rfqs.length,
      byStatus,
      totalQuotesReceived,
      acceptedCount,
    };
  },
};
