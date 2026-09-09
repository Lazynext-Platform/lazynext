import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CaseType = 'domestic' | 'international' | 'local' | 'remote_assignment' | 'permanent_transfer' | 'temporary_assignment';
export type CaseStatus = 'initiated' | 'planning' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type MoveType = 'full_service' | 'self_service' | 'partial' | 'storage' | 'auto_transport' | 'pet_relocation' | 'vehicle_ship';
export type MoveStatus = 'scheduled' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled' | 'rescheduled';
export type ExpenseType = 'moving' | 'travel' | 'temporary_housing' | 'storage' | 'misc' | 'tax_gross_up' | 'home_sale' | 'home_purchase' | 'lease_termination' | 'spousal_assistance';
export type ExpenseStatus = 'submitted' | 'approved' | 'rejected' | 'reimbursed' | 'pending' | 'disputed';
export type VendorType = 'moving_company' | 'real_estate' | 'storage' | 'transport' | 'housing' | 'immigration' | 'tax' | 'other';
export type VendorStatus = 'active' | 'inactive' | 'preferred' | 'blacklisted';

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

export interface RelocationCase {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  type: CaseType;
  description: string;
  status: CaseStatus;
  originLocation: string;
  destinationLocation: string;
  startDate: Date | null;
  endDate: Date | null;
  familySize: number;
  budget: number;
  assignedCoordinator: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelocationMove {
  id: string;
  organizationId: string;
  workspaceId: string;
  caseId: string;
  type: MoveType;
  description: string;
  status: MoveStatus;
  scheduledDate: Date | null;
  completedDate: Date | null;
  originAddress: string;
  destinationAddress: string;
  carrier: string;
  trackingNumber: string;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelocationExpense {
  id: string;
  organizationId: string;
  workspaceId: string;
  caseId: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  date: Date | null;
  vendor: string;
  receipt: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelocationVendor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: VendorType;
  description: string;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  contractTerms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelocationMetrics {
  activeCases: number;
  inTransitMoves: number;
  pendingExpenses: number;
  totalBudget: number;
  preferredVendors: number;
}

export interface RelocationStats {
  caseCount: number;
  moveCount: number;
  expenseCount: number;
  vendorCount: number;
  byCaseType: Record<string, number>;
  byCaseStatus: Record<string, number>;
  byMoveType: Record<string, number>;
  byMoveStatus: Record<string, number>;
  byExpenseType: Record<string, number>;
  byExpenseStatus: Record<string, number>;
  byVendorType: Record<string, number>;
  byVendorStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCaseInput {
  employeeId: string;
  employeeName: string;
  type: CaseType;
  description?: string;
  status?: CaseStatus;
  originLocation?: string;
  destinationLocation?: string;
  startDate?: string;
  endDate?: string;
  familySize?: number;
  budget?: number;
  assignedCoordinator?: string;
  notes?: string;
}

export interface UpdateCaseInput {
  employeeId?: string;
  employeeName?: string;
  type?: CaseType;
  description?: string;
  status?: CaseStatus;
  originLocation?: string;
  destinationLocation?: string;
  startDate?: string;
  endDate?: string;
  familySize?: number;
  budget?: number;
  assignedCoordinator?: string;
  notes?: string;
}

export interface ListCasesOpts {
  type?: CaseType;
  status?: CaseStatus;
}

export interface CreateMoveInput {
  caseId: string;
  type: MoveType;
  description?: string;
  status?: MoveStatus;
  scheduledDate?: string;
  completedDate?: string;
  originAddress?: string;
  destinationAddress?: string;
  carrier?: string;
  trackingNumber?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateMoveInput {
  caseId?: string;
  type?: MoveType;
  description?: string;
  status?: MoveStatus;
  scheduledDate?: string;
  completedDate?: string;
  originAddress?: string;
  destinationAddress?: string;
  carrier?: string;
  trackingNumber?: string;
  cost?: number;
  notes?: string;
}

export interface ListMovesOpts {
  caseId?: string;
  type?: MoveType;
  status?: MoveStatus;
}

export interface CreateExpenseInput {
  caseId: string;
  type: ExpenseType;
  amount: number;
  currency?: string;
  status?: ExpenseStatus;
  date?: string;
  vendor?: string;
  receipt?: string;
  description?: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  caseId?: string;
  type?: ExpenseType;
  amount?: number;
  currency?: string;
  status?: ExpenseStatus;
  date?: string;
  vendor?: string;
  receipt?: string;
  description?: string;
  notes?: string;
}

export interface ListExpensesOpts {
  caseId?: string;
  type?: ExpenseType;
  status?: ExpenseStatus;
}

export interface CreateVendorInput {
  name: string;
  type: VendorType;
  description?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  rating?: number;
  contractTerms?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  type?: VendorType;
  description?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  rating?: number;
  contractTerms?: string;
  notes?: string;
}

export interface ListVendorsOpts {
  type?: VendorType;
  status?: VendorStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toCase(row: MemoryRow): RelocationCase {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as CaseType) ?? 'domestic',
    description: (c.description as string) ?? '',
    status: (c.status as CaseStatus) ?? 'initiated',
    originLocation: (c.originLocation as string) ?? '',
    destinationLocation: (c.destinationLocation as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    familySize: (c.familySize as number) ?? 0,
    budget: (c.budget as number) ?? 0,
    assignedCoordinator: (c.assignedCoordinator as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMove(row: MemoryRow): RelocationMove {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    caseId: (c.caseId as string) ?? '',
    type: (c.type as MoveType) ?? 'full_service',
    description: (c.description as string) ?? '',
    status: (c.status as MoveStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    originAddress: (c.originAddress as string) ?? '',
    destinationAddress: (c.destinationAddress as string) ?? '',
    carrier: (c.carrier as string) ?? '',
    trackingNumber: (c.trackingNumber as string) ?? '',
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toExpense(row: MemoryRow): RelocationExpense {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    caseId: (c.caseId as string) ?? '',
    type: (c.type as ExpenseType) ?? 'moving',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    status: (c.status as ExpenseStatus) ?? 'submitted',
    date: c.date ? new Date(c.date as string) : null,
    vendor: (c.vendor as string) ?? '',
    receipt: (c.receipt as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVendor(row: MemoryRow): RelocationVendor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as VendorType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as VendorStatus) ?? 'active',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    rating: (c.rating as number) ?? 0,
    contractTerms: (c.contractTerms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const RelocationService = {
  // ── Cases ──

  async createCase(organizationId: string, workspaceId: string, input: CreateCaseInput, createdBy: string): Promise<RelocationCase> {
    const content = {
      employeeId: input.employeeId.trim(),
      employeeName: input.employeeName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'initiated',
      originLocation: input.originLocation ?? '',
      destinationLocation: input.destinationLocation ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      familySize: input.familySize ?? 0,
      budget: input.budget ?? 0,
      assignedCoordinator: input.assignedCoordinator ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'relocation_case',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['relocation_case', content.type, content.status]),
        createdBy,
      },
    });
    return toCase(row as MemoryRow);
  },

  async getCase(id: string): Promise<RelocationCase | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'relocation_case') return null;
    return toCase(row as MemoryRow);
  },

  async listCases(organizationId: string, opts: ListCasesOpts = {}): Promise<RelocationCase[]> {
    const where: Record<string, unknown> = { organizationId, type: 'relocation_case' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCase);
  },

  async updateCase(id: string, input: UpdateCaseInput): Promise<RelocationCase | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.employeeId !== undefined && { employeeId: input.employeeId.trim() }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.originLocation !== undefined && { originLocation: input.originLocation }),
      ...(input.destinationLocation !== undefined && { destinationLocation: input.destinationLocation }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.familySize !== undefined && { familySize: input.familySize }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.assignedCoordinator !== undefined && { assignedCoordinator: input.assignedCoordinator }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['relocation_case', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCase(row as MemoryRow);
  },

  async deleteCase(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async planCase(id: string, _plannedBy: string): Promise<RelocationCase | null> {
    return RelocationService.updateCase(id, { status: 'planning' });
  },

  async startCase(id: string, _startedBy: string): Promise<RelocationCase | null> {
    return RelocationService.updateCase(id, { status: 'in_progress' });
  },

  async completeCase(id: string, _completedBy: string): Promise<RelocationCase | null> {
    return RelocationService.updateCase(id, { status: 'completed' });
  },

  async holdCase(id: string, _holdBy: string): Promise<RelocationCase | null> {
    return RelocationService.updateCase(id, { status: 'on_hold' });
  },

  // ── Moves ──

  async createMove(organizationId: string, workspaceId: string, input: CreateMoveInput, createdBy: string): Promise<RelocationMove> {
    const content = {
      caseId: input.caseId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      originAddress: input.originAddress ?? '',
      destinationAddress: input.destinationAddress ?? '',
      carrier: input.carrier ?? '',
      trackingNumber: input.trackingNumber ?? '',
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'relocation_move',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.caseId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['relocation_move', content.type, content.status]),
        createdBy,
      },
    });
    return toMove(row as MemoryRow);
  },

  async getMove(id: string): Promise<RelocationMove | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'relocation_move') return null;
    return toMove(row as MemoryRow);
  },

  async listMoves(organizationId: string, opts: ListMovesOpts = {}): Promise<RelocationMove[]> {
    const where: Record<string, unknown> = { organizationId, type: 'relocation_move' };
    const conditions: unknown[] = [];
    if (opts.caseId) conditions.push({ content: { contains: `"caseId":"${opts.caseId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMove);
  },

  async updateMove(id: string, input: UpdateMoveInput): Promise<RelocationMove | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.caseId !== undefined && { caseId: input.caseId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.originAddress !== undefined && { originAddress: input.originAddress }),
      ...(input.destinationAddress !== undefined && { destinationAddress: input.destinationAddress }),
      ...(input.carrier !== undefined && { carrier: input.carrier }),
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['relocation_move', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMove(row as MemoryRow);
  },

  async deleteMove(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async dispatchMove(id: string, _dispatchedBy: string): Promise<RelocationMove | null> {
    return RelocationService.updateMove(id, { status: 'in_transit' });
  },

  async deliverMove(id: string, _deliveredBy: string): Promise<RelocationMove | null> {
    return RelocationService.updateMove(id, { status: 'delivered', completedDate: new Date().toISOString() });
  },

  async delayMove(id: string, _delayedBy: string): Promise<RelocationMove | null> {
    return RelocationService.updateMove(id, { status: 'delayed' });
  },

  async rescheduleMove(id: string, _rescheduledBy: string): Promise<RelocationMove | null> {
    return RelocationService.updateMove(id, { status: 'rescheduled' });
  },

  // ── Expenses ──

  async createExpense(organizationId: string, workspaceId: string, input: CreateExpenseInput, createdBy: string): Promise<RelocationExpense> {
    const content = {
      caseId: input.caseId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'submitted',
      date: input.date ?? null,
      vendor: input.vendor ?? '',
      receipt: input.receipt ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'relocation_expense',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.caseId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['relocation_expense', content.type, content.status]),
        createdBy,
      },
    });
    return toExpense(row as MemoryRow);
  },

  async getExpense(id: string): Promise<RelocationExpense | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'relocation_expense') return null;
    return toExpense(row as MemoryRow);
  },

  async listExpenses(organizationId: string, opts: ListExpensesOpts = {}): Promise<RelocationExpense[]> {
    const where: Record<string, unknown> = { organizationId, type: 'relocation_expense' };
    const conditions: unknown[] = [];
    if (opts.caseId) conditions.push({ content: { contains: `"caseId":"${opts.caseId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toExpense);
  },

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<RelocationExpense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.caseId !== undefined && { caseId: input.caseId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.vendor !== undefined && { vendor: input.vendor }),
      ...(input.receipt !== undefined && { receipt: input.receipt }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['relocation_expense', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toExpense(row as MemoryRow);
  },

  async deleteExpense(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveExpense(id: string, _approvedBy: string): Promise<RelocationExpense | null> {
    return RelocationService.updateExpense(id, { status: 'approved' });
  },

  async rejectExpense(id: string, _rejectedBy: string): Promise<RelocationExpense | null> {
    return RelocationService.updateExpense(id, { status: 'rejected' });
  },

  async reimburseExpense(id: string, _reimbursedBy: string): Promise<RelocationExpense | null> {
    return RelocationService.updateExpense(id, { status: 'reimbursed' });
  },

  async disputeExpense(id: string, _disputedBy: string): Promise<RelocationExpense | null> {
    return RelocationService.updateExpense(id, { status: 'disputed' });
  },

  // ── Vendors ──

  async createVendor(organizationId: string, workspaceId: string, input: CreateVendorInput, createdBy: string): Promise<RelocationVendor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      rating: input.rating ?? 0,
      contractTerms: input.contractTerms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'relocation_vendor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['relocation_vendor', content.type, content.status]),
        createdBy,
      },
    });
    return toVendor(row as MemoryRow);
  },

  async getVendor(id: string): Promise<RelocationVendor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'relocation_vendor') return null;
    return toVendor(row as MemoryRow);
  },

  async listVendors(organizationId: string, opts: ListVendorsOpts = {}): Promise<RelocationVendor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'relocation_vendor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVendor);
  },

  async updateVendor(id: string, input: UpdateVendorInput): Promise<RelocationVendor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.contractTerms !== undefined && { contractTerms: input.contractTerms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['relocation_vendor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVendor(row as MemoryRow);
  },

  async deleteVendor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async preferVendor(id: string, _preferredBy: string): Promise<RelocationVendor | null> {
    return RelocationService.updateVendor(id, { status: 'preferred' });
  },

  async blacklistVendor(id: string, _blacklistedBy: string): Promise<RelocationVendor | null> {
    return RelocationService.updateVendor(id, { status: 'blacklisted' });
  },

  // ── Metrics & Stats ──

  async getRelocationMetrics(organizationId: string): Promise<RelocationMetrics> {
    const [cases, moves, expenses, vendors] = await Promise.all([
      RelocationService.listCases(organizationId),
      RelocationService.listMoves(organizationId),
      RelocationService.listExpenses(organizationId),
      RelocationService.listVendors(organizationId),
    ]);
    const activeCases = cases.filter((c) => c.status === 'initiated' || c.status === 'planning' || c.status === 'in_progress').length;
    const inTransitMoves = moves.filter((m) => m.status === 'in_transit').length;
    const pendingExpenses = expenses.filter((e) => e.status === 'submitted' || e.status === 'pending').length;
    const totalBudget = cases.reduce((sum, c) => sum + (c.budget ?? 0), 0);
    const preferredVendors = vendors.filter((v) => v.status === 'preferred').length;
    return { activeCases, inTransitMoves, pendingExpenses, totalBudget, preferredVendors };
  },

  async getRelocationStats(organizationId: string): Promise<RelocationStats> {
    const [cases, moves, expenses, vendors] = await Promise.all([
      RelocationService.listCases(organizationId),
      RelocationService.listMoves(organizationId),
      RelocationService.listExpenses(organizationId),
      RelocationService.listVendors(organizationId),
    ]);
    const byCaseType: Record<string, number> = {};
    const byCaseStatus: Record<string, number> = {};
    const byMoveType: Record<string, number> = {};
    const byMoveStatus: Record<string, number> = {};
    const byExpenseType: Record<string, number> = {};
    const byExpenseStatus: Record<string, number> = {};
    const byVendorType: Record<string, number> = {};
    const byVendorStatus: Record<string, number> = {};
    for (const c of cases) { byCaseType[c.type] = (byCaseType[c.type] ?? 0) + 1; byCaseStatus[c.status] = (byCaseStatus[c.status] ?? 0) + 1; }
    for (const m of moves) { byMoveType[m.type] = (byMoveType[m.type] ?? 0) + 1; byMoveStatus[m.status] = (byMoveStatus[m.status] ?? 0) + 1; }
    for (const e of expenses) { byExpenseType[e.type] = (byExpenseType[e.type] ?? 0) + 1; byExpenseStatus[e.status] = (byExpenseStatus[e.status] ?? 0) + 1; }
    for (const v of vendors) { byVendorType[v.type] = (byVendorType[v.type] ?? 0) + 1; byVendorStatus[v.status] = (byVendorStatus[v.status] ?? 0) + 1; }
    return {
      caseCount: cases.length,
      moveCount: moves.length,
      expenseCount: expenses.length,
      vendorCount: vendors.length,
      byCaseType, byCaseStatus, byMoveType, byMoveStatus, byExpenseType, byExpenseStatus, byVendorType, byVendorStatus,
    };
  },
};
