import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type OrderType = 'installation' | 'maintenance' | 'repair' | 'inspection' | 'upgrade' | 'decommission' | 'survey' | 'emergency';
export type OrderStatus = 'new' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent' | 'emergency';
export type TechnicianStatus = 'available' | 'busy' | 'off_duty' | 'on_break' | 'unavailable';
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
export type EquipmentType = 'tool' | 'vehicle' | 'device' | 'spare_part' | 'safety_gear' | 'diagnostic' | 'other';
export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'lost' | 'retired';

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

export interface ServiceOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: OrderType;
  description: string;
  customerId: string | null;
  customerName: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  priority: OrderPriority;
  status: OrderStatus;
  scheduledDate: Date | null;
  completedDate: Date | null;
  estimatedDuration: number;
  actualDuration: number;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Technician {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  certifications: string[];
  status: TechnicianStatus;
  zone: string;
  availability: string;
  rating: number;
  completedJobs: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAssignment {
  id: string;
  organizationId: string;
  workspaceId: string;
  orderId: string;
  technicianId: string;
  status: AssignmentStatus;
  assignedDate: Date | null;
  acceptedDate: Date | null;
  startedDate: Date | null;
  completedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceEquipment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EquipmentType;
  description: string;
  status: EquipmentStatus;
  serialNumber: string;
  assignedTo: string;
  location: string;
  purchaseDate: Date | null;
  lastMaintenance: Date | null;
  nextMaintenance: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldServiceMetrics {
  openOrders: number;
  completedOrders: number;
  availableTechnicians: number;
  activeAssignments: number;
  equipmentUtilization: number;
}

export interface FieldServiceStats {
  orderCount: number;
  technicianCount: number;
  assignmentCount: number;
  equipmentCount: number;
  byOrderType: Record<string, number>;
  byOrderStatus: Record<string, number>;
  byOrderPriority: Record<string, number>;
  byTechnicianStatus: Record<string, number>;
  byAssignmentStatus: Record<string, number>;
  byEquipmentType: Record<string, number>;
  byEquipmentStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateOrderInput {
  title: string;
  type: OrderType;
  description?: string;
  customerId?: string;
  customerName?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  priority?: OrderPriority;
  status?: OrderStatus;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  cost?: number;
  notes?: string;
}

export interface UpdateOrderInput {
  title?: string;
  type?: OrderType;
  description?: string;
  customerId?: string;
  customerName?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  priority?: OrderPriority;
  status?: OrderStatus;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  cost?: number;
  notes?: string;
}

export interface ListOrdersOpts {
  type?: OrderType;
  status?: OrderStatus;
  priority?: OrderPriority;
}

export interface CreateTechnicianInput {
  name: string;
  email?: string;
  phone?: string;
  skills?: string[];
  certifications?: string[];
  status?: TechnicianStatus;
  zone?: string;
  availability?: string;
  rating?: number;
  completedJobs?: number;
  notes?: string;
}

export interface UpdateTechnicianInput {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  certifications?: string[];
  status?: TechnicianStatus;
  zone?: string;
  availability?: string;
  rating?: number;
  completedJobs?: number;
  notes?: string;
}

export interface ListTechniciansOpts {
  status?: TechnicianStatus;
  zone?: string;
}

export interface CreateAssignmentInput {
  orderId: string;
  technicianId: string;
  status?: AssignmentStatus;
  assignedDate?: string;
  acceptedDate?: string;
  startedDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface UpdateAssignmentInput {
  orderId?: string;
  technicianId?: string;
  status?: AssignmentStatus;
  assignedDate?: string;
  acceptedDate?: string;
  startedDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface ListAssignmentsOpts {
  orderId?: string;
  technicianId?: string;
  status?: AssignmentStatus;
}

export interface CreateEquipmentInput {
  name: string;
  type: EquipmentType;
  description?: string;
  status?: EquipmentStatus;
  serialNumber?: string;
  assignedTo?: string;
  location?: string;
  purchaseDate?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
}

export interface UpdateEquipmentInput {
  name?: string;
  type?: EquipmentType;
  description?: string;
  status?: EquipmentStatus;
  serialNumber?: string;
  assignedTo?: string;
  location?: string;
  purchaseDate?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
}

export interface ListEquipmentOpts {
  type?: EquipmentType;
  status?: EquipmentStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toOrder(row: MemoryRow): ServiceOrder {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as OrderType) ?? 'repair',
    description: (c.description as string) ?? '',
    customerId: (c.customerId as string) ?? null,
    customerName: (c.customerName as string) ?? '',
    address: (c.address as string) ?? '',
    contactPhone: (c.contactPhone as string) ?? '',
    contactEmail: (c.contactEmail as string) ?? '',
    priority: (c.priority as OrderPriority) ?? 'medium',
    status: (c.status as OrderStatus) ?? 'new',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    estimatedDuration: (c.estimatedDuration as number) ?? 0,
    actualDuration: (c.actualDuration as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTechnician(row: MemoryRow): Technician {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    skills: (c.skills as string[]) ?? [],
    certifications: (c.certifications as string[]) ?? [],
    status: (c.status as TechnicianStatus) ?? 'available',
    zone: (c.zone as string) ?? '',
    availability: (c.availability as string) ?? '',
    rating: (c.rating as number) ?? 0,
    completedJobs: (c.completedJobs as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAssignment(row: MemoryRow): ServiceAssignment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    orderId: (c.orderId as string) ?? '',
    technicianId: (c.technicianId as string) ?? '',
    status: (c.status as AssignmentStatus) ?? 'assigned',
    assignedDate: c.assignedDate ? new Date(c.assignedDate as string) : null,
    acceptedDate: c.acceptedDate ? new Date(c.acceptedDate as string) : null,
    startedDate: c.startedDate ? new Date(c.startedDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEquipment(row: MemoryRow): ServiceEquipment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EquipmentType) ?? 'tool',
    description: (c.description as string) ?? '',
    status: (c.status as EquipmentStatus) ?? 'available',
    serialNumber: (c.serialNumber as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    location: (c.location as string) ?? '',
    purchaseDate: c.purchaseDate ? new Date(c.purchaseDate as string) : null,
    lastMaintenance: c.lastMaintenance ? new Date(c.lastMaintenance as string) : null,
    nextMaintenance: c.nextMaintenance ? new Date(c.nextMaintenance as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const FieldServiceService = {
  // ── Orders ──

  async createOrder(organizationId: string, workspaceId: string, input: CreateOrderInput, createdBy: string): Promise<ServiceOrder> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? '',
      address: input.address ?? '',
      contactPhone: input.contactPhone ?? '',
      contactEmail: input.contactEmail ?? '',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'new',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      estimatedDuration: input.estimatedDuration ?? 0,
      actualDuration: input.actualDuration ?? 0,
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'service_order',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.customerId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['service_order', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toOrder(row as MemoryRow);
  },

  async getOrder(id: string): Promise<ServiceOrder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'service_order') return null;
    return toOrder(row as MemoryRow);
  },

  async listOrders(organizationId: string, opts: ListOrdersOpts = {}): Promise<ServiceOrder[]> {
    const where: Record<string, unknown> = { organizationId, type: 'service_order' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOrder);
  },

  async updateOrder(id: string, input: UpdateOrderInput): Promise<ServiceOrder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const title = input.title !== undefined ? input.title.trim() : (c.title as string);
    const type = input.type !== undefined ? input.type : (c.type as OrderType);
    const status = input.status !== undefined ? input.status : (c.status as OrderStatus);
    const priority = input.priority !== undefined ? input.priority : (c.priority as OrderPriority);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
      ...(input.customerName !== undefined && { customerName: input.customerName }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.estimatedDuration !== undefined && { estimatedDuration: input.estimatedDuration }),
      ...(input.actualDuration !== undefined && { actualDuration: input.actualDuration }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['service_order', type, status, priority]) },
    }), null);
    if (!row) return null;
    return toOrder(row as MemoryRow);
  },

  async deleteOrder(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assignOrder(id: string, _assignedBy: string): Promise<ServiceOrder | null> {
    return FieldServiceService.updateOrder(id, { status: 'assigned' });
  },

  async scheduleOrder(id: string, scheduledDate: string, _scheduledBy: string): Promise<ServiceOrder | null> {
    return FieldServiceService.updateOrder(id, { status: 'scheduled', scheduledDate });
  },

  async startOrder(id: string, _startedBy: string): Promise<ServiceOrder | null> {
    return FieldServiceService.updateOrder(id, { status: 'in_progress' });
  },

  async completeOrder(id: string, _completedBy: string): Promise<ServiceOrder | null> {
    return FieldServiceService.updateOrder(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  // ── Technicians ──

  async createTechnician(organizationId: string, workspaceId: string, input: CreateTechnicianInput, createdBy: string): Promise<Technician> {
    const content = {
      name: input.name.trim(),
      email: input.email ?? '',
      phone: input.phone ?? '',
      skills: input.skills ?? [],
      certifications: input.certifications ?? [],
      status: input.status ?? 'available',
      zone: input.zone ?? '',
      availability: input.availability ?? '',
      rating: input.rating ?? 0,
      completedJobs: input.completedJobs ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'technician',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['technician', content.status, content.zone]),
        createdBy,
      },
    });
    return toTechnician(row as MemoryRow);
  },

  async getTechnician(id: string): Promise<Technician | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'technician') return null;
    return toTechnician(row as MemoryRow);
  },

  async listTechnicians(organizationId: string, opts: ListTechniciansOpts = {}): Promise<Technician[]> {
    const where: Record<string, unknown> = { organizationId, type: 'technician' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.zone) conditions.push({ content: { contains: `"zone":"${opts.zone}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTechnician);
  },

  async updateTechnician(id: string, input: UpdateTechnicianInput): Promise<Technician | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as TechnicianStatus);
    const zone = input.zone !== undefined ? input.zone : (c.zone as string);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.skills !== undefined && { skills: input.skills }),
      ...(input.certifications !== undefined && { certifications: input.certifications }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.zone !== undefined && { zone: input.zone }),
      ...(input.availability !== undefined && { availability: input.availability }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.completedJobs !== undefined && { completedJobs: input.completedJobs }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['technician', status, zone]) },
    }), null);
    if (!row) return null;
    return toTechnician(row as MemoryRow);
  },

  async deleteTechnician(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Assignments ──

  async createAssignment(organizationId: string, workspaceId: string, input: CreateAssignmentInput, createdBy: string): Promise<ServiceAssignment> {
    const content = {
      orderId: input.orderId,
      technicianId: input.technicianId,
      status: input.status ?? 'assigned',
      assignedDate: input.assignedDate ?? null,
      acceptedDate: input.acceptedDate ?? null,
      startedDate: input.startedDate ?? null,
      completedDate: input.completedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'service_assignment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.orderId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['service_assignment', content.status, content.orderId, content.technicianId]),
        createdBy,
      },
    });
    return toAssignment(row as MemoryRow);
  },

  async getAssignment(id: string): Promise<ServiceAssignment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'service_assignment') return null;
    return toAssignment(row as MemoryRow);
  },

  async listAssignments(organizationId: string, opts: ListAssignmentsOpts = {}): Promise<ServiceAssignment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'service_assignment' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.orderId) conditions.push({ content: { contains: `"orderId":"${opts.orderId}"` } });
    if (opts.technicianId) conditions.push({ content: { contains: `"technicianId":"${opts.technicianId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAssignment);
  },

  async updateAssignment(id: string, input: UpdateAssignmentInput): Promise<ServiceAssignment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as AssignmentStatus);
    const orderId = input.orderId !== undefined ? input.orderId : (c.orderId as string);
    const technicianId = input.technicianId !== undefined ? input.technicianId : (c.technicianId as string);
    const content = {
      ...c,
      ...(input.orderId !== undefined && { orderId: input.orderId }),
      ...(input.technicianId !== undefined && { technicianId: input.technicianId }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.assignedDate !== undefined && { assignedDate: input.assignedDate }),
      ...(input.acceptedDate !== undefined && { acceptedDate: input.acceptedDate }),
      ...(input.startedDate !== undefined && { startedDate: input.startedDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['service_assignment', status, orderId, technicianId]) },
    }), null);
    if (!row) return null;
    return toAssignment(row as MemoryRow);
  },

  async deleteAssignment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async acceptAssignment(id: string, _acceptedBy: string): Promise<ServiceAssignment | null> {
    return FieldServiceService.updateAssignment(id, { status: 'accepted', acceptedDate: new Date().toISOString() });
  },

  async declineAssignment(id: string, _declinedBy: string): Promise<ServiceAssignment | null> {
    return FieldServiceService.updateAssignment(id, { status: 'declined' });
  },

  async startAssignment(id: string, _startedBy: string): Promise<ServiceAssignment | null> {
    return FieldServiceService.updateAssignment(id, { status: 'in_progress', startedDate: new Date().toISOString() });
  },

  async completeAssignment(id: string, _completedBy: string): Promise<ServiceAssignment | null> {
    return FieldServiceService.updateAssignment(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  // ── Equipment ──

  async createEquipment(organizationId: string, workspaceId: string, input: CreateEquipmentInput, createdBy: string): Promise<ServiceEquipment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'available',
      serialNumber: input.serialNumber ?? '',
      assignedTo: input.assignedTo ?? '',
      location: input.location ?? '',
      purchaseDate: input.purchaseDate ?? null,
      lastMaintenance: input.lastMaintenance ?? null,
      nextMaintenance: input.nextMaintenance ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'service_equipment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['service_equipment', content.type, content.status]),
        createdBy,
      },
    });
    return toEquipment(row as MemoryRow);
  },

  async getEquipment(id: string): Promise<ServiceEquipment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'service_equipment') return null;
    return toEquipment(row as MemoryRow);
  },

  async listEquipment(organizationId: string, opts: ListEquipmentOpts = {}): Promise<ServiceEquipment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'service_equipment' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEquipment);
  },

  async updateEquipment(id: string, input: UpdateEquipmentInput): Promise<ServiceEquipment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as EquipmentType);
    const status = input.status !== undefined ? input.status : (c.status as EquipmentStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.purchaseDate !== undefined && { purchaseDate: input.purchaseDate }),
      ...(input.lastMaintenance !== undefined && { lastMaintenance: input.lastMaintenance }),
      ...(input.nextMaintenance !== undefined && { nextMaintenance: input.nextMaintenance }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['service_equipment', type, status]) },
    }), null);
    if (!row) return null;
    return toEquipment(row as MemoryRow);
  },

  async deleteEquipment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getFieldServiceMetrics(organizationId: string): Promise<FieldServiceMetrics> {
    const [orders, technicians, assignments, equipment] = await Promise.all([
      FieldServiceService.listOrders(organizationId),
      FieldServiceService.listTechnicians(organizationId),
      FieldServiceService.listAssignments(organizationId),
      FieldServiceService.listEquipment(organizationId),
    ]);
    const openOrders = orders.filter((o) => o.status === 'new' || o.status === 'assigned' || o.status === 'scheduled' || o.status === 'in_progress').length;
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const availableTechnicians = technicians.filter((t) => t.status === 'available').length;
    const activeAssignments = assignments.filter((a) => a.status === 'assigned' || a.status === 'accepted' || a.status === 'in_progress').length;
    const inUseEquipment = equipment.filter((e) => e.status === 'in_use').length;
    const equipmentUtilization = equipment.length > 0 ? Math.round((inUseEquipment / equipment.length) * 100) : 0;
    return { openOrders, completedOrders, availableTechnicians, activeAssignments, equipmentUtilization };
  },

  async getFieldServiceStats(organizationId: string): Promise<FieldServiceStats> {
    const [orders, technicians, assignments, equipment] = await Promise.all([
      FieldServiceService.listOrders(organizationId),
      FieldServiceService.listTechnicians(organizationId),
      FieldServiceService.listAssignments(organizationId),
      FieldServiceService.listEquipment(organizationId),
    ]);
    const byOrderType: Record<string, number> = {};
    const byOrderStatus: Record<string, number> = {};
    const byOrderPriority: Record<string, number> = {};
    const byTechnicianStatus: Record<string, number> = {};
    const byAssignmentStatus: Record<string, number> = {};
    const byEquipmentType: Record<string, number> = {};
    const byEquipmentStatus: Record<string, number> = {};
    for (const o of orders) {
      byOrderType[o.type] = (byOrderType[o.type] ?? 0) + 1;
      byOrderStatus[o.status] = (byOrderStatus[o.status] ?? 0) + 1;
      byOrderPriority[o.priority] = (byOrderPriority[o.priority] ?? 0) + 1;
    }
    for (const t of technicians) { byTechnicianStatus[t.status] = (byTechnicianStatus[t.status] ?? 0) + 1; }
    for (const a of assignments) { byAssignmentStatus[a.status] = (byAssignmentStatus[a.status] ?? 0) + 1; }
    for (const e of equipment) {
      byEquipmentType[e.type] = (byEquipmentType[e.type] ?? 0) + 1;
      byEquipmentStatus[e.status] = (byEquipmentStatus[e.status] ?? 0) + 1;
    }
    return {
      orderCount: orders.length,
      technicianCount: technicians.length,
      assignmentCount: assignments.length,
      equipmentCount: equipment.length,
      byOrderType, byOrderStatus, byOrderPriority,
      byTechnicianStatus, byAssignmentStatus,
      byEquipmentType, byEquipmentStatus,
    };
  },
};
