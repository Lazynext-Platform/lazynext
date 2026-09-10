import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MenuType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'buffet' | 'catering' | 'special_event' | 'cafe' | 'vending' | 'holiday';
export type MenuStatus = 'draft' | 'published' | 'archived' | 'seasonal';
export type OrderType = 'individual' | 'catering' | 'event' | 'recurring' | 'department' | 'executive' | 'meeting' | 'training';
export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'no_show' | 'invoiced';
export type VendorType = 'caterer' | 'restaurant' | 'food_supplier' | 'beverage' | 'grocery' | 'specialty' | 'vending' | 'food_truck';
export type VendorStatus = 'active' | 'inactive' | 'preferred' | 'terminated' | 'under_review';
export type InventoryType = 'perishable' | 'non_perishable' | 'frozen' | 'beverage' | 'cleaning' | 'disposable' | 'equipment';
export type InventoryStatus = 'in_stock' | 'low' | 'out' | 'expired' | 'ordered' | 'received';

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

export interface FoodMenu {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: MenuType;
  description: string;
  status: MenuStatus;
  date: Date | null;
  items: string[];
  dietaryOptions: string[];
  pricePerPerson: number;
  servings: number;
  allergens: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  menuId: string | null;
  vendorId: string | null;
  type: OrderType;
  description: string;
  status: OrderStatus;
  requester: string;
  department: string;
  headcount: number;
  budget: number;
  deliveryDate: Date | null;
  deliveryLocation: string;
  specialRequests: string;
  dietaryRestrictions: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodVendor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: VendorType;
  description: string;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  cuisine: string;
  rating: number;
  contractTerms: string;
  menuLink: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodInventory {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: InventoryType;
  description: string;
  status: InventoryStatus;
  quantity: number;
  unit: string;
  reorderLevel: number;
  cost: number;
  expiryDate: Date | null;
  storageLocation: string;
  supplier: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodServicesMetrics {
  publishedMenus: number;
  pendingOrders: number;
  activeVendors: number;
  lowStockItems: number;
  totalOrders: number;
}

export interface FoodServicesStats {
  menuCount: number;
  orderCount: number;
  vendorCount: number;
  inventoryCount: number;
  byMenuType: Record<string, number>;
  byMenuStatus: Record<string, number>;
  byOrderType: Record<string, number>;
  byOrderStatus: Record<string, number>;
  byVendorType: Record<string, number>;
  byVendorStatus: Record<string, number>;
  byInventoryType: Record<string, number>;
  byInventoryStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateMenuInput {
  name: string;
  type: MenuType;
  description?: string;
  status?: MenuStatus;
  date?: string;
  items?: string[];
  dietaryOptions?: string[];
  pricePerPerson?: number;
  servings?: number;
  allergens?: string[];
  notes?: string;
}

export interface UpdateMenuInput {
  name?: string;
  type?: MenuType;
  description?: string;
  status?: MenuStatus;
  date?: string;
  items?: string[];
  dietaryOptions?: string[];
  pricePerPerson?: number;
  servings?: number;
  allergens?: string[];
  notes?: string;
}

export interface ListMenusOpts {
  type?: MenuType;
  status?: MenuStatus;
}

export interface CreateOrderInput {
  menuId?: string;
  vendorId?: string;
  type: OrderType;
  description?: string;
  status?: OrderStatus;
  requester?: string;
  department?: string;
  headcount?: number;
  budget?: number;
  deliveryDate?: string;
  deliveryLocation?: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  notes?: string;
}

export interface UpdateOrderInput {
  menuId?: string;
  vendorId?: string;
  type?: OrderType;
  description?: string;
  status?: OrderStatus;
  requester?: string;
  department?: string;
  headcount?: number;
  budget?: number;
  deliveryDate?: string;
  deliveryLocation?: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  notes?: string;
}

export interface ListOrdersOpts {
  menuId?: string;
  vendorId?: string;
  type?: OrderType;
  status?: OrderStatus;
}

export interface CreateVendorInput {
  name: string;
  type: VendorType;
  description?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  rating?: number;
  contractTerms?: string;
  menuLink?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  type?: VendorType;
  description?: string;
  status?: VendorStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  cuisine?: string;
  rating?: number;
  contractTerms?: string;
  menuLink?: string;
  notes?: string;
}

export interface ListVendorsOpts {
  type?: VendorType;
  status?: VendorStatus;
}

export interface CreateInventoryInput {
  name: string;
  type: InventoryType;
  description?: string;
  status?: InventoryStatus;
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  cost?: number;
  expiryDate?: string;
  storageLocation?: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateInventoryInput {
  name?: string;
  type?: InventoryType;
  description?: string;
  status?: InventoryStatus;
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  cost?: number;
  expiryDate?: string;
  storageLocation?: string;
  supplier?: string;
  notes?: string;
}

export interface ListInventoryOpts {
  type?: InventoryType;
  status?: InventoryStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toMenu(row: MemoryRow): FoodMenu {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as MenuType) ?? 'lunch',
    description: (c.description as string) ?? '',
    status: (c.status as MenuStatus) ?? 'draft',
    date: c.date ? new Date(c.date as string) : null,
    items: (c.items as string[]) ?? [],
    dietaryOptions: (c.dietaryOptions as string[]) ?? [],
    pricePerPerson: (c.pricePerPerson as number) ?? 0,
    servings: (c.servings as number) ?? 0,
    allergens: (c.allergens as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toOrder(row: MemoryRow): FoodOrder {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    menuId: (c.menuId as string) ?? null,
    vendorId: (c.vendorId as string) ?? null,
    type: (c.type as OrderType) ?? 'individual',
    description: (c.description as string) ?? '',
    status: (c.status as OrderStatus) ?? 'placed',
    requester: (c.requester as string) ?? '',
    department: (c.department as string) ?? '',
    headcount: (c.headcount as number) ?? 0,
    budget: (c.budget as number) ?? 0,
    deliveryDate: c.deliveryDate ? new Date(c.deliveryDate as string) : null,
    deliveryLocation: (c.deliveryLocation as string) ?? '',
    specialRequests: (c.specialRequests as string) ?? '',
    dietaryRestrictions: (c.dietaryRestrictions as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVendor(row: MemoryRow): FoodVendor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as VendorType) ?? 'caterer',
    description: (c.description as string) ?? '',
    status: (c.status as VendorStatus) ?? 'active',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    cuisine: (c.cuisine as string) ?? '',
    rating: (c.rating as number) ?? 0,
    contractTerms: (c.contractTerms as string) ?? '',
    menuLink: (c.menuLink as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toInventory(row: MemoryRow): FoodInventory {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as InventoryType) ?? 'perishable',
    description: (c.description as string) ?? '',
    status: (c.status as InventoryStatus) ?? 'in_stock',
    quantity: (c.quantity as number) ?? 0,
    unit: (c.unit as string) ?? '',
    reorderLevel: (c.reorderLevel as number) ?? 0,
    cost: (c.cost as number) ?? 0,
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    storageLocation: (c.storageLocation as string) ?? '',
    supplier: (c.supplier as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const FoodServicesService = {
  // ── Menus ──

  async createMenu(organizationId: string, workspaceId: string, input: CreateMenuInput, createdBy: string): Promise<FoodMenu> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      date: input.date ?? null,
      items: input.items ?? [],
      dietaryOptions: input.dietaryOptions ?? [],
      pricePerPerson: input.pricePerPerson ?? 0,
      servings: input.servings ?? 0,
      allergens: input.allergens ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'food_menu',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['food_menu', content.type, content.status]),
        createdBy,
      },
    });
    return toMenu(row as MemoryRow);
  },

  async getMenu(id: string): Promise<FoodMenu | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'food_menu') return null;
    return toMenu(row as MemoryRow);
  },

  async listMenus(organizationId: string, opts: ListMenusOpts = {}): Promise<FoodMenu[]> {
    const where: Record<string, unknown> = { organizationId, type: 'food_menu' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMenu);
  },

  async updateMenu(id: string, input: UpdateMenuInput): Promise<FoodMenu | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.items !== undefined && { items: input.items }),
      ...(input.dietaryOptions !== undefined && { dietaryOptions: input.dietaryOptions }),
      ...(input.pricePerPerson !== undefined && { pricePerPerson: input.pricePerPerson }),
      ...(input.servings !== undefined && { servings: input.servings }),
      ...(input.allergens !== undefined && { allergens: input.allergens }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['food_menu', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toMenu(row as MemoryRow);
  },

  async deleteMenu(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishMenu(id: string, _publishedBy: string): Promise<FoodMenu | null> {
    return FoodServicesService.updateMenu(id, { status: 'published' });
  },

  async archiveMenu(id: string, _archivedBy: string): Promise<FoodMenu | null> {
    return FoodServicesService.updateMenu(id, { status: 'archived' });
  },

  async seasonalMenu(id: string, _markedBy: string): Promise<FoodMenu | null> {
    return FoodServicesService.updateMenu(id, { status: 'seasonal' });
  },

  // ── Orders ──

  async createOrder(organizationId: string, workspaceId: string, input: CreateOrderInput, createdBy: string): Promise<FoodOrder> {
    const content = {
      menuId: input.menuId ?? null,
      vendorId: input.vendorId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'placed',
      requester: input.requester ?? '',
      department: input.department ?? '',
      headcount: input.headcount ?? 0,
      budget: input.budget ?? 0,
      deliveryDate: input.deliveryDate ?? null,
      deliveryLocation: input.deliveryLocation ?? '',
      specialRequests: input.specialRequests ?? '',
      dietaryRestrictions: input.dietaryRestrictions ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'food_order',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.menuId ?? input.vendorId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['food_order', content.type, content.status]),
        createdBy,
      },
    });
    return toOrder(row as MemoryRow);
  },

