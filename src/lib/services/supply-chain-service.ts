import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SupplierStatus = 'active' | 'inactive' | 'blacklisted' | 'pending';
export type ShipmentStatus =
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'delayed'
  | 'cancelled'
  | 'customs_hold';
export type FreightMode = 'air' | 'sea' | 'road' | 'rail' | 'multimodal';
export type LogisticsStatus = 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
export type SupplierRiskType =
  | 'financial'
  | 'operational'
  | 'geopolitical'
  | 'compliance'
  | 'capacity'
  | 'quality';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SupplierRiskStatus = 'open' | 'mitigating' | 'mitigated' | 'accepted' | 'closed';

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

/** Parsed content payload for a supplier Memory. */
interface SupplierContent {
  name: string;
  category: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  rating: number;
  paymentTerms: string;
  leadTimeDays: number;
  status: SupplierStatus;
}

/** Parsed content payload for a shipment Memory. */
interface ShipmentContent {
  supplierId: string;
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  expectedArrival: string;
  items: Array<{ name: string; quantity: number; unitCost: number }>;
  totalValue: number;
  currentLocation: string;
  trackingNotes: string;
  lastUpdated: string;
}

/** Parsed content payload for a logistics order Memory. */
interface LogisticsOrderContent {
  shipmentId: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  freightMode: FreightMode;
  cost: number;
  destination: string;
  status: LogisticsStatus;
}

/** Parsed content payload for a supplier risk Memory. */
interface SupplierRiskContent {
  supplierId: string;
  riskType: SupplierRiskType;
  severity: RiskSeverity;
  description: string;
  mitigation: string;
  status: SupplierRiskStatus;
  mitigatedBy: string;
  mitigatedAt: string | null;
}

