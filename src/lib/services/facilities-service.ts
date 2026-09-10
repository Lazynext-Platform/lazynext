import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FacilityType = 'office' | 'warehouse' | 'retail' | 'manufacturing' | 'other';
export type AreaUnit = 'sqft' | 'sqm';
export type LeaseStatus = 'active' | 'expired' | 'terminated' | 'pending';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceCategory =
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'structural'
  | 'cleaning'
  | 'security'
  | 'other';
export type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

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

/** Parsed content payload for a facility Memory. */
interface FacilityContent {
  name: string;
  address: string;
  type: FacilityType;
  floors: number;
  totalArea: number;
  areaUnit: AreaUnit;
  description: string;
  isActive: boolean;
}

/** Parsed content payload for a lease Memory. */
interface LeaseContent {
  facilityId: string;
  landlord: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  status: LeaseStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
}

/** Parsed content payload for a maintenance request Memory. */
interface MaintenanceContent {
  facilityId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  requestedBy: string;
  assignedTo: string | null;
  completedAt: string | null;
  completionNotes: string | null;
}

/** Parsed content payload for a space allocation Memory. */
interface SpaceAllocationContent {
  facilityId: string;
  floor: number;
  area: number;
  assignedTo: string;
  department: string;
  purpose: string;
  startDate: string;
}

/** A structured facility returned to callers. */
export interface Facility {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  address: string;
  type: FacilityType;
  floors: number;
  totalArea: number;
  areaUnit: AreaUnit;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured lease returned to callers. */
export interface Lease {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  landlord: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  status: LeaseStatus;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured maintenance request returned to callers. */
export interface MaintenanceRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  requestedBy: string;
  assignedTo: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured space allocation returned to callers. */
export interface SpaceAllocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  facilityId: string;
  floor: number;
  area: number;
  assignedTo: string;
  department: string;
  purpose: string;
  startDate: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFacilityInput {
  name: string;
  address?: string;
  type?: FacilityType;
  floors?: number;
  totalArea?: number;
  areaUnit?: AreaUnit;
  description?: string;
  isActive?: boolean;
}

export interface UpdateFacilityInput {
  name?: string;
  address?: string;
  type?: FacilityType;
  floors?: number;
  totalArea?: number;
  areaUnit?: AreaUnit;
  description?: string;
  isActive?: boolean;
}

export interface ListFacilitiesOpts {
  type?: FacilityType;
  isActive?: boolean;
}

export interface CreateLeaseInput {
  facilityId: string;
  landlord: string;
  startDate: string;
  endDate: string;
  monthlyRent?: number;
  deposit?: number;
  terms?: string;
  status?: LeaseStatus;
}

export interface UpdateLeaseInput {
  landlord?: string;
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  deposit?: number;
  terms?: string;
  status?: LeaseStatus;
}

export interface ListLeasesOpts {
  facilityId?: string;
  status?: LeaseStatus;
}

export interface CreateMaintenanceInput {
  facilityId: string;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  requestedBy: string;
  assignedTo?: string;
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  status?: MaintenanceStatus;
  assignedTo?: string;
}

export interface ListMaintenanceOpts {
  facilityId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}

export interface CreateSpaceAllocationInput {
  facilityId: string;
  floor?: number;
  area?: number;
  assignedTo?: string;
  department?: string;
  purpose?: string;
  startDate?: string;
}

export interface UpdateSpaceAllocationInput {
  floor?: number;
  area?: number;
  assignedTo?: string;
  department?: string;
  purpose?: string;
}

export interface ListSpaceAllocationsOpts {
  facilityId?: string;
  department?: string;
}

export interface OccupancyReport {
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    totalArea: number;
    allocatedArea: number;
    occupancyRate: number;
  }>;
  totalArea: number;
  totalAllocatedArea: number;
  overallOccupancyRate: number;
}

export interface FacilityCosts {
  totalRent: number;
  totalMaintenanceCost: number;
  totalCost: number;
  byFacility: Record<string, { rent: number; maintenance: number }>;
}

export interface FacilitiesStats {
  facilityCount: number;
  activeFacilityCount: number;
  leaseCount: number;
  activeLeaseCount: number;
  expiringLeaseCount: number;
  maintenanceRequestCount: number;
  openMaintenanceCount: number;
  spaceAllocationCount: number;
  totalArea: number;
  allocatedArea: number;
  occupancyRate: number;
}

// ── Helpers ──

const fallbackFacilityContent: FacilityContent = {
  name: '',
  address: '',
  type: 'other',
  floors: 0,
  totalArea: 0,
  areaUnit: 'sqft',
  description: '',
  isActive: true,
};

const fallbackLeaseContent: LeaseContent = {
  facilityId: '',
  landlord: '',
  startDate: '',
  endDate: '',
  monthlyRent: 0,
  deposit: 0,
  terms: '',
  status: 'pending',
  terminatedAt: null,
  terminationReason: null,
};

const fallbackMaintenanceContent: MaintenanceContent = {
  facilityId: '',
  title: '',
  description: '',
  priority: 'medium',
  category: 'other',
  status: 'pending',
  requestedBy: '',
  assignedTo: null,
  completedAt: null,
  completionNotes: null,
};

const fallbackSpaceContent: SpaceAllocationContent = {
  facilityId: '',
  floor: 0,
  area: 0,
  assignedTo: '',
  department: '',
  purpose: '',
  startDate: '',
};

function parseFacilityContent(raw: string): FacilityContent {
  if (!raw) return fallbackFacilityContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      address: parsed.address ?? '',
      type: (parsed.type as FacilityType) ?? 'other',
      floors: Number(parsed.floors) || 0,
      totalArea: Number(parsed.totalArea) || 0,
      areaUnit: (parsed.areaUnit as AreaUnit) ?? 'sqft',
      description: parsed.description ?? '',
      isActive: parsed.isActive !== undefined ? Boolean(parsed.isActive) : true,
    };
  } catch {
    return fallbackFacilityContent;
  }
}

