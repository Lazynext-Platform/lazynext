import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CenterType = 'warehouse' | 'cross_dock' | 'fulfillment' | 'regional' | 'central' | 'hub' | 'spoke';
export type CenterStatus = 'active' | 'inactive' | 'maintenance' | 'planned' | 'closed';
export type ChannelType = 'direct' | 'wholesale' | 'retail' | 'ecommerce' | 'marketplace' | 'distributor' | 'reseller' | 'affiliate';
export type ChannelStatus = 'active' | 'inactive' | 'paused' | 'discontinued';
export type FulfillmentType = 'standard' | 'express' | 'same_day' | 'next_day' | 'pickup' | 'dropship' | 'bulk' | 'international';
export type FulfillmentStatus = 'pending' | 'allocated' | 'picked' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
export type NetworkType = 'domestic' | 'international' | 'regional' | 'global' | 'local';
export type NetworkStatus = 'active' | 'inactive' | 'planned' | 'deprecated';

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

export interface DistributionCenter {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CenterType;
  location: string;
  address: string;
  capacity: number;
  status: CenterStatus;
  manager: string;
  operatingHours: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistributionChannel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ChannelType;
  description: string;
  status: ChannelStatus;
  partnerId: string | null;
  partnerName: string;
  commission: number;
  territory: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FulfillmentOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  orderId: string;
  type: FulfillmentType;
  status: FulfillmentStatus;
  centerId: string | null;
  channelId: string | null;
  customerId: string | null;
  customerName: string;
  items: unknown;
  shipTo: string;
  trackingNumber: string;
  carrier: string;
  priority: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistributionNetwork {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: NetworkType;
  description: string;
  status: NetworkStatus;
  nodes: unknown;
  routes: unknown;
  coverage: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistributionMetrics {
  activeCenters: number;
  activeChannels: number;
  pendingFulfillments: number;
  deliveredFulfillments: number;
  fulfillmentRate: number;
}

export interface DistributionStats {
  centerCount: number;
  channelCount: number;
  fulfillmentCount: number;
  networkCount: number;
  activeCenterCount: number;
  activeChannelCount: number;
  pendingFulfillmentCount: number;
  deliveredFulfillmentCount: number;
  byCenterType: Record<string, number>;
  byCenterStatus: Record<string, number>;
  byChannelType: Record<string, number>;
  byChannelStatus: Record<string, number>;
  byFulfillmentStatus: Record<string, number>;
  byNetworkType: Record<string, number>;
}

// ── Input / Options ──

export interface CreateCenterInput {
  name: string;
  type: CenterType;
  location?: string;
  address?: string;
  capacity?: number;
  status?: CenterStatus;
  manager?: string;
  operatingHours?: string;
  notes?: string;
}

export interface UpdateCenterInput {
  name?: string;
  type?: CenterType;
  location?: string;
  address?: string;
  capacity?: number;
  status?: CenterStatus;
  manager?: string;
  operatingHours?: string;
  notes?: string;
}

export interface ListCentersOpts {
  type?: CenterType;
  status?: CenterStatus;
}

export interface CreateChannelInput {
  name: string;
  type: ChannelType;
  description?: string;
  status?: ChannelStatus;
  partnerId?: string;
  partnerName?: string;
  commission?: number;
  territory?: string;
  notes?: string;
}

export interface UpdateChannelInput {
  name?: string;
  type?: ChannelType;
  description?: string;
  status?: ChannelStatus;
  partnerId?: string;
  partnerName?: string;
  commission?: number;
  territory?: string;
  notes?: string;
}

export interface ListChannelsOpts {
  type?: ChannelType;
  status?: ChannelStatus;
}

export interface CreateFulfillmentInput {
  orderId: string;
  type: FulfillmentType;
  status?: FulfillmentStatus;
  centerId?: string;
  channelId?: string;
  customerId?: string;
  customerName?: string;
  items?: unknown;
  shipTo?: string;
  trackingNumber?: string;
  carrier?: string;
  priority?: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface UpdateFulfillmentInput {
  orderId?: string;
  type?: FulfillmentType;
  status?: FulfillmentStatus;
  centerId?: string;
  channelId?: string;
  customerId?: string;
  customerName?: string;
  items?: unknown;
  shipTo?: string;
  trackingNumber?: string;
  carrier?: string;
  priority?: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface ListFulfillmentsOpts {
  type?: FulfillmentType;
  status?: FulfillmentStatus;
  centerId?: string;
  channelId?: string;
}

export interface CreateNetworkInput {
  name: string;
  type: NetworkType;
  description?: string;
  status?: NetworkStatus;
  nodes?: unknown;
  routes?: unknown;
  coverage?: string;
  notes?: string;
}

export interface UpdateNetworkInput {
  name?: string;
  type?: NetworkType;
  description?: string;
  status?: NetworkStatus;
  nodes?: unknown;
  routes?: unknown;
  coverage?: string;
  notes?: string;
}

export interface ListNetworksOpts {
  type?: NetworkType;
  status?: NetworkStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toCenter(row: MemoryRow): DistributionCenter {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CenterType) ?? 'warehouse',
    location: (c.location as string) ?? '',
    address: (c.address as string) ?? '',
    capacity: (c.capacity as number) ?? 0,
    status: (c.status as CenterStatus) ?? 'active',
    manager: (c.manager as string) ?? '',
    operatingHours: (c.operatingHours as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toChannel(row: MemoryRow): DistributionChannel {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ChannelType) ?? 'direct',
    description: (c.description as string) ?? '',
    status: (c.status as ChannelStatus) ?? 'active',
    partnerId: (c.partnerId as string) ?? null,
    partnerName: (c.partnerName as string) ?? '',
    commission: (c.commission as number) ?? 0,
    territory: (c.territory as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFulfillment(row: MemoryRow): FulfillmentOrder {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    orderId: (c.orderId as string) ?? '',
    type: (c.type as FulfillmentType) ?? 'standard',
    status: (c.status as FulfillmentStatus) ?? 'pending',
    centerId: (c.centerId as string) ?? null,
    channelId: (c.channelId as string) ?? null,
    customerId: (c.customerId as string) ?? null,
    customerName: (c.customerName as string) ?? '',
    items: c.items ?? null,
    shipTo: (c.shipTo as string) ?? '',
    trackingNumber: (c.trackingNumber as string) ?? '',
    carrier: (c.carrier as string) ?? '',
    priority: (c.priority as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toNetwork(row: MemoryRow): DistributionNetwork {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as NetworkType) ?? 'domestic',
    description: (c.description as string) ?? '',
    status: (c.status as NetworkStatus) ?? 'active',
    nodes: c.nodes ?? null,
    routes: c.routes ?? null,
    coverage: (c.coverage as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const DistributionService = {
  // ── Centers ──

  async createCenter(organizationId: string, workspaceId: string, input: CreateCenterInput, createdBy: string): Promise<DistributionCenter> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      location: input.location ?? '',
      address: input.address ?? '',
      capacity: input.capacity ?? 0,
      status: input.status ?? 'active',
      manager: input.manager ?? '',
      operatingHours: input.operatingHours ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'dist_center',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dist_center', content.type, content.status]),
        createdBy,
      },
    });
    return toCenter(row as MemoryRow);
  },

  async getCenter(id: string): Promise<DistributionCenter | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dist_center') return null;
    return toCenter(row as MemoryRow);
  },

  async listCenters(organizationId: string, opts: ListCentersOpts = {}): Promise<DistributionCenter[]> {
    const where: Record<string, unknown> = { organizationId, type: 'dist_center' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCenter);
  },

  async updateCenter(id: string, input: UpdateCenterInput): Promise<DistributionCenter | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.manager !== undefined && { manager: input.manager }),
      ...(input.operatingHours !== undefined && { operatingHours: input.operatingHours }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['dist_center', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCenter(row as MemoryRow);
  },

  async deleteCenter(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Channels ──

  async createChannel(organizationId: string, workspaceId: string, input: CreateChannelInput, createdBy: string): Promise<DistributionChannel> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      partnerId: input.partnerId ?? null,
      partnerName: input.partnerName ?? '',
      commission: input.commission ?? 0,
      territory: input.territory ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'dist_channel',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.partnerId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dist_channel', content.type, content.status]),
        createdBy,
      },
    });
    return toChannel(row as MemoryRow);
  },

  async getChannel(id: string): Promise<DistributionChannel | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dist_channel') return null;
    return toChannel(row as MemoryRow);
  },

  async listChannels(organizationId: string, opts: ListChannelsOpts = {}): Promise<DistributionChannel[]> {
    const where: Record<string, unknown> = { organizationId, type: 'dist_channel' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toChannel);
  },

  async updateChannel(id: string, input: UpdateChannelInput): Promise<DistributionChannel | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.partnerId !== undefined && { partnerId: input.partnerId }),
      ...(input.partnerName !== undefined && { partnerName: input.partnerName }),
      ...(input.commission !== undefined && { commission: input.commission }),
      ...(input.territory !== undefined && { territory: input.territory }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['dist_channel', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  async deleteChannel(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async pauseChannel(id: string, _pausedBy: string): Promise<DistributionChannel | null> {
    return DistributionService.updateChannel(id, { status: 'paused' });
  },

  async activateChannel(id: string, _activatedBy: string): Promise<DistributionChannel | null> {
    return DistributionService.updateChannel(id, { status: 'active' });
  },

  // ── Fulfillments ──

  async createFulfillment(organizationId: string, workspaceId: string, input: CreateFulfillmentInput, createdBy: string): Promise<FulfillmentOrder> {
    const content = {
      orderId: input.orderId,
      type: input.type,
      status: input.status ?? 'pending',
      centerId: input.centerId ?? null,
      channelId: input.channelId ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? '',
      items: input.items ?? null,
      shipTo: input.shipTo ?? '',
      trackingNumber: input.trackingNumber ?? '',
      carrier: input.carrier ?? '',
      priority: input.priority ?? '',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'fulfillment_order',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.orderId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['fulfillment_order', content.type, content.status]),
        createdBy,
      },
    });
    return toFulfillment(row as MemoryRow);
  },

