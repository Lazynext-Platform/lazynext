import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ItemType = 'physical' | 'digital' | 'experience' | 'voucher' | 'custom' | 'branded' | 'food' | 'apparel' | 'tech' | 'stationery';
export type ItemStatus = 'active' | 'discontinued' | 'out_of_stock' | 'limited';
export type RecipientType = 'client' | 'employee' | 'partner' | 'vendor' | 'executive' | 'prospect' | 'contractor' | 'board_member';
export type RecipientStatus = 'active' | 'inactive' | 'do_not_gift' | 'vip';
export type OrderType = 'individual' | 'bulk' | 'event' | 'holiday' | 'milestone' | 'recognition' | 'welcome' | 'farewell';
export type OrderStatus = 'draft' | 'approved' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type InventoryType = 'in_stock' | 'reserved' | 'allocated' | 'damaged' | 'returned';
export type InventoryStatus = 'available' | 'low' | 'out' | 'overstock';

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

export interface GiftItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ItemType;
  description: string;
  status: ItemStatus;
  sku: string;
  unitCost: number;
  retailValue: number;
  supplier: string;
  imageUrl: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftRecipient {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecipientType;
  description: string;
  status: RecipientStatus;
  email: string;
  phone: string;
  address: string;
  company: string;
  title: string;
  preferences: string;
  restrictions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  recipientId: string;
  itemId: string;
  type: OrderType;
  quantity: number;
  description: string;
  status: OrderStatus;
  occasion: string;
  message: string;
  budget: number;
  orderedDate: Date | null;
  deliveredDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftInventory {
  id: string;
  organizationId: string;
  workspaceId: string;
  itemId: string;
  type: InventoryType;
  quantity: number;
  description: string;
  status: InventoryStatus;
  location: string;
  batchNumber: string;
  receivedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftManagementMetrics {
  totalItems: number;
  activeRecipients: number;
  pendingOrders: number;
  deliveredOrders: number;
  availableInventoryCount: number;
}

export interface GiftManagementStats {
  itemCount: number;
  recipientCount: number;
  orderCount: number;
  inventoryCount: number;
  byItemType: Record<string, number>;
  byItemStatus: Record<string, number>;
  byRecipientType: Record<string, number>;
  byRecipientStatus: Record<string, number>;
  byOrderType: Record<string, number>;
  byOrderStatus: Record<string, number>;
  byInventoryType: Record<string, number>;
  byInventoryStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateItemInput {
  name: string;
  type: ItemType;
  description?: string;
  status?: ItemStatus;
  sku?: string;
  unitCost?: number;
  retailValue?: number;
  supplier?: string;
  imageUrl?: string;
  notes?: string;
}

export interface UpdateItemInput {
  name?: string;
  type?: ItemType;
  description?: string;
  status?: ItemStatus;
  sku?: string;
  unitCost?: number;
  retailValue?: number;
  supplier?: string;
  imageUrl?: string;
  notes?: string;
}

export interface ListItemsOpts {
  type?: ItemType;
  status?: ItemStatus;
}

export interface CreateRecipientInput {
  name: string;
  type: RecipientType;
  description?: string;
  status?: RecipientStatus;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  title?: string;
  preferences?: string;
  restrictions?: string;
  notes?: string;
}

export interface UpdateRecipientInput {
  name?: string;
  type?: RecipientType;
  description?: string;
  status?: RecipientStatus;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  title?: string;
  preferences?: string;
  restrictions?: string;
  notes?: string;
}

export interface ListRecipientsOpts {
  type?: RecipientType;
  status?: RecipientStatus;
}

export interface CreateOrderInput {
  recipientId: string;
  itemId: string;
  type: OrderType;
  quantity?: number;
  description?: string;
  status?: OrderStatus;
  occasion?: string;
  message?: string;
  budget?: number;
  orderedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export interface UpdateOrderInput {
  recipientId?: string;
  itemId?: string;
  type?: OrderType;
  quantity?: number;
  description?: string;
  status?: OrderStatus;
  occasion?: string;
  message?: string;
  budget?: number;
  orderedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export interface ListOrdersOpts {
  recipientId?: string;
  itemId?: string;
  type?: OrderType;
  status?: OrderStatus;
}

export interface CreateInventoryInput {
  itemId: string;
  type: InventoryType;
  quantity: number;
  description?: string;
  status?: InventoryStatus;
  location?: string;
  batchNumber?: string;
  receivedDate?: string;
  notes?: string;
}

export interface UpdateInventoryInput {
  itemId?: string;
  type?: InventoryType;
  quantity?: number;
  description?: string;
  status?: InventoryStatus;
  location?: string;
  batchNumber?: string;
  receivedDate?: string;
  notes?: string;
}

export interface ListInventoryOpts {
  itemId?: string;
  type?: InventoryType;
  status?: InventoryStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toItem(row: MemoryRow): GiftItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ItemType) ?? 'physical',
    description: (c.description as string) ?? '',
    status: (c.status as ItemStatus) ?? 'active',
    sku: (c.sku as string) ?? '',
    unitCost: (c.unitCost as number) ?? 0,
    retailValue: (c.retailValue as number) ?? 0,
    supplier: (c.supplier as string) ?? '',
    imageUrl: (c.imageUrl as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecipient(row: MemoryRow): GiftRecipient {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecipientType) ?? 'client',
    description: (c.description as string) ?? '',
    status: (c.status as RecipientStatus) ?? 'active',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    company: (c.company as string) ?? '',
    title: (c.title as string) ?? '',
    preferences: (c.preferences as string) ?? '',
    restrictions: (c.restrictions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toOrder(row: MemoryRow): GiftOrder {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    recipientId: (c.recipientId as string) ?? '',
    itemId: (c.itemId as string) ?? '',
    type: (c.type as OrderType) ?? 'individual',
    quantity: (c.quantity as number) ?? 1,
    description: (c.description as string) ?? '',
    status: (c.status as OrderStatus) ?? 'draft',
    occasion: (c.occasion as string) ?? '',
    message: (c.message as string) ?? '',
    budget: (c.budget as number) ?? 0,
    orderedDate: c.orderedDate ? new Date(c.orderedDate as string) : null,
    deliveredDate: c.deliveredDate ? new Date(c.deliveredDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toInventory(row: MemoryRow): GiftInventory {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    itemId: (c.itemId as string) ?? '',
    type: (c.type as InventoryType) ?? 'in_stock',
    quantity: (c.quantity as number) ?? 0,
    description: (c.description as string) ?? '',
    status: (c.status as InventoryStatus) ?? 'available',
    location: (c.location as string) ?? '',
    batchNumber: (c.batchNumber as string) ?? '',
    receivedDate: c.receivedDate ? new Date(c.receivedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const GiftManagementService = {
  // ── Items ──

  async createItem(organizationId: string, workspaceId: string, input: CreateItemInput, createdBy: string): Promise<GiftItem> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      sku: input.sku ?? '',
      unitCost: input.unitCost ?? 0,
      retailValue: input.retailValue ?? 0,
      supplier: input.supplier ?? '',
      imageUrl: input.imageUrl ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gift_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gift_item', content.type, content.status]),
        createdBy,
      },
    });
    return toItem(row as MemoryRow);
  },

  async getItem(id: string): Promise<GiftItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gift_item') return null;
    return toItem(row as MemoryRow);
  },

  async listItems(organizationId: string, opts: ListItemsOpts = {}): Promise<GiftItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gift_item' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toItem);
  },

  async updateItem(id: string, input: UpdateItemInput): Promise<GiftItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.unitCost !== undefined && { unitCost: input.unitCost }),
      ...(input.retailValue !== undefined && { retailValue: input.retailValue }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gift_item', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toItem(row as MemoryRow);
  },

  async deleteItem(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Recipients ──

  async createRecipient(organizationId: string, workspaceId: string, input: CreateRecipientInput, createdBy: string): Promise<GiftRecipient> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      company: input.company ?? '',
      title: input.title ?? '',
      preferences: input.preferences ?? '',
      restrictions: input.restrictions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gift_recipient',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gift_recipient', content.type, content.status]),
        createdBy,
      },
    });
    return toRecipient(row as MemoryRow);
  },

  async getRecipient(id: string): Promise<GiftRecipient | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gift_recipient') return null;
    return toRecipient(row as MemoryRow);
  },

  async listRecipients(organizationId: string, opts: ListRecipientsOpts = {}): Promise<GiftRecipient[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gift_recipient' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecipient);
  },

  async updateRecipient(id: string, input: UpdateRecipientInput): Promise<GiftRecipient | null> {
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
      ...(input.address !== undefined && { address: input.address }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.preferences !== undefined && { preferences: input.preferences }),
      ...(input.restrictions !== undefined && { restrictions: input.restrictions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gift_recipient', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecipient(row as MemoryRow);
  },

  async deleteRecipient(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async markVIP(id: string, _markedBy: string): Promise<GiftRecipient | null> {
    return GiftManagementService.updateRecipient(id, { status: 'vip' });
  },

  async markDoNotGift(id: string, _markedBy: string): Promise<GiftRecipient | null> {
    return GiftManagementService.updateRecipient(id, { status: 'do_not_gift' });
  },

  // ── Orders ──

  async createOrder(organizationId: string, workspaceId: string, input: CreateOrderInput, createdBy: string): Promise<GiftOrder> {
    const content = {
      recipientId: input.recipientId,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity ?? 1,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      occasion: input.occasion ?? '',
      message: input.message ?? '',
      budget: input.budget ?? 0,
      orderedDate: input.orderedDate ?? null,
      deliveredDate: input.deliveredDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gift_order',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.recipientId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gift_order', content.type, content.status]),
        createdBy,
      },
    });
    return toOrder(row as MemoryRow);
  },

  async getOrder(id: string): Promise<GiftOrder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gift_order') return null;
    return toOrder(row as MemoryRow);
  },

  async listOrders(organizationId: string, opts: ListOrdersOpts = {}): Promise<GiftOrder[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gift_order' };
    const conditions: unknown[] = [];
    if (opts.recipientId) conditions.push({ content: { contains: `"recipientId":"${opts.recipientId}"` } });
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOrder);
  },

  async updateOrder(id: string, input: UpdateOrderInput): Promise<GiftOrder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.recipientId !== undefined && { recipientId: input.recipientId }),
      ...(input.itemId !== undefined && { itemId: input.itemId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.occasion !== undefined && { occasion: input.occasion }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.orderedDate !== undefined && { orderedDate: input.orderedDate }),
      ...(input.deliveredDate !== undefined && { deliveredDate: input.deliveredDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gift_order', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toOrder(row as MemoryRow);
  },

  async deleteOrder(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveOrder(id: string, _approvedBy: string): Promise<GiftOrder | null> {
    return GiftManagementService.updateOrder(id, { status: 'approved' });
  },

  async placeOrder(id: string, _placedBy: string): Promise<GiftOrder | null> {
    return GiftManagementService.updateOrder(id, { status: 'ordered', orderedDate: new Date().toISOString() });
  },

  async shipOrder(id: string, _shippedBy: string): Promise<GiftOrder | null> {
    return GiftManagementService.updateOrder(id, { status: 'shipped' });
  },

  async deliverOrder(id: string, _deliveredBy: string): Promise<GiftOrder | null> {
    return GiftManagementService.updateOrder(id, { status: 'delivered', deliveredDate: new Date().toISOString() });
  },

  async cancelOrder(id: string, _cancelledBy: string): Promise<GiftOrder | null> {
    return GiftManagementService.updateOrder(id, { status: 'cancelled' });
  },

  // ── Inventory ──

  async createInventory(organizationId: string, workspaceId: string, input: CreateInventoryInput, createdBy: string): Promise<GiftInventory> {
    const content = {
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      description: input.description ?? '',
      status: input.status ?? 'available',
      location: input.location ?? '',
      batchNumber: input.batchNumber ?? '',
      receivedDate: input.receivedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'gift_inventory',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.itemId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['gift_inventory', content.type, content.status]),
        createdBy,
      },
    });
    return toInventory(row as MemoryRow);
  },

  async getInventory(id: string): Promise<GiftInventory | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'gift_inventory') return null;
    return toInventory(row as MemoryRow);
  },

  async listInventory(organizationId: string, opts: ListInventoryOpts = {}): Promise<GiftInventory[]> {
    const where: Record<string, unknown> = { organizationId, type: 'gift_inventory' };
    const conditions: unknown[] = [];
    if (opts.itemId) conditions.push({ content: { contains: `"itemId":"${opts.itemId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toInventory);
  },

  async updateInventory(id: string, input: UpdateInventoryInput): Promise<GiftInventory | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.itemId !== undefined && { itemId: input.itemId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.batchNumber !== undefined && { batchNumber: input.batchNumber }),
      ...(input.receivedDate !== undefined && { receivedDate: input.receivedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['gift_inventory', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toInventory(row as MemoryRow);
  },

  async deleteInventory(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reserveInventory(id: string, _reservedBy: string): Promise<GiftInventory | null> {
    return GiftManagementService.updateInventory(id, { status: 'low' });
  },

  async markOut(id: string, _markedBy: string): Promise<GiftInventory | null> {
    return GiftManagementService.updateInventory(id, { status: 'out' });
  },

  async markOverstock(id: string, _markedBy: string): Promise<GiftInventory | null> {
    return GiftManagementService.updateInventory(id, { status: 'overstock' });
  },

  // ── Metrics & Stats ──

  async getGiftManagementMetrics(organizationId: string): Promise<GiftManagementMetrics> {
    const [items, recipients, orders, inventory] = await Promise.all([
      GiftManagementService.listItems(organizationId),
      GiftManagementService.listRecipients(organizationId),
      GiftManagementService.listOrders(organizationId),
      GiftManagementService.listInventory(organizationId),
    ]);
    const totalItems = items.length;
    const activeRecipients = recipients.filter((r) => r.status === 'active' || r.status === 'vip').length;
    const pendingOrders = orders.filter((o) => o.status === 'draft' || o.status === 'approved' || o.status === 'ordered' || o.status === 'shipped').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const availableInventoryCount = inventory.filter((i) => i.status === 'available').reduce((sum, i) => sum + i.quantity, 0);
    return { totalItems, activeRecipients, pendingOrders, deliveredOrders, availableInventoryCount };
  },

  async getGiftManagementStats(organizationId: string): Promise<GiftManagementStats> {
    const [items, recipients, orders, inventory] = await Promise.all([
      GiftManagementService.listItems(organizationId),
      GiftManagementService.listRecipients(organizationId),
      GiftManagementService.listOrders(organizationId),
      GiftManagementService.listInventory(organizationId),
    ]);
    const byItemType: Record<string, number> = {};
    const byItemStatus: Record<string, number> = {};
    const byRecipientType: Record<string, number> = {};
    const byRecipientStatus: Record<string, number> = {};
    const byOrderType: Record<string, number> = {};
    const byOrderStatus: Record<string, number> = {};
    const byInventoryType: Record<string, number> = {};
    const byInventoryStatus: Record<string, number> = {};
    for (const i of items) { byItemType[i.type] = (byItemType[i.type] ?? 0) + 1; byItemStatus[i.status] = (byItemStatus[i.status] ?? 0) + 1; }
    for (const r of recipients) { byRecipientType[r.type] = (byRecipientType[r.type] ?? 0) + 1; byRecipientStatus[r.status] = (byRecipientStatus[r.status] ?? 0) + 1; }
    for (const o of orders) { byOrderType[o.type] = (byOrderType[o.type] ?? 0) + 1; byOrderStatus[o.status] = (byOrderStatus[o.status] ?? 0) + 1; }
    for (const inv of inventory) { byInventoryType[inv.type] = (byInventoryType[inv.type] ?? 0) + 1; byInventoryStatus[inv.status] = (byInventoryStatus[inv.status] ?? 0) + 1; }
    return {
      itemCount: items.length,
      recipientCount: recipients.length,
      orderCount: orders.length,
      inventoryCount: inventory.length,
      byItemType, byItemStatus, byRecipientType, byRecipientStatus,
      byOrderType, byOrderStatus, byInventoryType, byInventoryStatus,
    };
  },
};