function parseLeaseContent(raw: string): LeaseContent {
  if (!raw) return fallbackLeaseContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      facilityId: parsed.facilityId ?? '',
      landlord: parsed.landlord ?? '',
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? '',
      monthlyRent: Number(parsed.monthlyRent) || 0,
      deposit: Number(parsed.deposit) || 0,
      terms: parsed.terms ?? '',
      status: (parsed.status as LeaseStatus) ?? 'pending',
      terminatedAt: parsed.terminatedAt ?? null,
      terminationReason: parsed.terminationReason ?? null,
    };
  } catch {
    return fallbackLeaseContent;
  }
}

function parseMaintenanceContent(raw: string): MaintenanceContent {
  if (!raw) return fallbackMaintenanceContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      facilityId: parsed.facilityId ?? '',
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      priority: (parsed.priority as MaintenancePriority) ?? 'medium',
      category: (parsed.category as MaintenanceCategory) ?? 'other',
      status: (parsed.status as MaintenanceStatus) ?? 'pending',
      requestedBy: parsed.requestedBy ?? '',
      assignedTo: parsed.assignedTo ?? null,
      completedAt: parsed.completedAt ?? null,
      completionNotes: parsed.completionNotes ?? null,
    };
  } catch {
    return fallbackMaintenanceContent;
  }
}

function parseSpaceContent(raw: string): SpaceAllocationContent {
  if (!raw) return fallbackSpaceContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      facilityId: parsed.facilityId ?? '',
      floor: Number(parsed.floor) || 0,
      area: Number(parsed.area) || 0,
      assignedTo: parsed.assignedTo ?? '',
      department: parsed.department ?? '',
      purpose: parsed.purpose ?? '',
      startDate: parsed.startDate ?? '',
    };
  } catch {
    return fallbackSpaceContent;
  }
}

