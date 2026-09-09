import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';
export type InvoiceType = 'sales' | 'purchase' | 'credit' | 'debit';

/** Raw Invoice row as stored in the database. */
interface InvoiceRow {
  id: string;
  organizationId: string;
  workspaceId: string | null;
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
  notes: string;
  terms: string;
  paidAmount: number;
  paidAt: Date | null;
  sentAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: InvoiceLineItemRow[];
}

interface InvoiceLineItemRow {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  total: number;
  category: string | null;
  createdAt: Date;
}

export interface InvoiceWithLineItems {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  customerId: string | null;
  number: string;
  status: InvoiceStatus;
  type: InvoiceType;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes: string;
  terms: string;
  paidAmount: number;
  paidAt: Date | null;
  sentAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: InvoiceLineItemRow[];
}

export interface CreateInvoiceInput {
  organizationId: string;
  workspaceId?: string;
  customerId?: string;
  type?: InvoiceType;
  issueDate?: Date;
  dueDate: Date;
  currency?: string;
  notes?: string;
  terms?: string;
  taxRate?: number;
  discountRate?: number;
  lineItems?: CreateLineItemInput[];
  createdBy?: string;
}

export interface CreateLineItemInput {
  description: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  discountRate?: number;
  category?: string;
}

export interface UpdateInvoiceInput {
  customerId?: string;
  type?: InvoiceType;
  issueDate?: Date;
  dueDate?: Date;
  currency?: string;
  notes?: string;
  terms?: string;
  taxRate?: number;
  discountRate?: number;
  status?: InvoiceStatus;
}

export interface ListInvoiceOpts {
  workspaceId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
  customerId?: string;
  search?: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalRevenue: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  count: number;
}

// ── Helpers ──

function toInvoice(row: InvoiceRow): InvoiceWithLineItems {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    customerId: row.customerId,
    number: row.number,
    status: row.status as InvoiceStatus,
    type: row.type as InvoiceType,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    subtotal: row.subtotal,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    discountRate: row.discountRate,
    discountAmount: row.discountAmount,
    total: row.total,
    currency: row.currency,
    notes: row.notes,
    terms: row.terms,
    paidAmount: row.paidAmount,
    paidAt: row.paidAt,
    sentAt: row.sentAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lineItems: row.lineItems ?? [],
  };
}

/**
 * Calculate totals from line items and invoice-level tax/discount rates.
 */