/** A structured supplier returned to callers. */
export interface Supplier {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  rating: number;
  paymentTerms: string;
  leadTimeDays: number;
  status: SupplierStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured shipment returned to callers. */
export interface Shipment {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  expectedArrival: Date | null;
  items: Array<{ name: string; quantity: number; unitCost: number }>;
  totalValue: number;
  currentLocation: string;
  trackingNotes: string;
  lastUpdated: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured logistics order returned to callers. */
export interface LogisticsOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  shipmentId: string;
  supplierId: string;
  orderDate: Date | null;
  expectedDelivery: Date | null;
  freightMode: FreightMode;
  cost: number;
  destination: string;
  status: LogisticsStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured supplier risk returned to callers. */
export interface SupplierRisk {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  riskType: SupplierRiskType;
  severity: RiskSeverity;
  description: string;
  mitigation: string;
  status: SupplierRiskStatus;
  mitigatedBy: string;
  mitigatedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  category?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  rating?: number;
  paymentTerms?: string;
  leadTimeDays?: number;
  status?: SupplierStatus;
}

export interface UpdateSupplierInput {
  name?: string;
  category?: string;
  location?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  rating?: number;
  paymentTerms?: string;
  leadTimeDays?: number;
  status?: SupplierStatus;
}

export interface ListSuppliersOpts {
  category?: string;
  status?: SupplierStatus;
  location?: string;
}

export interface ShipmentItem {
  name: string;
  quantity: number;
  unitCost?: number;
}

export interface CreateShipmentInput {
  supplierId: string;
  origin: string;
  destination: string;
  carrier?: string;
  trackingNumber?: string;
  status?: ShipmentStatus;
  expectedArrival?: string;
  items: ShipmentItem[];
  totalValue?: number;
}

export interface UpdateShipmentInput {
  origin?: string;
  destination?: string;
  carrier?: string;
  trackingNumber?: string;
  status?: ShipmentStatus;
  expectedArrival?: string;
  items?: ShipmentItem[];
  totalValue?: number;
}

export interface ListShipmentsOpts {
  supplierId?: string;
  status?: ShipmentStatus;
  carrier?: string;
}

export interface CreateLogisticsOrderInput {
  shipmentId?: string;
  supplierId?: string;
  orderDate: string;
  expectedDelivery?: string;
  freightMode?: FreightMode;
  cost?: number;
  destination?: string;
  status?: LogisticsStatus;
}

export interface UpdateLogisticsOrderInput {
  shipmentId?: string;
  supplierId?: string;
  orderDate?: string;
  expectedDelivery?: string;
  freightMode?: FreightMode;
  cost?: number;
  destination?: string;
  status?: LogisticsStatus;
}

export interface ListLogisticsOrdersOpts {
  status?: LogisticsStatus;
  freightMode?: FreightMode;
}

export interface CreateSupplierRiskInput {
  supplierId: string;
  riskType: SupplierRiskType;
  severity: RiskSeverity;
  description?: string;
  mitigation?: string;
  status?: SupplierRiskStatus;
}

export interface UpdateSupplierRiskInput {
  riskType?: SupplierRiskType;
  severity?: RiskSeverity;
  description?: string;
  mitigation?: string;
  status?: SupplierRiskStatus;
}

export interface ListSupplierRisksOpts {
  supplierId?: string;
  severity?: RiskSeverity;
  status?: SupplierRiskStatus;
}

export interface SupplyChainMetrics {
  activeShipments: number;
  delayedShipments: number;
  avgLeadTime: number;
  highRiskSuppliers: number;
}

export interface SupplyChainStats {
  supplierCount: number;
  activeSupplierCount: number;
  shipmentCount: number;
  activeShipmentCount: number;
  delayedShipmentCount: number;
  logisticsOrderCount: number;
  supplierRiskCount: number;
  openRiskCount: number;
  criticalRiskCount: number;
}

// ── Helpers ──

const fallbackSupplierContent: SupplierContent = {
  name: '',
  category: '',
  location: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  rating: 0,
  paymentTerms: '',
  leadTimeDays: 0,
  status: 'active',
};

const fallbackShipmentContent: ShipmentContent = {
  supplierId: '',
  origin: '',
  destination: '',
  carrier: '',
  trackingNumber: '',
  status: 'pending',
  expectedArrival: '',
  items: [],
  totalValue: 0,
  currentLocation: '',
  trackingNotes: '',
  lastUpdated: '',
};

const fallbackLogisticsContent: LogisticsOrderContent = {
  shipmentId: '',
  supplierId: '',
  orderDate: '',
  expectedDelivery: '',
  freightMode: 'road',
  cost: 0,
  destination: '',
  status: 'pending',
};

const fallbackRiskContent: SupplierRiskContent = {
  supplierId: '',
  riskType: 'operational',
  severity: 'medium',
  description: '',
  mitigation: '',
  status: 'open',
  mitigatedBy: '',
  mitigatedAt: null,
};

function parseSupplierContent(raw: string): SupplierContent {
  if (!raw) return fallbackSupplierContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      category: parsed.category ?? '',
      location: parsed.location ?? '',
      contactName: parsed.contactName ?? '',
      contactEmail: parsed.contactEmail ?? '',
      contactPhone: parsed.contactPhone ?? '',
      rating: Number(parsed.rating) || 0,
      paymentTerms: parsed.paymentTerms ?? '',
      leadTimeDays: Number(parsed.leadTimeDays) || 0,
      status: (parsed.status as SupplierStatus) ?? 'active',
    };
  } catch {
    return fallbackSupplierContent;
  }
}

function parseShipmentContent(raw: string): ShipmentContent {
  if (!raw) return fallbackShipmentContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      supplierId: parsed.supplierId ?? '',
      origin: parsed.origin ?? '',
      destination: parsed.destination ?? '',
      carrier: parsed.carrier ?? '',
      trackingNumber: parsed.trackingNumber ?? '',
      status: (parsed.status as ShipmentStatus) ?? 'pending',
      expectedArrival: parsed.expectedArrival ?? '',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      totalValue: Number(parsed.totalValue) || 0,
      currentLocation: parsed.currentLocation ?? '',
      trackingNotes: parsed.trackingNotes ?? '',
      lastUpdated: parsed.lastUpdated ?? '',
    };
  } catch {
    return fallbackShipmentContent;
  }
}

