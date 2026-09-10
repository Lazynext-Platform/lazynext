import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SpotType = 'standard' | 'accessible' | 'reserved' | 'visitor' | 'electric' | 'motorcycle' | 'compact' | 'oversized';
export type SpotStatus = 'active' | 'maintained' | 'reserved' | 'offline';
export type PermitType = 'employee' | 'visitor' | 'contractor' | 'temporary' | 'permanent' | 'disabled' | 'vip';
export type PermitStatus = 'pending' | 'approved' | 'issued' | 'renewed' | 'revoked' | 'expired';
export type AllocationType = 'permanent' | 'temporary' | 'rotating' | 'shared' | 'priority' | 'visitor';
export type AllocationStatus = 'assigned' | 'released' | 'transferred' | 'expired';
export type VisitorParkingType = 'short_term' | 'long_term' | 'event' | 'contractor' | 'delivery' | 'service';
export type VisitorParkingStatus = 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'expired';

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

export interface ParkingSpot {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SpotType;
  description: string;
  status: SpotStatus;
  location: string;
  level: string;
  zone: string;
  assignedTo: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingPermit {
  id: string;
  organizationId: string;
  workspaceId: string;
  holderName: string;
  type: PermitType;
  description: string;
  status: PermitStatus;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  issuedDate: Date | null;
  expiryDate: Date | null;
  approvedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingAllocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  spotId: string | null;
  permitId: string | null;
  type: AllocationType;
  description: string;
  status: AllocationStatus;
  assignee: string;
  department: string;
  assignedDate: Date | null;
  releasedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorParking {
  id: string;
  organizationId: string;
  workspaceId: string;
  visitorName: string;
  type: VisitorParkingType;
  description: string;
  status: VisitorParkingStatus;
  host: string;
  vehiclePlate: string;
  spotId: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  expectedDuration: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingManagementMetrics {
  totalSpots: number;
  availableSpots: number;
  activePermits: number;
  activeVisitorParking: number;
  pendingPermits: number;
}

export interface ParkingManagementStats {
  spotCount: number;
  permitCount: number;
  allocationCount: number;
  visitorParkingCount: number;
  bySpotType: Record<string, number>;
  bySpotStatus: Record<string, number>;
  byPermitType: Record<string, number>;
  byPermitStatus: Record<string, number>;
  byAllocationType: Record<string, number>;
  byAllocationStatus: Record<string, number>;
  byVisitorParkingType: Record<string, number>;
  byVisitorParkingStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateSpotInput {
  name: string;
  type: SpotType;
  description?: string;
  status?: SpotStatus;
  location?: string;
  level?: string;
  zone?: string;
  assignedTo?: string;
  notes?: string;
}

export interface UpdateSpotInput {
  name?: string;
  type?: SpotType;
  description?: string;
  status?: SpotStatus;
  location?: string;
  level?: string;
  zone?: string;
  assignedTo?: string;
  notes?: string;
}

export interface ListSpotsOpts {
  type?: SpotType;
  status?: SpotStatus;
}

export interface CreatePermitInput {
  holderName: string;
  type: PermitType;
  description?: string;
  status?: PermitStatus;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issuedDate?: string;
  expiryDate?: string;
  approvedBy?: string;
  notes?: string;
}

export interface UpdatePermitInput {
  holderName?: string;
  type?: PermitType;
  description?: string;
  status?: PermitStatus;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issuedDate?: string;
  expiryDate?: string;
  approvedBy?: string;
  notes?: string;
}

export interface ListPermitsOpts {
  type?: PermitType;
  status?: PermitStatus;
}

export interface CreateAllocationInput {
  spotId?: string;
  permitId?: string;
  type: AllocationType;
  description?: string;
  status?: AllocationStatus;
  assignee?: string;
  department?: string;
  assignedDate?: string;
  releasedDate?: string;
  notes?: string;
}

export interface UpdateAllocationInput {
  spotId?: string;
  permitId?: string;
  type?: AllocationType;
  description?: string;
  status?: AllocationStatus;
  assignee?: string;
  department?: string;
  assignedDate?: string;
  releasedDate?: string;
  notes?: string;
}

export interface ListAllocationsOpts {
  spotId?: string;
  permitId?: string;
  type?: AllocationType;
  status?: AllocationStatus;
}

export interface CreateVisitorParkingInput {
  visitorName: string;
  type: VisitorParkingType;
  description?: string;
  status?: VisitorParkingStatus;
  host?: string;
  vehiclePlate?: string;
  spotId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  expectedDuration?: string;
  notes?: string;
}

export interface UpdateVisitorParkingInput {
  visitorName?: string;
  type?: VisitorParkingType;
  description?: string;
  status?: VisitorParkingStatus;
  host?: string;
  vehiclePlate?: string;
  spotId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  expectedDuration?: string;
  notes?: string;
}

export interface ListVisitorParkingOpts {
  type?: VisitorParkingType;
  status?: VisitorParkingStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSpot(row: MemoryRow): ParkingSpot {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SpotType) ?? 'standard',
    description: (c.description as string) ?? '',
    status: (c.status as SpotStatus) ?? 'active',
    location: (c.location as string) ?? '',
    level: (c.level as string) ?? '',
    zone: (c.zone as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPermit(row: MemoryRow): ParkingPermit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    holderName: (c.holderName as string) ?? '',
    type: (c.type as PermitType) ?? 'employee',
    description: (c.description as string) ?? '',
    status: (c.status as PermitStatus) ?? 'pending',
    vehiclePlate: (c.vehiclePlate as string) ?? '',
    vehicleMake: (c.vehicleMake as string) ?? '',
    vehicleModel: (c.vehicleModel as string) ?? '',
    issuedDate: c.issuedDate ? new Date(c.issuedDate as string) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    approvedBy: (c.approvedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAllocation(row: MemoryRow): ParkingAllocation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    spotId: (c.spotId as string) ?? null,
    permitId: (c.permitId as string) ?? null,
    type: (c.type as AllocationType) ?? 'permanent',
    description: (c.description as string) ?? '',
    status: (c.status as AllocationStatus) ?? 'assigned',
    assignee: (c.assignee as string) ?? '',
    department: (c.department as string) ?? '',
    assignedDate: c.assignedDate ? new Date(c.assignedDate as string) : null,
    releasedDate: c.releasedDate ? new Date(c.releasedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVisitorParking(row: MemoryRow): VisitorParking {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    visitorName: (c.visitorName as string) ?? '',
    type: (c.type as VisitorParkingType) ?? 'short_term',
    description: (c.description as string) ?? '',
    status: (c.status as VisitorParkingStatus) ?? 'pending',
    host: (c.host as string) ?? '',
    vehiclePlate: (c.vehiclePlate as string) ?? '',
    spotId: (c.spotId as string) ?? null,
    checkInDate: c.checkInDate ? new Date(c.checkInDate as string) : null,
    checkOutDate: c.checkOutDate ? new Date(c.checkOutDate as string) : null,
    expectedDuration: (c.expectedDuration as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const ParkingManagementService = {
  // ── Spots ──

  async createSpot(organizationId: string, workspaceId: string, input: CreateSpotInput, createdBy: string): Promise<ParkingSpot> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      level: input.level ?? '',
      zone: input.zone ?? '',
      assignedTo: input.assignedTo ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'parking_spot',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['parking_spot', content.type, content.status]),
        createdBy,
      },
    });
    return toSpot(row as MemoryRow);
  },

  async getSpot(id: string): Promise<ParkingSpot | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'parking_spot') return null;
    return toSpot(row as MemoryRow);
  },

  async listSpots(organizationId: string, opts: ListSpotsOpts = {}): Promise<ParkingSpot[]> {
    const where: Record<string, unknown> = { organizationId, type: 'parking_spot' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSpot);
  },

  async updateSpot(id: string, input: UpdateSpotInput): Promise<ParkingSpot | null> {
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
      ...(input.level !== undefined && { level: input.level }),
      ...(input.zone !== undefined && { zone: input.zone }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['parking_spot', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSpot(row as MemoryRow);
  },

  async deleteSpot(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateSpot(id: string, _activatedBy: string): Promise<ParkingSpot | null> {
    return ParkingManagementService.updateSpot(id, { status: 'active' });
  },

  async maintainSpot(id: string, _maintainedBy: string): Promise<ParkingSpot | null> {
    return ParkingManagementService.updateSpot(id, { status: 'maintained' });
  },

  async reserveSpot(id: string, _reservedBy: string): Promise<ParkingSpot | null> {
    return ParkingManagementService.updateSpot(id, { status: 'reserved' });
  },

  async offlineSpot(id: string, _offlineBy: string): Promise<ParkingSpot | null> {
    return ParkingManagementService.updateSpot(id, { status: 'offline' });
  },

  // ── Permits ──

  async createPermit(organizationId: string, workspaceId: string, input: CreatePermitInput, createdBy: string): Promise<ParkingPermit> {
    const content = {
      holderName: input.holderName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      vehiclePlate: input.vehiclePlate ?? '',
      vehicleMake: input.vehicleMake ?? '',
      vehicleModel: input.vehicleModel ?? '',
      issuedDate: input.issuedDate ?? null,
      expiryDate: input.expiryDate ?? null,
      approvedBy: input.approvedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'parking_permit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['parking_permit', content.type, content.status]),
        createdBy,
      },
    });
    return toPermit(row as MemoryRow);
  },

  async getPermit(id: string): Promise<ParkingPermit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'parking_permit') return null;
    return toPermit(row as MemoryRow);
  },

  async listPermits(organizationId: string, opts: ListPermitsOpts = {}): Promise<ParkingPermit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'parking_permit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermit);
  },

  async updatePermit(id: string, input: UpdatePermitInput): Promise<ParkingPermit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.holderName !== undefined && { holderName: input.holderName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.vehiclePlate !== undefined && { vehiclePlate: input.vehiclePlate }),
      ...(input.vehicleMake !== undefined && { vehicleMake: input.vehicleMake }),
      ...(input.vehicleModel !== undefined && { vehicleModel: input.vehicleModel }),
      ...(input.issuedDate !== undefined && { issuedDate: input.issuedDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.approvedBy !== undefined && { approvedBy: input.approvedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['parking_permit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermit(row as MemoryRow);
  },

  async deletePermit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approvePermit(id: string, approvedBy: string): Promise<ParkingPermit | null> {
    return ParkingManagementService.updatePermit(id, { status: 'approved', approvedBy });
  },

  async issuePermit(id: string, _issuedBy: string): Promise<ParkingPermit | null> {
    return ParkingManagementService.updatePermit(id, { status: 'issued', issuedDate: new Date().toISOString() });
  },

  async renewPermit(id: string, _renewedBy: string): Promise<ParkingPermit | null> {
    return ParkingManagementService.updatePermit(id, { status: 'renewed' });
  },

  async revokePermit(id: string, _revokedBy: string): Promise<ParkingPermit | null> {
    return ParkingManagementService.updatePermit(id, { status: 'revoked' });
  },

  async expirePermit(id: string, _expiredBy: string): Promise<ParkingPermit | null> {
    return ParkingManagementService.updatePermit(id, { status: 'expired', expiryDate: new Date().toISOString() });
  },

  // ── Allocations ──

  async createAllocation(organizationId: string, workspaceId: string, input: CreateAllocationInput, createdBy: string): Promise<ParkingAllocation> {
    const content = {
      spotId: input.spotId ?? null,
      permitId: input.permitId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'assigned',
      assignee: input.assignee ?? '',
      department: input.department ?? '',
      assignedDate: input.assignedDate ?? null,
      releasedDate: input.releasedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'parking_allocation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.spotId ?? input.permitId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['parking_allocation', content.type, content.status]),
        createdBy,
      },
    });
    return toAllocation(row as MemoryRow);
  },

  async getAllocation(id: string): Promise<ParkingAllocation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'parking_allocation') return null;
    return toAllocation(row as MemoryRow);
  },

