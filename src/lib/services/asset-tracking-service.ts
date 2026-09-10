import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AssetCategory = 'it_equipment' | 'furniture' | 'vehicle' | 'machinery' | 'building' | 'software' | 'tool' | 'other';
export type AssetStatus = 'available' | 'assigned' | 'in_repair' | 'retired' | 'lost' | 'disposed';
export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
export type AssignmentStatus = 'active' | 'returned' | 'transferred' | 'lost';
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'sum_of_years' | 'units_of_production' | 'none';
export type DepreciationStatus = 'active' | 'completed' | 'suspended';
export type AuditType = 'physical' | 'spot_check' | 'reconciliation' | 'compliance' | 'disposal';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

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

export interface AssetItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: AssetCategory;
  assetTag: string;
  serialNumber: string;
  description: string;
  status: AssetStatus;
  condition: AssetCondition;
  location: string;
  department: string;
  purchaseDate: Date | null;
  purchasePrice: number;
  currentValue: number;
  supplier: string;
  warrantyExpiry: Date | null;
  insuranceValue: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAssignment {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string;
  assignedTo: string;
  assignedToName: string;
  status: AssignmentStatus;
  assignedDate: Date | null;
  returnDate: Date | null;
  expectedReturnDate: Date | null;
  conditionAtAssignment: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepreciationRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  assetId: string;
  method: DepreciationMethod;
  status: DepreciationStatus;
  purchasePrice: number;
  salvageValue: number;
  usefulLife: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  currentValue: number;
  startDate: Date | null;
  endDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAudit {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AuditType;
  description: string;
  status: AuditStatus;
  auditor: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  scope: string;
  findings: string;
  discrepancies: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetTrackingMetrics {
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  inRepairAssets: number;
  retiredAssets: number;
  totalValue: number;
  activeDepreciations: number;
  completedAudits: number;
}

export interface AssetTrackingStats {
  assetCount: number;
  assignmentCount: number;
  activeAssignmentCount: number;
  depreciationCount: number;
  activeDepreciationCount: number;
  auditCount: number;
  completedAuditCount: number;
  byAssetCategory: Record<string, number>;
  byAssetStatus: Record<string, number>;
  byAssetCondition: Record<string, number>;
  byAssignmentStatus: Record<string, number>;
  byDepreciationStatus: Record<string, number>;
  byAuditType: Record<string, number>;
  byAuditStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAssetInput {
  name: string;
  category: AssetCategory;
  assetTag?: string;
  serialNumber?: string;
  description?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  department?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  supplier?: string;
  warrantyExpiry?: string;
  insuranceValue?: number;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: AssetCategory;
  assetTag?: string;
  serialNumber?: string;
  description?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  department?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  supplier?: string;
  warrantyExpiry?: string;
  insuranceValue?: number;
  notes?: string;
}

export interface ListAssetsOpts {
  category?: AssetCategory;
  status?: AssetStatus;
  condition?: AssetCondition;
  department?: string;
}

export interface CreateAssignmentInput {
  assetId: string;
  assignedTo: string;
  assignedToName: string;
  status?: AssignmentStatus;
  assignedDate?: string;
  returnDate?: string;
  expectedReturnDate?: string;
  conditionAtAssignment?: string;
  notes?: string;
}

export interface UpdateAssignmentInput {
  assignedTo?: string;
  assignedToName?: string;
  status?: AssignmentStatus;
  assignedDate?: string;
  returnDate?: string;
  expectedReturnDate?: string;
  conditionAtAssignment?: string;
  notes?: string;
}

export interface ListAssignmentsOpts {
  assetId?: string;
  assignedTo?: string;
  status?: AssignmentStatus;
}

export interface CreateDepreciationInput {
  assetId: string;
  method: DepreciationMethod;
  status?: DepreciationStatus;
  purchasePrice?: number;
  salvageValue?: number;
  usefulLife?: number;
  annualDepreciation?: number;
  accumulatedDepreciation?: number;
  currentValue?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateDepreciationInput {
  method?: DepreciationMethod;
  status?: DepreciationStatus;
  purchasePrice?: number;
  salvageValue?: number;
  usefulLife?: number;
  annualDepreciation?: number;
  accumulatedDepreciation?: number;
  currentValue?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ListDepreciationsOpts {
  assetId?: string;
  method?: DepreciationMethod;
  status?: DepreciationStatus;
}

export interface CreateAuditInput {
  name: string;
  type: AuditType;
  description?: string;
  status?: AuditStatus;
  auditor?: string;
  scheduledDate?: string;
  completedDate?: string;
  scope?: string;
  findings?: string;
  discrepancies?: string;
  notes?: string;
}

export interface UpdateAuditInput {
  name?: string;
  type?: AuditType;
  description?: string;
  status?: AuditStatus;
  auditor?: string;
  scheduledDate?: string;
  completedDate?: string;
  scope?: string;
  findings?: string;
  discrepancies?: string;
  notes?: string;
}

export interface ListAuditsOpts {
  type?: AuditType;
  status?: AuditStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toAsset(row: MemoryRow): AssetItem {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    category: (c.category as AssetCategory) ?? 'other',
    assetTag: (c.assetTag as string) ?? '',
    serialNumber: (c.serialNumber as string) ?? '',
    description: (c.description as string) ?? '',
    status: (c.status as AssetStatus) ?? 'available',
    condition: (c.condition as AssetCondition) ?? 'good',
    location: (c.location as string) ?? '',
    department: (c.department as string) ?? '',
    purchaseDate: c.purchaseDate ? new Date(c.purchaseDate as string) : null,
    purchasePrice: (c.purchasePrice as number) ?? 0,
    currentValue: (c.currentValue as number) ?? 0,
    supplier: (c.supplier as string) ?? '',
    warrantyExpiry: c.warrantyExpiry ? new Date(c.warrantyExpiry as string) : null,
    insuranceValue: (c.insuranceValue as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAssignment(row: MemoryRow): AssetAssignment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: (c.assetId as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    assignedToName: (c.assignedToName as string) ?? '',
    status: (c.status as AssignmentStatus) ?? 'active',
    assignedDate: c.assignedDate ? new Date(c.assignedDate as string) : null,
    returnDate: c.returnDate ? new Date(c.returnDate as string) : null,
    expectedReturnDate: c.expectedReturnDate ? new Date(c.expectedReturnDate as string) : null,
    conditionAtAssignment: (c.conditionAtAssignment as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDepreciation(row: MemoryRow): DepreciationRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    assetId: (c.assetId as string) ?? '',
    method: (c.method as DepreciationMethod) ?? 'straight_line',
    status: (c.status as DepreciationStatus) ?? 'active',
    purchasePrice: (c.purchasePrice as number) ?? 0,
    salvageValue: (c.salvageValue as number) ?? 0,
    usefulLife: (c.usefulLife as number) ?? 0,
    annualDepreciation: (c.annualDepreciation as number) ?? 0,
    accumulatedDepreciation: (c.accumulatedDepreciation as number) ?? 0,
    currentValue: (c.currentValue as number) ?? 0,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAudit(row: MemoryRow): AssetAudit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AuditType) ?? 'physical',
    description: (c.description as string) ?? '',
    status: (c.status as AuditStatus) ?? 'planned',
    auditor: (c.auditor as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    scope: (c.scope as string) ?? '',
    findings: (c.findings as string) ?? '',
    discrepancies: (c.discrepancies as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const AssetTrackingService = {
  // ── Assets ──

  async createAsset(organizationId: string, workspaceId: string, input: CreateAssetInput, createdBy: string): Promise<AssetItem> {
    const content = {
      name: input.name.trim(),
      category: input.category,
      assetTag: input.assetTag ?? '',
      serialNumber: input.serialNumber ?? '',
      description: input.description ?? '',
      status: input.status ?? 'available',
      condition: input.condition ?? 'good',
      location: input.location ?? '',
      department: input.department ?? '',
      purchaseDate: input.purchaseDate ?? null,
      purchasePrice: input.purchasePrice ?? 0,
      currentValue: input.currentValue ?? 0,
      supplier: input.supplier ?? '',
      warrantyExpiry: input.warrantyExpiry ?? null,
      insuranceValue: input.insuranceValue ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_item',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_item', content.category, content.status, content.condition]),
        createdBy,
      },
    });
    return toAsset(row as MemoryRow);
  },

  async getAsset(id: string): Promise<AssetItem | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_item') return null;
    return toAsset(row as MemoryRow);
  },

  async listAssets(organizationId: string, opts: ListAssetsOpts = {}): Promise<AssetItem[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_item' };
    const conditions: unknown[] = [];
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.condition) conditions.push({ content: { contains: `"condition":"${opts.condition}"` } });
    if (opts.department) conditions.push({ content: { contains: `"department":"${opts.department}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAsset);
  },

  async updateAsset(id: string, input: UpdateAssetInput): Promise<AssetItem | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.assetTag !== undefined && { assetTag: input.assetTag }),
      ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.purchaseDate !== undefined && { purchaseDate: input.purchaseDate }),
      ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice }),
      ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
      ...(input.supplier !== undefined && { supplier: input.supplier }),
      ...(input.warrantyExpiry !== undefined && { warrantyExpiry: input.warrantyExpiry }),
      ...(input.insuranceValue !== undefined && { insuranceValue: input.insuranceValue }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_item', content.category, content.status, content.condition]) },
    }), null);
    if (!row) return null;
    return toAsset(row as MemoryRow);
  },

  async deleteAsset(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Assignments ──

  async createAssignment(organizationId: string, workspaceId: string, input: CreateAssignmentInput, createdBy: string): Promise<AssetAssignment> {
    const content = {
      assetId: input.assetId,
      assignedTo: input.assignedTo,
      assignedToName: input.assignedToName,
      status: input.status ?? 'active',
      assignedDate: input.assignedDate ?? null,
      returnDate: input.returnDate ?? null,
      expectedReturnDate: input.expectedReturnDate ?? null,
      conditionAtAssignment: input.conditionAtAssignment ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_assignment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_assignment', content.status]),
        createdBy,
      },
    });
    return toAssignment(row as MemoryRow);
  },

  async getAssignment(id: string): Promise<AssetAssignment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_assignment') return null;
    return toAssignment(row as MemoryRow);
  },

  async listAssignments(organizationId: string, opts: ListAssignmentsOpts = {}): Promise<AssetAssignment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_assignment' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.assetId) conditions.push({ content: { contains: `"assetId":"${opts.assetId}"` } });
    if (opts.assignedTo) conditions.push({ content: { contains: `"assignedTo":"${opts.assignedTo}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAssignment);
  },

  async updateAssignment(id: string, input: UpdateAssignmentInput): Promise<AssetAssignment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.assignedToName !== undefined && { assignedToName: input.assignedToName }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.assignedDate !== undefined && { assignedDate: input.assignedDate }),
      ...(input.returnDate !== undefined && { returnDate: input.returnDate }),
      ...(input.expectedReturnDate !== undefined && { expectedReturnDate: input.expectedReturnDate }),
      ...(input.conditionAtAssignment !== undefined && { conditionAtAssignment: input.conditionAtAssignment }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_assignment', content.status]) },
    }), null);
    if (!row) return null;
    return toAssignment(row as MemoryRow);
  },

  async deleteAssignment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async returnAssignment(id: string, _returnedBy: string): Promise<AssetAssignment | null> {
    return AssetTrackingService.updateAssignment(id, { status: 'returned', returnDate: new Date().toISOString() });
  },

  async transferAssignment(id: string, _transferredBy: string): Promise<AssetAssignment | null> {
    return AssetTrackingService.updateAssignment(id, { status: 'transferred' });
  },

  // ── Depreciations ──

  async createDepreciation(organizationId: string, workspaceId: string, input: CreateDepreciationInput, createdBy: string): Promise<DepreciationRecord> {
    const content = {
      assetId: input.assetId,
      method: input.method,
      status: input.status ?? 'active',
      purchasePrice: input.purchasePrice ?? 0,
      salvageValue: input.salvageValue ?? 0,
      usefulLife: input.usefulLife ?? 0,
      annualDepreciation: input.annualDepreciation ?? 0,
      accumulatedDepreciation: input.accumulatedDepreciation ?? 0,
      currentValue: input.currentValue ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'depreciation_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.assetId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['depreciation_record', content.method, content.status]),
        createdBy,
      },
    });
    return toDepreciation(row as MemoryRow);
  },

  async getDepreciation(id: string): Promise<DepreciationRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'depreciation_record') return null;
    return toDepreciation(row as MemoryRow);
  },

  async listDepreciations(organizationId: string, opts: ListDepreciationsOpts = {}): Promise<DepreciationRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'depreciation_record' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.assetId) conditions.push({ content: { contains: `"assetId":"${opts.assetId}"` } });
    if (opts.method) conditions.push({ content: { contains: `"method":"${opts.method}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDepreciation);
  },

  async updateDepreciation(id: string, input: UpdateDepreciationInput): Promise<DepreciationRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.method !== undefined && { method: input.method }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice }),
      ...(input.salvageValue !== undefined && { salvageValue: input.salvageValue }),
      ...(input.usefulLife !== undefined && { usefulLife: input.usefulLife }),
      ...(input.annualDepreciation !== undefined && { annualDepreciation: input.annualDepreciation }),
      ...(input.accumulatedDepreciation !== undefined && { accumulatedDepreciation: input.accumulatedDepreciation }),
      ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['depreciation_record', content.method, content.status]) },
    }), null);
    if (!row) return null;
    return toDepreciation(row as MemoryRow);
  },

  async deleteDepreciation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async completeDepreciation(id: string, _completedBy: string): Promise<DepreciationRecord | null> {
    return AssetTrackingService.updateDepreciation(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async suspendDepreciation(id: string, _suspendedBy: string): Promise<DepreciationRecord | null> {
    return AssetTrackingService.updateDepreciation(id, { status: 'suspended' });
  },

  // ── Audits ──

  async createAudit(organizationId: string, workspaceId: string, input: CreateAuditInput, createdBy: string): Promise<AssetAudit> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      auditor: input.auditor ?? '',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      scope: input.scope ?? '',
      findings: input.findings ?? '',
      discrepancies: input.discrepancies ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'asset_audit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['asset_audit', content.type, content.status]),
        createdBy,
      },
    });
    return toAudit(row as MemoryRow);
  },

  async getAudit(id: string): Promise<AssetAudit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'asset_audit') return null;
    return toAudit(row as MemoryRow);
  },

  async listAudits(organizationId: string, opts: ListAuditsOpts = {}): Promise<AssetAudit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'asset_audit' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAudit);
  },

  async updateAudit(id: string, input: UpdateAuditInput): Promise<AssetAudit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.auditor !== undefined && { auditor: input.auditor }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.discrepancies !== undefined && { discrepancies: input.discrepancies }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['asset_audit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  async deleteAudit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startAudit(id: string, _startedBy: string): Promise<AssetAudit | null> {
    return AssetTrackingService.updateAudit(id, { status: 'in_progress' });
  },

  async completeAudit(id: string, _completedBy: string): Promise<AssetAudit | null> {
    return AssetTrackingService.updateAudit(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getAssetTrackingMetrics(organizationId: string): Promise<AssetTrackingMetrics> {
    const assets = await AssetTrackingService.listAssets(organizationId);
    const depreciations = await AssetTrackingService.listDepreciations(organizationId);
    const audits = await AssetTrackingService.listAudits(organizationId);
    return {
      totalAssets: assets.length,
      assignedAssets: assets.filter((a) => a.status === 'assigned').length,
      availableAssets: assets.filter((a) => a.status === 'available').length,
      inRepairAssets: assets.filter((a) => a.status === 'in_repair').length,
      retiredAssets: assets.filter((a) => a.status === 'retired').length,
      totalValue: assets.reduce((sum, a) => sum + a.currentValue, 0),
      activeDepreciations: depreciations.filter((d) => d.status === 'active').length,
      completedAudits: audits.filter((a) => a.status === 'completed').length,
    };
  },

  async getAssetTrackingStats(organizationId: string): Promise<AssetTrackingStats> {
    const [assets, assignments, depreciations, audits] = await Promise.all([
      AssetTrackingService.listAssets(organizationId),
      AssetTrackingService.listAssignments(organizationId),
      AssetTrackingService.listDepreciations(organizationId),
      AssetTrackingService.listAudits(organizationId),
    ]);
    const byAssetCategory: Record<string, number> = {};
    const byAssetStatus: Record<string, number> = {};
    const byAssetCondition: Record<string, number> = {};
    const byAssignmentStatus: Record<string, number> = {};
    const byDepreciationStatus: Record<string, number> = {};
    const byAuditType: Record<string, number> = {};
    const byAuditStatus: Record<string, number> = {};
    for (const a of assets) { byAssetCategory[a.category] = (byAssetCategory[a.category] ?? 0) + 1; byAssetStatus[a.status] = (byAssetStatus[a.status] ?? 0) + 1; byAssetCondition[a.condition] = (byAssetCondition[a.condition] ?? 0) + 1; }
    for (const a of assignments) { byAssignmentStatus[a.status] = (byAssignmentStatus[a.status] ?? 0) + 1; }
    for (const d of depreciations) { byDepreciationStatus[d.status] = (byDepreciationStatus[d.status] ?? 0) + 1; }
    for (const a of audits) { byAuditType[a.type] = (byAuditType[a.type] ?? 0) + 1; byAuditStatus[a.status] = (byAuditStatus[a.status] ?? 0) + 1; }
    return {
      assetCount: assets.length,
      assignmentCount: assignments.length,
      activeAssignmentCount: assignments.filter((a) => a.status === 'active').length,
      depreciationCount: depreciations.length,
      activeDepreciationCount: depreciations.filter((d) => d.status === 'active').length,
      auditCount: audits.length,
      completedAuditCount: audits.filter((a) => a.status === 'completed').length,
      byAssetCategory, byAssetStatus, byAssetCondition, byAssignmentStatus, byDepreciationStatus, byAuditType, byAuditStatus,
    };
  },
};
