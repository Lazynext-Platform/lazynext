import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MetricType = 'velocity' | 'throughput' | 'cycle_time' | 'lead_time' | 'deployment_frequency' | 'change_failure_rate' | 'mttr' | 'bug_rate' | 'code_coverage' | 'technical_debt' | 'pr_review_time' | 'commit_frequency';
export type MetricUnit = 'count' | 'hours' | 'days' | 'percentage' | 'minutes' | 'score';
export type SprintStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type QualityStatus = 'good' | 'warning' | 'critical' | 'improving' | 'declining';
export type QualityType = 'code_coverage' | 'technical_debt' | 'duplication' | 'complexity' | 'maintainability' | 'reliability' | 'security' | 'performance' | 'accessibility';
export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'improving';
export type HealthCategory = 'morale' | 'retention' | 'workload' | 'collaboration' | 'growth' | 'satisfaction' | 'burnout_risk';
export type Trend = 'up' | 'down' | 'stable';

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

export interface EngineeringMetric {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: MetricType;
  value: number;
  unit: MetricUnit;
  period: string;
  team: string;
  project: string;
  measuredDate: Date | null;
  target: number | null;
  trend: Trend;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SprintReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  team: string;
  startDate: Date | null;
  endDate: Date | null;
  status: SprintStatus;
  plannedPoints: number;
  completedPoints: number;
  committedPoints: number;
  addedPoints: number;
  removedPoints: number;
  teamMembers: string[];
  goal: string;
  retrospective: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeQuality {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: QualityType;
  status: QualityStatus;
  score: number;
  description: string;
  project: string;
  measuredDate: Date | null;
  target: number | null;
  trend: Trend;
  issues: string[];
  recommendations: string[];
  measuredBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamHealth {
  id: string;
  organizationId: string;
  workspaceId: string;
  category: HealthCategory;
  status: HealthStatus;
  score: number;
  description: string;
  team: string;
  measuredDate: Date | null;
  trend: Trend;
  factors: string[];
  recommendations: string[];
  actionItems: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngineeringManagementMetrics {
  averageVelocity: number;
  deploymentFrequency: number;
  codeCoverage: number;
  mttr: number;
  activeSprints: number;
  healthSummary: Record<string, number>;
}

export interface EngineeringManagementStats {
  metricCount: number;
  sprintCount: number;
  qualityCount: number;
  healthCount: number;
  activeSprintCount: number;
  byMetricType: Record<string, number>;
  bySprintStatus: Record<string, number>;
  byQualityType: Record<string, number>;
  byQualityStatus: Record<string, number>;
  byHealthCategory: Record<string, number>;
  byHealthStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateMetricInput {
  type: MetricType;
  value: number;
  unit: MetricUnit;
  period?: string;
  team?: string;
  project?: string;
  measuredDate?: string;
  target?: number;
  trend?: Trend;
  notes?: string;
}

export interface UpdateMetricInput {
  type?: MetricType;
  value?: number;
  unit?: MetricUnit;
  period?: string;
  team?: string;
  project?: string;
  measuredDate?: string;
  target?: number;
  trend?: Trend;
  notes?: string;
}

export interface ListMetricsOpts {
  type?: MetricType;
  team?: string;
  project?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateSprintInput {
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  status?: SprintStatus;
  plannedPoints?: number;
  completedPoints?: number;
  committedPoints?: number;
  addedPoints?: number;
  removedPoints?: number;
  teamMembers?: string[];
  goal?: string;
  retrospective?: string;
  notes?: string;
}

export interface UpdateSprintInput {
  name?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
  status?: SprintStatus;
  plannedPoints?: number;
  completedPoints?: number;
  committedPoints?: number;
  addedPoints?: number;
  removedPoints?: number;
  teamMembers?: string[];
  goal?: string;
  retrospective?: string;
  notes?: string;
}

export interface ListSprintsOpts {
  team?: string;
  status?: SprintStatus;
}

export interface CreateQualityInput {
  type: QualityType;
  status: QualityStatus;
  score: number;
  description?: string;
  project?: string;
  measuredDate?: string;
  target?: number;
  trend?: Trend;
  issues?: string[];
  recommendations?: string[];
  measuredBy?: string;
  notes?: string;
}

export interface UpdateQualityInput {
  type?: QualityType;
  status?: QualityStatus;
  score?: number;
  description?: string;
  project?: string;
  measuredDate?: string;
  target?: number;
  trend?: Trend;
  issues?: string[];
  recommendations?: string[];
  measuredBy?: string;
  notes?: string;
}

export interface ListQualitiesOpts {
  type?: QualityType;
  status?: QualityStatus;
  project?: string;
}

export interface CreateHealthInput {
  category: HealthCategory;
  status: HealthStatus;
  score: number;
  description?: string;
  team?: string;
  measuredDate?: string;
  trend?: Trend;
  factors?: string[];
  recommendations?: string[];
  actionItems?: string[];
  notes?: string;
}

export interface UpdateHealthInput {
  category?: HealthCategory;
  status?: HealthStatus;
  score?: number;
  description?: string;
  team?: string;
  measuredDate?: string;
  trend?: Trend;
  factors?: string[];
  recommendations?: string[];
  actionItems?: string[];
  notes?: string;
}

export interface ListHealthsOpts {
  category?: HealthCategory;
  status?: HealthStatus;
  team?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toMetric(row: MemoryRow): EngineeringMetric {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as MetricType) ?? 'velocity',
    value: (c.value as number) ?? 0,
    unit: (c.unit as MetricUnit) ?? 'count',
    period: (c.period as string) ?? '',
    team: (c.team as string) ?? '',
    project: (c.project as string) ?? '',
    measuredDate: c.measuredDate ? new Date(c.measuredDate as string) : null,
    target: c.target !== undefined && c.target !== null ? (c.target as number) : null,
    trend: (c.trend as Trend) ?? 'stable',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSprint(row: MemoryRow): SprintReport {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    team: (c.team as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    status: (c.status as SprintStatus) ?? 'planned',
    plannedPoints: (c.plannedPoints as number) ?? 0,
    completedPoints: (c.completedPoints as number) ?? 0,
    committedPoints: (c.committedPoints as number) ?? 0,
    addedPoints: (c.addedPoints as number) ?? 0,
    removedPoints: (c.removedPoints as number) ?? 0,
    teamMembers: (c.teamMembers as string[]) ?? [],
    goal: (c.goal as string) ?? '',
    retrospective: (c.retrospective as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toQuality(row: MemoryRow): CodeQuality {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: (c.type as QualityType) ?? 'code_coverage',
    status: (c.status as QualityStatus) ?? 'good',
    score: (c.score as number) ?? 0,
    description: (c.description as string) ?? '',
    project: (c.project as string) ?? '',
    measuredDate: c.measuredDate ? new Date(c.measuredDate as string) : null,
    target: c.target !== undefined && c.target !== null ? (c.target as number) : null,
    trend: (c.trend as Trend) ?? 'stable',
    issues: (c.issues as string[]) ?? [],
    recommendations: (c.recommendations as string[]) ?? [],
    measuredBy: (c.measuredBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toHealth(row: MemoryRow): TeamHealth {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    category: (c.category as HealthCategory) ?? 'morale',
    status: (c.status as HealthStatus) ?? 'healthy',
    score: (c.score as number) ?? 0,
    description: (c.description as string) ?? '',
    team: (c.team as string) ?? '',
    measuredDate: c.measuredDate ? new Date(c.measuredDate as string) : null,
    trend: (c.trend as Trend) ?? 'stable',
    factors: (c.factors as string[]) ?? [],
    recommendations: (c.recommendations as string[]) ?? [],
    actionItems: (c.actionItems as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EngineeringManagementService = {
  // ── Metrics ──

  async createMetric(organizationId: string, workspaceId: string, input: CreateMetricInput, createdBy: string): Promise<EngineeringMetric> {
    const content = {
      type: input.type,
      value: input.value,
      unit: input.unit,
      period: input.period ?? '',
      team: input.team ?? '',
      project: input.project ?? '',
      measuredDate: input.measuredDate ?? null,
      target: input.target ?? null,
      trend: input.trend ?? 'stable',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'eng_metric',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['eng_metric', content.type, content.unit, content.trend]),
        createdBy,
      },
    });
    return toMetric(row as MemoryRow);
  },

  async getMetric(id: string): Promise<EngineeringMetric | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'eng_metric') return null;
    return toMetric(row as MemoryRow);
  },

  async listMetrics(organizationId: string, opts: ListMetricsOpts = {}): Promise<EngineeringMetric[]> {
    const where: Record<string, unknown> = { organizationId, type: 'eng_metric' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.team) conditions.push({ content: { contains: `"team":"${opts.team}"` } });
    if (opts.project) conditions.push({ content: { contains: `"project":"${opts.project}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    let result = (rows as MemoryRow[]).map(toMetric);
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom);
      result = result.filter((m) => m.measuredDate && m.measuredDate >= from);
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      result = result.filter((m) => m.measuredDate && m.measuredDate <= to);
    }
    return result;
  },

  async updateMetric(id: string, input: UpdateMetricInput): Promise<EngineeringMetric | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as MetricType);
    const unit = input.unit !== undefined ? input.unit : (c.unit as MetricUnit);
    const trend = input.trend !== undefined ? input.trend : (c.trend as Trend);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.team !== undefined && { team: input.team }),
      ...(input.project !== undefined && { project: input.project }),
      ...(input.measuredDate !== undefined && { measuredDate: input.measuredDate }),
      ...(input.target !== undefined && { target: input.target }),
      ...(input.trend !== undefined && { trend: input.trend }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['eng_metric', type, unit, trend]) },
    }), null);
    if (!row) return null;
    return toMetric(row as MemoryRow);
  },

  async deleteMetric(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Sprints ──

  async createSprint(organizationId: string, workspaceId: string, input: CreateSprintInput, createdBy: string): Promise<SprintReport> {
    const content = {
      name: input.name.trim(),
      team: input.team,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? 'planned',
      plannedPoints: input.plannedPoints ?? 0,
      completedPoints: input.completedPoints ?? 0,
      committedPoints: input.committedPoints ?? 0,
      addedPoints: input.addedPoints ?? 0,
      removedPoints: input.removedPoints ?? 0,
      teamMembers: input.teamMembers ?? [],
      goal: input.goal ?? '',
      retrospective: input.retrospective ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'sprint_report',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['sprint_report', content.team, content.status]),
        createdBy,
      },
    });
    return toSprint(row as MemoryRow);
  },

  async getSprint(id: string): Promise<SprintReport | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'sprint_report') return null;
    return toSprint(row as MemoryRow);
  },

  async listSprints(organizationId: string, opts: ListSprintsOpts = {}): Promise<SprintReport[]> {
    const where: Record<string, unknown> = { organizationId, type: 'sprint_report' };
    const conditions: unknown[] = [];
    if (opts.team) conditions.push({ content: { contains: `"team":"${opts.team}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSprint);
  },

  async updateSprint(id: string, input: UpdateSprintInput): Promise<SprintReport | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const team = input.team !== undefined ? input.team : (c.team as string);
    const status = input.status !== undefined ? input.status : (c.status as SprintStatus);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.team !== undefined && { team: input.team }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.plannedPoints !== undefined && { plannedPoints: input.plannedPoints }),
      ...(input.completedPoints !== undefined && { completedPoints: input.completedPoints }),
      ...(input.committedPoints !== undefined && { committedPoints: input.committedPoints }),
      ...(input.addedPoints !== undefined && { addedPoints: input.addedPoints }),
      ...(input.removedPoints !== undefined && { removedPoints: input.removedPoints }),
      ...(input.teamMembers !== undefined && { teamMembers: input.teamMembers }),
      ...(input.goal !== undefined && { goal: input.goal }),
      ...(input.retrospective !== undefined && { retrospective: input.retrospective }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['sprint_report', team, status]) },
    }), null);
    if (!row) return null;
    return toSprint(row as MemoryRow);
  },

  async deleteSprint(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startSprint(id: string, _startedBy: string): Promise<SprintReport | null> {
    return EngineeringManagementService.updateSprint(id, { status: 'active' });
  },

  async completeSprint(id: string, _completedBy: string): Promise<SprintReport | null> {
    return EngineeringManagementService.updateSprint(id, { status: 'completed' });
  },

  // ── Code Quality ──

  async createQuality(organizationId: string, workspaceId: string, input: CreateQualityInput, createdBy: string): Promise<CodeQuality> {
    const content = {
      type: input.type,
      status: input.status,
      score: input.score,
      description: input.description ?? '',
      project: input.project ?? '',
      measuredDate: input.measuredDate ?? null,
      target: input.target ?? null,
      trend: input.trend ?? 'stable',
      issues: input.issues ?? [],
      recommendations: input.recommendations ?? [],
      measuredBy: input.measuredBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'code_quality',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['code_quality', content.type, content.status, content.trend]),
        createdBy,
      },
    });
    return toQuality(row as MemoryRow);
  },

  async getQuality(id: string): Promise<CodeQuality | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'code_quality') return null;
    return toQuality(row as MemoryRow);
  },

  async listQualities(organizationId: string, opts: ListQualitiesOpts = {}): Promise<CodeQuality[]> {
    const where: Record<string, unknown> = { organizationId, type: 'code_quality' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.project) conditions.push({ content: { contains: `"project":"${opts.project}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toQuality);
  },

  async updateQuality(id: string, input: UpdateQualityInput): Promise<CodeQuality | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as QualityType);
    const status = input.status !== undefined ? input.status : (c.status as QualityStatus);
    const trend = input.trend !== undefined ? input.trend : (c.trend as Trend);
    const content = {
      ...c,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.project !== undefined && { project: input.project }),
      ...(input.measuredDate !== undefined && { measuredDate: input.measuredDate }),
      ...(input.target !== undefined && { target: input.target }),
      ...(input.trend !== undefined && { trend: input.trend }),
      ...(input.issues !== undefined && { issues: input.issues }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.measuredBy !== undefined && { measuredBy: input.measuredBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['code_quality', type, status, trend]) },
    }), null);
    if (!row) return null;
    return toQuality(row as MemoryRow);
  },

  async deleteQuality(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Team Health ──

  async createHealth(organizationId: string, workspaceId: string, input: CreateHealthInput, createdBy: string): Promise<TeamHealth> {
    const content = {
      category: input.category,
      status: input.status,
      score: input.score,
      description: input.description ?? '',
      team: input.team ?? '',
      measuredDate: input.measuredDate ?? null,
      trend: input.trend ?? 'stable',
      factors: input.factors ?? [],
      recommendations: input.recommendations ?? [],
      actionItems: input.actionItems ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'team_health',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['team_health', content.category, content.status, content.trend]),
        createdBy,
      },
    });
    return toHealth(row as MemoryRow);
  },

  async getHealth(id: string): Promise<TeamHealth | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'team_health') return null;
    return toHealth(row as MemoryRow);
  },

  async listHealths(organizationId: string, opts: ListHealthsOpts = {}): Promise<TeamHealth[]> {
    const where: Record<string, unknown> = { organizationId, type: 'team_health' };
    const conditions: unknown[] = [];
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.team) conditions.push({ content: { contains: `"team":"${opts.team}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toHealth);
  },

  async updateHealth(id: string, input: UpdateHealthInput): Promise<TeamHealth | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const category = input.category !== undefined ? input.category : (c.category as HealthCategory);
    const status = input.status !== undefined ? input.status : (c.status as HealthStatus);
    const trend = input.trend !== undefined ? input.trend : (c.trend as Trend);
    const content = {
      ...c,
      ...(input.category !== undefined && { category: input.category }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.team !== undefined && { team: input.team }),
      ...(input.measuredDate !== undefined && { measuredDate: input.measuredDate }),
      ...(input.trend !== undefined && { trend: input.trend }),
      ...(input.factors !== undefined && { factors: input.factors }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.actionItems !== undefined && { actionItems: input.actionItems }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['team_health', category, status, trend]) },
    }), null);
    if (!row) return null;
    return toHealth(row as MemoryRow);
  },

