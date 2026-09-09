import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PropertyType = 'apartment' | 'house' | 'condo' | 'studio' | 'townhouse' | 'serviced_apartment' | 'guest_house' | 'hotel_room' | 'corporate_suite';
export type PropertyStatus = 'available' | 'occupied' | 'under_maintenance' | 'reserved' | 'off_market' | 'cleaning';
export type BookingType = 'short_term' | 'long_term' | 'temporary' | 'project' | 'relocation' | 'executive' | 'intern';
export type BookingStatus = 'requested' | 'approved' | 'active' | 'completed' | 'cancelled' | 'checked_out' | 'no_show';
export type MaintenanceType = 'routine' | 'repair' | 'cleaning' | 'inspection' | 'renovation' | 'emergency' | 'landscaping' | 'pest_control';
export type MaintenanceStatus = 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TenantType = 'employee' | 'executive' | 'contractor' | 'intern' | 'consultant' | 'family' | 'guest';
export type TenantStatus = 'active' | 'checked_out' | 'pending' | 'inactive';

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

export interface HousingProperty {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PropertyType;
  description: string;
  status: PropertyStatus;
  address: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  furnished: boolean;
  amenities: string[];
  monthlyRate: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HousingBooking {
  id: string;
  organizationId: string;
  workspaceId: string;
  propertyId: string;
  tenantId: string | null;
  tenantName: string;
  type: BookingType;
  description: string;
  status: BookingStatus;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  rate: number;
  purpose: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HousingMaintenance {
  id: string;
  organizationId: string;
  workspaceId: string;
  propertyId: string;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  priority: string;
  requestedDate: Date | null;
  scheduledDate: Date | null;
  completedDate: Date | null;
  assignedTo: string;
  cost: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HousingTenant {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: TenantType;
  description: string;
  status: TenantStatus;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  preferences: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateHousingMetrics {
  availableProperties: number;
  occupiedProperties: number;
  activeBookings: number;
  pendingMaintenance: number;
  activeTenants: number;
}

export interface CorporateHousingStats {
  propertyCount: number;
  bookingCount: number;
  maintenanceCount: number;
  tenantCount: number;
  byPropertyType: Record<string, number>;
  byPropertyStatus: Record<string, number>;
  byBookingType: Record<string, number>;
  byBookingStatus: Record<string, number>;
  byMaintenanceType: Record<string, number>;
  byMaintenanceStatus: Record<string, number>;
  byTenantType: Record<string, number>;
  byTenantStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePropertyInput {
  name: string;
  type: PropertyType;
  description?: string;
  status?: PropertyStatus;
  address?: string;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  furnished?: boolean;
  amenities?: string[];
  monthlyRate?: number;
  notes?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  type?: PropertyType;
  description?: string;
  status?: PropertyStatus;
  address?: string;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  furnished?: boolean;
  amenities?: string[];
  monthlyRate?: number;
  notes?: string;
}

export interface ListPropertiesOpts {
  type?: PropertyType;
  status?: PropertyStatus;
}

export interface CreateBookingInput {
  propertyId: string;
  tenantId?: string;
  tenantName: string;
  type: BookingType;
  description?: string;
  status?: BookingStatus;
  checkInDate?: string;
  checkOutDate?: string;
  rate?: number;
  purpose?: string;
  notes?: string;
}

export interface UpdateBookingInput {
  propertyId?: string;
  tenantId?: string;
  tenantName?: string;
  type?: BookingType;
  description?: string;
  status?: BookingStatus;
  checkInDate?: string;
  checkOutDate?: string;
  rate?: number;
  purpose?: string;
  notes?: string;
}

export interface ListBookingsOpts {
  propertyId?: string;
  tenantId?: string;
  type?: BookingType;
  status?: BookingStatus;
}

export interface CreateMaintenanceInput {
  propertyId: string;
  type: MaintenanceType;
  description?: string;
  status?: MaintenanceStatus;
  priority?: string;
  requestedDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedTo?: string;
  cost?: number;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  propertyId?: string;
  type?: MaintenanceType;
  description?: string;
  status?: MaintenanceStatus;
  priority?: string;
  requestedDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedTo?: string;
  cost?: number;
  notes?: string;
}

export interface ListMaintenanceOpts {
  propertyId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
}

export interface CreateTenantInput {
  name: string;
  type: TenantType;
  description?: string;
  status?: TenantStatus;
  email?: string;
  phone?: string;
  employeeId?: string;
  department?: string;
  preferences?: string[];
  notes?: string;
}

export interface UpdateTenantInput {
  name?: string;
  type?: TenantType;
  description?: string;
  status?: TenantStatus;
  email?: string;
  phone?: string;
  employeeId?: string;
  department?: string;
  preferences?: string[];
  notes?: string;
}

export interface ListTenantsOpts {
  type?: TenantType;
  status?: TenantStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toProperty(row: MemoryRow): HousingProperty {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PropertyType) ?? 'apartment',
    description: (c.description as string) ?? '',
    status: (c.status as PropertyStatus) ?? 'available',
    address: (c.address as string) ?? '',
    city: (c.city as string) ?? '',
    country: (c.country as string) ?? '',
    bedrooms: (c.bedrooms as number) ?? 0,
    bathrooms: (c.bathrooms as number) ?? 0,
    size: (c.size as number) ?? 0,
    furnished: (c.furnished as boolean) ?? false,
    amenities: (c.amenities as string[]) ?? [],
    monthlyRate: (c.monthlyRate as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBooking(row: MemoryRow): HousingBooking {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    propertyId: (c.propertyId as string) ?? '',
    tenantId: (c.tenantId as string) ?? null,
    tenantName: (c.tenantName as string) ?? '',
    type: (c.type as BookingType) ?? 'short_term',
    description: (c.description as string) ?? '',
    status: (c.status as BookingStatus) ?? 'requested',
    checkInDate: c.checkInDate ? new Date(c.checkInDate as string) : null,
    checkOutDate: c.checkOutDate ? new Date(c.checkOutDate as string) : null,
    rate: (c.rate as number) ?? 0,
    purpose: (c.purpose as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMaintenance(row: MemoryRow): HousingMaintenance {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    propertyId: (c.propertyId as string) ?? '',
    type: (c.type as MaintenanceType) ?? 'routine',
    description: (c.description as string) ?? '',
    status: (c.status as MaintenanceStatus) ?? 'requested',
    priority: (c.priority as string) ?? 'medium',
    requestedDate: c.requestedDate ? new Date(c.requestedDate as string) : null,
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    assignedTo: (c.assignedTo as string) ?? '',
    cost: (c.cost as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTenant(row: MemoryRow): HousingTenant {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as TenantType) ?? 'employee',
    description: (c.description as string) ?? '',
    status: (c.status as TenantStatus) ?? 'pending',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    employeeId: (c.employeeId as string) ?? '',
    department: (c.department as string) ?? '',
    preferences: (c.preferences as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CorporateHousingService = {
  // ── Properties ──

  async createProperty(organizationId: string, workspaceId: string, input: CreatePropertyInput, createdBy: string): Promise<HousingProperty> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'available',
      address: input.address ?? '',
      city: input.city ?? '',
      country: input.country ?? '',
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      size: input.size ?? 0,
      furnished: input.furnished ?? false,
      amenities: input.amenities ?? [],
      monthlyRate: input.monthlyRate ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'housing_property',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['housing_property', content.type, content.status]),
        createdBy,
      },
    });
    return toProperty(row as MemoryRow);
  },

  async getProperty(id: string): Promise<HousingProperty | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'housing_property') return null;
    return toProperty(row as MemoryRow);
  },

  async listProperties(organizationId: string, opts: ListPropertiesOpts = {}): Promise<HousingProperty[]> {
    const where: Record<string, unknown> = { organizationId, type: 'housing_property' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProperty);
  },

  async updateProperty(id: string, input: UpdatePropertyInput): Promise<HousingProperty | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.bedrooms !== undefined && { bedrooms: input.bedrooms }),
      ...(input.bathrooms !== undefined && { bathrooms: input.bathrooms }),
      ...(input.size !== undefined && { size: input.size }),
      ...(input.furnished !== undefined && { furnished: input.furnished }),
      ...(input.amenities !== undefined && { amenities: input.amenities }),
      ...(input.monthlyRate !== undefined && { monthlyRate: input.monthlyRate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['housing_property', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProperty(row as MemoryRow);
  },

  async deleteProperty(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async occupyProperty(id: string, _occupiedBy: string): Promise<HousingProperty | null> {
    return CorporateHousingService.updateProperty(id, { status: 'occupied' });
  },

  async reserveProperty(id: string, _reservedBy: string): Promise<HousingProperty | null> {
    return CorporateHousingService.updateProperty(id, { status: 'reserved' });
  },

  async startMaintenanceProperty(id: string, _startedBy: string): Promise<HousingProperty | null> {
    return CorporateHousingService.updateProperty(id, { status: 'under_maintenance' });
  },

  async startCleaningProperty(id: string, _startedBy: string): Promise<HousingProperty | null> {
    return CorporateHousingService.updateProperty(id, { status: 'cleaning' });
  },

  async offMarketProperty(id: string, _offBy: string): Promise<HousingProperty | null> {
    return CorporateHousingService.updateProperty(id, { status: 'off_market' });
  },

  // ── Bookings ──

  async createBooking(organizationId: string, workspaceId: string, input: CreateBookingInput, createdBy: string): Promise<HousingBooking> {
    const content = {
      propertyId: input.propertyId,
      tenantId: input.tenantId ?? null,
      tenantName: input.tenantName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'requested',
      checkInDate: input.checkInDate ?? null,
      checkOutDate: input.checkOutDate ?? null,
      rate: input.rate ?? 0,
      purpose: input.purpose ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'housing_booking',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.propertyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['housing_booking', content.type, content.status]),
        createdBy,
      },
    });
    return toBooking(row as MemoryRow);
  },

  async getBooking(id: string): Promise<HousingBooking | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'housing_booking') return null;
    return toBooking(row as MemoryRow);
  },

  async listBookings(organizationId: string, opts: ListBookingsOpts = {}): Promise<HousingBooking[]> {
    const where: Record<string, unknown> = { organizationId, type: 'housing_booking' };
    const conditions: unknown[] = [];
    if (opts.propertyId) conditions.push({ content: { contains: `"propertyId":"${opts.propertyId}"` } });
    if (opts.tenantId) conditions.push({ content: { contains: `"tenantId":"${opts.tenantId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBooking);
  },

  async updateBooking(id: string, input: UpdateBookingInput): Promise<HousingBooking | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
      ...(input.tenantId !== undefined && { tenantId: input.tenantId }),
      ...(input.tenantName !== undefined && { tenantName: input.tenantName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.checkInDate !== undefined && { checkInDate: input.checkInDate }),
      ...(input.checkOutDate !== undefined && { checkOutDate: input.checkOutDate }),
      ...(input.rate !== undefined && { rate: input.rate }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['housing_booking', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBooking(row as MemoryRow);
  },

  async deleteBooking(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveBooking(id: string, _approvedBy: string): Promise<HousingBooking | null> {
    return CorporateHousingService.updateBooking(id, { status: 'approved' });
  },

  async activateBooking(id: string, _activatedBy: string): Promise<HousingBooking | null> {
    return CorporateHousingService.updateBooking(id, { status: 'active' });
  },

  async completeBooking(id: string, _completedBy: string): Promise<HousingBooking | null> {
    return CorporateHousingService.updateBooking(id, { status: 'completed' });
  },

  async cancelBooking(id: string, _cancelledBy: string): Promise<HousingBooking | null> {
    return CorporateHousingService.updateBooking(id, { status: 'cancelled' });
  },

  async checkOutBooking(id: string, _checkedOutBy: string): Promise<HousingBooking | null> {
    return CorporateHousingService.updateBooking(id, { status: 'checked_out', checkOutDate: new Date().toISOString() });
  },

  // ── Maintenance ──

  async createMaintenance(organizationId: string, workspaceId: string, input: CreateMaintenanceInput, createdBy: string): Promise<HousingMaintenance> {
    const content = {
      propertyId: input.propertyId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'requested',
      priority: input.priority ?? 'medium',
      requestedDate: input.requestedDate ?? null,
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      assignedTo: input.assignedTo ?? '',
      cost: input.cost ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'housing_maintenance',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.propertyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['housing_maintenance', content.type, content.status]),
        createdBy,
      },
    });
    return toMaintenance(row as MemoryRow);
  },

  async getMaintenance(id: string): Promise<HousingMaintenance | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'housing_maintenance') return null;
    return toMaintenance(row as MemoryRow);
  },

  async listMaintenance(organizationId: string, opts: ListMaintenanceOpts = {}): Promise<HousingMaintenance[]> {
    const where: Record<string, unknown> = { organizationId, type: 'housing_maintenance' };
    const conditions: unknown[] = [];
    if (opts.propertyId) conditions.push({ content: { contains: `"propertyId":"${opts.propertyId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMaintenance);
  },

  async updateMaintenance(id: string, input: UpdateMaintenanceInput): Promise<HousingMaintenance | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.requestedDate !== undefined && { requestedDate: input.requestedDate }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['housing_maintenance', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  async deleteMaintenance(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleMaintenance(id: string, _scheduledBy: string): Promise<HousingMaintenance | null> {
    return CorporateHousingService.updateMaintenance(id, { status: 'scheduled' });
  },

  async startMaintenance(id: string, _startedBy: string): Promise<HousingMaintenance | null> {
    return CorporateHousingService.updateMaintenance(id, { status: 'in_progress' });
  },

  async completeMaintenance(id: string, _completedBy: string): Promise<HousingMaintenance | null> {
    return CorporateHousingService.updateMaintenance(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async cancelMaintenance(id: string, _cancelledBy: string): Promise<HousingMaintenance | null> {
    return CorporateHousingService.updateMaintenance(id, { status: 'cancelled' });
  },

  async overdueMaintenance(id: string, _markedBy: string): Promise<HousingMaintenance | null> {
    return CorporateHousingService.updateMaintenance(id, { status: 'overdue' });
  },

  // ── Tenants ──

  async createTenant(organizationId: string, workspaceId: string, input: CreateTenantInput, createdBy: string): Promise<HousingTenant> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      email: input.email ?? '',
      phone: input.phone ?? '',
      employeeId: input.employeeId ?? '',
      department: input.department ?? '',
      preferences: input.preferences ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'housing_tenant',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['housing_tenant', content.type, content.status]),
        createdBy,
      },
    });
    return toTenant(row as MemoryRow);
  },

  async getTenant(id: string): Promise<HousingTenant | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'housing_tenant') return null;
    return toTenant(row as MemoryRow);
  },

  async listTenants(organizationId: string, opts: ListTenantsOpts = {}): Promise<HousingTenant[]> {
    const where: Record<string, unknown> = { organizationId, type: 'housing_tenant' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTenant);
  },

  async updateTenant(id: string, input: UpdateTenantInput): Promise<HousingTenant | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.preferences !== undefined && { preferences: input.preferences }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['housing_tenant', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTenant(row as MemoryRow);
  },

  async deleteTenant(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateTenant(id: string, _activatedBy: string): Promise<HousingTenant | null> {
    return CorporateHousingService.updateTenant(id, { status: 'active' });
  },

  async checkOutTenant(id: string, _checkedOutBy: string): Promise<HousingTenant | null> {
    return CorporateHousingService.updateTenant(id, { status: 'checked_out' });
  },

  async deactivateTenant(id: string, _deactivatedBy: string): Promise<HousingTenant | null> {
    return CorporateHousingService.updateTenant(id, { status: 'inactive' });
  },

  // ── Metrics & Stats ──

  async getCorporateHousingMetrics(organizationId: string): Promise<CorporateHousingMetrics> {
    const [properties, bookings, maintenance, tenants] = await Promise.all([
      CorporateHousingService.listProperties(organizationId),
      CorporateHousingService.listBookings(organizationId),
      CorporateHousingService.listMaintenance(organizationId),
      CorporateHousingService.listTenants(organizationId),
    ]);
    return {
      availableProperties: properties.filter((p) => p.status === 'available').length,
      occupiedProperties: properties.filter((p) => p.status === 'occupied').length,
      activeBookings: bookings.filter((b) => b.status === 'active').length,
      pendingMaintenance: maintenance.filter((m) => m.status === 'requested' || m.status === 'scheduled').length,
      activeTenants: tenants.filter((t) => t.status === 'active').length,
    };
  },

  async getCorporateHousingStats(organizationId: string): Promise<CorporateHousingStats> {
    const [properties, bookings, maintenance, tenants] = await Promise.all([
      CorporateHousingService.listProperties(organizationId),
      CorporateHousingService.listBookings(organizationId),
      CorporateHousingService.listMaintenance(organizationId),
      CorporateHousingService.listTenants(organizationId),
    ]);
    const byPropertyType: Record<string, number> = {};
    const byPropertyStatus: Record<string, number> = {};
    const byBookingType: Record<string, number> = {};
    const byBookingStatus: Record<string, number> = {};
    const byMaintenanceType: Record<string, number> = {};
    const byMaintenanceStatus: Record<string, number> = {};
    const byTenantType: Record<string, number> = {};
    const byTenantStatus: Record<string, number> = {};
    for (const p of properties) { byPropertyType[p.type] = (byPropertyType[p.type] ?? 0) + 1; byPropertyStatus[p.status] = (byPropertyStatus[p.status] ?? 0) + 1; }
    for (const b of bookings) { byBookingType[b.type] = (byBookingType[b.type] ?? 0) + 1; byBookingStatus[b.status] = (byBookingStatus[b.status] ?? 0) + 1; }
    for (const m of maintenance) { byMaintenanceType[m.type] = (byMaintenanceType[m.type] ?? 0) + 1; byMaintenanceStatus[m.status] = (byMaintenanceStatus[m.status] ?? 0) + 1; }
    for (const t of tenants) { byTenantType[t.type] = (byTenantType[t.type] ?? 0) + 1; byTenantStatus[t.status] = (byTenantStatus[t.status] ?? 0) + 1; }
    return {
      propertyCount: properties.length,
      bookingCount: bookings.length,
      maintenanceCount: maintenance.length,
      tenantCount: tenants.length,
      byPropertyType, byPropertyStatus, byBookingType, byBookingStatus, byMaintenanceType, byMaintenanceStatus, byTenantType, byTenantStatus,
    };
  },
};