  async getOrder(id: string): Promise<FoodOrder | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'food_order') return null;
    return toOrder(row as MemoryRow);
  },

  async listOrders(organizationId: string, opts: ListOrdersOpts = {}): Promise<FoodOrder[]> {
    const where: Record<string, unknown> = { organizationId, type: 'food_order' };
    const conditions: unknown[] = [];
    if (opts.menuId) conditions.push({ content: { contains: `"menuId":"${opts.menuId}"` } });
    if (opts.vendorId) conditions.push({ content: { contains: `"vendorId":"${opts.vendorId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOrder);
  },

  async updateOrder(id: string, input: UpdateOrderInput): Promise<FoodOrder | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.menuId !== undefined && { menuId: input.menuId }),
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.requester !== undefined && { requester: input.requester }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.headcount !== undefined && { headcount: input.headcount }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.deliveryDate !== undefined && { deliveryDate: input.deliveryDate }),
      ...(input.deliveryLocation !== undefined && { deliveryLocation: input.deliveryLocation }),
      ...(input.specialRequests !== undefined && { specialRequests: input.specialRequests }),
      ...(input.dietaryRestrictions !== undefined && { dietaryRestrictions: input.dietaryRestrictions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['food_order', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toOrder(row as MemoryRow);
  },

  async deleteOrder(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async confirmOrder(id: string, _confirmedBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'confirmed' });
  },

  async prepareOrder(id: string, _preparedBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'preparing' });
  },

  async readyOrder(id: string, _readyBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'ready' });
  },

  async deliverOrder(id: string, _deliveredBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'delivered' });
  },

  async cancelOrder(id: string, _cancelledBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'cancelled' });
  },

  async invoiceOrder(id: string, _invoicedBy: string): Promise<FoodOrder | null> {
    return FoodServicesService.updateOrder(id, { status: 'invoiced' });
  },

  // ── Vendors ──

  async createVendor(organizationId: string, workspaceId: string, input: CreateVendorInput, createdBy: string): Promise<FoodVendor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      cuisine: input.cuisine ?? '',
      rating: input.rating ?? 0,
      contractTerms: input.contractTerms ?? '',
      menuLink: input.menuLink ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'food_vendor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['food_vendor', content.type, content.status]),
        createdBy,
      },
    });
    return toVendor(row as MemoryRow);
  },

  async getVendor(id: string): Promise<FoodVendor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'food_vendor') return null;
    return toVendor(row as MemoryRow);
  },

  async listVendors(organizationId: string, opts: ListVendorsOpts = {}): Promise<FoodVendor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'food_vendor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toVendor);
  },

  async updateVendor(id: string, input: UpdateVendorInput): Promise<FoodVendor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.cuisine !== undefined && { cuisine: input.cuisine }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.contractTerms !== undefined && { contractTerms: input.contractTerms }),
      ...(input.menuLink !== undefined && { menuLink: input.menuLink }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['food_vendor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toVendor(row as MemoryRow);
  },

  async deleteVendor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async preferVendor(id: string, _preferredBy: string): Promise<FoodVendor | null> {
    return FoodServicesService.updateVendor(id, { status: 'preferred' });
  },

  async reviewVendor(id: string, _reviewedBy: string): Promise<FoodVendor | null> {
    return FoodServicesService.updateVendor(id, { status: 'under_review' });
  },

  async terminateVendor(id: string, _terminatedBy: string): Promise<FoodVendor | null> {
    return FoodServicesService.updateVendor(id, { status: 'terminated' });
  },

  // ── Inventory ──

  async createInventory(organizationId: string, workspaceId: string, input: CreateInventoryInput, createdBy: string): Promise<FoodInventory> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'in_stock',
      quantity: input.quantity ?? 0,
      unit: input.unit ?? '',
      reorderLevel: input.reorderLevel ?? 0,
      cost: input.cost ?? 0,
      expiryDate: input.expiryDate ?? null,
      storageLocation: input.storageLocation ?? '',
      supplier: input.supplier ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'food_inventory',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['food_inventory', content.type, content.status]),
        createdBy,
      },
    });
    return toInventory(row as MemoryRow);
  },

  async getInventory(id: string): Promise<FoodInventory | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'food_inventory') return null;
    return toInventory(row as MemoryRow);
  },

  async listInventory(organizationId: string, opts: ListInventoryOpts = {}): Promise<FoodInventory[]> {
    const where: Record<string, unknown> = { organizationId, type: 'food_inventory' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toInventory);
  },

  async updateInventory(id: string, input: UpdateInventoryInput): Promise<FoodInventory | null> {
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
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.storageLocation !== undefined && { storageLocation: input.storageLocation }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['food_inventory', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toInventory(row as MemoryRow);
  },

  async deleteInventory(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async lowInventory(id: string, _markedBy: string): Promise<FoodInventory | null> {
    return FoodServicesService.updateInventory(id, { status: 'low' });
  },

  async outInventory(id: string, _markedBy: string): Promise<FoodInventory | null> {
    return FoodServicesService.updateInventory(id, { status: 'out' });
  },

  async expiredInventory(id: string, _markedBy: string): Promise<FoodInventory | null> {
    return FoodServicesService.updateInventory(id, { status: 'expired' });
  },

  async orderedInventory(id: string, _orderedBy: string): Promise<FoodInventory | null> {
    return FoodServicesService.updateInventory(id, { status: 'ordered' });
  },

  async receivedInventory(id: string, _receivedBy: string): Promise<FoodInventory | null> {
    return FoodServicesService.updateInventory(id, { status: 'received' });
  },

  // ── Metrics & Stats ──

  async getFoodServicesMetrics(organizationId: string): Promise<FoodServicesMetrics> {
    const [menus, orders, vendors, inventory] = await Promise.all([
      FoodServicesService.listMenus(organizationId),
      FoodServicesService.listOrders(organizationId),
      FoodServicesService.listVendors(organizationId),
      FoodServicesService.listInventory(organizationId),
    ]);
    return {
      publishedMenus: menus.filter((m) => m.status === 'published').length,
      pendingOrders: orders.filter((o) => o.status === 'placed' || o.status === 'confirmed' || o.status === 'preparing').length,
      activeVendors: vendors.filter((v) => v.status === 'active' || v.status === 'preferred').length,
      lowStockItems: inventory.filter((i) => i.status === 'low').length,
      totalOrders: orders.length,
    };
  },

  async getFoodServicesStats(organizationId: string): Promise<FoodServicesStats> {
    const [menus, orders, vendors, inventory] = await Promise.all([
      FoodServicesService.listMenus(organizationId),
      FoodServicesService.listOrders(organizationId),
      FoodServicesService.listVendors(organizationId),
      FoodServicesService.listInventory(organizationId),
    ]);
    const byMenuType: Record<string, number> = {};
    const byMenuStatus: Record<string, number> = {};
    const byOrderType: Record<string, number> = {};
    const byOrderStatus: Record<string, number> = {};
    const byVendorType: Record<string, number> = {};
    const byVendorStatus: Record<string, number> = {};
    const byInventoryType: Record<string, number> = {};
    const byInventoryStatus: Record<string, number> = {};
    for (const m of menus) { byMenuType[m.type] = (byMenuType[m.type] ?? 0) + 1; byMenuStatus[m.status] = (byMenuStatus[m.status] ?? 0) + 1; }
    for (const o of orders) { byOrderType[o.type] = (byOrderType[o.type] ?? 0) + 1; byOrderStatus[o.status] = (byOrderStatus[o.status] ?? 0) + 1; }
    for (const v of vendors) { byVendorType[v.type] = (byVendorType[v.type] ?? 0) + 1; byVendorStatus[v.status] = (byVendorStatus[v.status] ?? 0) + 1; }
    for (const i of inventory) { byInventoryType[i.type] = (byInventoryType[i.type] ?? 0) + 1; byInventoryStatus[i.status] = (byInventoryStatus[i.status] ?? 0) + 1; }
    return {
      menuCount: menus.length,
      orderCount: orders.length,
      vendorCount: vendors.length,
      inventoryCount: inventory.length,
      byMenuType, byMenuStatus, byOrderType, byOrderStatus, byVendorType, byVendorStatus, byInventoryType, byInventoryStatus,
    };
  },
};
