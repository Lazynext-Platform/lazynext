import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ItemType = 'letter' | 'package' | 'certified' | 'registered' | 'express' | 'international' | 'parcel' | 'flat' | 'postcard' | 'bulk_mail';
export type ItemStatus = 'received' | 'sorted' | 'routed' | 'delivered' | 'returned' | 'forwarded' | 'held' | 'lost' | 'destroyed';
export type RouteType = 'internal' | 'external' | 'courier' | 'postal' | 'international' | 'same_day' | 'next_day' | 'bulk';
export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'delayed';
export type DeliveryType = 'desk' | 'department' | 'building' | 'pickup' | 'external' | 'po_box' | 'secure';
export type DeliveryStatus = 'pending' | 'out_for_delivery' | 'delivered' | 'failed' | 'attempted' | 'returned' | 'held';
export type PostageType = 'meter' | 'stamp' | 'indicia' | 'permit' | 'prepaid' | 'business_reply' | 'certified';
export type PostageStatus = 'pending' | 'paid' | 'refunded' | 'adjusted' | 'disputed';

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

export interface MailroomItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  trackingNumber: string;
  type: ItemType;
  sender: string;
  recipient: string;
  description: string;
  status: ItemStatus;
  receivedDate: Date | null;
  weight: number;
  dimensions: string;
  returnAddress: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailroomRoute {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RouteType;
  description: string;
  status: RouteStatus;
  origin: string;
  destination: string;
  carrier: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  stops: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailroomDelivery {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  routeId: string | null;
  type: DeliveryType;
  description: string;
  status: DeliveryStatus;
  recipient: string;
  address: string;
  scheduledDate: Date | null;
  attemptedDate: Date | null;
  deliveredDate: Date | null;
  signatureRequired: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailroomPostage {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  type: PostageType;
  amount: number;
  currency: string;
  description: string;
  status: PostageStatus;
  date: Date | null;
  meterNumber: string;
  permitNumber: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailroomOperationsMetrics {
  pendingItems: number;
  inTransitDeliveries: number;
  activeRoutes: number;
  pendingPostage: number;
  deliveredToday: number;
}

export interface MailroomOperationsStats {
  itemCount: number;
  pendingItemCount: number;
  routeCount: number;
  activeRouteCount: number;
  deliveryCount: number;
  pendingDeliveryCount: number;
  postageCount: number;
  pendingPostageCount: number;
  byItemType: Record<string, number>;
  byItemStatus: Record<string, number>;
  byRouteType: Record<string, number>;
  byRouteStatus: Record<string, number>;
  byDeliveryType: Record<string, number>;
  byDeliveryStatus: Record<string, number>;
  byPostageType: Record<string, number>;
  byPostageStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateItemInput {
  trackingNumber?: string;
  type: ItemType;
  sender?: string;
  recipient?: string;
  description?: string;
  status?: ItemStatus;
  receivedDate?: string;
  weight?: number;
  dimensions?: string;
  returnAddress?: string;
  notes?: string;
}

export interface UpdateItemInput {
  trackingNumber?: string;
  type?: ItemType;
  sender?: string;
  recipient?: string;
  description?: string;
  status?: ItemStatus;
  receivedDate?: string;
  weight?: number;
  dimensions?: string;
  returnAddress?: string;
  notes?: string;
}

export interface ListItemsOpts {
  type?: ItemType;
  status?: ItemStatus;
}

export interface CreateRouteInput {
  name: string;
  type: RouteType;
  description?: string;
  status?: RouteStatus;
  origin?: string;
  destination?: string;
  carrier?: string;
  scheduledDate?: string;
  completedDate?: string;
  stops?: number;
  notes?: string;
}

export interface UpdateRouteInput {
  name?: string;
  type?: RouteType;
  description?: string;
  status?: RouteStatus;
  origin?: string;
  destination?: string;
  carrier?: string;
  scheduledDate?: string;
  completedDate?: string;
  stops?: number;
  notes?: string;
}

export interface ListRoutesOpts {
  type?: RouteType;
  status?: RouteStatus;
}

export interface CreateDeliveryInput {
  itemId: string;
  routeId?: string;
  type: DeliveryType;
  description?: string;
  status?: DeliveryStatus;
  recipient?: string;
  address?: string;
  scheduledDate?: string;
  attemptedDate?: string;
  deliveredDate?: string;
  signatureRequired?: boolean;
  notes?: string;
}

export interface UpdateDeliveryInput {
  itemId?: string;
  routeId?: string;
  type?: DeliveryType;
  description?: string;
  status?: DeliveryStatus;
  recipient?: string;
  address?: string;
  scheduledDate?: string;
  attemptedDate?: string;
  deliveredDate?: string;
  signatureRequired?: boolean;
  notes?: string;
}

export interface ListDeliveriesOpts {
  itemId?: string;
  routeId?: string;
  type?: DeliveryType;
  status?: DeliveryStatus;
}

export interface CreatePostageInput {
  itemId: string;
  type: PostageType;
  amount: number;
  currency?: string;
  description?: string;
  status?: PostageStatus;
  date?: string;
  meterNumber?: string;
  permitNumber?: string;
  notes?: string;
}

export interface UpdatePostageInput {
  itemId?: string;
  type?: PostageType;
  amount?: number;
  currency?: string;
  description?: string;
  status?: PostageStatus;
  date?: string;
  meterNumber?: string;
  permitNumber?: string;
  notes?: string;
}

export interface ListPostageOpts {
  itemId?: string;
  type?: PostageType;
  status?: PostageStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toItem(row: MemoryRow): MailroomItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    trackingNumber: (c.trackingNumber as string) ?? '',
    type: (c.type as ItemType) ?? 'letter',
    sender: (c.sender as string) ?? '',
    recipient: (c.recipient as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as ItemStatus) ?? 'received',
    receivedDate: c.receivedDate ? new Date(c.receivedDate as string) : null,
    weight: (c.weight as number) ?? 0,
    dimensions: (c.dimensions as string) ?? '',
    returnAddress: (c.returnAddress as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoute(row: MemoryRow): MailroomRoute {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RouteType) ?? 'internal',
    description: (c.description as string) ?? '',
    status: (c.status as RouteStatus) ?? 'planned',
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    carrier: (c.carrier as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    stops: (c.stops as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDelivery(row: MemoryRow): MailroomDelivery {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    routeId: (c.routeId as string) ?? null,
    type: (c.type as DeliveryType) ?? 'desk',
    description: (c.description as string) ?? '',
    status: (c.status as DeliveryStatus) ?? 'pending',
    recipient: (c.recipient as string) ?? '',
    address: (c.address as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    attemptedDate: c.attemptedDate ? new Date(c.attemptedDate as string) : null,
    deliveredDate: c.deliveredDate ? new Date(c.deliveredDate as string) : null,
    signatureRequired: (c.signatureRequired as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPostage(row: MemoryRow): MailroomPostage {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    type: (c.type as PostageType) ?? 'meter',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    description: (c.description as string) ?? '',
    status: (c.status as PostageStatus) ?? 'pending',
    date: c.date ? new Date(c.date as string) : null,
    meterNumber: (c.meterNumber as string) ?? '',
    permitNumber: (c.permitNumber as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const MailroomOperationsService = {
  // ── Items ──

  async createItem(organizationId: string, workspaceId: string, input: CreateItemInput, createdBy: string): Promise<MailroomItem> {
    const content = {
      trackingNumber: input.trackingNumber ?? '',
      type: input.type,
      sender: input.sender ?? '',
      recipient: input.recipient ?? '',
      description: input.description ?? '',
      status: input.status ?? 'received',
      receivedDate: input.receivedDate ?? null,
      weight: input.weight ?? 0,
      dimensions: input.dimensions ?? '',
      returnAddress: input.returnAddress ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mailroom_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mailroom_item', content.type, content.status]),
        createdBy,
      },
    });
    return toItem(row as MemoryRow);
  },

  async getItem(id: string): Promise<MailroomItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mailroom_item') return null;
    return toItem(row as MemoryRow);
  },

  async listItems(organizationId: string, opts: ListItemsOpts = {}): Promise<MailroomItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mailroom_item' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toItem);
  },

  async updateItem(id: string, input: UpdateItemInput): Promise<MailroomItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.sender !== undefined && { sender: input.sender }),
      ...(input.recipient !== undefined && { recipient: input.recipient }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.receivedDate !== undefined && { receivedDate: input.receivedDate }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.dimensions !== undefined && { dimensions: input.dimensions }),
      ...(input.returnAddress !== undefined && { returnAddress: input.returnAddress }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mailroom_item', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toItem(row as MemoryRow);
  },

  async deleteItem(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async sortItem(id: string, _sortedBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'sorted' });
  },

  async routeItem(id: string, _routedBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'routed' });
  },

  async deliverItem(id: string, _deliveredBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'delivered' });
  },

  async returnItem(id: string, _returnedBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'returned' });
  },

  async forwardItem(id: string, _forwardedBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'forwarded' });
  },

  async holdItem(id: string, _holdBy: string): Promise<MailroomItem | null> {
    return MailroomOperationsService.updateItem(id, { status: 'held' });
  },

  // ── Routes ──

  async createRoute(organizationId: string, workspaceId: string, input: CreateRouteInput, createdBy: string): Promise<MailroomRoute> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      origin: input.origin ?? '',
      destination: input.destination ?? '',
      carrier: input.carrier ?? '',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      stops: input.stops ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mailroom_route',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mailroom_route', content.type, content.status]),
        createdBy,
      },
    });
    return toRoute(row as MemoryRow);
  },

  async getRoute(id: string): Promise<MailroomRoute | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mailroom_route') return null;
    return toRoute(row as MemoryRow);
  },

  async listRoutes(organizationId: string, opts: ListRoutesOpts = {}): Promise<MailroomRoute[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mailroom_route' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRoute);
  },

  async updateRoute(id: string, input: UpdateRouteInput): Promise<MailroomRoute | null> {
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
      ...(input.carrier !== undefined && { carrier: input.carrier }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.stops !== undefined && { stops: input.stops }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mailroom_route', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRoute(row as MemoryRow);
  },

  async deleteRoute(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRoute(id: string, _activatedBy: string): Promise<MailroomRoute | null> {
    return MailroomOperationsService.updateRoute(id, { status: 'active' });
  },

  async completeRoute(id: string, _completedBy: string): Promise<MailroomRoute | null> {
    return MailroomOperationsService.updateRoute(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  async delayRoute(id: string, _delayedBy: string): Promise<MailroomRoute | null> {
    return MailroomOperationsService.updateRoute(id, { status: 'delayed' });
  },

  // ── Deliveries ──

  async createDelivery(organizationId: string, workspaceId: string, input: CreateDeliveryInput, createdBy: string): Promise<MailroomDelivery> {
    const content = {
      itemId: input.itemId,
      routeId: input.routeId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      recipient: input.recipient ?? '',
      address: input.address ?? '',
      scheduledDate: input.scheduledDate ?? null,
      attemptedDate: input.attemptedDate ?? null,
      deliveredDate: input.deliveredDate ?? null,
      signatureRequired: input.signatureRequired ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mailroom_delivery',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mailroom_delivery', content.type, content.status]),
        createdBy,
      },
    });
    return toDelivery(row as MemoryRow);
  },

  async getDelivery(id: string): Promise<MailroomDelivery | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mailroom_delivery') return null;
    return toDelivery(row as MemoryRow);
  },

  async listDeliveries(organizationId: string, opts: ListDeliveriesOpts = {}): Promise<MailroomDelivery[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mailroom_delivery' };
    const conditions: unknown[] = [];
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.routeId) conditions.push({ content: { contains: `"routeId":"${opts.routeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDelivery);
  },

  async updateDelivery(id: string, input: UpdateDeliveryInput): Promise<MailroomDelivery | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.itemId !== undefined && { itemId: input.itemId }),
      ...(input.routeId !== undefined && { routeId: input.routeId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.recipient !== undefined && { recipient: input.recipient }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.attemptedDate !== undefined && { attemptedDate: input.attemptedDate }),
      ...(input.deliveredDate !== undefined && { deliveredDate: input.deliveredDate }),
      ...(input.signatureRequired !== undefined && { signatureRequired: input.signatureRequired }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mailroom_delivery', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDelivery(row as MemoryRow);
  },

  async deleteDelivery(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async dispatchDelivery(id: string, _dispatchedBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'out_for_delivery' });
  },

  async completeDelivery(id: string, _completedBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'delivered', deliveredDate: new Date().toISOString() });
  },

  async failDelivery(id: string, _failedBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'failed' });
  },

  async attemptDelivery(id: string, _attemptedBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'attempted', attemptedDate: new Date().toISOString() });
  },

  async returnDelivery(id: string, _returnedBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'returned' });
  },

  async holdDelivery(id: string, _holdBy: string): Promise<MailroomDelivery | null> {
    return MailroomOperationsService.updateDelivery(id, { status: 'held' });
  },

  // ── Postage ──

  async createPostage(organizationId: string, workspaceId: string, input: CreatePostageInput, createdBy: string): Promise<MailroomPostage> {
    const content = {
      itemId: input.itemId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      description: input.description ?? '',
      status: input.status ?? 'pending',
      date: input.date ?? null,
      meterNumber: input.meterNumber ?? '',
      permitNumber: input.permitNumber ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mailroom_postage',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mailroom_postage', content.type, content.status]),
        createdBy,
      },
    });
    return toPostage(row as MemoryRow);
  },

  async getPostage(id: string): Promise<MailroomPostage | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mailroom_postage') return null;
    return toPostage(row as MemoryRow);
  },

  async listPostage(organizationId: string, opts: ListPostageOpts = {}): Promise<MailroomPostage[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mailroom_postage' };
    const conditions: unknown[] = [];
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPostage);
  },

  async updatePostage(id: string, input: UpdatePostageInput): Promise<MailroomPostage | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.itemId !== undefined && { itemId: input.itemId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.meterNumber !== undefined && { meterNumber: input.meterNumber }),
      ...(input.permitNumber !== undefined && { permitNumber: input.permitNumber }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mailroom_postage', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPostage(row as MemoryRow);
  },

  async deletePostage(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async payPostage(id: string, _paidBy: string): Promise<MailroomPostage | null> {
    return MailroomOperationsService.updatePostage(id, { status: 'paid', date: new Date().toISOString() });
  },

  async refundPostage(id: string, _refundedBy: string): Promise<MailroomPostage | null> {
    return MailroomOperationsService.updatePostage(id, { status: 'refunded' });
  },

  async adjustPostage(id: string, _adjustedBy: string): Promise<MailroomPostage | null> {
    return MailroomOperationsService.updatePostage(id, { status: 'adjusted' });
  },

  async disputePostage(id: string, _disputedBy: string): Promise<MailroomPostage | null> {
    return MailroomOperationsService.updatePostage(id, { status: 'disputed' });
  },

  // ── Metrics & Stats ──

  async getMailroomOperationsMetrics(organizationId: string): Promise<MailroomOperationsMetrics> {
    const [items, deliveries, routes, postage] = await Promise.all([
      MailroomOperationsService.listItems(organizationId),
      MailroomOperationsService.listDeliveries(organizationId),
      MailroomOperationsService.listRoutes(organizationId),
      MailroomOperationsService.listPostage(organizationId),
    ]);
    const pendingItems = items.filter((i) => i.status === 'received' || i.status === 'sorted').length;
    const inTransitDeliveries = deliveries.filter((d) => d.status === 'out_for_delivery').length;
    const activeRoutes = routes.filter((r) => r.status === 'active').length;
    const pendingPostage = postage.filter((p) => p.status === 'pending').length;
    const today = new Date();
    const deliveredToday = deliveries.filter((d) => d.deliveredDate && d.deliveredDate.toDateString() === today.toDateString()).length;
    return { pendingItems, inTransitDeliveries, activeRoutes, pendingPostage, deliveredToday };
  },

  async getMailroomOperationsStats(organizationId: string): Promise<MailroomOperationsStats> {
    const [items, routes, deliveries, postage] = await Promise.all([
      MailroomOperationsService.listItems(organizationId),
      MailroomOperationsService.listRoutes(organizationId),
      MailroomOperationsService.listDeliveries(organizationId),
      MailroomOperationsService.listPostage(organizationId),
    ]);
    const byItemType: Record<string, number> = {};
    const byItemStatus: Record<string, number> = {};
    const byRouteType: Record<string, number> = {};
    const byRouteStatus: Record<string, number> = {};
    const byDeliveryType: Record<string, number> = {};
    const byDeliveryStatus: Record<string, number> = {};
    const byPostageType: Record<string, number> = {};
    const byPostageStatus: Record<string, number> = {};
    for (const i of items) { byItemType[i.type] = (byItemType[i.type] ?? 0) + 1; byItemStatus[i.status] = (byItemStatus[i.status] ?? 0) + 1; }
    for (const r of routes) { byRouteType[r.type] = (byRouteType[r.type] ?? 0) + 1; byRouteStatus[r.status] = (byRouteStatus[r.status] ?? 0) + 1; }
    for (const d of deliveries) { byDeliveryType[d.type] = (byDeliveryType[d.type] ?? 0) + 1; byDeliveryStatus[d.status] = (byDeliveryStatus[d.status] ?? 0) + 1; }
    for (const p of postage) { byPostageType[p.type] = (byPostageType[p.type] ?? 0) + 1; byPostageStatus[p.status] = (byPostageStatus[p.status] ?? 0) + 1; }
    return {
      itemCount: items.length,
      pendingItemCount: items.filter((i) => i.status === 'received' || i.status === 'sorted').length,
      routeCount: routes.length,
      activeRouteCount: routes.filter((r) => r.status === 'active').length,
      deliveryCount: deliveries.length,
      pendingDeliveryCount: deliveries.filter((d) => d.status === 'pending').length,
      postageCount: postage.length,
      pendingPostageCount: postage.filter((p) => p.status === 'pending').length,
      byItemType, byItemStatus, byRouteType, byRouteStatus, byDeliveryType, byDeliveryStatus, byPostageType, byPostageStatus,
    };
  },
};
