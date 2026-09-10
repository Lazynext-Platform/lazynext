import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PermitType = 'air' | 'water' | 'waste' | 'hazardous_material' | 'stormwater' | 'underground_tank' | 'pesticide' | 'radiation' | 'noise' | 'multi_media';
export type PermitStatus = 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
export type EmissionType = 'co2' | 'methane' | 'nox' | 'sox' | 'particulate' | 'voc' | 'other';
export type EmissionScope = 'scope1' | 'scope2' | 'scope3';
export type EmissionStatus = 'measured' | 'estimated' | 'reported' | 'verified';
export type WasteType = 'hazardous' | 'industrial' | 'municipal' | 'recyclable' | 'organic' | 'electronic' | 'chemical' | 'medical';
export type WasteStatus = 'generated' | 'stored' | 'transported' | 'treated' | 'disposed' | 'recycled';
export type ReportType = 'annual' | 'quarterly' | 'monthly' | 'incident' | 'compliance' | 'audit' | 'assessment';
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';

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

export interface EnvPermit {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PermitType;
  description: string;
  status: PermitStatus;
  permitNumber: string;
  issuingAuthority: string;
  facility: string;
  validFrom: Date | null;
  validTo: Date | null;
  conditions: string;
  inspectionDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmissionRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: EmissionType;
  scope: EmissionScope;
  description: string;
  status: EmissionStatus;
  facility: string;
  source: string;
  amount: number;
  unit: string;
  measurementDate: Date | null;
  reportingPeriod: string;
  verifiedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WasteRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: WasteType;
  description: string;
  status: WasteStatus;
  facility: string;
  source: string;
  amount: number;
  unit: string;
  disposalMethod: string;
  contractor: string;
  generatedDate: Date | null;
  disposedDate: Date | null;
  manifestNumber: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  period: string;
  author: string;
  submittedDate: Date | null;
  approvedDate: Date | null;
  findings: string;
  recommendations: string;
  attachments: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentalComplianceMetrics {
  activePermits: number;
  expiringPermits: number;
  totalEmissions: number;
  verifiedEmissions: number;
  totalWaste: number;
  recycledWaste: number;
  pendingReports: number;
  complianceRate: number;
}

export interface EnvironmentalComplianceStats {
  permitCount: number;
  activePermitCount: number;
  emissionCount: number;
  verifiedEmissionCount: number;
  wasteCount: number;
  recycledWasteCount: number;
  reportCount: number;
  submittedReportCount: number;
  byPermitType: Record<string, number>;
  byPermitStatus: Record<string, number>;
  byEmissionType: Record<string, number>;
  byEmissionScope: Record<string, number>;
  byEmissionStatus: Record<string, number>;
  byWasteType: Record<string, number>;
  byWasteStatus: Record<string, number>;
  byReportType: Record<string, number>;
  byReportStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePermitInput {
  name: string;
  type: PermitType;
  description?: string;
  status?: PermitStatus;
  permitNumber?: string;
  issuingAuthority?: string;
  facility?: string;
  validFrom?: string;
  validTo?: string;
  conditions?: string;
  inspectionDate?: string;
  notes?: string;
}

export interface UpdatePermitInput {
  name?: string;
  type?: PermitType;
  description?: string;
  status?: PermitStatus;
  permitNumber?: string;
  issuingAuthority?: string;
  facility?: string;
  validFrom?: string;
  validTo?: string;
  conditions?: string;
  inspectionDate?: string;
  notes?: string;
}

export interface ListPermitsOpts {
  type?: PermitType;
  status?: PermitStatus;
}

export interface CreateEmissionInput {
  type: EmissionType;
  scope: EmissionScope;
  description?: string;
  status?: EmissionStatus;
  facility?: string;
  source?: string;
  amount?: number;
  unit?: string;
  measurementDate?: string;
  reportingPeriod?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface UpdateEmissionInput {
  type?: EmissionType;
  scope?: EmissionScope;
  description?: string;
  status?: EmissionStatus;
  facility?: string;
  source?: string;
  amount?: number;
  unit?: string;
  measurementDate?: string;
  reportingPeriod?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface ListEmissionsOpts {
  type?: EmissionType;
  scope?: EmissionScope;
  status?: EmissionStatus;
}

export interface CreateWasteInput {
  type: WasteType;
  description?: string;
  status?: WasteStatus;
  facility?: string;
  source?: string;
  amount?: number;
  unit?: string;
  disposalMethod?: string;
  contractor?: string;
  generatedDate?: string;
  disposedDate?: string;
  manifestNumber?: string;
  notes?: string;
}

export interface UpdateWasteInput {
  type?: WasteType;
  description?: string;
  status?: WasteStatus;
  facility?: string;
  source?: string;
  amount?: number;
  unit?: string;
  disposalMethod?: string;
  contractor?: string;
  generatedDate?: string;
  disposedDate?: string;
  manifestNumber?: string;
  notes?: string;
}

export interface ListWastesOpts {
  type?: WasteType;
  status?: WasteStatus;
  facility?: string;
}

export interface CreateReportInput {
  title: string;
  type: ReportType;
  description?: string;
  status?: ReportStatus;
  period?: string;
  author?: string;
  submittedDate?: string;
  approvedDate?: string;
  findings?: string;
  recommendations?: string;
  attachments?: string[];
  notes?: string;
}

export interface UpdateReportInput {
  title?: string;
  type?: ReportType;
  description?: string;
  status?: ReportStatus;
  period?: string;
  author?: string;
  submittedDate?: string;
  approvedDate?: string;
  findings?: string;
  recommendations?: string;
  attachments?: string[];
  notes?: string;
}

export interface ListReportsOpts {
  type?: ReportType;
  status?: ReportStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPermit(row: MemoryRow): EnvPermit {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PermitType) ?? 'air',
    description: (c.description as string) ?? '',
    status: (c.status as PermitStatus) ?? 'pending',
    permitNumber: (c.permitNumber as string) ?? '',
    issuingAuthority: (c.issuingAuthority as string) ?? '',
    facility: (c.facility as string) ?? '',
    validFrom: c.validFrom ? new Date(c.validFrom as string) : null,
    validTo: c.validTo ? new Date(c.validTo as string) : null,
    conditions: (c.conditions as string) ?? '',
    inspectionDate: c.inspectionDate ? new Date(c.inspectionDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEmission(row: MemoryRow): EmissionRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as EmissionType) ?? 'co2',
    scope: (c.scope as EmissionScope) ?? 'scope1',
    description: (c.description as string) ?? '',
    status: (c.status as EmissionStatus) ?? 'measured',
    facility: (c.facility as string) ?? '',
    source: (c.source as string) ?? '',
    amount: (c.amount as number) ?? 0,
    unit: (c.unit as string) ?? '',
    measurementDate: c.measurementDate ? new Date(c.measurementDate as string) : null,
    reportingPeriod: (c.reportingPeriod as string) ?? '',
    verifiedBy: (c.verifiedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWaste(row: MemoryRow): WasteRecord {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as WasteType) ?? 'industrial',
    description: (c.description as string) ?? '',
    status: (c.status as WasteStatus) ?? 'generated',
    facility: (c.facility as string) ?? '',
    source: (c.source as string) ?? '',
    amount: (c.amount as number) ?? 0,
    unit: (c.unit as string) ?? '',
    disposalMethod: (c.disposalMethod as string) ?? '',
    contractor: (c.contractor as string) ?? '',
    generatedDate: c.generatedDate ? new Date(c.generatedDate as string) : null,
    disposedDate: c.disposedDate ? new Date(c.disposedDate as string) : null,
    manifestNumber: (c.manifestNumber as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReport(row: MemoryRow): EnvReport {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ReportType) ?? 'annual',
    description: (c.description as string) ?? '',
    status: (c.status as ReportStatus) ?? 'draft',
    period: (c.period as string) ?? '',
    author: (c.author as string) ?? '',
    submittedDate: c.submittedDate ? new Date(c.submittedDate as string) : null,
    approvedDate: c.approvedDate ? new Date(c.approvedDate as string) : null,
    findings: (c.findings as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    attachments: (c.attachments as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EnvironmentalComplianceService = {
  // ── Permits ──

  async createPermit(organizationId: string, workspaceId: string, input: CreatePermitInput, createdBy: string): Promise<EnvPermit> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      permitNumber: input.permitNumber ?? '',
      issuingAuthority: input.issuingAuthority ?? '',
      facility: input.facility ?? '',
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      conditions: input.conditions ?? '',
      inspectionDate: input.inspectionDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'env_permit',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['env_permit', content.type, content.status]),
        createdBy,
      },
    });
    return toPermit(row as MemoryRow);
  },

  async getPermit(id: string): Promise<EnvPermit | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'env_permit') return null;
    return toPermit(row as MemoryRow);
  },

