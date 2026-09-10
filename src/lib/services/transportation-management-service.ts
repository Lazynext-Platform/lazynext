import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type VehicleType = 'sedan' | 'suv' | 'van' | 'bus' | 'truck' | 'electric' | 'hybrid' | 'luxury' | 'shuttle';
export type VehicleStatus = 'active' | 'maintained' | 'retired' | 'decommissioned' | 'offline';
export type RouteType = 'employee_shuttle' | 'visitor' | 'airport' | 'intercampus' | 'event' | 'delivery' | 'maintenance' | 'emergency';
export type RouteStatus = 'active' | 'suspended' | 'deactivated';
export type AssignmentType = 'primary' | 'backup' | 'temporary' | 'training' | 'event' | 'charter';
export type AssignmentStatus = 'assigned' | 'completed' | 'cancelled';
export type TripType = 'scheduled' | 'charter' | 'event' | 'emergency' | 'maintenance' | 'delivery' | 'shuttle';
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

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

export interface FleetVehicle {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: VehicleType;
  description: string;
  status: VehicleStatus;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  fuelType: string;
  mileage: number;
  lastServiceDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportRoute {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RouteType;
  description: string;
  status: RouteStatus;
  origin: string;
  destination: string;
  stops: string[];
  distance: number;
  estimatedDuration: number;
  schedule: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverAssignment {
  id: string;
  organizationId: string;
  workspaceId: string;
  vehicleId: string | null;
  routeId: string | null;
  type: AssignmentType;
  description: string;
  status: AssignmentStatus;
  driverName: string;
  driverLicense: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportTrip {
  id: string;
  organizationId: string;
  workspaceId: string;
  vehicleId: string | null;
  routeId: string | null;
  assignmentId: string | null;
  type: TripType;
  description: string;
  status: TripStatus;
  driverName: string;
  passengerCount: number;
  scheduledDate: Date | null;
  startDate: Date | null;
  completedDate: Date | null;
  origin: string;
  destination: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportationManagementMetrics {
  activeVehicles: number;
  activeRoutes: number;
  activeAssignments: number;
  scheduledTrips: number;
  completedTrips: number;
}

export interface TransportationManagementStats {
  vehicleCount: number;
  routeCount: number;
  assignmentCount: number;
  tripCount: number;
  byVehicleType: Record<string, number>;
  byVehicleStatus: Record<string, number>;
  byRouteType: Record<string, number>;
  byRouteStatus: Record<string, number>;
  byAssignmentType: Record<string, number>;
  byAssignmentStatus: Record<string, number>;
  byTripType: Record<string, number>;
  byTripStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateVehicleInput {
  name: string;
  type: VehicleType;
  description?: string;
  status?: VehicleStatus;
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  fuelType?: string;
  mileage?: number;
  lastServiceDate?: string;
  notes?: string;
}

export interface UpdateVehicleInput {
  name?: string;
  type?: VehicleType;
  description?: string;
  status?: VehicleStatus;
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  fuelType?: string;
  mileage?: number;
  lastServiceDate?: string;
  notes?: string;
}

export interface ListVehiclesOpts {
  type?: VehicleType;
  status?: VehicleStatus;
}

export interface CreateRouteInput {
  name: string;
  type: RouteType;
  description?: string;
  status?: RouteStatus;
  origin?: string;
  destination?: string;
  stops?: string[];
  distance?: number;
  estimatedDuration?: number;
  schedule?: string;
  notes?: string;
}

export interface UpdateRouteInput {
  name?: string;
  type?: RouteType;
  description?: string;
  status?: RouteStatus;
  origin?: string;
  destination?: string;
  stops?: string[];
  distance?: number;
  estimatedDuration?: number;
  schedule?: string;
  notes?: string;
}

export interface ListRoutesOpts {
  type?: RouteType;
  status?: RouteStatus;
}

export interface CreateAssignmentInput {
  vehicleId?: string;
  routeId?: string;
  type: AssignmentType;
  description?: string;
  status?: AssignmentStatus;
  driverName?: string;
  driverLicense?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateAssignmentInput {
  vehicleId?: string;
  routeId?: string;
  type?: AssignmentType;
  description?: string;
  status?: AssignmentStatus;
  driverName?: string;
  driverLicense?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ListAssignmentsOpts {
  vehicleId?: string;
  routeId?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
}

export interface CreateTripInput {
  vehicleId?: string;
  routeId?: string;
  assignmentId?: string;
  type: TripType;
  description?: string;
  status?: TripStatus;
  driverName?: string;
  passengerCount?: number;
  scheduledDate?: string;
  startDate?: string;
  completedDate?: string;
  origin?: string;
  destination?: string;
  notes?: string;
}

export interface UpdateTripInput {
  vehicleId?: string;
  routeId?: string;
  assignmentId?: string;
  type?: TripType;
  description?: string;
  status?: TripStatus;
  driverName?: string;
  passengerCount?: number;
  scheduledDate?: string;
  startDate?: string;
  completedDate?: string;
  origin?: string;
  destination?: string;
  notes?: string;
}

export interface ListTripsOpts {
  vehicleId?: string;
  routeId?: string;
  assignmentId?: string;
  type?: TripType;
  status?: TripStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toVehicle(row: MemoryRow): FleetVehicle {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as VehicleType) ?? 'sedan',
    description: (c.description as string) ?? '',
    status: (c.status as VehicleStatus) ?? 'active',
    plateNumber: (c.plateNumber as string) ?? '',
    make: (c.make as string) ?? '',
    model: (c.model as string) ?? '',
    year: (c.year as number) ?? 0,
    capacity: (c.capacity as number) ?? 1,
    fuelType: (c.fuelType as string) ?? '',
    mileage: (c.mileage as number) ?? 0,
    lastServiceDate: c.lastServiceDate ? new Date(c.lastServiceDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoute(row: MemoryRow): TransportRoute {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RouteType) ?? 'employee_shuttle',
    description: (c.description as string) ?? '',
    status: (c.status as RouteStatus) ?? 'active',
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    stops: (c.stops as string[]) ?? [],
    distance: (c.distance as number) ?? 0,
    estimatedDuration: (c.estimatedDuration as number) ?? 0,
    schedule: (c.schedule as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAssignment(row: MemoryRow): DriverAssignment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    vehicleId: (c.vehicleId as string) ?? null,
    routeId: (c.routeId as string) ?? null,
    type: (c.type as AssignmentType) ?? 'primary',
    description: (c.description as string) ?? '',
    status: (c.status as AssignmentStatus) ?? 'assigned',
    driverName: (c.driverName as string) ?? '',
    driverLicense: (c.driverLicense as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTrip(row: MemoryRow): TransportTrip {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    vehicleId: (c.vehicleId as string) ?? null,
    routeId: (c.routeId as string) ?? null,
    assignmentId: (c.assignmentId as string) ?? null,
    type: (c.type as TripType) ?? 'scheduled',
    description: (c.description as string) ?? '',
    status: (c.status as TripStatus) ?? 'scheduled',
    driverName: (c.driverName as string) ?? '',
    passengerCount: (c.passengerCount as number) ?? 0,
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const TransportationManagementService = {
  // ── Vehicles ──

  async createVehicle(organizationId: string, workspaceId: string, input: CreateVehicleInput, createdBy: string): Promise<FleetVehicle> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      plateNumber: input.plateNumber ?? '',
      make: input.make ?? '',
      model: input.model ?? '',
      year: input.year ?? 0,
      capacity: input.capacity ?? 1,
      fuelType: input.fuelType ?? '',
      mileage: input.mileage ?? 0,
      lastServiceDate: input.lastServiceDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'fleet_vehicle',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['fleet_vehicle', content.type, content.status]),
        createdBy,
      },
    });
    return toVehicle(row as MemoryRow);
  },

  async getVehicle(id: string): Promise<FleetVehicle | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'fleet_vehicle') return null;
    return toVehicle(row as MemoryRow);
  },

  async listVehicles(organizationId: string, opts: ListVehiclesOpts = {}): Promise<FleetVehicle[]> {
    const where: Record<string, unknown> = { organizationId, type: 'fleet_vehicle' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVehicle);
  },

  async updateVehicle(id: string, input: UpdateVehicleInput): Promise<FleetVehicle | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.plateNumber !== undefined && { plateNumber: input.plateNumber }),
      ...(input.make !== undefined && { make: input.make }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.year !== undefined && { year: input.year }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.fuelType !== undefined && { fuelType: input.fuelType }),
      ...(input.mileage !== undefined && { mileage: input.mileage }),
      ...(input.lastServiceDate !== undefined && { lastServiceDate: input.lastServiceDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['fleet_vehicle', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVehicle(row as MemoryRow);
  },

  async deleteVehicle(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateVehicle(id: string, _activatedBy: string): Promise<FleetVehicle | null> {
    return TransportationManagementService.updateVehicle(id, { status: 'active' });
  },

  async maintainVehicle(id: string, _maintainedBy: string): Promise<FleetVehicle | null> {
    return TransportationManagementService.updateVehicle(id, { status: 'maintained', lastServiceDate: new Date().toISOString() });
  },

  async retireVehicle(id: string, _retiredBy: string): Promise<FleetVehicle | null> {
    return TransportationManagementService.updateVehicle(id, { status: 'retired' });
  },

  async decommissionVehicle(id: string, _decommissionedBy: string): Promise<FleetVehicle | null> {
    return TransportationManagementService.updateVehicle(id, { status: 'decommissioned' });
  },

  // ── Routes ──

  async createRoute(organizationId: string, workspaceId: string, input: CreateRouteInput, createdBy: string): Promise<TransportRoute> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      origin: input.origin ?? '',
      destination: input.destination ?? '',
      stops: input.stops ?? [],
      distance: input.distance ?? 0,
      estimatedDuration: input.estimatedDuration ?? 0,
      schedule: input.schedule ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'transport_route',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['transport_route', content.type, content.status]),
        createdBy,
      },
    });
    return toRoute(row as MemoryRow);
  },

  async getRoute(id: string): Promise<TransportRoute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'transport_route') return null;
    return toRoute(row as MemoryRow);
  },

