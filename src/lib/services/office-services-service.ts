import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RequestType = 'maintenance' | 'repair' | 'cleaning' | 'setup' | 'move' | 'it_support' | 'facility' | 'equipment' | 'furniture' | 'other';
export type RequestStatus = 'submitted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MailType = 'incoming' | 'outgoing' | 'internal' | 'courier' | 'certified' | 'package' | 'registered';
export type MailStatus = 'received' | 'sorted' | 'delivered' | 'returned' | 'forwarded' | 'held' | 'lost';
export type PrintType = 'document' | 'booklet' | 'poster' | 'business_card' | 'brochure' | 'binding' | 'large_format' | '3d_print';
export type PrintStatus = 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled' | 'reprinted';
export type SupplyType = 'stationery' | 'office_supplies' | 'kitchen' | 'cleaning' | 'furniture' | 'electronics' | 'safety' | 'other';
export type SupplyStatus = 'requested' | 'approved' | 'ordered' | 'received' | 'distributed' | 'cancelled';

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

export interface OfficeRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: RequestType;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  requestedBy: string;
  assignedTo: string;
  location: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: MailType;
  sender: string;
  recipient: string;
  subject: string;
  status: MailStatus;
  receivedDate: Date | null;
  deliveredDate: Date | null;
  trackingNumber: string;
  weight: number;
  postage: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintJob {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: PrintType;
  title: string;
  description: string;
  status: PrintStatus;
  requestedBy: string;
  copies: number;
  color: boolean;
  doubleSided: boolean;
  paperSize: string;
  binding: string;
  cost: number;
  completedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplyOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: SupplyType;
  description: string;
  status: SupplyStatus;
  items: string[];
  requestedBy: string;
  approvedBy: string;
  supplier: string;
  totalCost: number;
  orderedDate: Date | null;
  receivedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfficeServicesMetrics {
  openRequests: number;
  urgentRequests: number;
  pendingMail: number;
  queuedPrintJobs: number;
  pendingSupplyOrders: number;
}

export interface OfficeServicesStats {
  requestCount: number;
  mailCount: number;
  printJobCount: number;
  supplyOrderCount: number;
  byRequestType: Record<string, number>;
  byRequestStatus: Record<string, number>;
  byRequestPriority: Record<string, number>;
  byMailType: Record<string, number>;
  byMailStatus: Record<string, number>;
  byPrintType: Record<string, number>;
  byPrintStatus: Record<string, number>;
  bySupplyType: Record<string, number>;
  bySupplyStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateRequestInput {
  title: string;
  type: RequestType;
  description?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  requestedBy?: string;
  assignedTo?: string;
  location?: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateRequestInput {
  title?: string;
  type?: RequestType;
  description?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  requestedBy?: string;
  assignedTo?: string;
  location?: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface ListRequestsOpts {
  type?: RequestType;
  status?: RequestStatus;
  priority?: RequestPriority;
}

export interface CreateMailInput {
  type: MailType;
  sender?: string;
  recipient?: string;
  subject?: string;
  status?: MailStatus;
  receivedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  weight?: number;
  postage?: number;
  notes?: string;
}

export interface UpdateMailInput {
  type?: MailType;
  sender?: string;
  recipient?: string;
  subject?: string;
  status?: MailStatus;
  receivedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  weight?: number;
  postage?: number;
  notes?: string;
}

export interface ListMailOpts {
  type?: MailType;
  status?: MailStatus;
}

export interface CreatePrintJobInput {
  type: PrintType;
  title: string;
  description?: string;
  status?: PrintStatus;
  requestedBy?: string;
  copies?: number;
  color?: boolean;
  doubleSided?: boolean;
  paperSize?: string;
  binding?: string;
  cost?: number;
  completedDate?: string;
  notes?: string;
}

export interface UpdatePrintJobInput {
  type?: PrintType;
  title?: string;
  description?: string;
  status?: PrintStatus;
  requestedBy?: string;
  copies?: number;
  color?: boolean;
  doubleSided?: boolean;
  paperSize?: string;
  binding?: string;
  cost?: number;
  completedDate?: string;
  notes?: string;
}

export interface ListPrintJobsOpts {
  type?: PrintType;
  status?: PrintStatus;
}

export interface CreateSupplyOrderInput {
  type: SupplyType;
  description?: string;
  status?: SupplyStatus;
  items?: string[];
  requestedBy?: string;
  approvedBy?: string;
  supplier?: string;
  totalCost?: number;
  orderedDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface UpdateSupplyOrderInput {
  type?: SupplyType;
  description?: string;
  status?: SupplyStatus;
  items?: string[];
  requestedBy?: string;
  approvedBy?: string;
  supplier?: string;
  totalCost?: number;
  orderedDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface ListSupplyOrdersOpts {
  type?: SupplyType;
  status?: SupplyStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toRequest(row: MemoryRow): OfficeRequest {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as RequestType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as RequestStatus) ?? 'submitted',
    priority: (c.priority as RequestPriority) ?? 'medium',
    requestedBy: (c.requestedBy as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    location: (c.location as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMail(row: MemoryRow): MailRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as MailType) ?? 'incoming',
    sender: (c.sender as string) ?? '',
    recipient: (c.recipient as string) ?? '',
    subject: (c.subject as string) ?? '',
    status: (c.status as MailStatus) ?? 'received',
    receivedDate: c.receivedDate ? new Date(c.receivedDate as string) : null,
    deliveredDate: c.deliveredDate ? new Date(c.deliveredDate as string) : null,
    trackingNumber: (c.trackingNumber as string) ?? '',
    weight: (c.weight as number) ?? 0,
    postage: (c.postage as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPrintJob(row: MemoryRow): PrintJob {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as PrintType) ?? 'document',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as PrintStatus) ?? 'queued',
    requestedBy: (c.requestedBy as string) ?? '',
    copies: (c.copies as number) ?? 1,
    color: (c.color as boolean) ?? false,
    doubleSided: (c.doubleSided as boolean) ?? false,
    paperSize: (c.paperSize as string) ?? '',
    binding: (c.binding as string) ?? '',
    cost: (c.cost as number) ?? 0,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSupplyOrder(row: MemoryRow): SupplyOrder {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as SupplyType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as SupplyStatus) ?? 'requested',
    items: (c.items as string[]) ?? [],
    requestedBy: (c.requestedBy as string) ?? '',
    approvedBy: (c.approvedBy as string) ?? '',
    supplier: (c.supplier as string) ?? '',
    totalCost: (c.totalCost as number) ?? 0,
    orderedDate: c.orderedDate ? new Date(c.orderedDate as string) : null,
    receivedDate: c.receivedDate ? new Date(c.receivedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const OfficeServicesService = {
  // ── Requests ──

  async createRequest(organizationId: string, workspaceId: string, input: CreateRequestInput, createdBy: string): Promise<OfficeRequest> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'submitted',
      priority: input.priority ?? 'medium',
      requestedBy: input.requestedBy ?? '',
      assignedTo: input.assignedTo ?? '',
      location: input.location ?? '',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'office_request',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['office_request', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toRequest(row as MemoryRow);
  },

  async getRequest(id: string): Promise<OfficeRequest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'office_request') return null;
    return toRequest(row as MemoryRow);
  },

  async listRequests(organizationId: string, opts: ListRequestsOpts = {}): Promise<OfficeRequest[]> {
    const where: Record<string, unknown> = { organizationId, type: 'office_request' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRequest);
  },

  async updateRequest(id: string, input: UpdateRequestInput): Promise<OfficeRequest | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.requestedBy !== undefined && { requestedBy: input.requestedBy }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['office_request', content.type, content.status, content.priority]) },
    }), null);
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  async deleteRequest(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assignRequest(id: string, _assignedBy: string): Promise<OfficeRequest | null> {
    return OfficeServicesService.updateRequest(id, { status: 'assigned' });
  },

  async startRequest(id: string, _startedBy: string): Promise<OfficeRequest | null> {
    return OfficeServicesService.updateRequest(id, { status: 'in_progress' });
  },

  async completeRequest(id: string, _completedBy: string): Promise<OfficeRequest | null> {
    return OfficeServicesService.updateRequest(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async holdRequest(id: string, _holdBy: string): Promise<OfficeRequest | null> {
    return OfficeServicesService.updateRequest(id, { status: 'on_hold' });
  },

  // ── Mail ──

  async createMail(organizationId: string, workspaceId: string, input: CreateMailInput, createdBy: string): Promise<MailRecord> {
    const content = {
      type: input.type,
      sender: input.sender ?? '',
      recipient: input.recipient ?? '',
      subject: input.subject ?? '',
      status: input.status ?? 'received',
      receivedDate: input.receivedDate ?? null,
      deliveredDate: input.deliveredDate ?? null,
      trackingNumber: input.trackingNumber ?? '',
      weight: input.weight ?? 0,
      postage: input.postage ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mail_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mail_record', content.type, content.status]),
        createdBy,
      },
    });
    return toMail(row as MemoryRow);
  },

  async getMail(id: string): Promise<MailRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mail_record') return null;
    return toMail(row as MemoryRow);
  },

  async listMail(organizationId: string, opts: ListMailOpts = {}): Promise<MailRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mail_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMail);
  },

  async updateMail(id: string, input: UpdateMailInput): Promise<MailRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.sender !== undefined && { sender: input.sender }),
      ...(input.recipient !== undefined && { recipient: input.recipient }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.receivedDate !== undefined && { receivedDate: input.receivedDate }),
      ...(input.deliveredDate !== undefined && { deliveredDate: input.deliveredDate }),
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.postage !== undefined && { postage: input.postage }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mail_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMail(row as MemoryRow);
  },

  async deleteMail(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async sortMail(id: string, _sortedBy: string): Promise<MailRecord | null> {
    return OfficeServicesService.updateMail(id, { status: 'sorted' });
  },

  async deliverMail(id: string, _deliveredBy: string): Promise<MailRecord | null> {
    return OfficeServicesService.updateMail(id, { status: 'delivered', deliveredDate: new Date().toISOString() });
  },

  async returnMail(id: string, _returnedBy: string): Promise<MailRecord | null> {
    return OfficeServicesService.updateMail(id, { status: 'returned' });
  },

  async forwardMail(id: string, _forwardedBy: string): Promise<MailRecord | null> {
    return OfficeServicesService.updateMail(id, { status: 'forwarded' });
  },

  async holdMail(id: string, _holdBy: string): Promise<MailRecord | null> {
    return OfficeServicesService.updateMail(id, { status: 'held' });
  },

  // ── Print Jobs ──

  async createPrintJob(organizationId: string, workspaceId: string, input: CreatePrintJobInput, createdBy: string): Promise<PrintJob> {
    const content = {
      type: input.type,
      title: input.title.trim(),
      description: input.description ?? '',
      status: input.status ?? 'queued',
      requestedBy: input.requestedBy ?? '',
      copies: input.copies ?? 1,
      color: input.color ?? false,
      doubleSided: input.doubleSided ?? false,
      paperSize: input.paperSize ?? '',
      binding: input.binding ?? '',
      cost: input.cost ?? 0,
      completedDate: input.completedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'print_job',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['print_job', content.type, content.status]),
        createdBy,
      },
    });
    return toPrintJob(row as MemoryRow);
  },

  async getPrintJob(id: string): Promise<PrintJob | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'print_job') return null;
    return toPrintJob(row as MemoryRow);
  },

  async listPrintJobs(organizationId: string, opts: ListPrintJobsOpts = {}): Promise<PrintJob[]> {
    const where: Record<string, unknown> = { organizationId, type: 'print_job' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPrintJob);
  },

  async updatePrintJob(id: string, input: UpdatePrintJobInput): Promise<PrintJob | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.requestedBy !== undefined && { requestedBy: input.requestedBy }),
      ...(input.copies !== undefined && { copies: input.copies }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.doubleSided !== undefined && { doubleSided: input.doubleSided }),
      ...(input.paperSize !== undefined && { paperSize: input.paperSize }),
      ...(input.binding !== undefined && { binding: input.binding }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['print_job', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPrintJob(row as MemoryRow);
  },

  async deletePrintJob(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startPrint(id: string, _startedBy: string): Promise<PrintJob | null> {
    return OfficeServicesService.updatePrintJob(id, { status: 'printing' });
  },

  async completePrint(id: string, _completedBy: string): Promise<PrintJob | null> {
    return OfficeServicesService.updatePrintJob(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async failPrint(id: string, _failedBy: string): Promise<PrintJob | null> {
    return OfficeServicesService.updatePrintJob(id, { status: 'failed' });
  },

  async reprint(id: string, _reprintedBy: string): Promise<PrintJob | null> {
    return OfficeServicesService.updatePrintJob(id, { status: 'reprinted' });
  },

  // ── Supply Orders ──

  async createSupplyOrder(organizationId: string, workspaceId: string, input: CreateSupplyOrderInput, createdBy: string): Promise<SupplyOrder> {
    const content = {
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'requested',
      items: input.items ?? [],
      requestedBy: input.requestedBy ?? '',
      approvedBy: input.approvedBy ?? '',
      supplier: input.supplier ?? '',
      totalCost: input.totalCost ?? 0,
      orderedDate: input.orderedDate ?? null,
      receivedDate: input.receivedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'supply_order',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['supply_order', content.type, content.status]),
        createdBy,
      },
    });
    return toSupplyOrder(row as MemoryRow);
  },

  async getSupplyOrder(id: string): Promise<SupplyOrder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'supply_order') return null;
    return toSupplyOrder(row as MemoryRow);
  },

  async listSupplyOrders(organizationId: string, opts: ListSupplyOrdersOpts = {}): Promise<SupplyOrder[]> {
    const where: Record<string, unknown> = { organizationId, type: 'supply_order' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSupplyOrder);
  },

  async updateSupplyOrder(id: string, input: UpdateSupplyOrderInput): Promise<SupplyOrder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.items !== undefined && { items: input.items }),
      ...(input.requestedBy !== undefined && { requestedBy: input.requestedBy }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.totalCost !== undefined && { totalCost: input.totalCost }),
      ...(input.orderedDate !== undefined && { orderedDate: input.orderedDate }),
      ...(input.receivedDate !== undefined && { receivedDate: input.receivedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['supply_order', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSupplyOrder(row as MemoryRow);
  },

  async deleteSupplyOrder(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveSupply(id: string, approvedBy: string): Promise<SupplyOrder | null> {
    return OfficeServicesService.updateSupplyOrder(id, { status: 'approved', approvedBy });
  },

  async orderSupply(id: string, _orderedBy: string): Promise<SupplyOrder | null> {
    return OfficeServicesService.updateSupplyOrder(id, { status: 'ordered', orderedDate: new Date().toISOString() });
  },

  async receiveSupply(id: string, _receivedBy: string): Promise<SupplyOrder | null> {
    return OfficeServicesService.updateSupplyOrder(id, { status: 'received', receivedDate: new Date().toISOString() });
  },

  async distributeSupply(id: string, _distributedBy: string): Promise<SupplyOrder | null> {
    return OfficeServicesService.updateSupplyOrder(id, { status: 'distributed' });
  },

  // ── Metrics & Stats ──

  async getOfficeServicesMetrics(organizationId: string): Promise<OfficeServicesMetrics> {
    const [requests, mail, printJobs, supplyOrders] = await Promise.all([
      OfficeServicesService.listRequests(organizationId),
      OfficeServicesService.listMail(organizationId),
      OfficeServicesService.listPrintJobs(organizationId),
      OfficeServicesService.listSupplyOrders(organizationId),
    ]);
    const openRequests = requests.filter((r) => r.status === 'submitted' || r.status === 'assigned' || r.status === 'in_progress' || r.status === 'on_hold').length;
    const urgentRequests = requests.filter((r) => r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled').length;
    const pendingMail = mail.filter((m) => m.status === 'received' || m.status === 'sorted' || m.status === 'held').length;
    const queuedPrintJobs = printJobs.filter((p) => p.status === 'queued' || p.status === 'printing').length;
    const pendingSupplyOrders = supplyOrders.filter((s) => s.status === 'requested' || s.status === 'approved' || s.status === 'ordered').length;
    return { openRequests, urgentRequests, pendingMail, queuedPrintJobs, pendingSupplyOrders };
  },

  async getOfficeServicesStats(organizationId: string): Promise<OfficeServicesStats> {
    const [requests, mail, printJobs, supplyOrders] = await Promise.all([
      OfficeServicesService.listRequests(organizationId),
      OfficeServicesService.listMail(organizationId),
      OfficeServicesService.listPrintJobs(organizationId),
      OfficeServicesService.listSupplyOrders(organizationId),
    ]);
    const byRequestType: Record<string, number> = {};
    const byRequestStatus: Record<string, number> = {};
    const byRequestPriority: Record<string, number> = {};
    const byMailType: Record<string, number> = {};
    const byMailStatus: Record<string, number> = {};
    const byPrintType: Record<string, number> = {};
    const byPrintStatus: Record<string, number> = {};
    const bySupplyType: Record<string, number> = {};
    const bySupplyStatus: Record<string, number> = {};
    for (const r of requests) {
      byRequestType[r.type] = (byRequestType[r.type] ?? 0) + 1;
      byRequestStatus[r.status] = (byRequestStatus[r.status] ?? 0) + 1;
      byRequestPriority[r.priority] = (byRequestPriority[r.priority] ?? 0) + 1;
    }
    for (const m of mail) {
      byMailType[m.type] = (byMailType[m.type] ?? 0) + 1;
      byMailStatus[m.status] = (byMailStatus[m.status] ?? 0) + 1;
    }
    for (const p of printJobs) {
      byPrintType[p.type] = (byPrintType[p.type] ?? 0) + 1;
      byPrintStatus[p.status] = (byPrintStatus[p.status] ?? 0) + 1;
    }
    for (const s of supplyOrders) {
      bySupplyType[s.type] = (bySupplyType[s.type] ?? 0) + 1;
      bySupplyStatus[s.status] = (bySupplyStatus[s.status] ?? 0) + 1;
    }
    return {
      requestCount: requests.length,
      mailCount: mail.length,
      printJobCount: printJobs.length,
      supplyOrderCount: supplyOrders.length,
      byRequestType, byRequestStatus, byRequestPriority,
      byMailType, byMailStatus,
      byPrintType, byPrintStatus,
      bySupplyType, bySupplyStatus,
    };
  },
};
