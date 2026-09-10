import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'received'
  | 'cancelled';

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

export interface POItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface ReceivedItem {
  description: string;
  quantityReceived: number;
  condition?: string;
}

/** Parsed content payload for a purchase order Memory. */
interface POContent {
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: POItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: POStatus;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  receivedItems: ReceivedItem[];
  approvedBy: string | null;
  rejectionReason: string | null;
  notes: string;
}

/** A structured purchase order returned to callers. */
export interface PurchaseOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: POItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: POStatus;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  receivedItems: ReceivedItem[];
  approvedBy: string | null;
  rejectionReason: string | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePOInput {
  vendorId: string;
  vendorName: string;
  items: POItem[];
  expectedDeliveryDate?: string;
  notes?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdatePOInput {
  vendorName?: string;
  items?: POItem[];
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface ReceivePOInput {
  receivedItems: ReceivedItem[];
  notes?: string;
}

export interface ListPOOpts {
  status?: POStatus;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface POStats {
  totalPOs: number;
  byStatus: Record<POStatus, number>;
  totalValue: number;
  pendingCount: number;
  avgPOValue: number;
}

// ── Helpers ──

const fallbackContent: POContent = {
  poNumber: '',
  vendorId: '',
  vendorName: '',
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  status: 'draft',
  expectedDeliveryDate: null,
  receivedDate: null,
  receivedItems: [],
  approvedBy: null,
  rejectionReason: null,
  notes: '',
};

/** Calculate subtotal, tax, and total from line items. */
export function calculateTotals(items: POItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const lineSubtotal = item.quantity * item.unitPrice;
    subtotal += lineSubtotal;
    const rate = item.taxRate ?? 0;
    tax += lineSubtotal * rate;
  }
  const total = subtotal + tax;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/** Generate a PO number: PO-YYYY-NNNN (sequence based on count). */
export async function generatePONumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await safePrisma(
    () =>
      prisma.memory.findMany({
        where: { type: 'purchase_order', organizationId },
        take: 10000,
      }),
    [],
  );
  const seq = rows.length + 1;
  return `PO-${year}-${String(seq).padStart(4, '0')}`;
}

function parsePOContent(raw: string): POContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    const items: POItem[] = Array.isArray(parsed.items) ? parsed.items : [];
    const { subtotal, tax, total } = calculateTotals(items);
    return {
      poNumber: parsed.poNumber ?? '',
      vendorId: parsed.vendorId ?? '',
      vendorName: parsed.vendorName ?? '',
      items,
      subtotal: parsed.subtotal !== undefined ? Number(parsed.subtotal) : subtotal,
      tax: parsed.tax !== undefined ? Number(parsed.tax) : tax,
      total: parsed.total !== undefined ? Number(parsed.total) : total,
      status: (parsed.status as POStatus) ?? 'draft',
      expectedDeliveryDate: parsed.expectedDeliveryDate ?? null,
      receivedDate: parsed.receivedDate ?? null,
      receivedItems: Array.isArray(parsed.receivedItems)
        ? parsed.receivedItems
        : [],
      approvedBy: parsed.approvedBy ?? null,
      rejectionReason: parsed.rejectionReason ?? null,
      notes: parsed.notes ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toPO(row: MemoryRow): PurchaseOrder {
  const content = parsePOContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    poNumber: content.poNumber,
    vendorId: content.vendorId,
    vendorName: content.vendorName,
    items: content.items,
    subtotal: content.subtotal,
    tax: content.tax,
    total: content.total,
    status: content.status,
    expectedDeliveryDate: content.expectedDeliveryDate,
    receivedDate: content.receivedDate,
    receivedItems: content.receivedItems,
    approvedBy: content.approvedBy,
    rejectionReason: content.rejectionReason,
    notes: content.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Purchase Order Service ──

export const PurchaseOrderService = {
  /**
   * Create a purchase order. Stored as a Memory with type='purchase_order'.
   */
  async create(
    organizationId: string,
    input: CreatePOInput,
  ): Promise<PurchaseOrder> {
    const poNumber = await generatePONumber(organizationId);
    const { subtotal, tax, total } = calculateTotals(input.items);
    const content: POContent = {
      poNumber,
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      items: input.items,
      subtotal,
      tax,
      total,
      status: 'draft',
      expectedDeliveryDate: input.expectedDeliveryDate ?? null,
      receivedDate: null,
      receivedItems: [],
      approvedBy: null,
      rejectionReason: null,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'purchase_order',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['purchase_order', 'draft']),
        createdBy: input.createdBy,
      },
    });

    return toPO(row as MemoryRow);
  },

  /**
   * Get a single purchase order by ID.
   */
  async get(id: string): Promise<PurchaseOrder | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /**
   * List purchase orders for an organization with optional filters.
   */
  async list(
    organizationId: string,
    opts: ListPOOpts = {},
  ): Promise<PurchaseOrder[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'purchase_order',
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

    let pos = rows.map((r) => toPO(r as MemoryRow));

    if (opts.status) {
      pos = pos.filter((p) => p.status === opts.status);
    }
    if (opts.vendorId) {
      pos = pos.filter((p) => p.vendorId === opts.vendorId);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      pos = pos.filter(
        (p) =>
          p.poNumber.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q),
      );
    }

    return pos;
  },

  /**
   * Update a purchase order.
   */
  async update(id: string, input: UpdatePOInput): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePOContent(existing.content);
    if (input.vendorName !== undefined) content.vendorName = input.vendorName;
    if (input.items !== undefined) {
      content.items = input.items;
      const { subtotal, tax, total } = calculateTotals(input.items);
      content.subtotal = subtotal;
      content.tax = tax;
      content.total = total;
    }
    if (input.expectedDeliveryDate !== undefined)
      content.expectedDeliveryDate = input.expectedDeliveryDate;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /**
   * Delete a purchase order.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** Submit a PO for approval (status → pending_approval). */
  async submit(id: string): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'pending_approval';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** Approve a PO (status → approved). */
  async approve(id: string, approvedBy: string): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'approved';
    content.approvedBy = approvedBy;
    content.rejectionReason = null;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** Reject a PO (status → rejected). */
  async reject(id: string, reason?: string): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'rejected';
    content.rejectionReason = reason ?? null;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** Send a PO to a vendor (status → sent). */
  async send(id: string): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'sent';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** Receive goods (status → received, set receivedDate and items). */
  async receive(
    id: string,
    input: ReceivePOInput,
  ): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'received';
    content.receivedDate = new Date().toISOString();
    content.receivedItems = input.receivedItems;
    if (input.notes) content.notes = input.notes;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** Cancel a PO (status → cancelled). */
  async cancel(id: string): Promise<PurchaseOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parsePOContent(existing.content);
    content.status = 'cancelled';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['purchase_order', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPO(row as MemoryRow);
  },

  /** POs grouped by status. */
  async getByStatus(
    organizationId: string,
  ): Promise<Record<POStatus, PurchaseOrder[]>> {
    const pos = await PurchaseOrderService.list(organizationId);
    const grouped: Record<POStatus, PurchaseOrder[]> = {
      draft: [],
      pending_approval: [],
      approved: [],
      rejected: [],
      sent: [],
      received: [],
      cancelled: [],
    };
    for (const p of pos) {
      grouped[p.status].push(p);
    }
    return grouped;
  },

  /** POs grouped by vendor. */
  async getByVendor(
    organizationId: string,
  ): Promise<Record<string, PurchaseOrder[]>> {
    const pos = await PurchaseOrderService.list(organizationId);
    const grouped: Record<string, PurchaseOrder[]> = {};
    for (const p of pos) {
      if (!grouped[p.vendorId]) grouped[p.vendorId] = [];
      grouped[p.vendorId].push(p);
    }
    return grouped;
  },

  /** POs pending approval. */
  async getPendingApprovals(organizationId: string): Promise<PurchaseOrder[]> {
    return PurchaseOrderService.list(organizationId, {
      status: 'pending_approval',
    });
  },

  /** POs not yet received (draft, pending_approval, approved, sent). */
  async getOpenPOs(organizationId: string): Promise<PurchaseOrder[]> {
    const pos = await PurchaseOrderService.list(organizationId);
    return pos.filter((p) =>
      ['draft', 'pending_approval', 'approved', 'sent'].includes(p.status),
    );
  },

  /** Total PO spend with optional date range. */
  async getTotalSpend(
    organizationId: string,
    opts: { startDate?: string; endDate?: string } = {},
  ): Promise<number> {
    const pos = await PurchaseOrderService.list(organizationId, {
      startDate: opts.startDate,
      endDate: opts.endDate,
    });
    // Count spend for POs that have been sent/received/approved (i.e. committed)
    return pos
      .filter((p) =>
        ['approved', 'sent', 'received'].includes(p.status),
      )
      .reduce((sum, p) => sum + p.total, 0);
  },

  /** Spend grouped by vendor. */
  async getSpendByVendor(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const pos = await PurchaseOrderService.list(organizationId);
    const grouped: Record<string, number> = {};
    for (const p of pos) {
      if (['approved', 'sent', 'received'].includes(p.status)) {
        grouped[p.vendorId] = (grouped[p.vendorId] || 0) + p.total;
      }
    }
    return grouped;
  },

  /** Get stats for an organization. */
  async getStats(organizationId: string): Promise<POStats> {
    const pos = await PurchaseOrderService.list(organizationId);
    const byStatus: Record<POStatus, number> = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      sent: 0,
      received: 0,
      cancelled: 0,
    };
    let totalValue = 0;
    let pendingCount = 0;
    for (const p of pos) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      totalValue += p.total;
      if (p.status === 'pending_approval') pendingCount += 1;
    }
    return {
      totalPOs: pos.length,
      byStatus,
      totalValue: Math.round(totalValue * 100) / 100,
      pendingCount,
      avgPOValue:
        pos.length > 0 ? Math.round((totalValue / pos.length) * 100) / 100 : 0,
    };
  },
};
