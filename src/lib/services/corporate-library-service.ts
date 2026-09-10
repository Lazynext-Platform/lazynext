import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ItemType = 'book' | 'journal' | 'magazine' | 'report' | 'research_paper' | 'media' | 'reference' | 'digital' | 'archive';
export type ItemStatus = 'available' | 'checked_out' | 'reserved' | 'in_repair' | 'lost' | 'archived' | 'weeded';
export type LoanStatus = 'active' | 'returned' | 'overdue' | 'lost' | 'renewed';
export type ReservationStatus = 'pending' | 'fulfilled' | 'cancelled' | 'expired';
export type AcquisitionType = 'purchase' | 'donation' | 'subscription' | 'inter_library_loan' | 'gift' | 'exchange';
export type AcquisitionStatus = 'requested' | 'approved' | 'ordered' | 'received' | 'rejected' | 'cancelled';

// ── Interfaces ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ItemType;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  edition: string;
  category: string;
  description: string;
  status: ItemStatus;
  location: string;
  quantity: number;
  availableQuantity: number;
  keywords: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryLoan {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  borrowerId: string;
  borrowerName: string;
  status: LoanStatus;
  checkoutDate: Date | null;
  dueDate: Date | null;
  returnDate: Date | null;
  renewedDate: Date | null;
  condition: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryReservation {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  reserverId: string;
  reserverName: string;
  status: ReservationStatus;
  reservedDate: Date | null;
  expiryDate: Date | null;
  fulfilledDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryAcquisition {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ItemType;
  author: string;
  publisher: string;
  cost: number;
  budget: number;
  status: AcquisitionStatus;
  requestedBy: string;
  approvedBy: string;
  orderedDate: Date | null;
  receivedDate: Date | null;
  supplier: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateLibraryMetrics {
  totalItems: number;
  availableItems: number;
  checkedOutItems: number;
  overdueLoans: number;
  activeReservations: number;
  pendingAcquisitions: number;
  totalInventoryValue: number;
}

export interface CorporateLibraryStats {
  itemCount: number;
  loanCount: number;
  activeLoanCount: number;
  reservationCount: number;
  pendingReservationCount: number;
  acquisitionCount: number;
  pendingAcquisitionCount: number;
  byItemType: Record<string, number>;
  byItemStatus: Record<string, number>;
  byLoanStatus: Record<string, number>;
  byReservationStatus: Record<string, number>;
  byAcquisitionType: Record<string, number>;
  byAcquisitionStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateItemInput {
  title: string;
  type: ItemType;
  author?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  category?: string;
  description?: string;
  status?: ItemStatus;
  location?: string;
  quantity?: number;
  availableQuantity?: number;
  keywords?: string[];
  notes?: string;
}

export interface UpdateItemInput {
  title?: string;
  type?: ItemType;
  author?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  category?: string;
  description?: string;
  status?: ItemStatus;
  location?: string;
  quantity?: number;
  availableQuantity?: number;
  keywords?: string[];
  notes?: string;
}

export interface ListItemsOpts {
  type?: ItemType;
  status?: ItemStatus;
  category?: string;
}

export interface CreateLoanInput {
  itemId: string;
  borrowerId: string;
  borrowerName: string;
  status?: LoanStatus;
  checkoutDate?: string;
  dueDate?: string;
  returnDate?: string;
  renewedDate?: string;
  condition?: string;
  notes?: string;
}

export interface UpdateLoanInput {
  borrowerId?: string;
  borrowerName?: string;
  status?: LoanStatus;
  checkoutDate?: string;
  dueDate?: string;
  returnDate?: string;
  renewedDate?: string;
  condition?: string;
  notes?: string;
}

export interface ListLoansOpts {
  itemId?: string;
  borrowerId?: string;
  status?: LoanStatus;
}

export interface CreateReservationInput {
  itemId: string;
  reserverId: string;
  reserverName: string;
  status?: ReservationStatus;
  reservedDate?: string;
  expiryDate?: string;
  fulfilledDate?: string;
  notes?: string;
}

export interface UpdateReservationInput {
  reserverId?: string;
  reserverName?: string;
  status?: ReservationStatus;
  reservedDate?: string;
  expiryDate?: string;
  fulfilledDate?: string;
  notes?: string;
}

export interface ListReservationsOpts {
  itemId?: string;
  reserverId?: string;
  status?: ReservationStatus;
}

export interface CreateAcquisitionInput {
  title: string;
  type: ItemType;
  author?: string;
  publisher?: string;
  cost?: number;
  budget?: number;
  status?: AcquisitionStatus;
  requestedBy?: string;
  approvedBy?: string;
  orderedDate?: string;
  receivedDate?: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateAcquisitionInput {
  title?: string;
  type?: ItemType;
  author?: string;
  publisher?: string;
  cost?: number;
  budget?: number;
  status?: AcquisitionStatus;
  requestedBy?: string;
  approvedBy?: string;
  orderedDate?: string;
  receivedDate?: string;
  supplier?: string;
  notes?: string;
}

export interface ListAcquisitionsOpts {
  type?: ItemType;
  status?: AcquisitionStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toItem(row: MemoryRow): LibraryItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ItemType) ?? 'book',
    author: (c.author as string) ?? '',
    isbn: (c.isbn as string) ?? '',
    publisher: (c.publisher as string) ?? '',
    publicationYear: (c.publicationYear as number) ?? 0,
    edition: (c.edition as string) ?? '',
    category: (c.category as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as ItemStatus) ?? 'available',
    location: (c.location as string) ?? '',
    quantity: (c.quantity as number) ?? 0,
    availableQuantity: (c.availableQuantity as number) ?? 0,
    keywords: (c.keywords as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLoan(row: MemoryRow): LibraryLoan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    borrowerId: (c.borrowerId as string) ?? '',
    borrowerName: (c.borrowerName as string) ?? '',
    status: (c.status as LoanStatus) ?? 'active',
    checkoutDate: c.checkoutDate ? new Date(c.checkoutDate as string) : null,
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    returnDate: c.returnDate ? new Date(c.returnDate as string) : null,
    renewedDate: c.renewedDate ? new Date(c.renewedDate as string) : null,
    condition: (c.condition as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReservation(row: MemoryRow): LibraryReservation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    reserverId: (c.reserverId as string) ?? '',
    reserverName: (c.reserverName as string) ?? '',
    status: (c.status as ReservationStatus) ?? 'pending',
    reservedDate: c.reservedDate ? new Date(c.reservedDate as string) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    fulfilledDate: c.fulfilledDate ? new Date(c.fulfilledDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAcquisition(row: MemoryRow): LibraryAcquisition {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ItemType) ?? 'book',
    author: (c.author as string) ?? '',
    publisher: (c.publisher as string) ?? '',
    cost: (c.cost as number) ?? 0,
    budget: (c.budget as number) ?? 0,
    status: (c.status as AcquisitionStatus) ?? 'requested',
    requestedBy: (c.requestedBy as string) ?? '',
    approvedBy: (c.approvedBy as string) ?? '',
    orderedDate: c.orderedDate ? new Date(c.orderedDate as string) : null,
    receivedDate: c.receivedDate ? new Date(c.receivedDate as string) : null,
    supplier: (c.supplier as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CorporateLibraryService = {
  // ── Items ──

  async createItem(organizationId: string, workspaceId: string, input: CreateItemInput, createdBy: string): Promise<LibraryItem> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      author: input.author ?? '',
      isbn: input.isbn ?? '',
      publisher: input.publisher ?? '',
      publicationYear: input.publicationYear ?? 0,
      edition: input.edition ?? '',
      category: input.category ?? '',
      description: input.description ?? '',
      status: input.status ?? 'available',
      location: input.location ?? '',
      quantity: input.quantity ?? 0,
      availableQuantity: input.availableQuantity ?? 0,
      keywords: input.keywords ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'library_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['library_item', content.type, content.status]),
        createdBy,
      },
    });
    return toItem(row as MemoryRow);
  },

  async getItem(id: string): Promise<LibraryItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'library_item') return null;
    return toItem(row as MemoryRow);
  },

  async listItems(organizationId: string, opts: ListItemsOpts = {}): Promise<LibraryItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'library_item' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toItem);
  },

  async updateItem(id: string, input: UpdateItemInput): Promise<LibraryItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.isbn !== undefined && { isbn: input.isbn }),
      ...(input.publisher !== undefined && { publisher: input.publisher }),
      ...(input.publicationYear !== undefined && { publicationYear: input.publicationYear }),
      ...(input.edition !== undefined && { edition: input.edition }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.availableQuantity !== undefined && { availableQuantity: input.availableQuantity }),
      ...(input.keywords !== undefined && { keywords: input.keywords }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['library_item', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toItem(row as MemoryRow);
  },

  async deleteItem(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Loans ──

  async createLoan(organizationId: string, workspaceId: string, input: CreateLoanInput, createdBy: string): Promise<LibraryLoan> {
    const content = {
      itemId: input.itemId,
      borrowerId: input.borrowerId,
      borrowerName: input.borrowerName,
      status: input.status ?? 'active',
      checkoutDate: input.checkoutDate ?? null,
      dueDate: input.dueDate ?? null,
      returnDate: input.returnDate ?? null,
      renewedDate: input.renewedDate ?? null,
      condition: input.condition ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'library_loan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['library_loan', content.status]),
        createdBy,
      },
    });
    return toLoan(row as MemoryRow);
  },

  async getLoan(id: string): Promise<LibraryLoan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'library_loan') return null;
    return toLoan(row as MemoryRow);
  },

  async listLoans(organizationId: string, opts: ListLoansOpts = {}): Promise<LibraryLoan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'library_loan' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.borrowerId) conditions.push({ content: { contains: `"borrowerId":"${opts.borrowerId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLoan);
  },

  async updateLoan(id: string, input: UpdateLoanInput): Promise<LibraryLoan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.borrowerId !== undefined && { borrowerId: input.borrowerId }),
      ...(input.borrowerName !== undefined && { borrowerName: input.borrowerName }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.checkoutDate !== undefined && { checkoutDate: input.checkoutDate }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.returnDate !== undefined && { returnDate: input.returnDate }),
      ...(input.renewedDate !== undefined && { renewedDate: input.renewedDate }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['library_loan', content.status]) },
    }), null);
    if (!row) return null;
    return toLoan(row as MemoryRow);
  },

  async deleteLoan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async returnLoan(id: string, _returnedBy: string): Promise<LibraryLoan | null> {
    return CorporateLibraryService.updateLoan(id, { status: 'returned', returnDate: new Date().toISOString() });
  },

  async renewLoan(id: string, _renewedBy: string): Promise<LibraryLoan | null> {
    return CorporateLibraryService.updateLoan(id, { status: 'renewed', renewedDate: new Date().toISOString() });
  },

  async markLoanLost(id: string, _markedBy: string): Promise<LibraryLoan | null> {
    return CorporateLibraryService.updateLoan(id, { status: 'lost' });
  },

  // ── Reservations ──

  async createReservation(organizationId: string, workspaceId: string, input: CreateReservationInput, createdBy: string): Promise<LibraryReservation> {
    const content = {
      itemId: input.itemId,
      reserverId: input.reserverId,
      reserverName: input.reserverName,
      status: input.status ?? 'pending',
      reservedDate: input.reservedDate ?? null,
      expiryDate: input.expiryDate ?? null,
      fulfilledDate: input.fulfilledDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'library_reservation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['library_reservation', content.status]),
        createdBy,
      },
    });
    return toReservation(row as MemoryRow);
  },

  async getReservation(id: string): Promise<LibraryReservation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'library_reservation') return null;
    return toReservation(row as MemoryRow);
  },

  async listReservations(organizationId: string, opts: ListReservationsOpts = {}): Promise<LibraryReservation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'library_reservation' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.reserverId) conditions.push({ content: { contains: `"reserverId":"${opts.reserverId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toReservation);
  },

  async updateReservation(id: string, input: UpdateReservationInput): Promise<LibraryReservation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.reserverId !== undefined && { reserverId: input.reserverId }),
      ...(input.reserverName !== undefined && { reserverName: input.reserverName }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.reservedDate !== undefined && { reservedDate: input.reservedDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.fulfilledDate !== undefined && { fulfilledDate: input.fulfilledDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['library_reservation', content.status]) },
    }), null);
    if (!row) return null;
    return toReservation(row as MemoryRow);
  },

  async deleteReservation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async fulfillReservation(id: string, _fulfilledBy: string): Promise<LibraryReservation | null> {
    return CorporateLibraryService.updateReservation(id, { status: 'fulfilled', fulfilledDate: new Date().toISOString() });
  },

  async cancelReservation(id: string, _cancelledBy: string): Promise<LibraryReservation | null> {
    return CorporateLibraryService.updateReservation(id, { status: 'cancelled' });
  },

  // ── Acquisitions ──

  async createAcquisition(organizationId: string, workspaceId: string, input: CreateAcquisitionInput, createdBy: string): Promise<LibraryAcquisition> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      author: input.author ?? '',
      publisher: input.publisher ?? '',
      cost: input.cost ?? 0,
      budget: input.budget ?? 0,
      status: input.status ?? 'requested',
      requestedBy: input.requestedBy ?? '',
      approvedBy: input.approvedBy ?? '',
      orderedDate: input.orderedDate ?? null,
      receivedDate: input.receivedDate ?? null,
      supplier: input.supplier ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'library_acquisition',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['library_acquisition', content.type, content.status]),
        createdBy,
      },
    });
    return toAcquisition(row as MemoryRow);
  },

  async getAcquisition(id: string): Promise<LibraryAcquisition | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'library_acquisition') return null;
    return toAcquisition(row as MemoryRow);
  },

  async listAcquisitions(organizationId: string, opts: ListAcquisitionsOpts = {}): Promise<LibraryAcquisition[]> {
    const where: Record<string, unknown> = { organizationId, type: 'library_acquisition' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAcquisition);
  },

  async updateAcquisition(id: string, input: UpdateAcquisitionInput): Promise<LibraryAcquisition | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.publisher !== undefined && { publisher: input.publisher }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.requestedBy !== undefined && { requestedBy: input.requestedBy }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.orderedDate !== undefined && { orderedDate: input.orderedDate }),
      ...(input.receivedDate !== undefined && { receivedDate: input.receivedDate }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['library_acquisition', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAcquisition(row as MemoryRow);
  },

  async deleteAcquisition(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveAcquisition(id: string, approvedBy: string): Promise<LibraryAcquisition | null> {
    return CorporateLibraryService.updateAcquisition(id, { status: 'approved', approvedBy });
  },

  async orderAcquisition(id: string, _orderedBy: string): Promise<LibraryAcquisition | null> {
    return CorporateLibraryService.updateAcquisition(id, { status: 'ordered', orderedDate: new Date().toISOString() });
  },

  async receiveAcquisition(id: string, _receivedBy: string): Promise<LibraryAcquisition | null> {
    return CorporateLibraryService.updateAcquisition(id, { status: 'received', receivedDate: new Date().toISOString() });
  },

  async rejectAcquisition(id: string, _rejectedBy: string): Promise<LibraryAcquisition | null> {
    return CorporateLibraryService.updateAcquisition(id, { status: 'rejected' });
  },

  // ── Metrics & Stats ──

  async getCorporateLibraryMetrics(organizationId: string): Promise<CorporateLibraryMetrics> {
    const items = await CorporateLibraryService.listItems(organizationId);
    const loans = await CorporateLibraryService.listLoans(organizationId);
    const reservations = await CorporateLibraryService.listReservations(organizationId);
    const acquisitions = await CorporateLibraryService.listAcquisitions(organizationId);
    return {
      totalItems: items.length,
      availableItems: items.filter((i) => i.status === 'available').length,
      checkedOutItems: items.filter((i) => i.status === 'checked_out').length,
      overdueLoans: loans.filter((l) => l.status === 'overdue').length,
      activeReservations: reservations.filter((r) => r.status === 'pending').length,
      pendingAcquisitions: acquisitions.filter((a) => a.status === 'requested' || a.status === 'approved' || a.status === 'ordered').length,
      totalInventoryValue: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  },

  async getCorporateLibraryStats(organizationId: string): Promise<CorporateLibraryStats> {
    const [items, loans, reservations, acquisitions] = await Promise.all([
      CorporateLibraryService.listItems(organizationId),
      CorporateLibraryService.listLoans(organizationId),
      CorporateLibraryService.listReservations(organizationId),
      CorporateLibraryService.listAcquisitions(organizationId),
    ]);
    const byItemType: Record<string, number> = {};
    const byItemStatus: Record<string, number> = {};
    const byLoanStatus: Record<string, number> = {};
    const byReservationStatus: Record<string, number> = {};
    const byAcquisitionType: Record<string, number> = {};
    const byAcquisitionStatus: Record<string, number> = {};
    for (const i of items) { byItemType[i.type] = (byItemType[i.type] ?? 0) + 1; byItemStatus[i.status] = (byItemStatus[i.status] ?? 0) + 1; }
    for (const l of loans) { byLoanStatus[l.status] = (byLoanStatus[l.status] ?? 0) + 1; }
    for (const r of reservations) { byReservationStatus[r.status] = (byReservationStatus[r.status] ?? 0) + 1; }
    for (const a of acquisitions) { byAcquisitionType[a.type] = (byAcquisitionType[a.type] ?? 0) + 1; byAcquisitionStatus[a.status] = (byAcquisitionStatus[a.status] ?? 0) + 1; }
    return {
      itemCount: items.length,
      loanCount: loans.length,
      activeLoanCount: loans.filter((l) => l.status === 'active').length,
      reservationCount: reservations.length,
      pendingReservationCount: reservations.filter((r) => r.status === 'pending').length,
      acquisitionCount: acquisitions.length,
      pendingAcquisitionCount: acquisitions.filter((a) => a.status === 'requested' || a.status === 'approved' || a.status === 'ordered').length,
      byItemType, byItemStatus, byLoanStatus, byReservationStatus, byAcquisitionType, byAcquisitionStatus,
    };
  },
};
