import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ShipmentType = 'inbound' | 'outbound' | 'transfer' | 'return' | 'cross_dock';
export type ShipmentStatus = 'draft' | 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delayed' | 'cancelled' | 'exception';
export type CarrierType = 'parcel' | 'ltl' | 'ftl' | 'air' | 'sea' | 'rail' | 'courier' | 'intermodal';
export type CarrierStatus = 'active' | 'inactive' | 'preferred' | 'blocked';
export type RouteType = 'standard' | 'express' | 'economy' | 'same_day' | 'next_day' | 'custom';
export type RouteStatus = 'active' | 'inactive' | 'seasonal' | 'discontinued';
export type FreightType = 'dry' | 'refrigerated' | 'frozen' | 'hazardous' | 'oversized' | 'liquid' | 'fragile' | 'general';
export type FreightStatus = 'pending' | 'loaded' | 'in_transit' | 'unloaded' | 'damaged' | 'lost';

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

export interface LogisticsShipment {
  id: string;
  organizationId: string;
  workspaceId: string;
  trackingNumber: string;
  type: ShipmentType;
  status: ShipmentStatus;
  carrierId: string | null;
  origin: string;
  destination: string;
  weight: number;
  cost: number;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogisticsCarrier {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CarrierType;
  status: CarrierStatus;
  contact: string;
  phone: string;
  email: string;
  rating: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogisticsRoute {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RouteType;
  status: RouteStatus;
  origin: string;
  destination: string;
  distance: number;
  estimatedTime: number;
  cost: number;
  carrierId: string | null;
  stops: string[];
  schedule: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FreightRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  shipmentId: string | null;
  type: FreightType;
  status: FreightStatus;
  description: string;
  weight: number;
  volume: number;
  units: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogisticsMetrics {
  activeShipments: number;
  deliveredShipments: number;
  inTransitShipments: number;
  delayedShipments: number;
  carrierCount: number;
}

export interface LogisticsStats {
  shipmentCount: number;
  carrierCount: number;
  routeCount: number;
  freightCount: number;
  byShipmentType: Record<string, number>;
  byShipmentStatus: Record<string, number>;
  byCarrierType: Record<string, number>;
  byCarrierStatus: Record<string, number>;
  byRouteType: Record<string, number>;
  byRouteStatus: Record<string, number>;
  byFreightType: Record<string, number>;
  byFreightStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateShipmentInput {
  trackingNumber: string;
  type: ShipmentType;
  status?: ShipmentStatus;
  carrierId?: string;
  origin?: string;
  destination?: string;
  weight?: number;
  cost?: number;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
}

export interface UpdateShipmentInput {
  trackingNumber?: string;
  type?: ShipmentType;
  status?: ShipmentStatus;
  carrierId?: string;
  origin?: string;
  destination?: string;
  weight?: number;
  cost?: number;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
}

export interface ListShipmentsOpts {
  type?: ShipmentType;
  status?: ShipmentStatus;
  carrierId?: string;
}

export interface CreateCarrierInput {
  name: string;
  type: CarrierType;
  status?: CarrierStatus;
  contact?: string;
  phone?: string;
  email?: string;
  rating?: number;
  notes?: string;
}

export interface UpdateCarrierInput {
  name?: string;
  type?: CarrierType;
  status?: CarrierStatus;
  contact?: string;
  phone?: string;
  email?: string;
  rating?: number;
  notes?: string;
}

export interface ListCarriersOpts {
  type?: CarrierType;
  status?: CarrierStatus;
}

export interface CreateRouteInput {
  name: string;
  type: RouteType;
  origin: string;
  destination: string;
  distance?: number;
  estimatedTime?: number;
  cost?: number;
  status?: RouteStatus;
  carrierId?: string;
  stops?: string[];
  schedule?: string;
  notes?: string;
}

export interface UpdateRouteInput {
  name?: string;
  type?: RouteType;
  origin?: string;
  destination?: string;
  distance?: number;
  estimatedTime?: number;
  cost?: number;
  status?: RouteStatus;
  carrierId?: string;
  stops?: string[];
  schedule?: string;
  notes?: string;
}

export interface ListRoutesOpts {
  type?: RouteType;
  status?: RouteStatus;
  carrierId?: string;
}

export interface CreateFreightInput {
  shipmentId?: string;
  type: FreightType;
  status?: FreightStatus;
  description?: string;
  weight?: number;
  volume?: number;
  units?: number;
  notes?: string;
}

export interface UpdateFreightInput {
  shipmentId?: string;
  type?: FreightType;
  status?: FreightStatus;
  description?: string;
  weight?: number;
  volume?: number;
  units?: number;
  notes?: string;
}

export interface ListFreightsOpts {
  shipmentId?: string;
  type?: FreightType;
  status?: FreightStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toShipment(row: MemoryRow): LogisticsShipment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    trackingNumber: (c.trackingNumber as string) ?? '',
    type: (c.type as ShipmentType) ?? 'outbound',
    status: (c.status as ShipmentStatus) ?? 'draft',
    carrierId: (c.carrierId as string) ?? null,
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    weight: (c.weight as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    estimatedDelivery: c.estimatedDelivery ? new Date(c.estimatedDelivery as string) : null,
    actualDelivery: c.actualDelivery ? new Date(c.actualDelivery as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCarrier(row: MemoryRow): LogisticsCarrier {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CarrierType) ?? 'parcel',
    status: (c.status as CarrierStatus) ?? 'active',
    contact: (c.contact as string) ?? '',
    phone: (c.phone as string) ?? '',
    email: (c.email as string) ?? '',
    rating: (c.rating as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoute(row: MemoryRow): LogisticsRoute {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RouteType) ?? 'standard',
    status: (c.status as RouteStatus) ?? 'active',
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    distance: (c.distance as number) ?? 0,
    estimatedTime: (c.estimatedTime as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    carrierId: (c.carrierId as string) ?? null,
    stops: (c.stops as string[]) ?? [],
    schedule: (c.schedule as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFreight(row: MemoryRow): FreightRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    shipmentId: (c.shipmentId as string) ?? null,
    type: (c.type as FreightType) ?? 'general',
    status: (c.status as FreightStatus) ?? 'pending',
    description: (c.description as string) ?? '',
    weight: (c.weight as number) ?? 0,
    volume: (c.volume as number) ?? 0,
    units: (c.units as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const LogisticsService = {
  // ── Shipments ──

  async createShipment(organizationId: string, workspaceId: string, input: CreateShipmentInput, createdBy: string): Promise<LogisticsShipment> {
    const content = {
      trackingNumber: input.trackingNumber.trim(),
      type: input.type,
      status: input.status ?? 'draft',
      carrierId: input.carrierId ?? null,
      origin: input.origin ?? '',
      destination: input.destination ?? '',
      weight: input.weight ?? 0,
      cost: input.cost ?? 0,
      estimatedDelivery: input.estimatedDelivery ?? null,
      actualDelivery: input.actualDelivery ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'logistics_shipment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.carrierId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['logistics_shipment', content.type, content.status]),
        createdBy,
      },
    });
    return toShipment(row as MemoryRow);
  },

  async getShipment(id: string): Promise<LogisticsShipment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'logistics_shipment') return null;
    return toShipment(row as MemoryRow);
  },

  async listShipments(organizationId: string, opts: ListShipmentsOpts = {}): Promise<LogisticsShipment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'logistics_shipment' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.carrierId) conditions.push({ content: { contains: `"carrierId":"${opts.carrierId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toShipment);
  },

  async updateShipment(id: string, input: UpdateShipmentInput): Promise<LogisticsShipment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.carrierId !== undefined && { carrierId: input.carrierId }),
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.estimatedDelivery !== undefined && { estimatedDelivery: input.estimatedDelivery }),
      ...(input.actualDelivery !== undefined && { actualDelivery: input.actualDelivery }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['logistics_shipment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toShipment(row as MemoryRow);
  },

  async deleteShipment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async bookShipment(id: string, _bookedBy: string): Promise<LogisticsShipment | null> {
    return LogisticsService.updateShipment(id, { status: 'booked' });
  },

  async pickUpShipment(id: string, _pickedUpBy: string): Promise<LogisticsShipment | null> {
    return LogisticsService.updateShipment(id, { status: 'picked_up' });
  },

  async deliverShipment(id: string, _deliveredBy: string): Promise<LogisticsShipment | null> {
    return LogisticsService.updateShipment(id, { status: 'delivered', actualDelivery: new Date().toISOString() });
  },

  // ── Carriers ──

  async createCarrier(organizationId: string, workspaceId: string, input: CreateCarrierInput, createdBy: string): Promise<LogisticsCarrier> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'active',
      contact: input.contact ?? '',
      phone: input.phone ?? '',
      email: input.email ?? '',
      rating: input.rating ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'logistics_carrier',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['logistics_carrier', content.type, content.status]),
        createdBy,
      },
    });
    return toCarrier(row as MemoryRow);
  },

  async getCarrier(id: string): Promise<LogisticsCarrier | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'logistics_carrier') return null;
    return toCarrier(row as MemoryRow);
  },

  async listCarriers(organizationId: string, opts: ListCarriersOpts = {}): Promise<LogisticsCarrier[]> {
    const where: Record<string, unknown> = { organizationId, type: 'logistics_carrier' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCarrier);
  },

  async updateCarrier(id: string, input: UpdateCarrierInput): Promise<LogisticsCarrier | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contact !== undefined && { contact: input.contact }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['logistics_carrier', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCarrier(row as MemoryRow);
  },

  async deleteCarrier(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Routes ──

  async createRoute(organizationId: string, workspaceId: string, input: CreateRouteInput, createdBy: string): Promise<LogisticsRoute> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      origin: input.origin,
      destination: input.destination,
      distance: input.distance ?? 0,
      estimatedTime: input.estimatedTime ?? 0,
      cost: input.cost ?? 0,
      status: input.status ?? 'active',
      carrierId: input.carrierId ?? null,
      stops: input.stops ?? [],
      schedule: input.schedule ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'logistics_route',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.carrierId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['logistics_route', content.type, content.status]),
        createdBy,
      },
    });
    return toRoute(row as MemoryRow);
  },

  async getRoute(id: string): Promise<LogisticsRoute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'logistics_route') return null;
    return toRoute(row as MemoryRow);
  },

  async listRoutes(organizationId: string, opts: ListRoutesOpts = {}): Promise<LogisticsRoute[]> {
    const where: Record<string, unknown> = { organizationId, type: 'logistics_route' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.carrierId) conditions.push({ content: { contains: `"carrierId":"${opts.carrierId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRoute);
  },

  async updateRoute(id: string, input: UpdateRouteInput): Promise<LogisticsRoute | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.distance !== undefined && { distance: input.distance }),
      ...(input.estimatedTime !== undefined && { estimatedTime: input.estimatedTime }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.carrierId !== undefined && { carrierId: input.carrierId }),
      ...(input.stops !== undefined && { stops: input.stops }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['logistics_route', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRoute(row as MemoryRow);
  },

  async deleteRoute(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Freight ──

  async createFreight(organizationId: string, workspaceId: string, input: CreateFreightInput, createdBy: string): Promise<FreightRecord> {
    const content = {
      shipmentId: input.shipmentId ?? null,
      type: input.type,
      status: input.status ?? 'pending',
      description: input.description ?? '',
      weight: input.weight ?? 0,
      volume: input.volume ?? 0,
      units: input.units ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'freight_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.shipmentId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['freight_record', content.type, content.status]),
        createdBy,
      },
    });
    return toFreight(row as MemoryRow);
  },

  async getFreight(id: string): Promise<FreightRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'freight_record') return null;
    return toFreight(row as MemoryRow);
  },

  async listFreights(organizationId: string, opts: ListFreightsOpts = {}): Promise<FreightRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'freight_record' };
    const conditions: unknown[] = [];
    if (opts.shipmentId) conditions.push({ content: { contains: `"shipmentId":"${opts.shipmentId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toFreight);
  },

  async updateFreight(id: string, input: UpdateFreightInput): Promise<FreightRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.shipmentId !== undefined && { shipmentId: input.shipmentId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.volume !== undefined && { volume: input.volume }),
      ...(input.units !== undefined && { units: input.units }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['freight_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toFreight(row as MemoryRow);
  },

  async deleteFreight(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async loadFreight(id: string, _loadedBy: string): Promise<FreightRecord | null> {
    return LogisticsService.updateFreight(id, { status: 'loaded' });
  },

  async unloadFreight(id: string, _unloadedBy: string): Promise<FreightRecord | null> {
    return LogisticsService.updateFreight(id, { status: 'unloaded' });
  },

  // ── Metrics & Stats ──

  async getLogisticsMetrics(organizationId: string): Promise<LogisticsMetrics> {
    const [shipments, carriers] = await Promise.all([
      LogisticsService.listShipments(organizationId),
      LogisticsService.listCarriers(organizationId),
    ]);
    const activeShipments = shipments.filter((s) => s.status === 'booked' || s.status === 'picked_up' || s.status === 'in_transit' || s.status === 'out_for_delivery').length;
    const deliveredShipments = shipments.filter((s) => s.status === 'delivered').length;
    const inTransitShipments = shipments.filter((s) => s.status === 'in_transit' || s.status === 'out_for_delivery').length;
    const delayedShipments = shipments.filter((s) => s.status === 'delayed').length;
    return { activeShipments, deliveredShipments, inTransitShipments, delayedShipments, carrierCount: carriers.length };
  },

  async getLogisticsStats(organizationId: string): Promise<LogisticsStats> {
    const [shipments, carriers, routes, freights] = await Promise.all([
      LogisticsService.listShipments(organizationId),
      LogisticsService.listCarriers(organizationId),
      LogisticsService.listRoutes(organizationId),
      LogisticsService.listFreights(organizationId),
    ]);
    const byShipmentType: Record<string, number> = {};
    const byShipmentStatus: Record<string, number> = {};
    const byCarrierType: Record<string, number> = {};
    const byCarrierStatus: Record<string, number> = {};
    const byRouteType: Record<string, number> = {};
    const byRouteStatus: Record<string, number> = {};
    const byFreightType: Record<string, number> = {};
    const byFreightStatus: Record<string, number> = {};
    for (const s of shipments) { byShipmentType[s.type] = (byShipmentType[s.type] ?? 0) + 1; byShipmentStatus[s.status] = (byShipmentStatus[s.status] ?? 0) + 1; }
    for (const c of carriers) { byCarrierType[c.type] = (byCarrierType[c.type] ?? 0) + 1; byCarrierStatus[c.status] = (byCarrierStatus[c.status] ?? 0) + 1; }
    for (const r of routes) { byRouteType[r.type] = (byRouteType[r.type] ?? 0) + 1; byRouteStatus[r.status] = (byRouteStatus[r.status] ?? 0) + 1; }
    for (const f of freights) { byFreightType[f.type] = (byFreightType[f.type] ?? 0) + 1; byFreightStatus[f.status] = (byFreightStatus[f.status] ?? 0) + 1; }
    return {
      shipmentCount: shipments.length,
      carrierCount: carriers.length,
      routeCount: routes.length,
      freightCount: freights.length,
      byShipmentType, byShipmentStatus, byCarrierType, byCarrierStatus, byRouteType, byRouteStatus, byFreightType, byFreightStatus,
    };
  },
};
