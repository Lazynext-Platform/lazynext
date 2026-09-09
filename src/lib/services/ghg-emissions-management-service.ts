import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type GHGEmissionType = 'scope1' | 'scope2' | 'scope3' | 'stationary' | 'mobile' | 'fugitive' | 'process' | 'purchased_electricity' | 'purchased_heat' | 'business_travel' | 'employee_commuting' | 'waste' | 'purchased_goods';
export type GHGEmissionStatus = 'draft' | 'calculated' | 'verified' | 'submitted' | 'archived';
export type EmissionFactorType = 'fuel' | 'electricity' | 'heat' | 'transport' | 'waste' | 'process' | 'refrigerant' | 'agriculture' | 'land_use';
export type EmissionFactorStatus = 'active' | 'deprecated' | 'draft' | 'archived';
export type GHGReportType = 'annual' | 'quarterly' | 'monthly' | 'cdp' | 'tcfd' | 'ghg_protocol' | 'iso_14064' | 'regulatory';
export type GHGReportStatus = 'draft' | 'submitted' | 'approved' | 'published' | 'archived';
export type EmissionSourceType = 'facility' | 'vehicle' | 'equipment' | 'process' | 'supply_chain' | 'product' | 'service' | 'travel';
export type EmissionSourceStatus = 'active' | 'inactive' | 'monitored' | 'decommissioned';

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