  async listPermits(organizationId: string, opts: ListPermitsOpts = {}): Promise<EnvPermit[]> {
    const where: Record<string, unknown> = { organizationId, type: 'env_permit' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPermit);
  },

  async updatePermit(id: string, input: UpdatePermitInput): Promise<EnvPermit | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.permitNumber !== undefined && { permitNumber: input.permitNumber }),
      ...(input.issuingAuthority !== undefined && { issuingAuthority: input.issuingAuthority }),
      ...(input.facility !== undefined && { facility: input.facility }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.conditions !== undefined && { conditions: input.conditions }),
      ...(input.inspectionDate !== undefined && { inspectionDate: input.inspectionDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['env_permit', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPermit(row as MemoryRow);
  },

  async deletePermit(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePermit(id: string, _activatedBy: string): Promise<EnvPermit | null> {
    return EnvironmentalComplianceService.updatePermit(id, { status: 'active' });
  },

  async suspendPermit(id: string, _suspendedBy: string): Promise<EnvPermit | null> {
    return EnvironmentalComplianceService.updatePermit(id, { status: 'suspended' });
  },

  async revokePermit(id: string, _revokedBy: string): Promise<EnvPermit | null> {
    return EnvironmentalComplianceService.updatePermit(id, { status: 'revoked' });
  },

  // ── Emissions ──

  async createEmission(organizationId: string, workspaceId: string, input: CreateEmissionInput, createdBy: string): Promise<EmissionRecord> {
    const content = {
      type: input.type,
      scope: input.scope,
      description: input.description ?? '',
      status: input.status ?? 'measured',
      facility: input.facility ?? '',
      source: input.source ?? '',
      amount: input.amount ?? 0,
      unit: input.unit ?? '',
      measurementDate: input.measurementDate ?? null,
      reportingPeriod: input.reportingPeriod ?? '',
      verifiedBy: input.verifiedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emission_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emission_record', content.type, content.scope, content.status]),
        createdBy,
      },
    });
    return toEmission(row as MemoryRow);
  },

  async getEmission(id: string): Promise<EmissionRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emission_record') return null;
    return toEmission(row as MemoryRow);
  },

