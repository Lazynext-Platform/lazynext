import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type KpiDefinitionType = 'revenue' | 'growth' | 'efficiency' | 'quality' | 'satisfaction' | 'retention' | 'engagement' | 'performance' | 'cost' | 'productivity' | 'safety' | 'compliance' | 'innovation' | 'custom';
export type KpiDefinitionStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type Direction = 'increase' | 'decrease' | 'maintain';
export type KpiTargetType = 'annual' | 'quarterly' | 'monthly' | 'weekly' | 'daily' | 'stretch' | 'minimum' | 'expected' | 'custom';
export type KpiTargetStatus = 'draft' | 'active' | 'achieved' | 'missed' | 'archived';
export type KpiMeasurementType = 'actual' | 'forecast' | 'estimate' | 'baseline' | 'milestone' | 'adjustment';
export type KpiMeasurementStatus = 'recorded' | 'verified' | 'disputed' | 'archived';
export type KpiDashboardType = 'executive' | 'operational' | 'departmental' | 'project' | 'team' | 'custom';
export type KpiDashboardStatus = 'draft' | 'active' | 'deprecated' | 'archived';

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

export interface KpiDefinition {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: KpiDefinitionType;
  description: string;
  status: KpiDefinitionStatus;
  metric: string;
  unit: string;
  formula: string;
  frequency: string;
  owner: string;
  category: string;
  target: number;
  direction: Direction;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiTarget {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: KpiTargetType;
  description: string;
  status: KpiTargetStatus;
  kpiId: string | null;
  target: number;
  minimum: number;
  stretch: number;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiMeasurement {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: KpiMeasurementType;
  description: string;
  status: KpiMeasurementStatus;
  kpiId: string | null;
  targetId: string | null;
  value: number;
  previousValue: number;
  change: number;
  measuredAt: Date | null;
  measuredBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiDashboard {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: KpiDashboardType;
  description: string;
  status: KpiDashboardStatus;
  kpis: string[];
  layout: string;
  filters: string;
  refreshInterval: string;
  owner: string;
  shared: boolean;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiMetrics {
  activeDefinitions: number;
  activeTargets: number;
  recordedMeasurements: number;
  activeDashboards: number;
  achievedTargets: number;
}

export interface KpiStats {
  definitionCount: number;
  targetCount: number;
  measurementCount: number;
  dashboardCount: number;
  byDefinitionType: Record<string, number>;
  byDefinitionStatus: Record<string, number>;
  byTargetType: Record<string, number>;
  byTargetStatus: Record<string, number>;
  byMeasurementType: Record<string, number>;
  byMeasurementStatus: Record<string, number>;
  byDashboardType: Record<string, number>;
  byDashboardStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateKpiDefinitionInput {
  name: string;
  type: KpiDefinitionType;
  description?: string;
  status?: KpiDefinitionStatus;
  metric?: string;
  unit?: string;
  formula?: string;
  frequency?: string;
  owner?: string;
  category?: string;
  target?: number;
  direction?: Direction;
  notes?: string;
}

export interface UpdateKpiDefinitionInput {
  name?: string;
  type?: KpiDefinitionType;
  description?: string;
  status?: KpiDefinitionStatus;
  metric?: string;
  unit?: string;
  formula?: string;
  frequency?: string;
  owner?: string;
  category?: string;
  target?: number;
  direction?: Direction;
  notes?: string;
}

export interface ListKpiDefinitionsOpts {
  type?: KpiDefinitionType;
  status?: KpiDefinitionStatus;
}

export interface CreateKpiTargetInput {
  name: string;
  type: KpiTargetType;
  description?: string;
  status?: KpiTargetStatus;
  kpiId?: string;
  target?: number;
  minimum?: number;
  stretch?: number;
  startDate?: string;
  endDate?: string;
  progress?: number;
  notes?: string;
}

export interface UpdateKpiTargetInput {
  name?: string;
  type?: KpiTargetType;
  description?: string;
  status?: KpiTargetStatus;
  kpiId?: string;
  target?: number;
  minimum?: number;
  stretch?: number;
  startDate?: string;
  endDate?: string;
  progress?: number;
  notes?: string;
}

export interface ListKpiTargetsOpts {
  type?: KpiTargetType;
  status?: KpiTargetStatus;
  kpiId?: string;
}

export interface CreateKpiMeasurementInput {
  name: string;
  type: KpiMeasurementType;
  description?: string;
  status?: KpiMeasurementStatus;
  kpiId?: string;
  targetId?: string;
  value?: number;
  previousValue?: number;
  change?: number;
  measuredAt?: string;
  measuredBy?: string;
  notes?: string;
}

export interface UpdateKpiMeasurementInput {
  name?: string;
  type?: KpiMeasurementType;
  description?: string;
  status?: KpiMeasurementStatus;
  kpiId?: string;
  targetId?: string;
  value?: number;
  previousValue?: number;
  change?: number;
  measuredAt?: string;
  measuredBy?: string;
  notes?: string;
}

export interface ListKpiMeasurementsOpts {
  type?: KpiMeasurementType;
  status?: KpiMeasurementStatus;
  kpiId?: string;
  targetId?: string;
}

export interface CreateKpiDashboardInput {
  name: string;
  type: KpiDashboardType;
  description?: string;
  status?: KpiDashboardStatus;
  kpis?: string[];
  layout?: string;
  filters?: string;
  refreshInterval?: string;
  owner?: string;
  shared?: boolean;
  notes?: string;
}

export interface UpdateKpiDashboardInput {
  name?: string;
  type?: KpiDashboardType;
  description?: string;
  status?: KpiDashboardStatus;
  kpis?: string[];
  layout?: string;
  filters?: string;
  refreshInterval?: string;
  owner?: string;
  shared?: boolean;
  notes?: string;
}

export interface ListKpiDashboardsOpts {
  type?: KpiDashboardType;
  status?: KpiDashboardStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toKpiDefinition(row: MemoryRow): KpiDefinition {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as KpiDefinitionType) ?? 'custom',
    description: (c.description as string) ?? '',
    status: (c.status as KpiDefinitionStatus) ?? 'draft',
    metric: (c.metric as string) ?? '',
    unit: (c.unit as string) ?? '',
    formula: (c.formula as string) ?? '',
    frequency: (c.frequency as string) ?? '',
    owner: (c.owner as string) ?? '',
    category: (c.category as string) ?? '',
    target: (c.target as number) ?? 0,
    direction: (c.direction as Direction) ?? 'increase',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toKpiTarget(row: MemoryRow): KpiTarget {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as KpiTargetType) ?? 'annual',
    description: (c.description as string) ?? '',
    status: (c.status as KpiTargetStatus) ?? 'draft',
    kpiId: (c.kpiId as string) ?? null,
    target: (c.target as number) ?? 0,
    minimum: (c.minimum as number) ?? 0,
    stretch: (c.stretch as number) ?? 0,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    progress: (c.progress as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toKpiMeasurement(row: MemoryRow): KpiMeasurement {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as KpiMeasurementType) ?? 'actual',
    description: (c.description as string) ?? '',
    status: (c.status as KpiMeasurementStatus) ?? 'recorded',
    kpiId: (c.kpiId as string) ?? null,
    targetId: (c.targetId as string) ?? null,
    value: (c.value as number) ?? 0,
    previousValue: (c.previousValue as number) ?? 0,
    change: (c.change as number) ?? 0,
    measuredAt: c.measuredAt ? new Date(c.measuredAt as string) : null,
    measuredBy: (c.measuredBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toKpiDashboard(row: MemoryRow): KpiDashboard {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as KpiDashboardType) ?? 'custom',
    description: (c.description as string) ?? '',
    status: (c.status as KpiDashboardStatus) ?? 'draft',
    kpis: (c.kpis as string[]) ?? [],
    layout: (c.layout as string) ?? '',
    filters: (c.filters as string) ?? '',
    refreshInterval: (c.refreshInterval as string) ?? '',
    owner: (c.owner as string) ?? '',
    shared: (c.shared as boolean) ?? false,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const KpiService = {
  // ── KPI Definitions ──

  async createKpiDefinition(organizationId: string, workspaceId: string, input: CreateKpiDefinitionInput, createdBy: string): Promise<KpiDefinition> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      metric: input.metric ?? '',
      unit: input.unit ?? '',
      formula: input.formula ?? '',
      frequency: input.frequency ?? '',
      owner: input.owner ?? '',
      category: input.category ?? '',
      target: input.target ?? 0,
      direction: input.direction ?? 'increase',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kpi_definition',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kpi_definition', content.type, content.status]),
        createdBy,
      },
    });
    return toKpiDefinition(row as MemoryRow);
  },

  async getKpiDefinition(id: string): Promise<KpiDefinition | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kpi_definition') return null;
    return toKpiDefinition(row as MemoryRow);
  },

  async listKpiDefinitions(organizationId: string, opts: ListKpiDefinitionsOpts = {}): Promise<KpiDefinition[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kpi_definition' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toKpiDefinition);
  },

  async updateKpiDefinition(id: string, input: UpdateKpiDefinitionInput): Promise<KpiDefinition | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.metric !== undefined && { metric: input.metric }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.formula !== undefined && { formula: input.formula }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.target !== undefined && { target: input.target }),
      ...(input.direction !== undefined && { direction: input.direction }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kpi_definition', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toKpiDefinition(row as MemoryRow);
  },