  async listAllocations(organizationId: string, opts: ListAllocationsOpts = {}): Promise<ParkingAllocation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'parking_allocation' };
    const conditions: unknown[] = [];
    if (opts.spotId) conditions.push({ content: { contains: `"spotId":"${opts.spotId}"` } });
    if (opts.permitId) conditions.push({ content: { contains: `"permitId":"${opts.permitId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAllocation);
  },

  async updateAllocation(id: string, input: UpdateAllocationInput): Promise<ParkingAllocation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.spotId !== undefined && { spotId: input.spotId }),
      ...(input.permitId !== undefined && { permitId: input.permitId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.assignedDate !== undefined && { assignedDate: input.assignedDate }),
      ...(input.releasedDate !== undefined && { releasedDate: input.releasedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['parking_allocation', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAllocation(row as MemoryRow);
  },

  async deleteAllocation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assignAllocation(id: string, _assignedBy: string): Promise<ParkingAllocation | null> {
    return ParkingManagementService.updateAllocation(id, { status: 'assigned', assignedDate: new Date().toISOString() });
  },

  async releaseAllocation(id: string, _releasedBy: string): Promise<ParkingAllocation | null> {
    return ParkingManagementService.updateAllocation(id, { status: 'released', releasedDate: new Date().toISOString() });
  },

  async transferAllocation(id: string, _transferredBy: string): Promise<ParkingAllocation | null> {
    return ParkingManagementService.updateAllocation(id, { status: 'transferred' });
  },

  // ── Visitor Parking ──

  async createVisitorParking(organizationId: string, workspaceId: string, input: CreateVisitorParkingInput, createdBy: string): Promise<VisitorParking> {
    const content = {
      visitorName: input.visitorName.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      host: input.host ?? '',
      vehiclePlate: input.vehiclePlate ?? '',
      spotId: input.spotId ?? null,
      checkInDate: input.checkInDate ?? null,
      checkOutDate: input.checkOutDate ?? null,
      expectedDuration: input.expectedDuration ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'visitor_parking',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.spotId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['visitor_parking', content.type, content.status]),
        createdBy,
      },
    });
    return toVisitorParking(row as MemoryRow);
  },

  async getVisitorParking(id: string): Promise<VisitorParking | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'visitor_parking') return null;
    return toVisitorParking(row as MemoryRow);
  },

  async listVisitorParking(organizationId: string, opts: ListVisitorParkingOpts = {}): Promise<VisitorParking[]> {
    const where: Record<string, unknown> = { organizationId, type: 'visitor_parking' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVisitorParking);
  },

  async updateVisitorParking(id: string, input: UpdateVisitorParkingInput): Promise<VisitorParking | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.visitorName !== undefined && { visitorName: input.visitorName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.host !== undefined && { host: input.host }),
      ...(input.vehiclePlate !== undefined && { vehiclePlate: input.vehiclePlate }),
      ...(input.spotId !== undefined && { spotId: input.spotId }),
      ...(input.checkInDate !== undefined && { checkInDate: input.checkInDate }),
      ...(input.checkOutDate !== undefined && { checkOutDate: input.checkOutDate }),
      ...(input.expectedDuration !== undefined && { expectedDuration: input.expectedDuration }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['visitor_parking', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVisitorParking(row as MemoryRow);
  },

  async deleteVisitorParking(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveVisitorParking(id: string, _approvedBy: string): Promise<VisitorParking | null> {
    return ParkingManagementService.updateVisitorParking(id, { status: 'approved' });
  },

  async checkInVisitorParking(id: string, _checkedInBy: string): Promise<VisitorParking | null> {
    return ParkingManagementService.updateVisitorParking(id, { status: 'checked_in', checkInDate: new Date().toISOString() });
  },

  async checkOutVisitorParking(id: string, _checkedOutBy: string): Promise<VisitorParking | null> {
    return ParkingManagementService.updateVisitorParking(id, { status: 'checked_out', checkOutDate: new Date().toISOString() });
  },

  async expireVisitorParking(id: string, _expiredBy: string): Promise<VisitorParking | null> {
    return ParkingManagementService.updateVisitorParking(id, { status: 'expired' });
  },

  // ── Metrics & Stats ──

  async getParkingManagementMetrics(organizationId: string): Promise<ParkingManagementMetrics> {
    const [spots, permits, visitorParking] = await Promise.all([
      ParkingManagementService.listSpots(organizationId),
      ParkingManagementService.listPermits(organizationId),
      ParkingManagementService.listVisitorParking(organizationId),
    ]);
    return {
      totalSpots: spots.length,
      availableSpots: spots.filter((s) => s.status === 'active').length,
      activePermits: permits.filter((p) => p.status === 'issued' || p.status === 'renewed').length,
      activeVisitorParking: visitorParking.filter((v) => v.status === 'checked_in' || v.status === 'approved').length,
      pendingPermits: permits.filter((p) => p.status === 'pending' || p.status === 'approved').length,
    };
  },

  async getParkingManagementStats(organizationId: string): Promise<ParkingManagementStats> {
    const [spots, permits, allocations, visitorParking] = await Promise.all([
      ParkingManagementService.listSpots(organizationId),
      ParkingManagementService.listPermits(organizationId),
      ParkingManagementService.listAllocations(organizationId),
      ParkingManagementService.listVisitorParking(organizationId),
    ]);
    const bySpotType: Record<string, number> = {};
    const bySpotStatus: Record<string, number> = {};
    const byPermitType: Record<string, number> = {};
    const byPermitStatus: Record<string, number> = {};
    const byAllocationType: Record<string, number> = {};
    const byAllocationStatus: Record<string, number> = {};
    const byVisitorParkingType: Record<string, number> = {};
    const byVisitorParkingStatus: Record<string, number> = {};
    for (const s of spots) { bySpotType[s.type] = (bySpotType[s.type] ?? 0) + 1; bySpotStatus[s.status] = (bySpotStatus[s.status] ?? 0) + 1; }
    for (const p of permits) { byPermitType[p.type] = (byPermitType[p.type] ?? 0) + 1; byPermitStatus[p.status] = (byPermitStatus[p.status] ?? 0) + 1; }
    for (const a of allocations) { byAllocationType[a.type] = (byAllocationType[a.type] ?? 0) + 1; byAllocationStatus[a.status] = (byAllocationStatus[a.status] ?? 0) + 1; }
    for (const v of visitorParking) { byVisitorParkingType[v.type] = (byVisitorParkingType[v.type] ?? 0) + 1; byVisitorParkingStatus[v.status] = (byVisitorParkingStatus[v.status] ?? 0) + 1; }
    return {
      spotCount: spots.length,
      permitCount: permits.length,
      allocationCount: allocations.length,
      visitorParkingCount: visitorParking.length,
      bySpotType, bySpotStatus, byPermitType, byPermitStatus, byAllocationType, byAllocationStatus, byVisitorParkingType, byVisitorParkingStatus,
    };
  },
};