export function calculateTotals(
  lineItems: CreateLineItemInput[],
  taxRate: number = 0,
  discountRate: number = 0,
): { subtotal: number; taxAmount: number; discountAmount: number; total: number } {
  let subtotal = 0;
  for (const item of lineItems) {
    const qty = item.quantity ?? 1;
    const price = item.unitPrice ?? 0;
    const lineSubtotal = qty * price;
    const lineDiscount = lineSubtotal * ((item.discountRate ?? 0) / 100);
    const lineAfterDiscount = lineSubtotal - lineDiscount;
    const lineTax = lineAfterDiscount * ((item.taxRate ?? 0) / 100);
    subtotal += lineAfterDiscount;
    // line tax is folded into the invoice-level tax for simplicity
    void lineTax;
  }

  const invoiceDiscount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - invoiceDiscount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  return {
    subtotal: round2(subtotal),
    taxAmount: round2(taxAmount),
    discountAmount: round2(invoiceDiscount),
    total: round2(total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate an invoice number: INV-YYYY-NNNN
 */
async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const existing = await safePrisma(() =>
    prisma.invoice.findMany({
      where: {
        organizationId,
        number: { startsWith: prefix },
      },
      select: { number: true },
      take: 1000,
    }),
    [],
  );

  let maxNum = 0;
  for (const inv of existing as Array<{ number: string }>) {
    const suffix = inv.number.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

// ── Invoice Service ──

export const InvoiceService = {
  /**
   * Create a new invoice with auto-generated number and calculated totals.
   */
  async create(input: CreateInvoiceInput): Promise<InvoiceWithLineItems> {
    const number = await generateInvoiceNumber(input.organizationId);
    const lineItems = input.lineItems ?? [];
    const totals = calculateTotals(lineItems, input.taxRate ?? 0, input.discountRate ?? 0);

    const row = await prisma.invoice.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        customerId: input.customerId || null,
        number,
        status: 'draft',
        type: input.type ?? 'sales',
        issueDate: input.issueDate ?? new Date(),
        dueDate: input.dueDate,
        subtotal: totals.subtotal,
        taxRate: input.taxRate ?? 0,
        taxAmount: totals.taxAmount,
        discountRate: input.discountRate ?? 0,
        discountAmount: totals.discountAmount,
        total: totals.total,
        currency: input.currency ?? 'USD',
        notes: input.notes ?? '',
        terms: input.terms ?? '',
        paidAmount: 0,
        createdBy: input.createdBy || null,
        lineItems: {
          create: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            taxRate: item.taxRate ?? 0,
            discountRate: item.discountRate ?? 0,
            total: round2(
              (item.quantity ?? 1) * (item.unitPrice ?? 0) *
              (1 - (item.discountRate ?? 0) / 100) *
              (1 + (item.taxRate ?? 0) / 100),
            ),
            category: item.category || null,
          })),
        },
      },
      include: { lineItems: true },
    });

    return toInvoice(row as InvoiceRow);
  },

  /**
   * Get a single invoice by ID with line items.
   */
  async get(id: string): Promise<InvoiceWithLineItems | null> {
    const row = await safePrisma(() =>
      prisma.invoice.findUnique({
        where: { id },
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * List invoices for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListInvoiceOpts = {}): Promise<InvoiceWithLineItems[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts.status) where.status = opts.status;
    if (opts.type) where.type = opts.type;
    if (opts.customerId) where.customerId = opts.customerId;
    if (opts.search) {
      where.OR = [
        { number: { contains: opts.search } },
        { notes: { contains: opts.search } },
      ];
    }

    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: { lineItems: true },
      }),
      [],
    );

    return rows.map((r) => toInvoice(r as InvoiceRow));
  },

  /**
   * Update an invoice.
   */
  async update(id: string, input: UpdateInvoiceInput): Promise<InvoiceWithLineItems | null> {
    const updateData: Record<string, unknown> = {};
    if (input.customerId !== undefined) updateData.customerId = input.customerId || null;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.issueDate !== undefined) updateData.issueDate = input.issueDate;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.terms !== undefined) updateData.terms = input.terms;
    if (input.taxRate !== undefined) updateData.taxRate = input.taxRate;
    if (input.discountRate !== undefined) updateData.discountRate = input.discountRate;
    if (input.status !== undefined) updateData.status = input.status;

    // Recalculate totals if tax/discount changed
    if (input.taxRate !== undefined || input.discountRate !== undefined) {
      const existing = await prisma.invoice.findUnique({
        where: { id },
        include: { lineItems: true },
      });
      if (existing) {
        const lineItems = (existing.lineItems as InvoiceLineItemRow[]).map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate,
          discountRate: li.discountRate,
        }));
        const totals = calculateTotals(
          lineItems,
          input.taxRate ?? existing.taxRate,
          input.discountRate ?? existing.discountRate,
        );
        updateData.subtotal = totals.subtotal;
        updateData.taxAmount = totals.taxAmount;
        updateData.discountAmount = totals.discountAmount;
        updateData.total = totals.total;
      }
    }

    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id },
        data: updateData,
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Delete an invoice.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.invoice.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Change the status of an invoice.
   */
  async changeStatus(id: string, status: InvoiceStatus): Promise<InvoiceWithLineItems | null> {
    const updateData: Record<string, unknown> = { status };
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id },
        data: updateData,
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Send an invoice (sets status to 'sent' and records sentAt).
   */
  async send(id: string): Promise<InvoiceWithLineItems | null> {
    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Mark an invoice as paid.
   */
  async markPaid(id: string, paidAmount?: number): Promise<InvoiceWithLineItems | null> {
    const existing = await safePrisma(() =>
      prisma.invoice.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const amount = paidAmount ?? (existing as InvoiceRow).total;
    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id },
        data: {
          status: 'paid',
          paidAmount: amount,
          paidAt: new Date(),
        },
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Cancel an invoice.
   */
  async cancel(id: string): Promise<InvoiceWithLineItems | null> {
    return InvoiceService.changeStatus(id, 'cancelled');
  },

  /**
   * Void an invoice.
   */
  async void(id: string): Promise<InvoiceWithLineItems | null> {
    return InvoiceService.changeStatus(id, 'void');
  },

  /**
   * Add a line item to an invoice and recalculate totals.
   */
  async addLineItem(
    invoiceId: string,
    item: CreateLineItemInput,
  ): Promise<InvoiceWithLineItems | null> {
    const existing = await safePrisma(() =>
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { lineItems: true },
      }),
      null,
    );
    if (!existing) return null;

    const lineTotal = round2(
      (item.quantity ?? 1) * (item.unitPrice ?? 0) *
      (1 - (item.discountRate ?? 0) / 100) *
      (1 + (item.taxRate ?? 0) / 100),
    );

    await prisma.invoiceLineItem.create({
      data: {
        invoiceId,
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        taxRate: item.taxRate ?? 0,
        discountRate: item.discountRate ?? 0,
        total: lineTotal,
        category: item.category || null,
      },
    });

    // Recalculate totals
    const allItems = [
      ...(existing.lineItems as InvoiceLineItemRow[]).map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxRate: li.taxRate,
        discountRate: li.discountRate,
      })),
      item,
    ];
    const inv = existing as InvoiceRow;
    const totals = calculateTotals(allItems, inv.taxRate, inv.discountRate);

    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          total: totals.total,
        },
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Remove a line item from an invoice and recalculate totals.
   */
  async removeLineItem(
    invoiceId: string,
    lineItemId: string,
  ): Promise<InvoiceWithLineItems | null> {
    const existing = await safePrisma(() =>
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { lineItems: true },
      }),
      null,
    );
    if (!existing) return null;

    await prisma.invoiceLineItem.delete({ where: { id: lineItemId } }).catch(() => null);

    const remaining = (existing.lineItems as InvoiceLineItemRow[])
      .filter((li) => li.id !== lineItemId)
      .map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxRate: li.taxRate,
        discountRate: li.discountRate,
      }));

    const inv = existing as InvoiceRow;
    const totals = calculateTotals(remaining, inv.taxRate, inv.discountRate);

    const row = await safePrisma(() =>
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          total: totals.total,
        },
        include: { lineItems: true },
      }),
      null,
    );
    if (!row) return null;
    return toInvoice(row as InvoiceRow);
  },

  /**
   * Get overdue invoices for an organization.
   */
  async getOverdue(organizationId: string): Promise<InvoiceWithLineItems[]> {
    const now = new Date();
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['sent', 'overdue'] },
          dueDate: { lt: now },
        },
        orderBy: { dueDate: 'asc' },
        include: { lineItems: true },
      }),
      [],
    );

    // Update status to overdue for returned invoices
    const invoices = rows.map((r) => toInvoice(r as InvoiceRow));
    for (const inv of invoices) {
      if (inv.status === 'sent') {
        await safePrisma(() =>
          prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'overdue' },
          }),
          null,
        );
      }
    }

    return invoices;
  },

  /**
   * Get invoices by status.
   */
  async getByStatus(organizationId: string, status: InvoiceStatus): Promise<InvoiceWithLineItems[]> {
    return InvoiceService.list(organizationId, { status });
  },

  /**
   * Get invoices by type.
   */
  async getByType(organizationId: string, type: InvoiceType): Promise<InvoiceWithLineItems[]> {
    return InvoiceService.list(organizationId, { type });
  },

  /**
   * Get total revenue (sum of paid invoice totals).
   */
  async getRevenue(organizationId: string): Promise<number> {
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: 'paid',
        },
        select: { total: true, paidAmount: true },
      }),
      [],
    );
    let total = 0;
    for (const r of rows as Array<{ total: number; paidAmount: number }>) {
      total += r.paidAmount || r.total;
    }
    return round2(total);
  },

  /**
   * Get total outstanding (sum of unpaid invoice totals).
   */
  async getOutstanding(organizationId: string): Promise<number> {
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ['sent', 'overdue'] },
        },
        select: { total: true, paidAmount: true },
      }),
      [],
    );
    let total = 0;
    for (const r of rows as Array<{ total: number; paidAmount: number }>) {
      total += r.total - (r.paidAmount || 0);
    }
    return round2(total);
  },

  /**
   * Get revenue trend by month.
   */
  async getRevenueTrend(organizationId: string, months: number = 12): Promise<RevenueTrendPoint[]> {
    const rows = await safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: 'paid',
        },
        select: { total: true, paidAmount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      [],
    );

    const now = new Date();
    const trend: Map<string, RevenueTrendPoint> = new Map();

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend.set(key, { period: key, revenue: 0, count: 0 });
    }

    for (const r of rows as Array<{ total: number; paidAmount: number; paidAt: Date | null }>) {
      if (!r.paidAt) continue;
      const d = r.paidAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const point = trend.get(key);
      if (point) {
        point.revenue += r.paidAmount || r.total;
        point.count += 1;
      }
    }

    return Array.from(trend.values()).map((p) => ({
      period: p.period,
      revenue: round2(p.revenue),
      count: p.count,
    }));
  },

  /**
   * Get invoice stats for an organization.
   */
  async getStats(organizationId: string): Promise<InvoiceStats> {
    const invoices = await InvoiceService.list(organizationId);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalRevenue = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    const now = new Date();

    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
      byType[inv.type] = (byType[inv.type] || 0) + 1;

      if (inv.status === 'paid') {
        totalRevenue += inv.paidAmount || inv.total;
      }
      if (inv.status === 'sent' || inv.status === 'overdue') {
        totalOutstanding += inv.total - (inv.paidAmount || 0);
      }
      if (inv.status === 'overdue' || (inv.status === 'sent' && inv.dueDate < now)) {
        totalOverdue += inv.total - (inv.paidAmount || 0);
      }
    }

    return {
      totalInvoices: invoices.length,
      byStatus,
      byType,
      totalRevenue: round2(totalRevenue),
      totalOutstanding: round2(totalOutstanding),
      totalOverdue: round2(totalOverdue),
    };
  },
};
