import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ShipmentDirection = 'import' | 'export' | 're_export' | 'transit';
export type ShipmentType = 'sea' | 'air' | 'land' | 'rail' | 'multimodal' | 'courier' | 'postal';
export type ShipmentStatus = 'draft' | 'filed' | 'in_transit' | 'arrived' | 'cleared' | 'delivered' | 'held' | 'rejected' | 'cancelled';
export type DeclarationType = 'import' | 'export' | 'transit' | 're_export' | 'temporary';
export type DeclarationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'amended' | 'cancelled';
export type LicenseType = 'import' | 'export' | 'dual_use' | 'strategic' | 'sanctions' | 'general' | 'specific';
export type LicenseStatus = 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
export type TariffType = 'ad_valorem' | 'specific' | 'compound' | 'anti_dumping' | 'countervailing' | 'preferential';
export type TariffStatus = 'active' | 'expired' | 'pending' | 'repealed';

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

export interface ImportExportShipment {
  id: string;
  organizationId: string;
  workspaceId: string;
  reference: string;
  direction: ShipmentDirection;
  type: ShipmentType;
  description: string;
  status: ShipmentStatus;
  originCountry: string;
  destinationCountry: string;
  originPort: string;
  destinationPort: string;
  carrier: string;
  vessel: string;
  trackingNumber: string;
  estimatedArrival: Date | null;
  actualArrival: Date | null;
  containerNumber: string;
  billOfLading: string;
  incoterms: string;
  value: number;
  currency: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomsDeclaration {
  id: string;
  organizationId: string;
  workspaceId: string;
  shipmentId: string | null;
  reference: string;
  type: DeclarationType;
  description: string;
  status: DeclarationStatus;
  country: string;
  port: string;
  declaredValue: number;
  currency: string;
  hsCode: string;
  goodsDescription: string;
  quantity: number;
  origin: string;
  destination: string;
  importer: string;
  exporter: string;
  broker: string;
  filingDate: Date | null;
  approvalDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeLicense {
  id: string;
  organizationId: string;
  workspaceId: string;
  reference: string;
  type: LicenseType;
  description: string;
  status: LicenseStatus;
  issuingAuthority: string;
  country: string;
  holder: string;
  validFrom: Date | null;
  validTo: Date | null;
  goods: string;
  restrictions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TariffRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  hsCode: string;
  description: string;
  type: TariffType;
  rate: number;
  unit: string;
  country: string;
  status: TariffStatus;
  effectiveDate: Date | null;
  expiryDate: Date | null;
  preferentialRate: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportExportMetrics {
  activeShipments: number;
  pendingDeclarations: number;
  activeLicenses: number;
  activeTariffs: number;
  shipmentClearanceRate: number;
}

export interface ImportExportStats {
  shipmentCount: number;
  declarationCount: number;
  licenseCount: number;
  tariffCount: number;
  activeShipmentCount: number;
  pendingDeclarationCount: number;
  activeLicenseCount: number;
  activeTariffCount: number;
  byShipmentDirection: Record<string, number>;
  byShipmentStatus: Record<string, number>;
  byDeclarationStatus: Record<string, number>;
  byLicenseStatus: Record<string, number>;
  byTariffType: Record<string, number>;
}

// ── Input / Options ──

export interface CreateShipmentInput {
  reference: string;
  direction: ShipmentDirection;
  type: ShipmentType;
  description?: string;
  status?: ShipmentStatus;
  originCountry?: string;
  destinationCountry?: string;
  originPort?: string;
  destinationPort?: string;
  carrier?: string;
  vessel?: string;
  trackingNumber?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  containerNumber?: string;
  billOfLading?: string;
  incoterms?: string;
  value?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateShipmentInput {
  reference?: string;
  direction?: ShipmentDirection;
  type?: ShipmentType;
  description?: string;
  status?: ShipmentStatus;
  originCountry?: string;
  destinationCountry?: string;
  originPort?: string;
  destinationPort?: string;
  carrier?: string;
  vessel?: string;
  trackingNumber?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  containerNumber?: string;
  billOfLading?: string;
  incoterms?: string;
  value?: number;
  currency?: string;
  notes?: string;
}

export interface ListShipmentsOpts {
  direction?: ShipmentDirection;
  type?: ShipmentType;
  status?: ShipmentStatus;
}

export interface CreateDeclarationInput {
  shipmentId?: string;
  reference: string;
  type: DeclarationType;
  description?: string;
  status?: DeclarationStatus;
  country?: string;
  port?: string;
  declaredValue?: number;
  currency?: string;
  hsCode?: string;
  goodsDescription?: string;
  quantity?: number;
  origin?: string;
  destination?: string;
  importer?: string;
  exporter?: string;
  broker?: string;
  filingDate?: string;
  approvalDate?: string;
  notes?: string;
}

export interface UpdateDeclarationInput {
  shipmentId?: string;
  reference?: string;
  type?: DeclarationType;
  description?: string;
  status?: DeclarationStatus;
  country?: string;
  port?: string;
  declaredValue?: number;
  currency?: string;
  hsCode?: string;
  goodsDescription?: string;
  quantity?: number;
  origin?: string;
  destination?: string;
  importer?: string;
  exporter?: string;
  broker?: string;
  filingDate?: string;
  approvalDate?: string;
  notes?: string;
}

export interface ListDeclarationsOpts {
  type?: DeclarationType;
  status?: DeclarationStatus;
}

export interface CreateLicenseInput {
  reference: string;
  type: LicenseType;
  description?: string;
  status?: LicenseStatus;
  issuingAuthority?: string;
  country?: string;
  holder?: string;
  validFrom?: string;
  validTo?: string;
  goods?: string;
  restrictions?: string;
  notes?: string;
}

export interface UpdateLicenseInput {
  reference?: string;
  type?: LicenseType;
  description?: string;
  status?: LicenseStatus;
  issuingAuthority?: string;
  country?: string;
  holder?: string;
  validFrom?: string;
  validTo?: string;
  goods?: string;
  restrictions?: string;
  notes?: string;
}

export interface ListLicensesOpts {
  type?: LicenseType;
  status?: LicenseStatus;
}

export interface CreateTariffInput {
  hsCode: string;
  description: string;
  type: TariffType;
  rate: number;
  unit?: string;
  country?: string;
  status?: TariffStatus;
  effectiveDate?: string;
  expiryDate?: string;
  preferentialRate?: number;
  notes?: string;
}

export interface UpdateTariffInput {
  hsCode?: string;
  description?: string;
  type?: TariffType;
  rate?: number;
  unit?: string;
  country?: string;
  status?: TariffStatus;
  effectiveDate?: string;
  expiryDate?: string;
  preferentialRate?: number;
  notes?: string;
}

export interface ListTariffsOpts {
  type?: TariffType;
  status?: TariffStatus;
  country?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toShipment(row: MemoryRow): ImportExportShipment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    reference: (c.reference as string) ?? '',
    direction: (c.direction as ShipmentDirection) ?? 'import',
    type: (c.type as ShipmentType) ?? 'sea',
    description: (c.description as string) ?? '',
    status: (c.status as ShipmentStatus) ?? 'draft',
    originCountry: (c.originCountry as string) ?? '',
    destinationCountry: (c.destinationCountry as string) ?? '',
    originPort: (c.originPort as string) ?? '',
    destinationPort: (c.destinationPort as string) ?? '',
    carrier: (c.carrier as string) ?? '',
    vessel: (c.vessel as string) ?? '',
    trackingNumber: (c.trackingNumber as string) ?? '',
    estimatedArrival: c.estimatedArrival ? new Date(c.estimatedArrival as string) : null,
    actualArrival: c.actualArrival ? new Date(c.actualArrival as string) : null,
    containerNumber: (c.containerNumber as string) ?? '',
    billOfLading: (c.billOfLading as string) ?? '',
    incoterms: (c.incoterms as string) ?? '',
    value: (c.value as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDeclaration(row: MemoryRow): CustomsDeclaration {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    shipmentId: (c.shipmentId as string) ?? null,
    reference: (c.reference as string) ?? '',
    type: (c.type as DeclarationType) ?? 'import',
    description: (c.description as string) ?? '',
    status: (c.status as DeclarationStatus) ?? 'draft',
    country: (c.country as string) ?? '',
    port: (c.port as string) ?? '',
    declaredValue: (c.declaredValue as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    hsCode: (c.hsCode as string) ?? '',
    goodsDescription: (c.goodsDescription as string) ?? '',
    quantity: (c.quantity as number) ?? 0,
    origin: (c.origin as string) ?? '',
    destination: (c.destination as string) ?? '',
    importer: (c.importer as string) ?? '',
    exporter: (c.exporter as string) ?? '',
    broker: (c.broker as string) ?? '',
    filingDate: c.filingDate ? new Date(c.filingDate as string) : null,
    approvalDate: c.approvalDate ? new Date(c.approvalDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLicense(row: MemoryRow): TradeLicense {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    reference: (c.reference as string) ?? '',
    type: (c.type as LicenseType) ?? 'general',
    description: (c.description as string) ?? '',
    status: (c.status as LicenseStatus) ?? 'pending',
    issuingAuthority: (c.issuingAuthority as string) ?? '',
    country: (c.country as string) ?? '',
    holder: (c.holder as string) ?? '',
    validFrom: c.validFrom ? new Date(c.validFrom as string) : null,
    validTo: c.validTo ? new Date(c.validTo as string) : null,
    goods: (c.goods as string) ?? '',
    restrictions: (c.restrictions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTariff(row: MemoryRow): TariffRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    hsCode: (c.hsCode as string) ?? '',
    description: (c.description as string) ?? '',
    type: (c.type as TariffType) ?? 'ad_valorem',
    rate: (c.rate as number) ?? 0,
    unit: (c.unit as string) ?? '',
    country: (c.country as string) ?? '',
    status: (c.status as TariffStatus) ?? 'active',
    effectiveDate: c.effectiveDate ? new Date(c.effectiveDate as string) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate as string) : null,
    preferentialRate: (c.preferentialRate as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const ImportExportService = {
  // ── Shipments ──

  async createShipment(organizationId: string, workspaceId: string, input: CreateShipmentInput, createdBy: string): Promise<ImportExportShipment> {
    const content = {
      reference: input.reference.trim(),
      direction: input.direction,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      originCountry: input.originCountry ?? '',
      destinationCountry: input.destinationCountry ?? '',
      originPort: input.originPort ?? '',
      destinationPort: input.destinationPort ?? '',
      carrier: input.carrier ?? '',
      vessel: input.vessel ?? '',
      trackingNumber: input.trackingNumber ?? '',
      estimatedArrival: input.estimatedArrival ?? null,
      actualArrival: input.actualArrival ?? null,
      containerNumber: input.containerNumber ?? '',
      billOfLading: input.billOfLading ?? '',
      incoterms: input.incoterms ?? '',
      value: input.value ?? 0,
      currency: input.currency ?? 'USD',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'import_export_shipment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['import_export_shipment', content.direction, content.type, content.status]),
        createdBy,
      },
    });
    return toShipment(row as MemoryRow);
  },

  async getShipment(id: string): Promise<ImportExportShipment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'import_export_shipment') return null;
    return toShipment(row as MemoryRow);
  },

  async listShipments(organizationId: string, opts: ListShipmentsOpts = {}): Promise<ImportExportShipment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'import_export_shipment' };
    const conditions: unknown[] = [];
    if (opts.direction) conditions.push({ content: { contains: `"direction":"${opts.direction}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toShipment);
  },

  async updateShipment(id: string, input: UpdateShipmentInput): Promise<ImportExportShipment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.reference !== undefined && { reference: input.reference.trim() }),
      ...(input.direction !== undefined && { direction: input.direction }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.originCountry !== undefined && { originCountry: input.originCountry }),
      ...(input.destinationCountry !== undefined && { destinationCountry: input.destinationCountry }),
      ...(input.originPort !== undefined && { originPort: input.originPort }),
      ...(input.destinationPort !== undefined && { destinationPort: input.destinationPort }),
      ...(input.carrier !== undefined && { carrier: input.carrier }),
      ...(input.vessel !== undefined && { vessel: input.vessel }),
      ...(input.trackingNumber !== undefined && { trackingNumber: input.trackingNumber }),
      ...(input.estimatedArrival !== undefined && { estimatedArrival: input.estimatedArrival }),
      ...(input.actualArrival !== undefined && { actualArrival: input.actualArrival }),
      ...(input.containerNumber !== undefined && { containerNumber: input.containerNumber }),
      ...(input.billOfLading !== undefined && { billOfLading: input.billOfLading }),
      ...(input.incoterms !== undefined && { incoterms: input.incoterms }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['import_export_shipment', content.direction, content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toShipment(row as MemoryRow);
  },

  async deleteShipment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async fileShipment(id: string, _filedBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'filed' });
  },

  async transitShipment(id: string, _transitBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'in_transit' });
  },

  async arriveShipment(id: string, _arrivedBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'arrived', actualArrival: new Date().toISOString() });
  },

  async clearShipment(id: string, _clearedBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'cleared' });
  },

  async deliverShipment(id: string, _deliveredBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'delivered' });
  },

  async holdShipment(id: string, _heldBy: string): Promise<ImportExportShipment | null> {
    return ImportExportService.updateShipment(id, { status: 'held' });
  },

  // ── Declarations ──

  async createDeclaration(organizationId: string, workspaceId: string, input: CreateDeclarationInput, createdBy: string): Promise<CustomsDeclaration> {
    const content = {
      shipmentId: input.shipmentId ?? null,
      reference: input.reference.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      country: input.country ?? '',
      port: input.port ?? '',
      declaredValue: input.declaredValue ?? 0,
      currency: input.currency ?? 'USD',
      hsCode: input.hsCode ?? '',
      goodsDescription: input.goodsDescription ?? '',
      quantity: input.quantity ?? 0,
      origin: input.origin ?? '',
      destination: input.destination ?? '',
      importer: input.importer ?? '',
      exporter: input.exporter ?? '',
      broker: input.broker ?? '',
      filingDate: input.filingDate ?? null,
      approvalDate: input.approvalDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'customs_declaration',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.shipmentId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['customs_declaration', content.type, content.status]),
        createdBy,
      },
    });
    return toDeclaration(row as MemoryRow);
  },

  async getDeclaration(id: string): Promise<CustomsDeclaration | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'customs_declaration') return null;
    return toDeclaration(row as MemoryRow);
  },

  async listDeclarations(organizationId: string, opts: ListDeclarationsOpts = {}): Promise<CustomsDeclaration[]> {
    const where: Record<string, unknown> = { organizationId, type: 'customs_declaration' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDeclaration);
  },

  async updateDeclaration(id: string, input: UpdateDeclarationInput): Promise<CustomsDeclaration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.shipmentId !== undefined && { shipmentId: input.shipmentId }),
      ...(input.reference !== undefined && { reference: input.reference.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.port !== undefined && { port: input.port }),
      ...(input.declaredValue !== undefined && { declaredValue: input.declaredValue }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.hsCode !== undefined && { hsCode: input.hsCode }),
      ...(input.goodsDescription !== undefined && { goodsDescription: input.goodsDescription }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.origin !== undefined && { origin: input.origin }),
      ...(input.destination !== undefined && { destination: input.destination }),
      ...(input.importer !== undefined && { importer: input.importer }),
      ...(input.exporter !== undefined && { exporter: input.exporter }),
      ...(input.broker !== undefined && { broker: input.broker }),
      ...(input.filingDate !== undefined && { filingDate: input.filingDate }),
      ...(input.approvalDate !== undefined && { approvalDate: input.approvalDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['customs_declaration', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDeclaration(row as MemoryRow);
  },

  async deleteDeclaration(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitDeclaration(id: string, _submittedBy: string): Promise<CustomsDeclaration | null> {
    return ImportExportService.updateDeclaration(id, { status: 'submitted', filingDate: new Date().toISOString() });
  },

  async approveDeclaration(id: string, _approvedBy: string): Promise<CustomsDeclaration | null> {
    return ImportExportService.updateDeclaration(id, { status: 'approved', approvalDate: new Date().toISOString() });
  },

  async rejectDeclaration(id: string, _rejectedBy: string): Promise<CustomsDeclaration | null> {
    return ImportExportService.updateDeclaration(id, { status: 'rejected' });
  },

  async amendDeclaration(id: string, _amendedBy: string): Promise<CustomsDeclaration | null> {
    return ImportExportService.updateDeclaration(id, { status: 'amended' });
  },

  // ── Licenses ──

  async createLicense(organizationId: string, workspaceId: string, input: CreateLicenseInput, createdBy: string): Promise<TradeLicense> {
    const content = {
      reference: input.reference.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      issuingAuthority: input.issuingAuthority ?? '',
      country: input.country ?? '',
      holder: input.holder ?? '',
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      goods: input.goods ?? '',
      restrictions: input.restrictions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'trade_license',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['trade_license', content.type, content.status]),
        createdBy,
      },
    });
    return toLicense(row as MemoryRow);
  },

  async getLicense(id: string): Promise<TradeLicense | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'trade_license') return null;
    return toLicense(row as MemoryRow);
  },

  async listLicenses(organizationId: string, opts: ListLicensesOpts = {}): Promise<TradeLicense[]> {
    const where: Record<string, unknown> = { organizationId, type: 'trade_license' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLicense);
  },

  async updateLicense(id: string, input: UpdateLicenseInput): Promise<TradeLicense | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.reference !== undefined && { reference: input.reference.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.issuingAuthority !== undefined && { issuingAuthority: input.issuingAuthority }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.holder !== undefined && { holder: input.holder }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.goods !== undefined && { goods: input.goods }),
      ...(input.restrictions !== undefined && { restrictions: input.restrictions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['trade_license', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toLicense(row as MemoryRow);
  },

  async deleteLicense(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateLicense(id: string, _activatedBy: string): Promise<TradeLicense | null> {
    return ImportExportService.updateLicense(id, { status: 'active' });
  },

  async suspendLicense(id: string, _suspendedBy: string): Promise<TradeLicense | null> {
    return ImportExportService.updateLicense(id, { status: 'suspended' });
  },

  async revokeLicense(id: string, _revokedBy: string): Promise<TradeLicense | null> {
    return ImportExportService.updateLicense(id, { status: 'revoked' });
  },

  // ── Tariffs ──

  async createTariff(organizationId: string, workspaceId: string, input: CreateTariffInput, createdBy: string): Promise<TariffRecord> {
    const content = {
      hsCode: input.hsCode.trim(),
      description: input.description.trim(),
      type: input.type,
      rate: input.rate,
      unit: input.unit ?? '',
      country: input.country ?? '',
      status: input.status ?? 'active',
      effectiveDate: input.effectiveDate ?? null,
      expiryDate: input.expiryDate ?? null,
      preferentialRate: input.preferentialRate ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'tariff_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['tariff_record', content.type, content.status, content.country]),
        createdBy,
      },
    });
    return toTariff(row as MemoryRow);
  },

  async getTariff(id: string): Promise<TariffRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'tariff_record') return null;
    return toTariff(row as MemoryRow);
  },

  async listTariffs(organizationId: string, opts: ListTariffsOpts = {}): Promise<TariffRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'tariff_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.country) conditions.push({ content: { contains: `"country":"${opts.country}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTariff);
  },

  async updateTariff(id: string, input: UpdateTariffInput): Promise<TariffRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.hsCode !== undefined && { hsCode: input.hsCode.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.rate !== undefined && { rate: input.rate }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      ...(input.preferentialRate !== undefined && { preferentialRate: input.preferentialRate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['tariff_record', content.type, content.status, content.country]) },
    }), null);
    if (!row) return null;
    return toTariff(row as MemoryRow);
  },

  async deleteTariff(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getImportExportMetrics(organizationId: string): Promise<ImportExportMetrics> {
    const [shipments, declarations, licenses, tariffs] = await Promise.all([
      ImportExportService.listShipments(organizationId),
      ImportExportService.listDeclarations(organizationId),
      ImportExportService.listLicenses(organizationId),
      ImportExportService.listTariffs(organizationId),
    ]);
    const activeShipments = shipments.filter((s) => s.status === 'filed' || s.status === 'in_transit' || s.status === 'arrived').length;
    const pendingDeclarations = declarations.filter((d) => d.status === 'draft' || d.status === 'submitted' || d.status === 'under_review').length;
    const activeLicenses = licenses.filter((l) => l.status === 'active').length;
    const activeTariffs = tariffs.filter((t) => t.status === 'active').length;
    const clearedShipments = shipments.filter((s) => s.status === 'cleared' || s.status === 'delivered').length;
    const shipmentClearanceRate = shipments.length > 0 ? Math.round((clearedShipments / shipments.length) * 100) : 0;
    return { activeShipments, pendingDeclarations, activeLicenses, activeTariffs, shipmentClearanceRate };
  },

  async getImportExportStats(organizationId: string): Promise<ImportExportStats> {
    const [shipments, declarations, licenses, tariffs] = await Promise.all([
      ImportExportService.listShipments(organizationId),
      ImportExportService.listDeclarations(organizationId),
      ImportExportService.listLicenses(organizationId),
      ImportExportService.listTariffs(organizationId),
    ]);
    const byShipmentDirection: Record<string, number> = {};
    const byShipmentStatus: Record<string, number> = {};
    const byDeclarationStatus: Record<string, number> = {};
    const byLicenseStatus: Record<string, number> = {};
    const byTariffType: Record<string, number> = {};
    for (const s of shipments) { byShipmentDirection[s.direction] = (byShipmentDirection[s.direction] ?? 0) + 1; byShipmentStatus[s.status] = (byShipmentStatus[s.status] ?? 0) + 1; }
    for (const d of declarations) { byDeclarationStatus[d.status] = (byDeclarationStatus[d.status] ?? 0) + 1; }
    for (const l of licenses) { byLicenseStatus[l.status] = (byLicenseStatus[l.status] ?? 0) + 1; }
    for (const t of tariffs) { byTariffType[t.type] = (byTariffType[t.type] ?? 0) + 1; }
    return {
      shipmentCount: shipments.length,
      declarationCount: declarations.length,
      licenseCount: licenses.length,
      tariffCount: tariffs.length,
      activeShipmentCount: shipments.filter((s) => s.status === 'filed' || s.status === 'in_transit' || s.status === 'arrived').length,
      pendingDeclarationCount: declarations.filter((d) => d.status === 'draft' || d.status === 'submitted' || d.status === 'under_review').length,
      activeLicenseCount: licenses.filter((l) => l.status === 'active').length,
      activeTariffCount: tariffs.filter((t) => t.status === 'active').length,
      byShipmentDirection, byShipmentStatus, byDeclarationStatus, byLicenseStatus, byTariffType,
    };
  },
};
