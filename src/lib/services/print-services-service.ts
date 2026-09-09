import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type JobType = 'document' | 'photo' | 'poster' | 'brochure' | 'business_card' | 'booklet' | 'large_format' | 'binding' | 'scan' | 'copy';
export type JobStatus = 'submitted' | 'processing' | 'completed' | 'cancelled' | 'reprinted' | 'failed';
export type PrinterType = 'laser' | 'inkjet' | 'thermal' | 'dot_matrix' | 'plotter' | '3d' | 'multifunction' | 'digital';
export type PrinterStatus = 'active' | 'maintained' | 'decommissioned' | 'offline' | 'error';
export type SupplyType = 'toner' | 'ink' | 'paper' | 'binding' | 'maintenance_kit' | 'fuser' | 'drum' | 'staples';
export type SupplyStatus = 'in_stock' | 'low' | 'out' | 'reordered' | 'received' | 'depleted';
export type MaintenanceType = 'preventive' | 'corrective' | 'emergency' | 'calibration' | 'cleaning' | 'upgrade';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

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

export interface PrintJob {
  id: string;
  organizationId: string;
  workspaceId: string;
  printerId: string | null;
  type: JobType;
  description: string;
  status: JobStatus;
  requester: string;
  department: string;
  copies: number;
  colorMode: string;
  duplex: boolean;
  paperSize: string;
  submittedDate: Date | null;
  completedDate: Date | null;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Printer {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PrinterType;
  description: string;
  status: PrinterStatus;
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  colorCapable: boolean;
  duplexCapable: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintSupply {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SupplyType;
  description: string;
  status: SupplyStatus;
  quantity: number;
  unit: string;
  reorderLevel: number;
  cost: number;
  supplier: string;
  compatiblePrinters: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintMaintenance {
  id: string;
  organizationId: string;
  workspaceId: string;
  printerId: string | null;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  scheduledDate: Date | null;
  startedDate: Date | null;
  completedDate: Date | null;
  technician: string;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintServicesMetrics {
  activePrinters: number;
  pendingJobs: number;
  completedJobs: number;
  lowSupplies: number;
  pendingMaintenance: number;
}

export interface PrintServicesStats {
  jobCount: number;
  printerCount: number;
  supplyCount: number;
  maintenanceCount: number;
  byJobType: Record<string, number>;
  byJobStatus: Record<string, number>;
  byPrinterType: Record<string, number>;
  byPrinterStatus: Record<string, number>;
  bySupplyType: Record<string, number>;
  bySupplyStatus: Record<string, number>;
  byMaintenanceType: Record<string, number>;
  byMaintenanceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateJobInput {
  printerId?: string;
  type: JobType;
  description?: string;
  status?: JobStatus;
  requester?: string;
  department?: string;
  copies?: number;
  colorMode?: string;
  duplex?: boolean;
  paperSize?: string;
  submittedDate?: string;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateJobInput {
  printerId?: string;
  type?: JobType;
  description?: string;
  status?: JobStatus;
  requester?: string;
  department?: string;
  copies?: number;
  colorMode?: string;
  duplex?: boolean;
  paperSize?: string;
  submittedDate?: string;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface ListJobsOpts {
  printerId?: string;
  type?: JobType;
  status?: JobStatus;
}

export interface CreatePrinterInput {
  name: string;
  type: PrinterType;
  description?: string;
  status?: PrinterStatus;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  colorCapable?: boolean;
  duplexCapable?: boolean;
  notes?: string;
}

export interface UpdatePrinterInput {
  name?: string;
  type?: PrinterType;
  description?: string;
  status?: PrinterStatus;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  colorCapable?: boolean;
  duplexCapable?: boolean;
  notes?: string;
}

export interface ListPrintersOpts {
  type?: PrinterType;
  status?: PrinterStatus;
}

export interface CreateSupplyInput {
  name: string;
  type: SupplyType;
  description?: string;
  status?: SupplyStatus;
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  cost?: number;
  supplier?: string;
  compatiblePrinters?: string[];
  notes?: string;
}

export interface UpdateSupplyInput {
  name?: string;
  type?: SupplyType;
  description?: string;
  status?: SupplyStatus;
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  cost?: number;
  supplier?: string;
  compatiblePrinters?: string[];
  notes?: string;
}

export interface ListSuppliesOpts {
  type?: SupplyType;
  status?: SupplyStatus;
}

export interface CreateMaintenanceInput {
  printerId?: string;
  type: MaintenanceType;
  description?: string;
  status?: MaintenanceStatus;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  technician?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  printerId?: string;
  type?: MaintenanceType;
  description?: string;
  status?: MaintenanceStatus;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  technician?: string;
  cost?: number;
  notes?: string;
}

export interface ListMaintenanceOpts {
  printerId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toJob(row: MemoryRow): PrintJob {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    printerId: (c.printerId as string) ?? null,
    type: (c.type as JobType) ?? 'document',
    description: (c.description as string) ?? '',
    status: (c.status as JobStatus) ?? 'submitted',
    requester: (c.requester as string) ?? '',
    department: (c.department as string) ?? '',
    copies: (c.copies as number) ?? 1,
    colorMode: (c.colorMode as string) ?? 'bw',
    duplex: (c.duplex as boolean) ?? false,
    paperSize: (c.paperSize as string) ?? 'A4',
    submittedDate: c.submittedDate ? new Date(c.submittedDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPrinter(row: MemoryRow): Printer {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PrinterType) ?? 'laser',
    description: (c.description as string) ?? '',
    status: (c.status as PrinterStatus) ?? 'active',
    location: (c.location as string) ?? '',
    manufacturer: (c.manufacturer as string) ?? '',
    model: (c.model as string) ?? '',
    serialNumber: (c.serialNumber as string) ?? '',
    ipAddress: (c.ipAddress as string) ?? '',
    colorCapable: (c.colorCapable as boolean) ?? false,
    duplexCapable: (c.duplexCapable as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSupply(row: MemoryRow): PrintSupply {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SupplyType) ?? 'toner',
    description: (c.description as string) ?? '',
    status: (c.status as SupplyStatus) ?? 'in_stock',
    quantity: (c.quantity as number) ?? 0,
    unit: (c.unit as string) ?? '',
    reorderLevel: (c.reorderLevel as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    supplier: (c.supplier as string) ?? '',
    compatiblePrinters: (c.compatiblePrinters as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMaintenance(row: MemoryRow): PrintMaintenance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    printerId: (c.printerId as string) ?? null,
    type: (c.type as MaintenanceType) ?? 'preventive',
    description: (c.description as string) ?? '',
    status: (c.status as MaintenanceStatus) ?? 'scheduled',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    startedDate: c.startedDate ? new Date(c.startedDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    technician: (c.technician as string) ?? '',
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PrintServicesService = {
  // ── Jobs ──

  async createJob(organizationId: string, workspaceId: string, input: CreateJobInput, createdBy: string): Promise<PrintJob> {
    const content = {
      printerId: input.printerId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'submitted',
      requester: input.requester ?? '',
      department: input.department ?? '',
      copies: input.copies ?? 1,
      colorMode: input.colorMode ?? 'bw',
      duplex: input.duplex ?? false,
      paperSize: input.paperSize ?? 'A4',
      submittedDate: input.submittedDate ?? null,
      completedDate: input.completedDate ?? null,
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'print_job',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.printerId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['print_job', content.type, content.status]),
        createdBy,
      },
    });
    return toJob(row as MemoryRow);
  },

  async getJob(id: string): Promise<PrintJob | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'print_job') return null;
    return toJob(row as MemoryRow);
  },

  async listJobs(organizationId: string, opts: ListJobsOpts = {}): Promise<PrintJob[]> {
    const where: Record<string, unknown> = { organizationId, type: 'print_job' };
    const conditions: unknown[] = [];
    if (opts.printerId) conditions.push({ content: { contains: `"printerId":"${opts.printerId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toJob);
  },

  async updateJob(id: string, input: UpdateJobInput): Promise<PrintJob | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.printerId !== undefined && { printerId: input.printerId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.requester !== undefined && { requester: input.requester }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.copies !== undefined && { copies: input.copies }),
      ...(input.colorMode !== undefined && { colorMode: input.colorMode }),
      ...(input.duplex !== undefined && { duplex: input.duplex }),
      ...(input.paperSize !== undefined && { paperSize: input.paperSize }),
      ...(input.submittedDate !== undefined && { submittedDate: input.submittedDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['print_job', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toJob(row as MemoryRow);
  },

  async deleteJob(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitJob(id: string, _submittedBy: string): Promise<PrintJob | null> {
    return PrintServicesService.updateJob(id, { status: 'submitted', submittedDate: new Date().toISOString() });
  },

  async processJob(id: string, _processedBy: string): Promise<PrintJob | null> {
    return PrintServicesService.updateJob(id, { status: 'processing' });
  },

  async completeJob(id: string, _completedBy: string): Promise<PrintJob | null> {
    return PrintServicesService.updateJob(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async cancelJob(id: string, _cancelledBy: string): Promise<PrintJob | null> {
    return PrintServicesService.updateJob(id, { status: 'cancelled' });
  },

  async reprintJob(id: string, _reprintedBy: string): Promise<PrintJob | null> {
    return PrintServicesService.updateJob(id, { status: 'reprinted', submittedDate: new Date().toISOString() });
  },

  // ── Printers ──

  async createPrinter(organizationId: string, workspaceId: string, input: CreatePrinterInput, createdBy: string): Promise<Printer> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      manufacturer: input.manufacturer ?? '',
      model: input.model ?? '',
      serialNumber: input.serialNumber ?? '',
      ipAddress: input.ipAddress ?? '',
      colorCapable: input.colorCapable ?? false,
      duplexCapable: input.duplexCapable ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'printer',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['printer', content.type, content.status]),
        createdBy,
      },
    });
    return toPrinter(row as MemoryRow);
  },

  async getPrinter(id: string): Promise<Printer | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'printer') return null;
    return toPrinter(row as MemoryRow);
  },

  async listPrinters(organizationId: string, opts: ListPrintersOpts = {}): Promise<Printer[]> {
    const where: Record<string, unknown> = { organizationId, type: 'printer' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPrinter);
  },

  async updatePrinter(id: string, input: UpdatePrinterInput): Promise<Printer | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.manufacturer !== undefined && { manufacturer: input.manufacturer }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
      ...(input.ipAddress !== undefined && { ipAddress: input.ipAddress }),
      ...(input.colorCapable !== undefined && { colorCapable: input.colorCapable }),
      ...(input.duplexCapable !== undefined && { duplexCapable: input.duplexCapable }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['printer', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPrinter(row as MemoryRow);
  },

  async deletePrinter(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePrinter(id: string, _activatedBy: string): Promise<Printer | null> {
    return PrintServicesService.updatePrinter(id, { status: 'active' });
  },

  async maintainPrinter(id: string, _maintainedBy: string): Promise<Printer | null> {
    return PrintServicesService.updatePrinter(id, { status: 'maintained' });
  },

  async decommissionPrinter(id: string, _decommissionedBy: string): Promise<Printer | null> {
    return PrintServicesService.updatePrinter(id, { status: 'decommissioned' });
  },

  // ── Supplies ──

  async createSupply(organizationId: string, workspaceId: string, input: CreateSupplyInput, createdBy: string): Promise<PrintSupply> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'in_stock',
      quantity: input.quantity ?? 0,
      unit: input.unit ?? '',
      reorderLevel: input.reorderLevel ?? 0,
      cost: input.cost ?? 0,
      supplier: input.supplier ?? '',
      compatiblePrinters: input.compatiblePrinters ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'print_supply',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['print_supply', content.type, content.status]),
        createdBy,
      },
    });
    return toSupply(row as MemoryRow);
  },

  async getSupply(id: string): Promise<PrintSupply | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'print_supply') return null;
    return toSupply(row as MemoryRow);
  },

  async listSupplies(organizationId: string, opts: ListSuppliesOpts = {}): Promise<PrintSupply[]> {
    const where: Record<string, unknown> = { organizationId, type: 'print_supply' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSupply);
  },

  async updateSupply(id: string, input: UpdateSupplyInput): Promise<PrintSupply | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.reorderLevel !== undefined && { reorderLevel: input.reorderLevel }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.compatiblePrinters !== undefined && { compatiblePrinters: input.compatiblePrinters }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['print_supply', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSupply(row as MemoryRow);
  },

  async deleteSupply(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reorderSupply(id: string, _reorderedBy: string): Promise<PrintSupply | null> {
    return PrintServicesService.updateSupply(id, { status: 'reordered' });
  },

  async receiveSupply(id: string, _receivedBy: string): Promise<PrintSupply | null> {
    return PrintServicesService.updateSupply(id, { status: 'received' });
  },

  async depleteSupply(id: string, _depletedBy: string): Promise<PrintSupply | null> {
    return PrintServicesService.updateSupply(id, { status: 'depleted' });
  },

  // ── Maintenance ──

  async createMaintenance(organizationId: string, workspaceId: string, input: CreateMaintenanceInput, createdBy: string): Promise<PrintMaintenance> {
    const content = {
      printerId: input.printerId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      scheduledDate: input.scheduledDate ?? null,
      startedDate: input.startedDate ?? null,
      completedDate: input.completedDate ?? null,
      technician: input.technician ?? '',
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'print_maintenance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.printerId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['print_maintenance', content.type, content.status]),
        createdBy,
      },
    });
    return toMaintenance(row as MemoryRow);
  },

  async getMaintenance(id: string): Promise<PrintMaintenance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'print_maintenance') return null;
    return toMaintenance(row as MemoryRow);
  },

  async listMaintenance(organizationId: string, opts: ListMaintenanceOpts = {}): Promise<PrintMaintenance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'print_maintenance' };
    const conditions: unknown[] = [];
    if (opts.printerId) conditions.push({ content: { contains: `"printerId":"${opts.printerId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMaintenance);
  },

  async updateMaintenance(id: string, input: UpdateMaintenanceInput): Promise<PrintMaintenance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.printerId !== undefined && { printerId: input.printerId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.startedDate !== undefined && { startedDate: input.startedDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.technician !== undefined && { technician: input.technician }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['print_maintenance', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  async deleteMaintenance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleMaintenance(id: string, _scheduledBy: string): Promise<PrintMaintenance | null> {
    return PrintServicesService.updateMaintenance(id, { status: 'scheduled' });
  },

  async startMaintenance(id: string, _startedBy: string): Promise<PrintMaintenance | null> {
    return PrintServicesService.updateMaintenance(id, { status: 'in_progress', startedDate: new Date().toISOString() });
  },

  async completeMaintenance(id: string, _completedBy: string): Promise<PrintMaintenance | null> {
    return PrintServicesService.updateMaintenance(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async cancelMaintenance(id: string, _cancelledBy: string): Promise<PrintMaintenance | null> {
    return PrintServicesService.updateMaintenance(id, { status: 'cancelled' });
  },

  // ── Metrics & Stats ──

  async getPrintServicesMetrics(organizationId: string): Promise<PrintServicesMetrics> {
    const [printers, jobs, supplies, maintenance] = await Promise.all([
      PrintServicesService.listPrinters(organizationId),
      PrintServicesService.listJobs(organizationId),
      PrintServicesService.listSupplies(organizationId),
      PrintServicesService.listMaintenance(organizationId),
    ]);
    return {
      activePrinters: printers.filter((p) => p.status === 'active').length,
      pendingJobs: jobs.filter((j) => j.status === 'submitted' || j.status === 'processing').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      lowSupplies: supplies.filter((s) => s.status === 'low').length,
      pendingMaintenance: maintenance.filter((m) => m.status === 'scheduled' || m.status === 'in_progress').length,
    };
  },

  async getPrintServicesStats(organizationId: string): Promise<PrintServicesStats> {
    const [jobs, printers, supplies, maintenance] = await Promise.all([
      PrintServicesService.listJobs(organizationId),
      PrintServicesService.listPrinters(organizationId),
      PrintServicesService.listSupplies(organizationId),
      PrintServicesService.listMaintenance(organizationId),
    ]);
    const byJobType: Record<string, number> = {};
    const byJobStatus: Record<string, number> = {};
    const byPrinterType: Record<string, number> = {};
    const byPrinterStatus: Record<string, number> = {};
    const bySupplyType: Record<string, number> = {};
    const bySupplyStatus: Record<string, number> = {};
    const byMaintenanceType: Record<string, number> = {};
    const byMaintenanceStatus: Record<string, number> = {};
    for (const j of jobs) { byJobType[j.type] = (byJobType[j.type] ?? 0) + 1; byJobStatus[j.status] = (byJobStatus[j.status] ?? 0) + 1; }
    for (const p of printers) { byPrinterType[p.type] = (byPrinterType[p.type] ?? 0) + 1; byPrinterStatus[p.status] = (byPrinterStatus[p.status] ?? 0) + 1; }
    for (const s of supplies) { bySupplyType[s.type] = (bySupplyType[s.type] ?? 0) + 1; bySupplyStatus[s.status] = (bySupplyStatus[s.status] ?? 0) + 1; }
    for (const m of maintenance) { byMaintenanceType[m.type] = (byMaintenanceType[m.type] ?? 0) + 1; byMaintenanceStatus[m.status] = (byMaintenanceStatus[m.status] ?? 0) + 1; }
    return {
      jobCount: jobs.length,
      printerCount: printers.length,
      supplyCount: supplies.length,
      maintenanceCount: maintenance.length,
      byJobType, byJobStatus, byPrinterType, byPrinterStatus, bySupplyType, bySupplyStatus, byMaintenanceType, byMaintenanceStatus,
    };
  },
};