  async listEmissions(organizationId: string, opts: ListEmissionsOpts = {}): Promise<EmissionRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emission_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.scope) conditions.push({ content: { contains: `"scope":"${opts.scope}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmission);
  },

  async updateEmission(id: string, input: UpdateEmissionInput): Promise<EmissionRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.facility !== undefined && { facility: input.facility }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.measurementDate !== undefined && { measurementDate: input.measurementDate }),
      ...(input.reportingPeriod !== undefined && { reportingPeriod: input.reportingPeriod }),
      ...(input.verifiedBy !== undefined && { verifiedBy: input.verifiedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emission_record', content.type, content.scope, content.status]) },
    }), null);
    if (!row) return null;
    return toEmission(row as MemoryRow);
  },

  async deleteEmission(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async reportEmission(id: string, _reportedBy: string): Promise<EmissionRecord | null> {
    return EnvironmentalComplianceService.updateEmission(id, { status: 'reported' });
  },

  async verifyEmission(id: string, verifiedBy: string): Promise<EmissionRecord | null> {
    const e = await EnvironmentalComplianceService.updateEmission(id, { status: 'verified', verifiedBy });
    if (!e) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy, verifiedAt: new Date() } }), null);
    return e;
  },

  // ── Waste ──

  async createWaste(organizationId: string, workspaceId: string, input: CreateWasteInput, createdBy: string): Promise<WasteRecord> {
    const content = {
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'generated',
      facility: input.facility ?? '',
      source: input.source ?? '',
      amount: input.amount ?? 0,
      unit: input.unit ?? '',
      disposalMethod: input.disposalMethod ?? '',
      contractor: input.contractor ?? '',
      generatedDate: input.generatedDate ?? null,
      disposedDate: input.disposedDate ?? null,
      manifestNumber: input.manifestNumber ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'waste_record',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['waste_record', content.type, content.status]),
        createdBy,
      },
    });
    return toWaste(row as MemoryRow);
  },

  async getWaste(id: string): Promise<WasteRecord | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'waste_record') return null;
    return toWaste(row as MemoryRow);
  },

  async listWastes(organizationId: string, opts: ListWastesOpts = {}): Promise<WasteRecord[]> {
    const where: Record<string, unknown> = { organizationId, type: 'waste_record' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.facility) conditions.push({ content: { contains: `"facility":"${opts.facility}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toWaste);
  },

  async updateWaste(id: string, input: UpdateWasteInput): Promise<WasteRecord | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.facility !== undefined && { facility: input.facility }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.disposalMethod !== undefined && { disposalMethod: input.disposalMethod }),
      ...(input.contractor !== undefined && { contractor: input.contractor }),
      ...(input.generatedDate !== undefined && { generatedDate: input.generatedDate }),
      ...(input.disposedDate !== undefined && { disposedDate: input.disposedDate }),
      ...(input.manifestNumber !== undefined && { manifestNumber: input.manifestNumber }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['waste_record', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toWaste(row as MemoryRow);
  },

  async deleteWaste(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async transportWaste(id: string, _transportedBy: string): Promise<WasteRecord | null> {
    return EnvironmentalComplianceService.updateWaste(id, { status: 'transported' });
  },

  async treatWaste(id: string, _treatedBy: string): Promise<WasteRecord | null> {
    return EnvironmentalComplianceService.updateWaste(id, { status: 'treated' });
  },

  async disposeWaste(id: string, _disposedBy: string): Promise<WasteRecord | null> {
    return EnvironmentalComplianceService.updateWaste(id, { status: 'disposed', disposedDate: new Date().toISOString() });
  },

  async recycleWaste(id: string, _recycledBy: string): Promise<WasteRecord | null> {
    return EnvironmentalComplianceService.updateWaste(id, { status: 'recycled', disposedDate: new Date().toISOString() });
  },

  // ── Reports ──

  async createReport(organizationId: string, workspaceId: string, input: CreateReportInput, createdBy: string): Promise<EnvReport> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      period: input.period ?? '',
      author: input.author ?? '',
      submittedDate: input.submittedDate ?? null,
      approvedDate: input.approvedDate ?? null,
      findings: input.findings ?? '',
      recommendations: input.recommendations ?? '',
      attachments: input.attachments ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'env_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['env_report', content.type, content.status]),
        createdBy,
      },
    });
    return toReport(row as MemoryRow);
  },

  async getReport(id: string): Promise<EnvReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'env_report') return null;
    return toReport(row as MemoryRow);
  },

  async listReports(organizationId: string, opts: ListReportsOpts = {}): Promise<EnvReport[]> {
    const where: Record<string, unknown> = { organizationId, type: 'env_report' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toReport);
  },

  async updateReport(id: string, input: UpdateReportInput): Promise<EnvReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.submittedDate !== undefined && { submittedDate: input.submittedDate }),
      ...(input.approvedDate !== undefined && { approvedDate: input.approvedDate }),
      ...(input.findings !== undefined && { findings: input.findings }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.attachments !== undefined && { attachments: input.attachments }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['env_report', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  async deleteReport(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitReport(id: string, _submittedBy: string): Promise<EnvReport | null> {
    return EnvironmentalComplianceService.updateReport(id, { status: 'submitted', submittedDate: new Date().toISOString() });
  },

  async approveReport(id: string, _approvedBy: string): Promise<EnvReport | null> {
    return EnvironmentalComplianceService.updateReport(id, { status: 'approved', approvedDate: new Date().toISOString() });
  },

  async rejectReport(id: string, _rejectedBy: string): Promise<EnvReport | null> {
    return EnvironmentalComplianceService.updateReport(id, { status: 'rejected' });
  },

  // ── Metrics & Stats ──

  async getEnvironmentalComplianceMetrics(organizationId: string): Promise<EnvironmentalComplianceMetrics> {
    const permits = await EnvironmentalComplianceService.listPermits(organizationId);
    const emissions = await EnvironmentalComplianceService.listEmissions(organizationId);
    const wastes = await EnvironmentalComplianceService.listWastes(organizationId);
    const reports = await EnvironmentalComplianceService.listReports(organizationId);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringPermits = permits.filter((p) => p.status === 'active' && p.validTo && p.validTo <= thirtyDaysFromNow).length;
    const totalEmissions = emissions.reduce((sum, e) => sum + e.amount, 0);
    const verifiedEmissions = emissions.filter((e) => e.status === 'verified').reduce((sum, e) => sum + e.amount, 0);
    const totalWaste = wastes.reduce((sum, w) => sum + w.amount, 0);
    const recycledWaste = wastes.filter((w) => w.status === 'recycled').reduce((sum, w) => sum + w.amount, 0);
    const pendingReports = reports.filter((r) => r.status === 'draft').length;
    const complianceRate = permits.length > 0 ? Math.round((permits.filter((p) => p.status === 'active').length / permits.length) * 100) : 0;
    return {
      activePermits: permits.filter((p) => p.status === 'active').length,
      expiringPermits,
      totalEmissions,
      verifiedEmissions,
      totalWaste,
      recycledWaste,
      pendingReports,
      complianceRate,
    };
  },

  async getEnvironmentalComplianceStats(organizationId: string): Promise<EnvironmentalComplianceStats> {
    const [permits, emissions, wastes, reports] = await Promise.all([
      EnvironmentalComplianceService.listPermits(organizationId),
      EnvironmentalComplianceService.listEmissions(organizationId),
      EnvironmentalComplianceService.listWastes(organizationId),
      EnvironmentalComplianceService.listReports(organizationId),
    ]);
    const byPermitType: Record<string, number> = {};
    const byPermitStatus: Record<string, number> = {};
    const byEmissionType: Record<string, number> = {};
    const byEmissionScope: Record<string, number> = {};
    const byEmissionStatus: Record<string, number> = {};
    const byWasteType: Record<string, number> = {};
    const byWasteStatus: Record<string, number> = {};
    const byReportType: Record<string, number> = {};
    const byReportStatus: Record<string, number> = {};
    for (const p of permits) { byPermitType[p.type] = (byPermitType[p.type] ?? 0) + 1; byPermitStatus[p.status] = (byPermitStatus[p.status] ?? 0) + 1; }
    for (const e of emissions) { byEmissionType[e.type] = (byEmissionType[e.type] ?? 0) + 1; byEmissionScope[e.scope] = (byEmissionScope[e.scope] ?? 0) + 1; byEmissionStatus[e.status] = (byEmissionStatus[e.status] ?? 0) + 1; }
    for (const w of wastes) { byWasteType[w.type] = (byWasteType[w.type] ?? 0) + 1; byWasteStatus[w.status] = (byWasteStatus[w.status] ?? 0) + 1; }
    for (const r of reports) { byReportType[r.type] = (byReportType[r.type] ?? 0) + 1; byReportStatus[r.status] = (byReportStatus[r.status] ?? 0) + 1; }
    return {
      permitCount: permits.length,
      activePermitCount: permits.filter((p) => p.status === 'active').length,
      emissionCount: emissions.length,
      verifiedEmissionCount: emissions.filter((e) => e.status === 'verified').length,
      wasteCount: wastes.length,
      recycledWasteCount: wastes.filter((w) => w.status === 'recycled').length,
      reportCount: reports.length,
      submittedReportCount: reports.filter((r) => r.status === 'submitted' || r.status === 'approved').length,
      byPermitType, byPermitStatus, byEmissionType, byEmissionScope, byEmissionStatus, byWasteType, byWasteStatus, byReportType, byReportStatus,
    };
  },
};