export interface GHGEmission {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: GHGEmissionType;
  description: string;
  status: GHGEmissionStatus;
  scope: string;
  period: string;
  amount: number;
  unit: string;
  co2e: number;
  source: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmissionFactor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EmissionFactorType;
  description: string;
  status: EmissionFactorStatus;
  factor: number;
  unit: string;
  source: string;
  validFrom: Date | null;
  validTo: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GHGReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: GHGReportType;
  description: string;
  status: GHGReportStatus;
  period: string;
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  unit: string;
  submittedBy: string;
  submittedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmissionSource {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: EmissionSourceType;
  description: string;
  status: EmissionSourceStatus;
  scope: string;
  location: string;
  fuelType: string;
  capacity: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GHGEmissionsManagementMetrics {
  calculatedEmissions: number;
  verifiedEmissions: number;
  activeFactors: number;
  submittedReports: number;
  activeSources: number;
}

export interface GHGEmissionsManagementStats {
  emissionCount: number;
  factorCount: number;
  reportCount: number;
  sourceCount: number;
  byEmissionType: Record<string, number>;
  byEmissionStatus: Record<string, number>;
  byFactorType: Record<string, number>;
  byFactorStatus: Record<string, number>;
  byReportType: Record<string, number>;
  byReportStatus: Record<string, number>;
  bySourceType: Record<string, number>;
  bySourceStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateGHGEmissionInput {
  name: string;
  type: GHGEmissionType;
  description?: string;
  status?: GHGEmissionStatus;
  scope?: string;
  period?: string;
  amount?: number;
  unit?: string;
  co2e?: number;
  source?: string;
  notes?: string;
}

export interface UpdateGHGEmissionInput {
  name?: string;
  type?: GHGEmissionType;
  description?: string;
  status?: GHGEmissionStatus;
  scope?: string;
  period?: string;
  amount?: number;
  unit?: string;
  co2e?: number;
  source?: string;
  notes?: string;
}

export interface ListGHGEmissionsOpts {
  type?: GHGEmissionType;
  status?: GHGEmissionStatus;
}

export interface CreateEmissionFactorInput {
  name: string;
  type: EmissionFactorType;
  description?: string;
  status?: EmissionFactorStatus;
  factor?: number;
  unit?: string;
  source?: string;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

export interface UpdateEmissionFactorInput {
  name?: string;
  type?: EmissionFactorType;
  description?: string;
  status?: EmissionFactorStatus;
  factor?: number;
  unit?: string;
  source?: string;
  validFrom?: string;
  validTo?: string;
  notes?: string;
}

export interface ListEmissionFactorsOpts {
  type?: EmissionFactorType;
  status?: EmissionFactorStatus;
}

export interface CreateGHGReportInput {
  name: string;
  type: GHGReportType;
  description?: string;
  status?: GHGReportStatus;
  period?: string;
  totalEmissions?: number;
  scope1?: number;
  scope2?: number;
  scope3?: number;
  unit?: string;
  submittedBy?: string;
  submittedDate?: string;
  notes?: string;
}

export interface UpdateGHGReportInput {
  name?: string;
  type?: GHGReportType;
  description?: string;
  status?: GHGReportStatus;
  period?: string;
  totalEmissions?: number;
  scope1?: number;
  scope2?: number;
  scope3?: number;
  unit?: string;
  submittedBy?: string;
  submittedDate?: string;
  notes?: string;
}

export interface ListGHGReportsOpts {
  type?: GHGReportType;
  status?: GHGReportStatus;
}

export interface CreateEmissionSourceInput {
  name: string;
  type: EmissionSourceType;
  description?: string;
  status?: EmissionSourceStatus;
  scope?: string;
  location?: string;
  fuelType?: string;
  capacity?: string;
  notes?: string;
}

export interface UpdateEmissionSourceInput {
  name?: string;
  type?: EmissionSourceType;
  description?: string;
  status?: EmissionSourceStatus;
  scope?: string;
  location?: string;
  fuelType?: string;
  capacity?: string;
  notes?: string;
}

export interface ListEmissionSourcesOpts {
  type?: EmissionSourceType;
  status?: EmissionSourceStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toGHGEmission(row: MemoryRow): GHGEmission {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as GHGEmissionType) ?? 'scope1',
    description: (c.description as string) ?? '',
    status: (c.status as GHGEmissionStatus) ?? 'draft',
    scope: (c.scope as string) ?? '',
    period: (c.period as string) ?? '',
    amount: (c.amount as number) ?? 0,
    unit: (c.unit as string) ?? '',
    co2e: (c.co2e as number) ?? 0,
    source: (c.source as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEmissionFactor(row: MemoryRow): EmissionFactor {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EmissionFactorType) ?? 'fuel',
    description: (c.description as string) ?? '',
    status: (c.status as EmissionFactorStatus) ?? 'draft',
    factor: (c.factor as number) ?? 0,
    unit: (c.unit as string) ?? '',
    source: (c.source as string) ?? '',
    validFrom: c.validFrom ? new Date(c.validFrom as string) : null,
    validTo: c.validTo ? new Date(c.validTo as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toGHGReport(row: MemoryRow): GHGReport {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as GHGReportType) ?? 'annual',
    description: (c.description as string) ?? '',
    status: (c.status as GHGReportStatus) ?? 'draft',
    period: (c.period as string) ?? '',
    totalEmissions: (c.totalEmissions as number) ?? 0,
    scope1: (c.scope1 as number) ?? 0,
    scope2: (c.scope2 as number) ?? 0,
    scope3: (c.scope3 as number) ?? 0,
    unit: (c.unit as string) ?? '',
    submittedBy: (c.submittedBy as string) ?? '',
    submittedDate: c.submittedDate ? new Date(c.submittedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toEmissionSource(row: MemoryRow): EmissionSource {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as EmissionSourceType) ?? 'facility',
    description: (c.description as string) ?? '',
    status: (c.status as EmissionSourceStatus) ?? 'active',
    scope: (c.scope as string) ?? '',
    location: (c.location as string) ?? '',
    fuelType: (c.fuelType as string) ?? '',
    capacity: (c.capacity as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const GHGEmissionsManagementService = {
  // ── GHG Emissions ──

  async createGHGEmission(organizationId: string, workspaceId: string, input: CreateGHGEmissionInput, createdBy: string): Promise<GHGEmission> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      scope: input.scope ?? '',
      period: input.period ?? '',
      amount: input.amount ?? 0,
      unit: input.unit ?? '',
      co2e: input.co2e ?? 0,
      source: input.source ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'ghg_emission',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ghg_emission', content.type, content.status]),
        createdBy,
      },
    });
    return toGHGEmission(row as MemoryRow);
  },

  async getGHGEmission(id: string): Promise<GHGEmission | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ghg_emission') return null;
    return toGHGEmission(row as MemoryRow);
  },

  async listGHGEmissions(organizationId: string, opts: ListGHGEmissionsOpts = {}): Promise<GHGEmission[]> {
    const where: Record<string, unknown> = { organizationId, type: 'ghg_emission' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGHGEmission);
  },

  async updateGHGEmission(id: string, input: UpdateGHGEmissionInput): Promise<GHGEmission | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.co2e !== undefined && { co2e: input.co2e }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['ghg_emission', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toGHGEmission(row as MemoryRow);
  },

  async deleteGHGEmission(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async calculateGHGEmission(id: string, _calculatedBy: string): Promise<GHGEmission | null> {
    return GHGEmissionsManagementService.updateGHGEmission(id, { status: 'calculated' });
  },

  async verifyGHGEmission(id: string, _verifiedBy: string): Promise<GHGEmission | null> {
    return GHGEmissionsManagementService.updateGHGEmission(id, { status: 'verified' });
  },

  async submitGHGEmission(id: string, _submittedBy: string): Promise<GHGEmission | null> {
    return GHGEmissionsManagementService.updateGHGEmission(id, { status: 'submitted' });
  },

  async archiveGHGEmission(id: string, _archivedBy: string): Promise<GHGEmission | null> {
    return GHGEmissionsManagementService.updateGHGEmission(id, { status: 'archived' });
  },

  // ── Emission Factors ──

  async createEmissionFactor(organizationId: string, workspaceId: string, input: CreateEmissionFactorInput, createdBy: string): Promise<EmissionFactor> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      factor: input.factor ?? 0,
      unit: input.unit ?? '',
      source: input.source ?? '',
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emission_factor',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emission_factor', content.type, content.status]),
        createdBy,
      },
    });
    return toEmissionFactor(row as MemoryRow);
  },

  async getEmissionFactor(id: string): Promise<EmissionFactor | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emission_factor') return null;
    return toEmissionFactor(row as MemoryRow);
  },

  async listEmissionFactors(organizationId: string, opts: ListEmissionFactorsOpts = {}): Promise<EmissionFactor[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emission_factor' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmissionFactor);
  },

  async updateEmissionFactor(id: string, input: UpdateEmissionFactorInput): Promise<EmissionFactor | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.factor !== undefined && { factor: input.factor }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emission_factor', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEmissionFactor(row as MemoryRow);
  },

  async deleteEmissionFactor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEmissionFactor(id: string, _activatedBy: string): Promise<EmissionFactor | null> {
    return GHGEmissionsManagementService.updateEmissionFactor(id, { status: 'active' });
  },

  async deprecateEmissionFactor(id: string, _deprecatedBy: string): Promise<EmissionFactor | null> {
    return GHGEmissionsManagementService.updateEmissionFactor(id, { status: 'deprecated' });
  },

  async archiveEmissionFactor(id: string, _archivedBy: string): Promise<EmissionFactor | null> {
    return GHGEmissionsManagementService.updateEmissionFactor(id, { status: 'archived' });
  },

  // ── GHG Reports ──

  async createGHGReport(organizationId: string, workspaceId: string, input: CreateGHGReportInput, createdBy: string): Promise<GHGReport> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      period: input.period ?? '',
      totalEmissions: input.totalEmissions ?? 0,
      scope1: input.scope1 ?? 0,
      scope2: input.scope2 ?? 0,
      scope3: input.scope3 ?? 0,
      unit: input.unit ?? '',
      submittedBy: input.submittedBy ?? '',
      submittedDate: input.submittedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'ghg_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['ghg_report', content.type, content.status]),
        createdBy,
      },
    });
    return toGHGReport(row as MemoryRow);
  },

  async getGHGReport(id: string): Promise<GHGReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'ghg_report') return null;
    return toGHGReport(row as MemoryRow);
  },

  async listGHGReports(organizationId: string, opts: ListGHGReportsOpts = {}): Promise<GHGReport[]> {
    const where: Record<string, unknown> = { organizationId, type: 'ghg_report' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGHGReport);
  },

  async updateGHGReport(id: string, input: UpdateGHGReportInput): Promise<GHGReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.totalEmissions !== undefined && { totalEmissions: input.totalEmissions }),
      ...(input.scope1 !== undefined && { scope1: input.scope1 }),
      ...(input.scope2 !== undefined && { scope2: input.scope2 }),
      ...(input.scope3 !== undefined && { scope3: input.scope3 }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.submittedBy !== undefined && { submittedBy: input.submittedBy }),
      ...(input.submittedDate !== undefined && { submittedDate: input.submittedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['ghg_report', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toGHGReport(row as MemoryRow);
  },

  async deleteGHGReport(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitGHGReport(id: string, submittedBy: string): Promise<GHGReport | null> {
    return GHGEmissionsManagementService.updateGHGReport(id, { status: 'submitted', submittedBy, submittedDate: new Date().toISOString() });
  },

  async approveGHGReport(id: string, _approvedBy: string): Promise<GHGReport | null> {
    return GHGEmissionsManagementService.updateGHGReport(id, { status: 'approved' });
  },

  async publishGHGReport(id: string, _publishedBy: string): Promise<GHGReport | null> {
    return GHGEmissionsManagementService.updateGHGReport(id, { status: 'published' });
  },

  async archiveGHGReport(id: string, _archivedBy: string): Promise<GHGReport | null> {
    return GHGEmissionsManagementService.updateGHGReport(id, { status: 'archived' });
  },

  // ── Emission Sources ──

  async createEmissionSource(organizationId: string, workspaceId: string, input: CreateEmissionSourceInput, createdBy: string): Promise<EmissionSource> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      scope: input.scope ?? '',
      location: input.location ?? '',
      fuelType: input.fuelType ?? '',
      capacity: input.capacity ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'emission_source',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['emission_source', content.type, content.status]),
        createdBy,
      },
    });
    return toEmissionSource(row as MemoryRow);
  },

  async getEmissionSource(id: string): Promise<EmissionSource | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'emission_source') return null;
    return toEmissionSource(row as MemoryRow);
  },

  async listEmissionSources(organizationId: string, opts: ListEmissionSourcesOpts = {}): Promise<EmissionSource[]> {
    const where: Record<string, unknown> = { organizationId, type: 'emission_source' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toEmissionSource);
  },

  async updateEmissionSource(id: string, input: UpdateEmissionSourceInput): Promise<EmissionSource | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.fuelType !== undefined && { fuelType: input.fuelType }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['emission_source', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toEmissionSource(row as MemoryRow);
  },

  async deleteEmissionSource(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateEmissionSource(id: string, _activatedBy: string): Promise<EmissionSource | null> {
    return GHGEmissionsManagementService.updateEmissionSource(id, { status: 'active' });
  },

  async monitorEmissionSource(id: string, _monitoredBy: string): Promise<EmissionSource | null> {
    return GHGEmissionsManagementService.updateEmissionSource(id, { status: 'monitored' });
  },

  async decommissionEmissionSource(id: string, _decommissionedBy: string): Promise<EmissionSource | null> {
    return GHGEmissionsManagementService.updateEmissionSource(id, { status: 'decommissioned' });
  },

  // ── Metrics & Stats ──

  async getGHGEmissionsManagementMetrics(organizationId: string): Promise<GHGEmissionsManagementMetrics> {
    const [emissions, factors, reports, sources] = await Promise.all([
      GHGEmissionsManagementService.listGHGEmissions(organizationId),
      GHGEmissionsManagementService.listEmissionFactors(organizationId),
      GHGEmissionsManagementService.listGHGReports(organizationId),
      GHGEmissionsManagementService.listEmissionSources(organizationId),
    ]);
    return {
      calculatedEmissions: emissions.filter((e) => e.status === 'calculated' || e.status === 'verified' || e.status === 'submitted').length,
      verifiedEmissions: emissions.filter((e) => e.status === 'verified').length,
      activeFactors: factors.filter((f) => f.status === 'active').length,
      submittedReports: reports.filter((r) => r.status === 'submitted' || r.status === 'approved' || r.status === 'published').length,
      activeSources: sources.filter((s) => s.status === 'active').length,
    };
  },

  async getGHGEmissionsManagementStats(organizationId: string): Promise<GHGEmissionsManagementStats> {
    const [emissions, factors, reports, sources] = await Promise.all([
      GHGEmissionsManagementService.listGHGEmissions(organizationId),
      GHGEmissionsManagementService.listEmissionFactors(organizationId),
      GHGEmissionsManagementService.listGHGReports(organizationId),
      GHGEmissionsManagementService.listEmissionSources(organizationId),
    ]);
    const byEmissionType: Record<string, number> = {};
    const byEmissionStatus: Record<string, number> = {};
    const byFactorType: Record<string, number> = {};
    const byFactorStatus: Record<string, number> = {};
    const byReportType: Record<string, number> = {};
    const byReportStatus: Record<string, number> = {};
    const bySourceType: Record<string, number> = {};
    const bySourceStatus: Record<string, number> = {};
    for (const e of emissions) { byEmissionType[e.type] = (byEmissionType[e.type] ?? 0) + 1; byEmissionStatus[e.status] = (byEmissionStatus[e.status] ?? 0) + 1; }
    for (const f of factors) { byFactorType[f.type] = (byFactorType[f.type] ?? 0) + 1; byFactorStatus[f.status] = (byFactorStatus[f.status] ?? 0) + 1; }
    for (const r of reports) { byReportType[r.type] = (byReportType[r.type] ?? 0) + 1; byReportStatus[r.status] = (byReportStatus[r.status] ?? 0) + 1; }
    for (const s of sources) { bySourceType[s.type] = (bySourceType[s.type] ?? 0) + 1; bySourceStatus[s.status] = (bySourceStatus[s.status] ?? 0) + 1; }
    return {
      emissionCount: emissions.length,
      factorCount: factors.length,
      reportCount: reports.length,
      sourceCount: sources.length,
      byEmissionType, byEmissionStatus, byFactorType, byFactorStatus, byReportType, byReportStatus, bySourceType, bySourceStatus,
    };
  },
};