  async getFulfillment(id: string): Promise<FulfillmentOrder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'fulfillment_order') return null;
    return toFulfillment(row as MemoryRow);
  },

  async listFulfillments(organizationId: string, opts: ListFulfillmentsOpts = {}): Promise<FulfillmentOrder[]> {
    const where: Record<string, unknown> = { organizationId, type: 'fulfillment_order' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.centerId) conditions.push({ content: { contains: `"centerId":"${opts.centerId}"` } });
    if (opts.channelId) conditions.push({ content: { contains: `"channelId":"${opts.channelId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toFulfillment);
  },

  async updateFulfillment(id: string, input: UpdateFulfillmentInput): Promise<FulfillmentOrder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.orderId !== undefined && { orderId: input.orderId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.centerId !== undefined && { centerId: input.centerId }),
      ...(input.channelId !== undefined && { channelId: input.channelId }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
      ...(input.customerName !== undefined && { customerName: input.customerName }),
      ...(input.items !== undefined && { items: input.items }),
      ...(input.shipTo !== undefined && { shipTo: input.shipTo }),
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
      ...(input.carrier !== undefined && { carrier: input.carrier }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['fulfillment_order', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toFulfillment(row as MemoryRow);
  },

  async deleteFulfillment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async allocateFulfillment(id: string, _allocatedBy: string): Promise<FulfillmentOrder | null> {
    return DistributionService.updateFulfillment(id, { status: 'allocated' });
  },

  async pickFulfillment(id: string, _pickedBy: string): Promise<FulfillmentOrder | null> {
    return DistributionService.updateFulfillment(id, { status: 'picked' });
  },

  async packFulfillment(id: string, _packedBy: string): Promise<FulfillmentOrder | null> {
    return DistributionService.updateFulfillment(id, { status: 'packed' });
  },

  async shipFulfillment(id: string, _shippedBy: string): Promise<FulfillmentOrder | null> {
    return DistributionService.updateFulfillment(id, { status: 'shipped' });
  },

  async deliverFulfillment(id: string, _deliveredBy: string): Promise<FulfillmentOrder | null> {
    return DistributionService.updateFulfillment(id, { status: 'delivered', completedDate: new Date().toISOString() });
  },

  // ── Networks ──

  async createNetwork(organizationId: string, workspaceId: string, input: CreateNetworkInput, createdBy: string): Promise<DistributionNetwork> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      nodes: input.nodes ?? null,
      routes: input.routes ?? null,
      coverage: input.coverage ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'dist_network',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dist_network', content.type, content.status]),
        createdBy,
      },
    });
    return toNetwork(row as MemoryRow);
  },

  async getNetwork(id: string): Promise<DistributionNetwork | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dist_network') return null;
    return toNetwork(row as MemoryRow);
  },

  async listNetworks(organizationId: string, opts: ListNetworksOpts = {}): Promise<DistributionNetwork[]> {
    const where: Record<string, unknown> = { organizationId, type: 'dist_network' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toNetwork);
  },

  async updateNetwork(id: string, input: UpdateNetworkInput): Promise<DistributionNetwork | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.nodes !== undefined && { nodes: input.nodes }),
      ...(input.routes !== undefined && { routes: input.routes }),
      ...(input.coverage !== undefined && { coverage: input.coverage }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['dist_network', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toNetwork(row as MemoryRow);
  },

  async deleteNetwork(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getDistributionMetrics(organizationId: string): Promise<DistributionMetrics> {
    const [centers, channels, fulfillments] = await Promise.all([
      DistributionService.listCenters(organizationId),
      DistributionService.listChannels(organizationId),
      DistributionService.listFulfillments(organizationId),
    ]);
    const activeCenters = centers.filter((c) => c.status === 'active').length;
    const activeChannels = channels.filter((c) => c.status === 'active').length;
    const pendingFulfillments = fulfillments.filter((f) => f.status === 'pending' || f.status === 'allocated' || f.status === 'picked' || f.status === 'packed').length;
    const deliveredFulfillments = fulfillments.filter((f) => f.status === 'delivered').length;
    const fulfillmentRate = fulfillments.length > 0 ? Math.round((deliveredFulfillments / fulfillments.length) * 100) : 0;
    return { activeCenters, activeChannels, pendingFulfillments, deliveredFulfillments, fulfillmentRate };
  },

  async getDistributionStats(organizationId: string): Promise<DistributionStats> {
    const [centers, channels, fulfillments, networks] = await Promise.all([
      DistributionService.listCenters(organizationId),
      DistributionService.listChannels(organizationId),
      DistributionService.listFulfillments(organizationId),
      DistributionService.listNetworks(organizationId),
    ]);
    const byCenterType: Record<string, number> = {};
    const byCenterStatus: Record<string, number> = {};
    const byChannelType: Record<string, number> = {};
    const byChannelStatus: Record<string, number> = {};
    const byFulfillmentStatus: Record<string, number> = {};
    const byNetworkType: Record<string, number> = {};
    for (const c of centers) { byCenterType[c.type] = (byCenterType[c.type] ?? 0) + 1; byCenterStatus[c.status] = (byCenterStatus[c.status] ?? 0) + 1; }
    for (const c of channels) { byChannelType[c.type] = (byChannelType[c.type] ?? 0) + 1; byChannelStatus[c.status] = (byChannelStatus[c.status] ?? 0) + 1; }
    for (const f of fulfillments) { byFulfillmentStatus[f.status] = (byFulfillmentStatus[f.status] ?? 0) + 1; }
    for (const n of networks) { byNetworkType[n.type] = (byNetworkType[n.type] ?? 0) + 1; }
    return {
      centerCount: centers.length,
      channelCount: channels.length,
      fulfillmentCount: fulfillments.length,
      networkCount: networks.length,
      activeCenterCount: centers.filter((c) => c.status === 'active').length,
      activeChannelCount: channels.filter((c) => c.status === 'active').length,
      pendingFulfillmentCount: fulfillments.filter((f) => f.status === 'pending' || f.status === 'allocated' || f.status === 'picked' || f.status === 'packed').length,
      deliveredFulfillmentCount: fulfillments.filter((f) => f.status === 'delivered').length,
      byCenterType, byCenterStatus, byChannelType, byChannelStatus, byFulfillmentStatus, byNetworkType,
    };
  },
};