  async deleteHealth(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getEngineeringMetrics(organizationId: string): Promise<EngineeringManagementMetrics> {
    const [metrics, sprints, healths] = await Promise.all([
      EngineeringManagementService.listMetrics(organizationId),
      EngineeringManagementService.listSprints(organizationId),
      EngineeringManagementService.listHealths(organizationId),
    ]);
    const velocityMetrics = metrics.filter((m) => m.type === 'velocity');
    const averageVelocity = velocityMetrics.length > 0
      ? Math.round(velocityMetrics.reduce((sum, m) => sum + m.value, 0) / velocityMetrics.length)
      : 0;
    const deployMetrics = metrics.filter((m) => m.type === 'deployment_frequency');
    const deploymentFrequency = deployMetrics.length > 0
      ? Math.round(deployMetrics.reduce((sum, m) => sum + m.value, 0) / deployMetrics.length)
      : 0;
    const coverageMetrics = metrics.filter((m) => m.type === 'code_coverage');
    const codeCoverage = coverageMetrics.length > 0
      ? Math.round(coverageMetrics.reduce((sum, m) => sum + m.value, 0) / coverageMetrics.length)
      : 0;
    const mttrMetrics = metrics.filter((m) => m.type === 'mttr');
    const mttr = mttrMetrics.length > 0
      ? Math.round(mttrMetrics.reduce((sum, m) => sum + m.value, 0) / mttrMetrics.length)
      : 0;
    const activeSprints = sprints.filter((s) => s.status === 'active').length;
    const healthSummary: Record<string, number> = {};
    for (const h of healths) { healthSummary[h.status] = (healthSummary[h.status] ?? 0) + 1; }
    return { averageVelocity, deploymentFrequency, codeCoverage, mttr, activeSprints, healthSummary };
  },

  async getEngineeringStats(organizationId: string): Promise<EngineeringManagementStats> {
    const [metrics, sprints, qualities, healths] = await Promise.all([
      EngineeringManagementService.listMetrics(organizationId),
      EngineeringManagementService.listSprints(organizationId),
      EngineeringManagementService.listQualities(organizationId),
      EngineeringManagementService.listHealths(organizationId),
    ]);
    const byMetricType: Record<string, number> = {};
    const bySprintStatus: Record<string, number> = {};
    const byQualityType: Record<string, number> = {};
    const byQualityStatus: Record<string, number> = {};
    const byHealthCategory: Record<string, number> = {};
    const byHealthStatus: Record<string, number> = {};
    for (const m of metrics) { byMetricType[m.type] = (byMetricType[m.type] ?? 0) + 1; }
    for (const s of sprints) { bySprintStatus[s.status] = (bySprintStatus[s.status] ?? 0) + 1; }
    for (const q of qualities) { byQualityType[q.type] = (byQualityType[q.type] ?? 0) + 1; byQualityStatus[q.status] = (byQualityStatus[q.status] ?? 0) + 1; }
    for (const h of healths) { byHealthCategory[h.category] = (byHealthCategory[h.category] ?? 0) + 1; byHealthStatus[h.status] = (byHealthStatus[h.status] ?? 0) + 1; }
    return {
      metricCount: metrics.length,
      sprintCount: sprints.length,
      qualityCount: qualities.length,
      healthCount: healths.length,
      activeSprintCount: sprints.filter((s) => s.status === 'active').length,
      byMetricType, bySprintStatus, byQualityType, byQualityStatus, byHealthCategory, byHealthStatus,
    };
  },
};