  async deleteKpiDefinition(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateKpiDefinition(id: string, _activatedBy: string): Promise<KpiDefinition | null> {
    return KpiService.updateKpiDefinition(id, { status: 'active' });
  },

  async deprecateKpiDefinition(id: string, _deprecatedBy: string): Promise<KpiDefinition | null> {
    return KpiService.updateKpiDefinition(id, { status: 'deprecated' });
  },

  async archiveKpiDefinition(id: string, _archivedBy: string): Promise<KpiDefinition | null> {
    return KpiService.updateKpiDefinition(id, { status: 'archived' });
  },

  // ── KPI Targets ──

  async createKpiTarget(organizationId: string, workspaceId: string, input: CreateKpiTargetInput, createdBy: string): Promise<KpiTarget> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      kpiId: input.kpiId ?? null,
      target: input.target ?? 0,
      minimum: input.minimum ?? 0,
      stretch: input.stretch ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      progress: input.progress ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kpi_target',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.kpiId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kpi_target', content.type, content.status]),
        createdBy,
      },
    });
    return toKpiTarget(row as MemoryRow);
  },

  async getKpiTarget(id: string): Promise<KpiTarget | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kpi_target') return null;
    return toKpiTarget(row as MemoryRow);
  },

  async listKpiTargets(organizationId: string, opts: ListKpiTargetsOpts = {}): Promise<KpiTarget[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kpi_target' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.kpiId) conditions.push({ content: { contains: `"kpiId":"${opts.kpiId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toKpiTarget);
  },

  async updateKpiTarget(id: string, input: UpdateKpiTargetInput): Promise<KpiTarget | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.kpiId !== undefined && { kpiId: input.kpiId }),
      ...(input.target !== undefined && { target: input.target }),
      ...(input.minimum !== undefined && { minimum: input.minimum }),
      ...(input.stretch !== undefined && { stretch: input.stretch }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kpi_target', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toKpiTarget(row as MemoryRow);
  },

  async deleteKpiTarget(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateKpiTarget(id: string, _activatedBy: string): Promise<KpiTarget | null> {
    return KpiService.updateKpiTarget(id, { status: 'active' });
  },

  async achieveKpiTarget(id: string, _achievedBy: string): Promise<KpiTarget | null> {
    return KpiService.updateKpiTarget(id, { status: 'achieved', progress: 100 });
  },

  async missKpiTarget(id: string, _missedBy: string): Promise<KpiTarget | null> {
    return KpiService.updateKpiTarget(id, { status: 'missed' });
  },

  async archiveKpiTarget(id: string, _archivedBy: string): Promise<KpiTarget | null> {
    return KpiService.updateKpiTarget(id, { status: 'archived' });
  },

  // ── KPI Measurements ──

  async createKpiMeasurement(organizationId: string, workspaceId: string, input: CreateKpiMeasurementInput, createdBy: string): Promise<KpiMeasurement> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'recorded',
      kpiId: input.kpiId ?? null,
      targetId: input.targetId ?? null,
      value: input.value ?? 0,
      previousValue: input.previousValue ?? 0,
      change: input.change ?? 0,
      measuredAt: input.measuredAt ?? null,
      measuredBy: input.measuredBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kpi_measurement',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.kpiId ?? input.targetId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kpi_measurement', content.type, content.status]),
        createdBy,
      },
    });
    return toKpiMeasurement(row as MemoryRow);
  },

  async getKpiMeasurement(id: string): Promise<KpiMeasurement | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kpi_measurement') return null;
    return toKpiMeasurement(row as MemoryRow);
  },

  async listKpiMeasurements(organizationId: string, opts: ListKpiMeasurementsOpts = {}): Promise<KpiMeasurement[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kpi_measurement' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.kpiId) conditions.push({ content: { contains: `"kpiId":"${opts.kpiId}"` } });
    if (opts.targetId) conditions.push({ content: { contains: `"targetId":"${opts.targetId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toKpiMeasurement);
  },

  async updateKpiMeasurement(id: string, input: UpdateKpiMeasurementInput): Promise<KpiMeasurement | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.kpiId !== undefined && { kpiId: input.kpiId }),
      ...(input.targetId !== undefined && { targetId: input.targetId }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.previousValue !== undefined && { previousValue: input.previousValue }),
      ...(input.change !== undefined && { change: input.change }),
      ...(input.measuredAt !== undefined && { measuredAt: input.measuredAt }),
      ...(input.measuredBy !== undefined && { measuredBy: input.measuredBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kpi_measurement', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toKpiMeasurement(row as MemoryRow);
  },

  async deleteKpiMeasurement(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async recordMeasurement(id: string, _recordedBy: string): Promise<KpiMeasurement | null> {
    return KpiService.updateKpiMeasurement(id, { status: 'recorded' });
  },

  async verifyMeasurement(id: string, _verifiedBy: string): Promise<KpiMeasurement | null> {
    return KpiService.updateKpiMeasurement(id, { status: 'verified' });
  },

  async disputeMeasurement(id: string, _disputedBy: string): Promise<KpiMeasurement | null> {
    return KpiService.updateKpiMeasurement(id, { status: 'disputed' });
  },

  async archiveMeasurement(id: string, _archivedBy: string): Promise<KpiMeasurement | null> {
    return KpiService.updateKpiMeasurement(id, { status: 'archived' });
  },

  // ── KPI Dashboards ──

  async createKpiDashboard(organizationId: string, workspaceId: string, input: CreateKpiDashboardInput, createdBy: string): Promise<KpiDashboard> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      kpis: input.kpis ?? [],
      layout: input.layout ?? '',
      filters: input.filters ?? '',
      refreshInterval: input.refreshInterval ?? '',
      owner: input.owner ?? '',
      shared: input.shared ?? false,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kpi_dashboard',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kpi_dashboard', content.type, content.status]),
        createdBy,
      },
    });
    return toKpiDashboard(row as MemoryRow);
  },

  async getKpiDashboard(id: string): Promise<KpiDashboard | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kpi_dashboard') return null;
    return toKpiDashboard(row as MemoryRow);
  },

  async listKpiDashboards(organizationId: string, opts: ListKpiDashboardsOpts = {}): Promise<KpiDashboard[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kpi_dashboard' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toKpiDashboard);
  },

  async updateKpiDashboard(id: string, input: UpdateKpiDashboardInput): Promise<KpiDashboard | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.kpis !== undefined && { kpis: input.kpis }),
      ...(input.layout !== undefined && { layout: input.layout }),
      ...(input.filters !== undefined && { filters: input.filters }),
      ...(input.refreshInterval !== undefined && { refreshInterval: input.refreshInterval }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.shared !== undefined && { shared: input.shared }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kpi_dashboard', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toKpiDashboard(row as MemoryRow);
  },

  async deleteKpiDashboard(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateKpiDashboard(id: string, _activatedBy: string): Promise<KpiDashboard | null> {
    return KpiService.updateKpiDashboard(id, { status: 'active' });
  },

  async deprecateKpiDashboard(id: string, _deprecatedBy: string): Promise<KpiDashboard | null> {
    return KpiService.updateKpiDashboard(id, { status: 'deprecated' });
  },

  async archiveKpiDashboard(id: string, _archivedBy: string): Promise<KpiDashboard | null> {
    return KpiService.updateKpiDashboard(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getKpiMetrics(organizationId: string): Promise<KpiMetrics> {
    const [definitions, targets, measurements, dashboards] = await Promise.all([
      KpiService.listKpiDefinitions(organizationId),
      KpiService.listKpiTargets(organizationId),
      KpiService.listKpiMeasurements(organizationId),
      KpiService.listKpiDashboards(organizationId),
    ]);
    return {
      activeDefinitions: definitions.filter((d) => d.status === 'active').length,
      activeTargets: targets.filter((t) => t.status === 'active').length,
      recordedMeasurements: measurements.filter((m) => m.status === 'recorded').length,
      activeDashboards: dashboards.filter((d) => d.status === 'active').length,
      achievedTargets: targets.filter((t) => t.status === 'achieved').length,
    };
  },

  async getKpiStats(organizationId: string): Promise<KpiStats> {
    const [definitions, targets, measurements, dashboards] = await Promise.all([
      KpiService.listKpiDefinitions(organizationId),
      KpiService.listKpiTargets(organizationId),
      KpiService.listKpiMeasurements(organizationId),
      KpiService.listKpiDashboards(organizationId),
    ]);
    const byDefinitionType: Record<string, number> = {};
    const byDefinitionStatus: Record<string, number> = {};
    const byTargetType: Record<string, number> = {};
    const byTargetStatus: Record<string, number> = {};
    const byMeasurementType: Record<string, number> = {};
    const byMeasurementStatus: Record<string, number> = {};
    const byDashboardType: Record<string, number> = {};
    const byDashboardStatus: Record<string, number> = {};
    for (const d of definitions) { byDefinitionType[d.type] = (byDefinitionType[d.type] ?? 0) + 1; byDefinitionStatus[d.status] = (byDefinitionStatus[d.status] ?? 0) + 1; }
    for (const t of targets) { byTargetType[t.type] = (byTargetType[t.type] ?? 0) + 1; byTargetStatus[t.status] = (byTargetStatus[t.status] ?? 0) + 1; }
    for (const m of measurements) { byMeasurementType[m.type] = (byMeasurementType[m.type] ?? 0) + 1; byMeasurementStatus[m.status] = (byMeasurementStatus[m.status] ?? 0) + 1; }
    for (const d of dashboards) { byDashboardType[d.type] = (byDashboardType[d.type] ?? 0) + 1; byDashboardStatus[d.status] = (byDashboardStatus[d.status] ?? 0) + 1; }
    return {
      definitionCount: definitions.length,
      targetCount: targets.length,
      measurementCount: measurements.length,
      dashboardCount: dashboards.length,
      byDefinitionType, byDefinitionStatus, byTargetType, byTargetStatus, byMeasurementType, byMeasurementStatus, byDashboardType, byDashboardStatus,
    };
  },
};