function parseLogisticsContent(raw: string): LogisticsOrderContent {
  if (!raw) return fallbackLogisticsContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      shipmentId: parsed.shipmentId ?? '',
      supplierId: parsed.supplierId ?? '',
      orderDate: parsed.orderDate ?? '',
      expectedDelivery: parsed.expectedDelivery ?? '',
      freightMode: (parsed.freightMode as FreightMode) ?? 'road',
      cost: Number(parsed.cost) || 0,
      destination: parsed.destination ?? '',
      status: (parsed.status as LogisticsStatus) ?? 'pending',
    };
  } catch {
    return fallbackLogisticsContent;
  }
}

function parseRiskContent(raw: string): SupplierRiskContent {
  if (!raw) return fallbackRiskContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      supplierId: parsed.supplierId ?? '',
      riskType: (parsed.riskType as SupplierRiskType) ?? 'operational',
      severity: (parsed.severity as RiskSeverity) ?? 'medium',
      description: parsed.description ?? '',
      mitigation: parsed.mitigation ?? '',
      status: (parsed.status as SupplierRiskStatus) ?? 'open',
      mitigatedBy: parsed.mitigatedBy ?? '',
      mitigatedAt: parsed.mitigatedAt ?? null,
    };
  } catch {
    return fallbackRiskContent;
  }
}