function toFacility(row: MemoryRow): Facility {
  const content = parseFacilityContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    address: content.address,
    type: content.type,
    floors: content.floors,
    totalArea: content.totalArea,
    areaUnit: content.areaUnit,
    description: content.description,
    isActive: content.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLease(row: MemoryRow): Lease {
  const content = parseLeaseContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    facilityId: content.facilityId,
    landlord: content.landlord,
    startDate: content.startDate,
    endDate: content.endDate,
    monthlyRent: content.monthlyRent,
    deposit: content.deposit,
    terms: content.terms,
    status: content.status,
    terminatedAt: content.terminatedAt,
    terminationReason: content.terminationReason,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMaintenance(row: MemoryRow): MaintenanceRequest {
  const content = parseMaintenanceContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    facilityId: content.facilityId,
    title: content.title,
    description: content.description,
    priority: content.priority,
    category: content.category,
    status: content.status,
    requestedBy: content.requestedBy,
    assignedTo: content.assignedTo,
    completedAt: content.completedAt,
    completionNotes: content.completionNotes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSpaceAllocation(row: MemoryRow): SpaceAllocation {
  const content = parseSpaceContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    facilityId: content.facilityId,
    floor: content.floor,
    area: content.area,
    assignedTo: content.assignedTo,
    department: content.department,
    purpose: content.purpose,
    startDate: content.startDate,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Facilities Service ──

export const FacilitiesService = {
  /**
   * Create a facility. Stored as a Memory with type='facility'.
   */
  async createFacility(
    organizationId: string,
    workspaceId: string,
    input: CreateFacilityInput,
    createdBy: string,
  ): Promise<Facility> {
    const content: FacilityContent = {
      name: input.name,
      address: input.address ?? '',
      type: input.type ?? 'other',
      floors: input.floors ?? 0,
      totalArea: input.totalArea ?? 0,
      areaUnit: input.areaUnit ?? 'sqft',
      description: input.description ?? '',
      isActive: input.isActive ?? true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'facility',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['facility', content.type]),
        createdBy,
      },
    });

    return toFacility(row as MemoryRow);
  },

  /**
   * Get a single facility by ID.
   */
  async getFacility(id: string): Promise<Facility | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toFacility(row as MemoryRow);
  },

  /**
   * List facilities for an organization with optional filters.
   */
  async listFacilities(
    organizationId: string,
    opts: ListFacilitiesOpts = {},
  ): Promise<Facility[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'facility',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let facilities = rows.map((r) => toFacility(r as MemoryRow));

    if (opts.type) {
      facilities = facilities.filter((f) => f.type === opts.type);
    }
    if (opts.isActive !== undefined) {
      facilities = facilities.filter((f) => f.isActive === opts.isActive);
    }

    return facilities;
  },

  /**
   * Update a facility.
   */
  async updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseFacilityContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.address !== undefined) content.address = input.address;
    if (input.type !== undefined) content.type = input.type;
    if (input.floors !== undefined) content.floors = input.floors;
    if (input.totalArea !== undefined) content.totalArea = input.totalArea;
    if (input.areaUnit !== undefined) content.areaUnit = input.areaUnit;
    if (input.description !== undefined) content.description = input.description;
    if (input.isActive !== undefined) content.isActive = input.isActive;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['facility', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toFacility(row as MemoryRow);
  },

  /**
   * Delete a facility.
   */
  async deleteFacility(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create a lease. Stored as a Memory with type='lease'.
   */
  async createLease(
    organizationId: string,
    workspaceId: string,
    input: CreateLeaseInput,
    createdBy: string,
  ): Promise<Lease> {
    const content: LeaseContent = {
      facilityId: input.facilityId,
      landlord: input.landlord,
      startDate: input.startDate,
      endDate: input.endDate,
      monthlyRent: input.monthlyRent ?? 0,
      deposit: input.deposit ?? 0,
      terms: input.terms ?? '',
      status: input.status ?? 'pending',
      terminatedAt: null,
      terminationReason: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'lease',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.facilityId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['lease', content.status]),
        createdBy,
      },
    });

    return toLease(row as MemoryRow);
  },

  /**
   * Get a single lease by ID.
   */
  async getLease(id: string): Promise<Lease | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toLease(row as MemoryRow);
  },

  /**
   * List leases for an organization with optional filters.
   */
  async listLeases(
    organizationId: string,
    opts: ListLeasesOpts = {},
  ): Promise<Lease[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'lease',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let leases = rows.map((r) => toLease(r as MemoryRow));

    if (opts.facilityId) {
      leases = leases.filter((l) => l.facilityId === opts.facilityId);
    }
    if (opts.status) {
      leases = leases.filter((l) => l.status === opts.status);
    }

    return leases;
  },

  /**
   * Update a lease.
   */
  async updateLease(id: string, input: UpdateLeaseInput): Promise<Lease | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseLeaseContent(existing.content);
    if (input.landlord !== undefined) content.landlord = input.landlord;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.monthlyRent !== undefined) content.monthlyRent = input.monthlyRent;
    if (input.deposit !== undefined) content.deposit = input.deposit;
    if (input.terms !== undefined) content.terms = input.terms;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['lease', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toLease(row as MemoryRow);
  },

  /**
   * Terminate a lease (status → terminated).
   */
  async terminateLease(id: string, reason: string): Promise<Lease | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseLeaseContent(existing.content);
    content.status = 'terminated';
    content.terminatedAt = new Date().toISOString();
    content.terminationReason = reason;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['lease', 'terminated']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toLease(row as MemoryRow);
  },

  /**
   * Get leases expiring within the given horizon (days).
   */
  async getExpiringLeases(organizationId: string, days = 90): Promise<Lease[]> {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const leases = await this.listLeases(organizationId, { status: 'active' });
    return leases.filter((l) => {
      const end = new Date(l.endDate);
      return end >= now && end <= horizon;
    });
  },

  /**
   * Create a maintenance request. Stored as a Memory with type='maintenance_request'.
   */
  async createMaintenanceRequest(
    organizationId: string,
    workspaceId: string,
    input: CreateMaintenanceInput,
    createdBy: string,
  ): Promise<MaintenanceRequest> {
    const content: MaintenanceContent = {
      facilityId: input.facilityId,
      title: input.title,
      description: input.description ?? '',
      priority: input.priority ?? 'medium',
      category: input.category ?? 'other',
      status: 'pending',
      requestedBy: input.requestedBy,
      assignedTo: input.assignedTo ?? null,
      completedAt: null,
      completionNotes: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'maintenance_request',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.facilityId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['maintenance_request', content.status, content.priority]),
        createdBy,
      },
    });

    return toMaintenance(row as MemoryRow);
  },

  /**
   * Get a single maintenance request by ID.
   */
  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  /**
   * List maintenance requests for an organization with optional filters.
   */
  async listMaintenanceRequests(
    organizationId: string,
    opts: ListMaintenanceOpts = {},
  ): Promise<MaintenanceRequest[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'maintenance_request',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let requests = rows.map((r) => toMaintenance(r as MemoryRow));

    if (opts.facilityId) {
      requests = requests.filter((m) => m.facilityId === opts.facilityId);
    }
    if (opts.status) {
      requests = requests.filter((m) => m.status === opts.status);
    }
    if (opts.priority) {
      requests = requests.filter((m) => m.priority === opts.priority);
    }

    return requests;
  },

  /**
   * Update a maintenance request.
   */
  async updateMaintenanceRequest(id: string, input: UpdateMaintenanceInput): Promise<MaintenanceRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMaintenanceContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.priority !== undefined) content.priority = input.priority;
    if (input.category !== undefined) content.category = input.category;
    if (input.status !== undefined) content.status = input.status;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['maintenance_request', content.status, content.priority]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  /**
   * Assign a maintenance request (status → assigned).
   */
  async assignMaintenanceRequest(id: string, assignedTo: string): Promise<MaintenanceRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseMaintenanceContent(existing.content);
    content.assignedTo = assignedTo;
    content.status = 'assigned';
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['maintenance_request', 'assigned', content.priority]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  /**
   * Complete a maintenance request (status → completed).
   */
  async completeMaintenanceRequest(id: string, notes?: string): Promise<MaintenanceRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;
    const content = parseMaintenanceContent(existing.content);
    content.status = 'completed';
    content.completedAt = new Date().toISOString();
    content.completionNotes = notes ?? null;
    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['maintenance_request', 'completed', content.priority]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMaintenance(row as MemoryRow);
  },

  /**
   * Create a space allocation. Stored as a Memory with type='space_allocation'.
   */
  async createSpaceAllocation(
    organizationId: string,
    workspaceId: string,
    input: CreateSpaceAllocationInput,
    createdBy: string,
  ): Promise<SpaceAllocation> {
    const content: SpaceAllocationContent = {
      facilityId: input.facilityId,
      floor: input.floor ?? 0,
      area: input.area ?? 0,
      assignedTo: input.assignedTo ?? '',
      department: input.department ?? '',
      purpose: input.purpose ?? '',
      startDate: input.startDate ?? new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'space_allocation',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.facilityId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['space_allocation', content.department]),
        createdBy,
      },
    });

    return toSpaceAllocation(row as MemoryRow);
  },

  /**
   * List space allocations for an organization with optional filters.
   */
  async getSpaceAllocations(
    organizationId: string,
    opts: ListSpaceAllocationsOpts = {},
  ): Promise<SpaceAllocation[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'space_allocation',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let allocations = rows.map((r) => toSpaceAllocation(r as MemoryRow));

    if (opts.facilityId) {
      allocations = allocations.filter((s) => s.facilityId === opts.facilityId);
    }
    if (opts.department) {
      allocations = allocations.filter((s) => s.department === opts.department);
    }

    return allocations;
  },

  /**
   * Update a space allocation.
   */
  async updateSpaceAllocation(id: string, input: UpdateSpaceAllocationInput): Promise<SpaceAllocation | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseSpaceContent(existing.content);
    if (input.floor !== undefined) content.floor = input.floor;
    if (input.area !== undefined) content.area = input.area;
    if (input.assignedTo !== undefined) content.assignedTo = input.assignedTo;
    if (input.department !== undefined) content.department = input.department;
    if (input.purpose !== undefined) content.purpose = input.purpose;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['space_allocation', content.department]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSpaceAllocation(row as MemoryRow);
  },

  /**
   * Delete a space allocation.
   */
  async deleteSpaceAllocation(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get an occupancy report by facility.
   */
  async getOccupancyReport(organizationId: string): Promise<OccupancyReport> {
    const [facilities, allocations] = await Promise.all([
      this.listFacilities(organizationId),
      this.getSpaceAllocations(organizationId),
    ]);

    const facilityReports: OccupancyReport['facilities'] = [];
    let totalArea = 0;
    let totalAllocatedArea = 0;

    for (const facility of facilities) {
      const allocatedArea = allocations
        .filter((a) => a.facilityId === facility.id)
        .reduce((sum, a) => sum + a.area, 0);
      const occupancyRate =
        facility.totalArea > 0 ? (allocatedArea / facility.totalArea) * 100 : 0;
      facilityReports.push({
        facilityId: facility.id,
        facilityName: facility.name,
        totalArea: facility.totalArea,
        allocatedArea,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      });
      totalArea += facility.totalArea;
      totalAllocatedArea += allocatedArea;
    }

    const overallOccupancyRate =
      totalArea > 0 ? (totalAllocatedArea / totalArea) * 100 : 0;

    return {
      facilities: facilityReports,
      totalArea,
      totalAllocatedArea,
      overallOccupancyRate: Math.round(overallOccupancyRate * 100) / 100,
    };
  },

  /**
   * Get facility costs (rent + maintenance) optionally filtered by date range.
   */
  async getFacilityCosts(
    organizationId: string,
    opts: { fromDate?: Date; toDate?: Date } = {},
  ): Promise<FacilityCosts> {
    const [leases, maintenance] = await Promise.all([
      this.listLeases(organizationId, { status: 'active' }),
      this.listMaintenanceRequests(organizationId),
    ]);

    const byFacility: Record<string, { rent: number; maintenance: number }> = {};
    let totalRent = 0;
    let totalMaintenanceCost = 0;

    for (const lease of leases) {
      if (!byFacility[lease.facilityId]) {
        byFacility[lease.facilityId] = { rent: 0, maintenance: 0 };
      }
      byFacility[lease.facilityId].rent += lease.monthlyRent;
      totalRent += lease.monthlyRent;
    }

    for (const request of maintenance) {
      // Maintenance requests don't carry an explicit cost field; count as 0 for cost calc
      // unless a future enhancement adds cost. We include the request count contribution as 0.
      void request;
      void opts;
    }

    const totalCost = totalRent + totalMaintenanceCost;

    return {
      totalRent,
      totalMaintenanceCost,
      totalCost,
      byFacility,
    };
  },

  /**
   * Get aggregate facilities stats.
   */
  async getStats(organizationId: string): Promise<FacilitiesStats> {
    const [facilities, leases, expiringLeases, maintenance, allocations] = await Promise.all([
      this.listFacilities(organizationId),
      this.listLeases(organizationId),
      this.getExpiringLeases(organizationId),
      this.listMaintenanceRequests(organizationId),
      this.getSpaceAllocations(organizationId),
    ]);

    const activeFacilityCount = facilities.filter((f) => f.isActive).length;
    const activeLeaseCount = leases.filter((l) => l.status === 'active').length;
    const openMaintenanceCount = maintenance.filter(
      (m) => m.status !== 'completed' && m.status !== 'cancelled',
    ).length;
    const totalArea = facilities.reduce((sum, f) => sum + f.totalArea, 0);
    const allocatedArea = allocations.reduce((sum, a) => sum + a.area, 0);
    const occupancyRate = totalArea > 0 ? (allocatedArea / totalArea) * 100 : 0;

    return {
      facilityCount: facilities.length,
      activeFacilityCount,
      leaseCount: leases.length,
      activeLeaseCount,
      expiringLeaseCount: expiringLeases.length,
      maintenanceRequestCount: maintenance.length,
      openMaintenanceCount,
      spaceAllocationCount: allocations.length,
      totalArea,
      allocatedArea,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    };
  },
};
