import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type InspectionType = 'incoming' | 'in_process' | 'final' | 'random' | 'supplier' | 'product' | 'process' | 'shipment';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'conditional' | 'cancelled';
export type InspectionResult = 'pass' | 'fail' | 'conditional_pass' | 'pending';
export type DefectType = 'cosmetic' | 'functional' | 'safety' | 'performance' | 'packaging' | 'documentation' | 'process' | 'material';
export type DefectSeverity = 'critical' | 'major' | 'minor' | 'cosmetic';
export type DefectStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'rejected';
export type CapaType = 'corrective' | 'preventive' | 'combined';
export type CapaStatus = 'open' | 'in_progress' | 'implemented' | 'verified' | 'closed' | 'cancelled';
export type CapaPriority = 'low' | 'medium' | 'high' | 'critical';
export type QaAuditType = 'process' | 'product' | 'system' | 'supplier' | 'internal' | 'external' | 'regulatory';
export type QaAuditStatus = 'planned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

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

export interface QaInspection {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: InspectionType;
  status: InspectionStatus;
  result: InspectionResult;
  productId: string | null;
  productName: string;
  batchId: string | null;
  inspector: string;
  inspectionDate: Date | null;
  location: string;
  sampleSize: number;
  defectsFound: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QaDefect {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: DefectType;
  severity: DefectSeverity;
  status: DefectStatus;
  productId: string | null;
  productName: string;
  batchId: string | null;
  inspectionId: string | null;
  description: string;
  identifiedBy: string;
  identifiedDate: Date | null;
  resolvedBy: string;
  resolvedDate: Date | null;
  rootCause: string;
  resolution: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QaCapa {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: CapaType;
  priority: CapaPriority;
  status: CapaStatus;
  defectId: string | null;
  description: string;
  assignedTo: string;
  rootCause: string;
  action: string;
  implementationDate: Date | null;
  verificationDate: Date | null;
  verifiedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QaAudit {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: QaAuditType;
  description: string;
  status: QaAuditStatus;
  auditor: string;
  auditedEntity: string;
  scheduledDate: Date | null;
  completedDate: Date | null;
  scope: string;
  findings: string;
  recommendations: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityAssuranceMetrics {
  openDefects: number;
  criticalDefects: number;
  openCapas: number;
  capaCompletionRate: number;
  inspectionPassRate: number;
}

export interface QualityAssuranceStats {
  inspectionCount: number;
  defectCount: number;
  capaCount: number;
  auditCount: number;
  openDefectCount: number;
  openCapaCount: number;
  byInspectionType: Record<string, number>;
  byInspectionStatus: Record<string, number>;
  byDefectSeverity: Record<string, number>;
  byDefectStatus: Record<string, number>;
  byCapaStatus: Record<string, number>;
  byAuditType: Record<string, number>;
}

// ── Input / Options ──

export interface CreateInspectionInput {
  type: InspectionType;
  productId?: string;
  productName?: string;
  batchId?: string;
  inspector?: string;
  inspectionDate?: string;
  location?: string;
  sampleSize?: number;
  defectsFound?: number;
  status?: InspectionStatus;
  result?: InspectionResult;
  notes?: string;
}

export interface UpdateInspectionInput {
  type?: InspectionType;
  productId?: string;
  productName?: string;
  batchId?: string;
  inspector?: string;
  inspectionDate?: string;
  location?: string;
  sampleSize?: number;
  defectsFound?: number;
  status?: InspectionStatus;
  result?: InspectionResult;
  notes?: string;
}

export interface ListInspectionsOpts {
  type?: InspectionType;
  status?: InspectionStatus;
  result?: InspectionResult;
}

export interface CreateDefectInput {
  title: string;
  type: DefectType;
  severity: DefectSeverity;
  productId?: string;
  productName?: string;
  batchId?: string;
  inspectionId?: string;
  description?: string;
  status?: DefectStatus;
  identifiedBy?: string;
  identifiedDate?: string;
  resolvedBy?: string;
  resolvedDate?: string;
  rootCause?: string;
  resolution?: string;
  notes?: string;
}

export interface UpdateDefectInput {
  title?: string;
  type?: DefectType;
  severity?: DefectSeverity;
  status?: DefectStatus;
  productId?: string;
  productName?: string;
  batchId?: string;
  inspectionId?: string;
  description?: string;
  identifiedBy?: string;
  identifiedDate?: string;
  resolvedBy?: string;
  resolvedDate?: string;
  rootCause?: string;
  resolution?: string;
  notes?: string;
}

export interface ListDefectsOpts {
  type?: DefectType;
  severity?: DefectSeverity;
  status?: DefectStatus;
  productId?: string;
}

export interface CreateCapaInput {
  title: string;
  type: CapaType;
  priority: CapaPriority;
  defectId?: string;
  description?: string;
  status?: CapaStatus;
  assignedTo?: string;
  rootCause?: string;
  action?: string;
  implementationDate?: string;
  verificationDate?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface UpdateCapaInput {
  title?: string;
  type?: CapaType;
  priority?: CapaPriority;
  status?: CapaStatus;
  defectId?: string;
  description?: string;
  assignedTo?: string;
  rootCause?: string;
  action?: string;
  implementationDate?: string;
  verificationDate?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface ListCapasOpts {
  type?: CapaType;
  status?: CapaStatus;
  priority?: CapaPriority;
}

export interface CreateAuditInput {
  name: string;
  type: QaAuditType;
  description?: string;
  status?: QaAuditStatus;
  auditor?: string;
  auditedEntity?: string;
  scheduledDate?: string;
  completedDate?: string;
  scope?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface UpdateAuditInput {
  name?: string;
  type?: QaAuditType;
  description?: string;
  status?: QaAuditStatus;
  auditor?: string;
  auditedEntity?: string;
  scheduledDate?: string;
  completedDate?: string;
  scope?: string;
  findings?: string;
  recommendations?: string;
  notes?: string;
}

export interface ListAuditsOpts {
  type?: QaAuditType;
  status?: QaAuditStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toInspection(row: MemoryRow): QaInspection {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as InspectionType) ?? 'incoming',
    status: (c.status as InspectionStatus) ?? 'scheduled',
    result: (c.result as InspectionResult) ?? 'pending',
    productId: (c.productId as string) ?? null,
    productName: (c.productName as string) ?? '',
    batchId: (c.batchId as string) ?? null,
    inspector: (c.inspector as string) ?? '',
    inspectionDate: c.inspectionDate ? new Date(c.inspectionDate as string) : null,
    location: (c.location as string) ?? '',
    sampleSize: (c.sampleSize as number) ?? 0,
    defectsFound: (c.defectsFound as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDefect(row: MemoryRow): QaDefect {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as DefectType) ?? 'functional',
    severity: (c.severity as DefectSeverity) ?? 'minor',
    status: (c.status as DefectStatus) ?? 'open',
    productId: (c.productId as string) ?? null,
    productName: (c.productName as string) ?? '',
    batchId: (c.batchId as string) ?? null,
    inspectionId: (c.inspectionId as string) ?? null,
    description: (c.description as string) ?? '',
    identifiedBy: (c.identifiedBy as string) ?? '',
    identifiedDate: c.identifiedDate ? new Date(c.identifiedDate as string) : null,
    resolvedBy: (c.resolvedBy as string) ?? '',
    resolvedDate: c.resolvedDate ? new Date(c.resolvedDate as string) : null,
    rootCause: (c.rootCause as string) ?? '',
    resolution: (c.resolution as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCapa(row: MemoryRow): QaCapa {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as CapaType) ?? 'corrective',
    priority: (c.priority as CapaPriority) ?? 'medium',
    status: (c.status as CapaStatus) ?? 'open',
    defectId: (c.defectId as string) ?? null,
    description: (c.description as string) ?? '',
    assignedTo: (c.assignedTo as string) ?? '',
    rootCause: (c.rootCause as string) ?? '',
    action: (c.action as string) ?? '',
    implementationDate: c.implementationDate ? new Date(c.implementationDate as string) : null,
    verificationDate: c.verificationDate ? new Date(c.verificationDate as string) : null,
    verifiedBy: (c.verifiedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAudit(row: MemoryRow): QaAudit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as QaAuditType) ?? 'internal',
    description: (c.description as string) ?? '',
    status: (c.status as QaAuditStatus) ?? 'planned',
    auditor: (c.auditor as string) ?? '',
    auditedEntity: (c.auditedEntity as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    scope: (c.scope as string) ?? '',
    findings: (c.findings as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const QualityAssuranceService = {
  // ── Inspections ──

  async createInspection(organizationId: string, workspaceId: string, input: CreateInspectionInput, createdBy: string): Promise<QaInspection> {
    const content = {
      type: input.type,
      productId: input.productId ?? null,
      productName: input.productName ?? '',
      batchId: input.batchId ?? null,
      inspector: input.inspector ?? '',
      inspectionDate: input.inspectionDate ?? null,
      location: input.location ?? '',
      sampleSize: input.sampleSize ?? 0,
      defectsFound: input.defectsFound ?? 0,
      status: input.status ?? 'scheduled',
      result: input.result ?? 'pending',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'qa_inspection',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.productId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['qa_inspection', content.type, content.status, content.result]),
        createdBy,
      },
    });
    return toInspection(row as MemoryRow);
  },

  async getInspection(id: string): Promise<QaInspection | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'qa_inspection') return null;
    return toInspection(row as MemoryRow);
  },

  async listInspections(organizationId: string, opts: ListInspectionsOpts = {}): Promise<QaInspection[]> {
    const where: Record<string, unknown> = { organizationId, type: 'qa_inspection' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.result) conditions.push({ content: { contains: `"result":"${opts.result}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toInspection);
  },

  async updateInspection(id: string, input: UpdateInspectionInput): Promise<QaInspection | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.productId !== undefined && { productId: input.productId }),
      ...(input.productName !== undefined && { productName: input.productName }),
      ...(input.batchId !== undefined && { batchId: input.batchId }),
      ...(input.inspector !== undefined && { inspector: input.inspector }),
      ...(input.inspectionDate !== undefined && { inspectionDate: input.inspectionDate }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.sampleSize !== undefined && { sampleSize: input.sampleSize }),
      ...(input.defectsFound !== undefined && { defectsFound: input.defectsFound }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['qa_inspection', content.type, content.status, content.result]) },
    }), null);
    if (!row) return null;
    return toInspection(row as MemoryRow);
  },

  async deleteInspection(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startInspection(id: string, _startedBy: string): Promise<QaInspection | null> {
    return QualityAssuranceService.updateInspection(id, { status: 'in_progress' });
  },

  async passInspection(id: string, _passedBy: string): Promise<QaInspection | null> {
    return QualityAssuranceService.updateInspection(id, { status: 'passed', result: 'pass' });
  },

  async failInspection(id: string, _failedBy: string): Promise<QaInspection | null> {
    return QualityAssuranceService.updateInspection(id, { status: 'failed', result: 'fail' });
  },

  // ── Defects ──

  async createDefect(organizationId: string, workspaceId: string, input: CreateDefectInput, createdBy: string): Promise<QaDefect> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      severity: input.severity,
      status: input.status ?? 'open',
      productId: input.productId ?? null,
      productName: input.productName ?? '',
      batchId: input.batchId ?? null,
      inspectionId: input.inspectionId ?? null,
      description: input.description ?? '',
      identifiedBy: input.identifiedBy ?? '',
      identifiedDate: input.identifiedDate ?? null,
      resolvedBy: input.resolvedBy ?? '',
      resolvedDate: input.resolvedDate ?? null,
      rootCause: input.rootCause ?? '',
      resolution: input.resolution ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'qa_defect',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.inspectionId ?? input.productId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['qa_defect', content.type, content.severity, content.status]),
        createdBy,
      },
    });
    return toDefect(row as MemoryRow);
  },

  async getDefect(id: string): Promise<QaDefect | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'qa_defect') return null;
    return toDefect(row as MemoryRow);
  },

  async listDefects(organizationId: string, opts: ListDefectsOpts = {}): Promise<QaDefect[]> {
    const where: Record<string, unknown> = { organizationId, type: 'qa_defect' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.severity) conditions.push({ content: { contains: `"severity":"${opts.severity}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.productId) conditions.push({ content: { contains: `"productId":"${opts.productId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDefect);
  },

  async updateDefect(id: string, input: UpdateDefectInput): Promise<QaDefect | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.productId !== undefined && { productId: input.productId }),
      ...(input.productName !== undefined && { productName: input.productName }),
      ...(input.batchId !== undefined && { batchId: input.batchId }),
      ...(input.inspectionId !== undefined && { inspectionId: input.inspectionId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.identifiedBy !== undefined && { identifiedBy: input.identifiedBy }),
      ...(input.identifiedDate !== undefined && { identifiedDate: input.identifiedDate }),
      ...(input.resolvedBy !== undefined && { resolvedBy: input.resolvedBy }),
      ...(input.resolvedDate !== undefined && { resolvedDate: input.resolvedDate }),
      ...(input.rootCause !== undefined && { rootCause: input.rootCause }),
      ...(input.resolution !== undefined && { resolution: input.resolution }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['qa_defect', content.type, content.severity, content.status]) },
    }), null);
    if (!row) return null;
    return toDefect(row as MemoryRow);
  },

  async deleteDefect(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async investigateDefect(id: string, _investigatedBy: string): Promise<QaDefect | null> {
    return QualityAssuranceService.updateDefect(id, { status: 'investigating' });
  },

  async resolveDefect(id: string, _resolvedBy: string): Promise<QaDefect | null> {
    return QualityAssuranceService.updateDefect(id, { status: 'resolved', resolvedDate: new Date().toISOString() });
  },

  async closeDefect(id: string, _closedBy: string): Promise<QaDefect | null> {
    return QualityAssuranceService.updateDefect(id, { status: 'closed' });
  },

  // ── CAPAs ──

  async createCapa(organizationId: string, workspaceId: string, input: CreateCapaInput, createdBy: string): Promise<QaCapa> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      priority: input.priority,
      status: input.status ?? 'open',
      defectId: input.defectId ?? null,
      description: input.description ?? '',
      assignedTo: input.assignedTo ?? '',
      rootCause: input.rootCause ?? '',
      action: input.action ?? '',
      implementationDate: input.implementationDate ?? null,
      verificationDate: input.verificationDate ?? null,
      verifiedBy: input.verifiedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'qa_capa',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.defectId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['qa_capa', content.type, content.priority, content.status]),
        createdBy,
      },
    });
    return toCapa(row as MemoryRow);
  },

  async getCapa(id: string): Promise<QaCapa | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'qa_capa') return null;
    return toCapa(row as MemoryRow);
  },

  async listCapas(organizationId: string, opts: ListCapasOpts = {}): Promise<QaCapa[]> {
    const where: Record<string, unknown> = { organizationId, type: 'qa_capa' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCapa);
  },

  async updateCapa(id: string, input: UpdateCapaInput): Promise<QaCapa | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.defectId !== undefined && { defectId: input.defectId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.rootCause !== undefined && { rootCause: input.rootCause }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.implementationDate !== undefined && { implementationDate: input.implementationDate }),
      ...(input.verificationDate !== undefined && { verificationDate: input.verificationDate }),
      ...(input.verifiedBy !== undefined && { verifiedBy: input.verifiedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['qa_capa', content.type, content.priority, content.status]) },
    }), null);
    if (!row) return null;
    return toCapa(row as MemoryRow);
  },

  async deleteCapa(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startCapa(id: string, _startedBy: string): Promise<QaCapa | null> {
    return QualityAssuranceService.updateCapa(id, { status: 'in_progress' });
  },

  async implementCapa(id: string, _implementedBy: string): Promise<QaCapa | null> {
    return QualityAssuranceService.updateCapa(id, { status: 'implemented', implementationDate: new Date().toISOString() });
  },

  async verifyCapa(id: string, verifiedBy: string): Promise<QaCapa | null> {
    const capa = await QualityAssuranceService.updateCapa(id, { status: 'verified', verifiedBy, verificationDate: new Date().toISOString() });
    if (!capa) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy, verifiedAt: new Date() } }), null);
    return capa;
  },

  async closeCapa(id: string, _closedBy: string): Promise<QaCapa | null> {
    return QualityAssuranceService.updateCapa(id, { status: 'closed' });
  },

  // ── Audits ──

  async createAudit(organizationId: string, workspaceId: string, input: CreateAuditInput, createdBy: string): Promise<QaAudit> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      auditor: input.auditor ?? '',
      auditedEntity: input.auditedEntity ?? '',
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      scope: input.scope ?? '',
      findings: input.findings ?? '',
      recommendations: input.recommendations ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'qa_audit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['qa_audit', content.type, content.status]),
        createdBy,
      },
    });
    return toAudit(row as MemoryRow);
  },

  async getAudit(id: string): Promise<QaAudit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'qa_audit') return null;
    return toAudit(row as MemoryRow);
  },

  async listAudits(organizationId: string, opts: ListAuditsOpts = {}): Promise<QaAudit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'qa_audit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAudit);
  },

  async updateAudit(id: string, input: UpdateAuditInput): Promise<QaAudit | null> {
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
      ...(input.auditedEntity !== undefined && { auditedEntity: input.auditedEntity }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['qa_audit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAudit(row as MemoryRow);
  },

  async deleteAudit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleAudit(id: string, _scheduledBy: string): Promise<QaAudit | null> {
    return QualityAssuranceService.updateAudit(id, { status: 'scheduled' });
  },

  async startAudit(id: string, _startedBy: string): Promise<QaAudit | null> {
    return QualityAssuranceService.updateAudit(id, { status: 'in_progress' });
  },

  async completeAudit(id: string, _completedBy: string): Promise<QaAudit | null> {
    return QualityAssuranceService.updateAudit(id, { status: 'completed', completedDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getQualityAssuranceMetrics(organizationId: string): Promise<QualityAssuranceMetrics> {
    const [defects, capas, inspections] = await Promise.all([
      QualityAssuranceService.listDefects(organizationId),
      QualityAssuranceService.listCapas(organizationId),
      QualityAssuranceService.listInspections(organizationId),
    ]);
    const openDefects = defects.filter((d) => d.status === 'open' || d.status === 'investigating').length;
    const criticalDefects = defects.filter((d) => d.severity === 'critical' && d.status !== 'closed' && d.status !== 'rejected').length;
    const openCapas = capas.filter((c) => c.status === 'open' || c.status === 'in_progress').length;
    const completedCapas = capas.filter((c) => c.status === 'verified' || c.status === 'closed').length;
    const capaCompletionRate = capas.length > 0 ? Math.round((completedCapas / capas.length) * 100) : 0;
    const passedInspections = inspections.filter((i) => i.result === 'pass').length;
    const inspectionPassRate = inspections.length > 0 ? Math.round((passedInspections / inspections.length) * 100) : 0;
    return { openDefects, criticalDefects, openCapas, capaCompletionRate, inspectionPassRate };
  },

  async getQualityAssuranceStats(organizationId: string): Promise<QualityAssuranceStats> {
    const [inspections, defects, capas, audits] = await Promise.all([
      QualityAssuranceService.listInspections(organizationId),
      QualityAssuranceService.listDefects(organizationId),
      QualityAssuranceService.listCapas(organizationId),
      QualityAssuranceService.listAudits(organizationId),
    ]);
    const byInspectionType: Record<string, number> = {};
    const byInspectionStatus: Record<string, number> = {};
    const byDefectSeverity: Record<string, number> = {};
    const byDefectStatus: Record<string, number> = {};
    const byCapaStatus: Record<string, number> = {};
    const byAuditType: Record<string, number> = {};
    for (const i of inspections) { byInspectionType[i.type] = (byInspectionType[i.type] ?? 0) + 1; byInspectionStatus[i.status] = (byInspectionStatus[i.status] ?? 0) + 1; }
    for (const d of defects) { byDefectSeverity[d.severity] = (byDefectSeverity[d.severity] ?? 0) + 1; byDefectStatus[d.status] = (byDefectStatus[d.status] ?? 0) + 1; }
    for (const c of capas) { byCapaStatus[c.status] = (byCapaStatus[c.status] ?? 0) + 1; }
    for (const a of audits) { byAuditType[a.type] = (byAuditType[a.type] ?? 0) + 1; }
    return {
      inspectionCount: inspections.length,
      defectCount: defects.length,
      capaCount: capas.length,
      auditCount: audits.length,
      openDefectCount: defects.filter((d) => d.status === 'open' || d.status === 'investigating').length,
      openCapaCount: capas.filter((c) => c.status === 'open' || c.status === 'in_progress').length,
      byInspectionType, byInspectionStatus, byDefectSeverity, byDefectStatus, byCapaStatus, byAuditType,
    };
  },
};