function toSupplier(row: MemoryRow): Supplier {
  const content = parseSupplierContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    category: content.category,
    location: content.location,
    contactName: content.contactName,
    contactEmail: content.contactEmail,
    contactPhone: content.contactPhone,
    rating: content.rating,
    paymentTerms: content.paymentTerms,
    leadTimeDays: content.leadTimeDays,
    status: content.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toShipment(row: MemoryRow): Shipment {
  const content = parseShipmentContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    supplierId: content.supplierId,
    origin: content.origin,
    destination: content.destination,
    carrier: content.carrier,
    trackingNumber: content.trackingNumber,
    status: content.status,
    expectedArrival: content.expectedArrival ? new Date(content.expectedArrival) : null,
    items: content.items,
    totalValue: content.totalValue,
    currentLocation: content.currentLocation,
    trackingNotes: content.trackingNotes,
    lastUpdated: content.lastUpdated ? new Date(content.lastUpdated) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLogisticsOrder(row: MemoryRow): LogisticsOrder {
  const content = parseLogisticsContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    shipmentId: content.shipmentId,
    supplierId: content.supplierId,
    orderDate: content.orderDate ? new Date(content.orderDate) : null,
    expectedDelivery: content.expectedDelivery ? new Date(content.expectedDelivery) : null,
    freightMode: content.freightMode,
    cost: content.cost,
    destination: content.destination,
    status: content.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSupplierRisk(row: MemoryRow): SupplierRisk {
  const content = parseRiskContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    supplierId: content.supplierId,
    riskType: content.riskType,
    severity: content.severity,
    description: content.description,
    mitigation: content.mitigation,
    status: content.status,
    mitigatedBy: content.mitigatedBy,
    mitigatedAt: content.mitigatedAt ? new Date(content.mitigatedAt) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Supply Chain Service ──

export const SupplyChainService = {
  /**
   * Create a supplier. Stored as a Memory with type='sc_supplier'.
   */
  async createSupplier(
    organizationId: string,
    workspaceId: string,
    input: CreateSupplierInput,
    createdBy: string,
  ): Promise<Supplier> {
    const content: SupplierContent = {
      name: input.name,
      category: input.category ?? '',
      location: input.location ?? '',
      contactName: input.contactName ?? '',
      contactEmail: input.contactEmail ?? '',
      contactPhone: input.contactPhone ?? '',
      rating: input.rating ?? 0,
      paymentTerms: input.paymentTerms ?? '',
      leadTimeDays: input.leadTimeDays ?? 0,
      status: input.status ?? 'active',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'sc_supplier',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sc_supplier', content.status, content.category]),
        createdBy,
      },
    });

    return toSupplier(row as MemoryRow);
  },

  /**
   * Get a single supplier by ID.
   */
  async getSupplier(id: string): Promise<Supplier | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toSupplier(row as MemoryRow);
  },

  /**
   * List suppliers for an organization with optional filters.
   */
  async listSuppliers(
    organizationId: string,
    opts: ListSuppliersOpts = {},
  ): Promise<Supplier[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'sc_supplier',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let suppliers = rows.map((r) => toSupplier(r as MemoryRow));

    if (opts.category) {
      suppliers = suppliers.filter((s) => s.category === opts.category);
    }
    if (opts.status) {
      suppliers = suppliers.filter((s) => s.status === opts.status);
    }
    if (opts.location) {
      suppliers = suppliers.filter((s) => s.location === opts.location);
    }

    return suppliers;
  },

  /**
   * Update a supplier.
   */
  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseSupplierContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.category !== undefined) content.category = input.category;
    if (input.location !== undefined) content.location = input.location;
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.contactEmail !== undefined) content.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) content.contactPhone = input.contactPhone;
    if (input.rating !== undefined) content.rating = input.rating;
    if (input.paymentTerms !== undefined) content.paymentTerms = input.paymentTerms;
    if (input.leadTimeDays !== undefined) content.leadTimeDays = input.leadTimeDays;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_supplier', content.status, content.category]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSupplier(row as MemoryRow);
  },

  /**
   * Delete a supplier.
   */
  async deleteSupplier(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create a shipment. Stored as a Memory with type='sc_shipment'.
   */
  async createShipment(
    organizationId: string,
    workspaceId: string,
    input: CreateShipmentInput,
    createdBy: string,
  ): Promise<Shipment> {
    const items = input.items.map((it) => ({
      name: it.name,
      quantity: Number(it.quantity) || 0,
      unitCost: it.unitCost !== undefined ? Number(it.unitCost) : 0,
    }));

    const computedTotal =
      input.totalValue !== undefined
        ? Number(input.totalValue)
        : items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

    const content: ShipmentContent = {
      supplierId: input.supplierId,
      origin: input.origin,
      destination: input.destination,
      carrier: input.carrier ?? '',
      trackingNumber: input.trackingNumber ?? '',
      status: input.status ?? 'pending',
      expectedArrival: input.expectedArrival ?? '',
      items,
      totalValue: computedTotal,
      currentLocation: '',
      trackingNotes: '',
      lastUpdated: new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'sc_shipment',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.supplierId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sc_shipment', content.status]),
        createdBy,
      },
    });

    return toShipment(row as MemoryRow);
  },

  /**
   * Get a single shipment by ID.
   */
  async getShipment(id: string): Promise<Shipment | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toShipment(row as MemoryRow);
  },

  /**
   * List shipments for an organization with optional filters.
   */
  async listShipments(
    organizationId: string,
    opts: ListShipmentsOpts = {},
  ): Promise<Shipment[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'sc_shipment',
            organizationId,
            ...(opts.supplierId ? { sourceId: opts.supplierId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let shipments = rows.map((r) => toShipment(r as MemoryRow));

    if (opts.status) {
      shipments = shipments.filter((s) => s.status === opts.status);
    }
    if (opts.carrier) {
      shipments = shipments.filter((s) => s.carrier === opts.carrier);
    }

    return shipments;
  },

  /**
   * Update a shipment.
   */
  async updateShipment(id: string, input: UpdateShipmentInput): Promise<Shipment | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseShipmentContent(existing.content);
    if (input.origin !== undefined) content.origin = input.origin;
    if (input.destination !== undefined) content.destination = input.destination;
    if (input.carrier !== undefined) content.carrier = input.carrier;
    if (input.trackingNumber !== undefined) content.trackingNumber = input.trackingNumber;
    if (input.status !== undefined) content.status = input.status;
    if (input.expectedArrival !== undefined) content.expectedArrival = input.expectedArrival;
    if (input.items !== undefined) {
      content.items = input.items.map((it) => ({
        name: it.name,
        quantity: Number(it.quantity) || 0,
        unitCost: it.unitCost !== undefined ? Number(it.unitCost) : 0,
      }));
    }
    if (input.totalValue !== undefined) content.totalValue = Number(input.totalValue);

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_shipment', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toShipment(row as MemoryRow);
  },

  /**
   * Track a shipment — update status, location, and notes.
   */
  async trackShipment(
    id: string,
    status: ShipmentStatus,
    location?: string,
    notes?: string,
  ): Promise<Shipment | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseShipmentContent(existing.content);
    content.status = status;
    if (location !== undefined) content.currentLocation = location;
    if (notes !== undefined) content.trackingNotes = notes;
    content.lastUpdated = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_shipment', content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toShipment(row as MemoryRow);
  },

  /**
   * Create a logistics order. Stored as a Memory with type='sc_logistics_order'.
   */
  async createLogisticsOrder(
    organizationId: string,
    workspaceId: string,
    input: CreateLogisticsOrderInput,
    createdBy: string,
  ): Promise<LogisticsOrder> {
    const content: LogisticsOrderContent = {
      shipmentId: input.shipmentId ?? '',
      supplierId: input.supplierId ?? '',
      orderDate: input.orderDate,
      expectedDelivery: input.expectedDelivery ?? '',
      freightMode: input.freightMode ?? 'road',
      cost: input.cost ?? 0,
      destination: input.destination ?? '',
      status: input.status ?? 'pending',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'sc_logistics_order',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.shipmentId ?? input.supplierId ?? null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sc_logistics_order', content.status, content.freightMode]),
        createdBy,
      },
    });

    return toLogisticsOrder(row as MemoryRow);
  },

  /**
   * Get a single logistics order by ID.
   */
  async getLogisticsOrder(id: string): Promise<LogisticsOrder | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toLogisticsOrder(row as MemoryRow);
  },

  /**
   * List logistics orders for an organization with optional filters.
   */
  async listLogisticsOrders(
    organizationId: string,
    opts: ListLogisticsOrdersOpts = {},
  ): Promise<LogisticsOrder[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'sc_logistics_order',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let orders = rows.map((r) => toLogisticsOrder(r as MemoryRow));

    if (opts.status) {
      orders = orders.filter((o) => o.status === opts.status);
    }
    if (opts.freightMode) {
      orders = orders.filter((o) => o.freightMode === opts.freightMode);
    }

    return orders;
  },

  /**
   * Update a logistics order.
   */
  async updateLogisticsOrder(id: string, input: UpdateLogisticsOrderInput): Promise<LogisticsOrder | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseLogisticsContent(existing.content);
    if (input.shipmentId !== undefined) content.shipmentId = input.shipmentId;
    if (input.supplierId !== undefined) content.supplierId = input.supplierId;
    if (input.orderDate !== undefined) content.orderDate = input.orderDate;
    if (input.expectedDelivery !== undefined) content.expectedDelivery = input.expectedDelivery;
    if (input.freightMode !== undefined) content.freightMode = input.freightMode;
    if (input.cost !== undefined) content.cost = input.cost;
    if (input.destination !== undefined) content.destination = input.destination;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_logistics_order', content.status, content.freightMode]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toLogisticsOrder(row as MemoryRow);
  },

  /**
   * Create a supplier risk. Stored as a Memory with type='sc_supplier_risk'.
   */
  async createSupplierRisk(
    organizationId: string,
    workspaceId: string,
    input: CreateSupplierRiskInput,
    createdBy: string,
  ): Promise<SupplierRisk> {
    const content: SupplierRiskContent = {
      supplierId: input.supplierId,
      riskType: input.riskType,
      severity: input.severity,
      description: input.description ?? '',
      mitigation: input.mitigation ?? '',
      status: input.status ?? 'open',
      mitigatedBy: '',
      mitigatedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'sc_supplier_risk',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.supplierId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sc_supplier_risk', content.severity, content.status]),
        createdBy,
      },
    });

    return toSupplierRisk(row as MemoryRow);
  },

  /**
   * Get a single supplier risk by ID.
   */
  async getSupplierRisk(id: string): Promise<SupplierRisk | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toSupplierRisk(row as MemoryRow);
  },

  /**
   * List supplier risks for an organization with optional filters.
   */
  async listSupplierRisks(
    organizationId: string,
    opts: ListSupplierRisksOpts = {},
  ): Promise<SupplierRisk[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'sc_supplier_risk',
            organizationId,
            ...(opts.supplierId ? { sourceId: opts.supplierId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let risks = rows.map((r) => toSupplierRisk(r as MemoryRow));

    if (opts.severity) {
      risks = risks.filter((r) => r.severity === opts.severity);
    }
    if (opts.status) {
      risks = risks.filter((r) => r.status === opts.status);
    }

    return risks;
  },

  /**
   * Update a supplier risk.
   */
  async updateSupplierRisk(id: string, input: UpdateSupplierRiskInput): Promise<SupplierRisk | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRiskContent(existing.content);
    if (input.riskType !== undefined) content.riskType = input.riskType;
    if (input.severity !== undefined) content.severity = input.severity;
    if (input.description !== undefined) content.description = input.description;
    if (input.mitigation !== undefined) content.mitigation = input.mitigation;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_supplier_risk', content.severity, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSupplierRisk(row as MemoryRow);
  },

  /**
   * Mitigate a supplier risk — set mitigation, mitigatedBy, status → mitigating/mitigated.
   */
  async mitigateSupplierRisk(
    id: string,
    mitigation: string,
    mitigatedBy: string,
  ): Promise<SupplierRisk | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRiskContent(existing.content);
    content.mitigation = mitigation;
    content.mitigatedBy = mitigatedBy;
    content.mitigatedAt = new Date().toISOString();
    content.status = 'mitigated';

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['sc_supplier_risk', content.severity, 'mitigated']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toSupplierRisk(row as MemoryRow);
  },

  /**
   * Get supply chain metrics for an organization.
   */
  async getSupplyChainMetrics(organizationId: string): Promise<SupplyChainMetrics> {
    const [shipments, suppliers, risks] = await Promise.all([
      this.listShipments(organizationId),
      this.listSuppliers(organizationId),
      this.listSupplierRisks(organizationId),
    ]);

    const activeShipments = shipments.filter(
      (s) => s.status === 'in_transit' || s.status === 'pending' || s.status === 'customs_hold',
    ).length;
    const delayedShipments = shipments.filter((s) => s.status === 'delayed').length;

    const leadTimes = suppliers.filter((s) => s.leadTimeDays > 0).map((s) => s.leadTimeDays);
    const avgLeadTime =
      leadTimes.length > 0
        ? Math.round((leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length) * 100) / 100
        : 0;

    // High-risk suppliers: suppliers with at least one open high/critical risk
    const highRiskSupplierIds = new Set(
      risks
        .filter((r) => (r.severity === 'high' || r.severity === 'critical') && r.status !== 'closed')
        .map((r) => r.supplierId),
    );

    return {
      activeShipments,
      delayedShipments,
      avgLeadTime,
      highRiskSuppliers: highRiskSupplierIds.size,
    };
  },

  /**
   * Get aggregate supply chain stats.
   */
  async getStats(organizationId: string): Promise<SupplyChainStats> {
    const [suppliers, shipments, logisticsOrders, risks] = await Promise.all([
      this.listSuppliers(organizationId),
      this.listShipments(organizationId),
      this.listLogisticsOrders(organizationId),
      this.listSupplierRisks(organizationId),
    ]);

    const activeSupplierCount = suppliers.filter((s) => s.status === 'active').length;
    const activeShipmentCount = shipments.filter(
      (s) => s.status === 'in_transit' || s.status === 'pending' || s.status === 'customs_hold',
    ).length;
    const delayedShipmentCount = shipments.filter((s) => s.status === 'delayed').length;
    const openRiskCount = risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length;
    const criticalRiskCount = risks.filter((r) => r.severity === 'critical').length;

    return {
      supplierCount: suppliers.length,
      activeSupplierCount,
      shipmentCount: shipments.length,
      activeShipmentCount,
      delayedShipmentCount,
      logisticsOrderCount: logisticsOrders.length,
      supplierRiskCount: risks.length,
      openRiskCount,
      criticalRiskCount,
    };
  },
};