  async listRoutes(organizationId: string, opts: ListRoutesOpts = {}): Promise<TransportRoute[]> {
    const where: Record<string, unknown> = { organizationId, type: 'transport_route' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRoute);
  },

  async updateRoute(id: string, input: UpdateRouteInput): Promise<TransportRoute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.stops !== undefined && { stops: input.stops }),
      ...(input.distance !== undefined && { distance: input.distance }),
      ...(input.estimatedDuration !== undefined && { estimatedDuration: input.estimatedDuration }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['transport_route', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRoute(row as MemoryRow);
  },

  async deleteRoute(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRoute(id: string, _activatedBy: string): Promise<TransportRoute | null> {
    return TransportationManagementService.updateRoute(id, { status: 'active' });
  },

  async suspendRoute(id: string, _suspendedBy: string): Promise<TransportRoute | null> {
    return TransportationManagementService.updateRoute(id, { status: 'suspended' });
  },

  async deactivateRoute(id: string, _deactivatedBy: string): Promise<TransportRoute | null> {
    return TransportationManagementService.updateRoute(id, { status: 'deactivated' });
  },

  // ── Assignments ──

  async createAssignment(organizationId: string, workspaceId: string, input: CreateAssignmentInput, createdBy: string): Promise<DriverAssignment> {
    const content = {
      vehicleId: input.vehicleId ?? null,
      routeId: input.routeId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'assigned',
      driverName: input.driverName ?? '',
      driverLicense: input.driverLicense ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'driver_assignment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.vehicleId ?? input.routeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['driver_assignment', content.type, content.status]),
        createdBy,
      },
    });
    return toAssignment(row as MemoryRow);
  },

  async getAssignment(id: string): Promise<DriverAssignment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'driver_assignment') return null;
    return toAssignment(row as MemoryRow);
  },

  async listAssignments(organizationId: string, opts: ListAssignmentsOpts = {}): Promise<DriverAssignment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'driver_assignment' };
    const conditions: unknown[] = [];
    if (opts.vehicleId) conditions.push({ content: { contains: `"vehicleId":"${opts.vehicleId}"` } });
    if (opts.routeId) conditions.push({ content: { contains: `"routeId":"${opts.routeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAssignment);
  },

  async updateAssignment(id: string, input: UpdateAssignmentInput): Promise<DriverAssignment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.vehicleId !== undefined && { vehicleId: input.vehicleId }),
      ...(input.routeId !== undefined && { routeId: input.routeId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.driverName !== undefined && { driverName: input.driverName }),
      ...(input.driverLicense !== undefined && { driverLicense: input.driverLicense }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['driver_assignment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAssignment(row as MemoryRow);
  },

  async deleteAssignment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async assignAssignment(id: string, _assignedBy: string): Promise<DriverAssignment | null> {
    return TransportationManagementService.updateAssignment(id, { status: 'assigned', startDate: new Date().toISOString() });
  },

  async completeAssignment(id: string, _completedBy: string): Promise<DriverAssignment | null> {
    return TransportationManagementService.updateAssignment(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async cancelAssignment(id: string, _cancelledBy: string): Promise<DriverAssignment | null> {
    return TransportationManagementService.updateAssignment(id, { status: 'cancelled' });
  },

  // ── Trips ──

  async createTrip(organizationId: string, workspaceId: string, input: CreateTripInput, createdBy: string): Promise<TransportTrip> {
    const content = {
      vehicleId: input.vehicleId ?? null,
      routeId: input.routeId ?? null,
      assignmentId: input.assignmentId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      driverName: input.driverName ?? '',
      passengerCount: input.passengerCount ?? 0,
      scheduledDate: input.scheduledDate ?? null,
      startDate: input.startDate ?? null,
      completedDate: input.completedDate ?? null,
      origin: input.origin ?? '',
      destination: input.destination ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'transport_trip',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.vehicleId ?? input.routeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['transport_trip', content.type, content.status]),
        createdBy,
      },
    });
    return toTrip(row as MemoryRow);
  },

  async getTrip(id: string): Promise<TransportTrip | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'transport_trip') return null;
    return toTrip(row as MemoryRow);
  },

  async listTrips(organizationId: string, opts: ListTripsOpts = {}): Promise<TransportTrip[]> {
    const where: Record<string, unknown> = { organizationId, type: 'transport_trip' };
    const conditions: unknown[] = [];
    if (opts.vehicleId) conditions.push({ content: { contains: `"vehicleId":"${opts.vehicleId}"` } });
    if (opts.routeId) conditions.push({ content: { contains: `"routeId":"${opts.routeId}"` } });
    if (opts.assignmentId) conditions.push({ content: { contains: `"assignmentId":"${opts.assignmentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTrip);
  },

  async updateTrip(id: string, input: UpdateTripInput): Promise<TransportTrip | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.vehicleId !== undefined && { vehicleId: input.vehicleId }),
      ...(input.routeId !== undefined && { routeId: input.routeId }),
      ...(input.assignmentId !== undefined && { assignmentId: input.assignmentId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.driverName !== undefined && { driverName: input.driverName }),
      ...(input.passengerCount !== undefined && { passengerCount: input.passengerCount }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['transport_trip', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTrip(row as MemoryRow);
  },

  async deleteTrip(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleTrip(id: string, _scheduledBy: string): Promise<TransportTrip | null> {
    return TransportationManagementService.updateTrip(id, { status: 'scheduled' });
  },

  async startTrip(id: string, _startedBy: string): Promise<TransportTrip | null> {
    return TransportationManagementService.updateTrip(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async completeTrip(id: string, _completedBy: string): Promise<TransportTrip | null> {
    return TransportationManagementService.updateTrip(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async cancelTrip(id: string, _cancelledBy: string): Promise<TransportTrip | null> {
    return TransportationManagementService.updateTrip(id, { status: 'cancelled' });
  },

  async noShowTrip(id: string, _markedBy: string): Promise<TransportTrip | null> {
    return TransportationManagementService.updateTrip(id, { status: 'no_show' });
  },

  // ── Metrics & Stats ──

  async getTransportationManagementMetrics(organizationId: string): Promise<TransportationManagementMetrics> {
    const [vehicles, routes, assignments, trips] = await Promise.all([
      TransportationManagementService.listVehicles(organizationId),
      TransportationManagementService.listRoutes(organizationId),
      TransportationManagementService.listAssignments(organizationId),
      TransportationManagementService.listTrips(organizationId),
    ]);
    return {
      activeVehicles: vehicles.filter((v) => v.status === 'active').length,
      activeRoutes: routes.filter((r) => r.status === 'active').length,
      activeAssignments: assignments.filter((a) => a.status === 'assigned').length,
      scheduledTrips: trips.filter((t) => t.status === 'scheduled').length,
      completedTrips: trips.filter((t) => t.status === 'completed').length,
    };
  },

  async getTransportationManagementStats(organizationId: string): Promise<TransportationManagementStats> {
    const [vehicles, routes, assignments, trips] = await Promise.all([
      TransportationManagementService.listVehicles(organizationId),
      TransportationManagementService.listRoutes(organizationId),
      TransportationManagementService.listAssignments(organizationId),
      TransportationManagementService.listTrips(organizationId),
    ]);
    const byVehicleType: Record<string, number> = {};
    const byVehicleStatus: Record<string, number> = {};
    const byRouteType: Record<string, number> = {};
    const byRouteStatus: Record<string, number> = {};
    const byAssignmentType: Record<string, number> = {};
    const byAssignmentStatus: Record<string, number> = {};
    const byTripType: Record<string, number> = {};
    const byTripStatus: Record<string, number> = {};
    for (const v of vehicles) { byVehicleType[v.type] = (byVehicleType[v.type] ?? 0) + 1; byVehicleStatus[v.status] = (byVehicleStatus[v.status] ?? 0) + 1; }
    for (const r of routes) { byRouteType[r.type] = (byRouteType[r.type] ?? 0) + 1; byRouteStatus[r.status] = (byRouteStatus[r.status] ?? 0) + 1; }
    for (const a of assignments) { byAssignmentType[a.type] = (byAssignmentType[a.type] ?? 0) + 1; byAssignmentStatus[a.status] = (byAssignmentStatus[a.status] ?? 0) + 1; }
    for (const t of trips) { byTripType[t.type] = (byTripType[t.type] ?? 0) + 1; byTripStatus[t.status] = (byTripStatus[t.status] ?? 0) + 1; }
    return {
      vehicleCount: vehicles.length,
      routeCount: routes.length,
      assignmentCount: assignments.length,
      tripCount: trips.length,
      byVehicleType, byVehicleStatus, byRouteType, byRouteStatus, byAssignmentType, byAssignmentStatus, byTripType, byTripStatus,
    };
  },
};
