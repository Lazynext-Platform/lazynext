import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContinuityPlanType = 'business_continuity' | 'disaster_recovery' | 'crisis_management' | 'pandemic' | 'cyber_incident' | 'supply_chain' | 'facility_loss' | 'personnel_loss';
export type ContinuityPlanStatus = 'draft' | 'approved' | 'active' | 'tested' | 'deprecated' | 'archived';
export type RecoveryStrategyType = 'active_active' | 'active_passive' | 'cold_site' | 'warm_site' | 'hot_site' | 'cloud_failover' | 'manual_workaround' | 'reciprocal';
export type RecoveryStrategyStatus = 'draft' | 'approved' | 'implemented' | 'tested' | 'deprecated';
export type BIAType = 'process' | 'function' | 'system' | 'department' | 'service' | 'application' | 'facility';
export type BIAStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
export type ContinuityTestType = 'tabletop' | 'simulation' | 'full_scale' | 'component' | 'parallel' | 'failover' | 'communication';
export type ContinuityTestStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

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

export interface ContinuityPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContinuityPlanType;
  description: string;
  status: ContinuityPlanStatus;
  scope: string;
  owner: string;
  priority: string;
  recoveryTime: string;
  lastTested: Date | null;
  nextTest: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecoveryStrategy {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecoveryStrategyType;
  description: string;
  status: RecoveryStrategyStatus;
  planId: string | null;
  strategy: string;
  cost: string;
  complexity: string;
  recoveryTime: string;
  recoveryPoint: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessImpactAnalysis {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: BIAType;
  description: string;
  status: BIAStatus;
  processName: string;
  criticality: string;
  maxDowntime: string;
  recoveryTime: string;
  recoveryPoint: string;
  dependencies: string;
  impact: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContinuityTest {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ContinuityTestType;
  description: string;
  status: ContinuityTestStatus;
  planId: string | null;
  testDate: Date | null;
  duration: number;
  participants: number;
  results: string;
  gaps: string;
  recommendations: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessContinuityMetrics {
  activePlans: number;
  implementedStrategies: number;
  completedBIAs: number;
  scheduledTests: number;
  completedTests: number;
}

export interface BusinessContinuityStats {
  planCount: number;
  strategyCount: number;
  biaCount: number;
  testCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byStrategyType: Record<string, number>;
  byStrategyStatus: Record<string, number>;
  byBIAType: Record<string, number>;
  byBIAStatus: Record<string, number>;
  byTestType: Record<string, number>;
  byTestStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateContinuityPlanInput {
  name: string;
  type: ContinuityPlanType;
  description?: string;
  status?: ContinuityPlanStatus;
  scope?: string;
  owner?: string;
  priority?: string;
  recoveryTime?: string;
  lastTested?: string;
  nextTest?: string;
  notes?: string;
}

export interface UpdateContinuityPlanInput {
  name?: string;
  type?: ContinuityPlanType;
  description?: string;
  status?: ContinuityPlanStatus;
  scope?: string;
  owner?: string;
  priority?: string;
  recoveryTime?: string;
  lastTested?: string;
  nextTest?: string;
  notes?: string;
}

export interface ListContinuityPlansOpts {
  type?: ContinuityPlanType;
  status?: ContinuityPlanStatus;
}

export interface CreateRecoveryStrategyInput {
  name: string;
  type: RecoveryStrategyType;
  description?: string;
  status?: RecoveryStrategyStatus;
  planId?: string;
  strategy?: string;
  cost?: string;
  complexity?: string;
  recoveryTime?: string;
  recoveryPoint?: string;
  notes?: string;
}

export interface UpdateRecoveryStrategyInput {
  name?: string;
  type?: RecoveryStrategyType;
  description?: string;
  status?: RecoveryStrategyStatus;
  planId?: string;
  strategy?: string;
  cost?: string;
  complexity?: string;
  recoveryTime?: string;
  recoveryPoint?: string;
  notes?: string;
}

export interface ListRecoveryStrategiesOpts {
  type?: RecoveryStrategyType;
  status?: RecoveryStrategyStatus;
  planId?: string;
}

export interface CreateBusinessImpactAnalysisInput {
  name: string;
  type: BIAType;
  description?: string;
  status?: BIAStatus;
  processName?: string;
  criticality?: string;
  maxDowntime?: string;
  recoveryTime?: string;
  recoveryPoint?: string;
  dependencies?: string;
  impact?: string;
  notes?: string;
}

export interface UpdateBusinessImpactAnalysisInput {
  name?: string;
  type?: BIAType;
  description?: string;
  status?: BIAStatus;
  processName?: string;
  criticality?: string;
  maxDowntime?: string;
  recoveryTime?: string;
  recoveryPoint?: string;
  dependencies?: string;
  impact?: string;
  notes?: string;
}

export interface ListBusinessImpactAnalysesOpts {
  type?: BIAType;
  status?: BIAStatus;
}

export interface CreateContinuityTestInput {
  name: string;
  type: ContinuityTestType;
  description?: string;
  status?: ContinuityTestStatus;
  planId?: string;
  testDate?: string;
  duration?: number;
  participants?: number;
  results?: string;
  gaps?: string;
  recommendations?: string;
  notes?: string;
}

export interface UpdateContinuityTestInput {
  name?: string;
  type?: ContinuityTestType;
  description?: string;
  status?: ContinuityTestStatus;
  planId?: string;
  testDate?: string;
  duration?: number;
  participants?: number;
  results?: string;
  gaps?: string;
  recommendations?: string;
  notes?: string;
}

export interface ListContinuityTestsOpts {
  type?: ContinuityTestType;
  status?: ContinuityTestStatus;
  planId?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toContinuityPlan(row: MemoryRow): ContinuityPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContinuityPlanType) ?? 'business_continuity',
    description: (c.description as string) ?? '',
    status: (c.status as ContinuityPlanStatus) ?? 'draft',
    scope: (c.scope as string) ?? '',
    owner: (c.owner as string) ?? '',
    priority: (c.priority as string) ?? '',
    recoveryTime: (c.recoveryTime as string) ?? '',
    lastTested: c.lastTested ? new Date(c.lastTested as string) : null,
    nextTest: c.nextTest ? new Date(c.nextTest as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecoveryStrategy(row: MemoryRow): RecoveryStrategy {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecoveryStrategyType) ?? 'active_passive',
    description: (c.description as string) ?? '',
    status: (c.status as RecoveryStrategyStatus) ?? 'draft',
    planId: (c.planId as string) ?? null,
    strategy: (c.strategy as string) ?? '',
    cost: (c.cost as string) ?? '',
    complexity: (c.complexity as string) ?? '',
    recoveryTime: (c.recoveryTime as string) ?? '',
    recoveryPoint: (c.recoveryPoint as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBusinessImpactAnalysis(row: MemoryRow): BusinessImpactAnalysis {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as BIAType) ?? 'process',
    description: (c.description as string) ?? '',
    status: (c.status as BIAStatus) ?? 'draft',
    processName: (c.processName as string) ?? '',
    criticality: (c.criticality as string) ?? '',
    maxDowntime: (c.maxDowntime as string) ?? '',
    recoveryTime: (c.recoveryTime as string) ?? '',
    recoveryPoint: (c.recoveryPoint as string) ?? '',
    dependencies: (c.dependencies as string) ?? '',
    impact: (c.impact as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContinuityTest(row: MemoryRow): ContinuityTest {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ContinuityTestType) ?? 'tabletop',
    description: (c.description as string) ?? '',
    status: (c.status as ContinuityTestStatus) ?? 'scheduled',
    planId: (c.planId as string) ?? null,
    testDate: c.testDate ? new Date(c.testDate as string) : null,
    duration: (c.duration as number) ?? 0,
    participants: (c.participants as number) ?? 0,
    results: (c.results as string) ?? '',
    gaps: (c.gaps as string) ?? '',
    recommendations: (c.recommendations as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const BusinessContinuityService = {
  // ── Continuity Plans ──

  async createContinuityPlan(organizationId: string, workspaceId: string, input: CreateContinuityPlanInput, createdBy: string): Promise<ContinuityPlan> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      scope: input.scope ?? '',
      owner: input.owner ?? '',
      priority: input.priority ?? '',
      recoveryTime: input.recoveryTime ?? '',
      lastTested: input.lastTested ?? null,
      nextTest: input.nextTest ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'continuity_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['continuity_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toContinuityPlan(row as MemoryRow);
  },

  async getContinuityPlan(id: string): Promise<ContinuityPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'continuity_plan') return null;
    return toContinuityPlan(row as MemoryRow);
  },

  async listContinuityPlans(organizationId: string, opts: ListContinuityPlansOpts = {}): Promise<ContinuityPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'continuity_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContinuityPlan);
  },

  async updateContinuityPlan(id: string, input: UpdateContinuityPlanInput): Promise<ContinuityPlan | null> {
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
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.recoveryTime !== undefined && { recoveryTime: input.recoveryTime }),
      ...(input.lastTested !== undefined && { lastTested: input.lastTested }),
      ...(input.nextTest !== undefined && { nextTest: input.nextTest }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['continuity_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContinuityPlan(row as MemoryRow);
  },

  async deleteContinuityPlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveContinuityPlan(id: string, _approvedBy: string): Promise<ContinuityPlan | null> {
    return BusinessContinuityService.updateContinuityPlan(id, { status: 'approved' });
  },

  async activateContinuityPlan(id: string, _activatedBy: string): Promise<ContinuityPlan | null> {
    return BusinessContinuityService.updateContinuityPlan(id, { status: 'active' });
  },

  async testContinuityPlan(id: string, _testedBy: string): Promise<ContinuityPlan | null> {
    return BusinessContinuityService.updateContinuityPlan(id, { status: 'tested', lastTested: new Date().toISOString() });
  },

  async deprecateContinuityPlan(id: string, _deprecatedBy: string): Promise<ContinuityPlan | null> {
    return BusinessContinuityService.updateContinuityPlan(id, { status: 'deprecated' });
  },

  async archiveContinuityPlan(id: string, _archivedBy: string): Promise<ContinuityPlan | null> {
    return BusinessContinuityService.updateContinuityPlan(id, { status: 'archived' });
  },

  // ── Recovery Strategies ──

  async createRecoveryStrategy(organizationId: string, workspaceId: string, input: CreateRecoveryStrategyInput, createdBy: string): Promise<RecoveryStrategy> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      planId: input.planId ?? null,
      strategy: input.strategy ?? '',
      cost: input.cost ?? '',
      complexity: input.complexity ?? '',
      recoveryTime: input.recoveryTime ?? '',
      recoveryPoint: input.recoveryPoint ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recovery_strategy',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recovery_strategy', content.type, content.status]),
        createdBy,
      },
    });
    return toRecoveryStrategy(row as MemoryRow);
  },

  async getRecoveryStrategy(id: string): Promise<RecoveryStrategy | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recovery_strategy') return null;
    return toRecoveryStrategy(row as MemoryRow);
  },

  async listRecoveryStrategies(organizationId: string, opts: ListRecoveryStrategiesOpts = {}): Promise<RecoveryStrategy[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recovery_strategy' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecoveryStrategy);
  },

  async updateRecoveryStrategy(id: string, input: UpdateRecoveryStrategyInput): Promise<RecoveryStrategy | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.strategy !== undefined && { strategy: input.strategy }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.complexity !== undefined && { complexity: input.complexity }),
      ...(input.recoveryTime !== undefined && { recoveryTime: input.recoveryTime }),
      ...(input.recoveryPoint !== undefined && { recoveryPoint: input.recoveryPoint }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recovery_strategy', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecoveryStrategy(row as MemoryRow);
  },

  async deleteRecoveryStrategy(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveRecoveryStrategy(id: string, _approvedBy: string): Promise<RecoveryStrategy | null> {
    return BusinessContinuityService.updateRecoveryStrategy(id, { status: 'approved' });
  },

  async implementRecoveryStrategy(id: string, _implementedBy: string): Promise<RecoveryStrategy | null> {
    return BusinessContinuityService.updateRecoveryStrategy(id, { status: 'implemented' });
  },

  async testRecoveryStrategy(id: string, _testedBy: string): Promise<RecoveryStrategy | null> {
    return BusinessContinuityService.updateRecoveryStrategy(id, { status: 'tested' });
  },

  async deprecateRecoveryStrategy(id: string, _deprecatedBy: string): Promise<RecoveryStrategy | null> {
    return BusinessContinuityService.updateRecoveryStrategy(id, { status: 'deprecated' });
  },

  // ── Business Impact Analyses ──

  async createBusinessImpactAnalysis(organizationId: string, workspaceId: string, input: CreateBusinessImpactAnalysisInput, createdBy: string): Promise<BusinessImpactAnalysis> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      processName: input.processName ?? '',
      criticality: input.criticality ?? '',
      maxDowntime: input.maxDowntime ?? '',
      recoveryTime: input.recoveryTime ?? '',
      recoveryPoint: input.recoveryPoint ?? '',
      dependencies: input.dependencies ?? '',
      impact: input.impact ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'business_impact_analysis',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['business_impact_analysis', content.type, content.status]),
        createdBy,
      },
    });
    return toBusinessImpactAnalysis(row as MemoryRow);
  },

  async getBusinessImpactAnalysis(id: string): Promise<BusinessImpactAnalysis | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'business_impact_analysis') return null;
    return toBusinessImpactAnalysis(row as MemoryRow);
  },

  async listBusinessImpactAnalyses(organizationId: string, opts: ListBusinessImpactAnalysesOpts = {}): Promise<BusinessImpactAnalysis[]> {
    const where: Record<string, unknown> = { organizationId, type: 'business_impact_analysis' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBusinessImpactAnalysis);
  },

  async updateBusinessImpactAnalysis(id: string, input: UpdateBusinessImpactAnalysisInput): Promise<BusinessImpactAnalysis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.processName !== undefined && { processName: input.processName }),
      ...(input.criticality !== undefined && { criticality: input.criticality }),
      ...(input.maxDowntime !== undefined && { maxDowntime: input.maxDowntime }),
      ...(input.recoveryTime !== undefined && { recoveryTime: input.recoveryTime }),
      ...(input.recoveryPoint !== undefined && { recoveryPoint: input.recoveryPoint }),
      ...(input.dependencies !== undefined && { dependencies: input.dependencies }),
      ...(input.impact !== undefined && { impact: input.impact }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['business_impact_analysis', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBusinessImpactAnalysis(row as MemoryRow);
  },

  async deleteBusinessImpactAnalysis(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startBIA(id: string, _startedBy: string): Promise<BusinessImpactAnalysis | null> {
    return BusinessContinuityService.updateBusinessImpactAnalysis(id, { status: 'in_progress' });
  },

  async completeBIA(id: string, _completedBy: string): Promise<BusinessImpactAnalysis | null> {
    return BusinessContinuityService.updateBusinessImpactAnalysis(id, { status: 'completed' });
  },

  async reviewBIA(id: string, _reviewedBy: string): Promise<BusinessImpactAnalysis | null> {
    return BusinessContinuityService.updateBusinessImpactAnalysis(id, { status: 'reviewed' });
  },

  async archiveBIA(id: string, _archivedBy: string): Promise<BusinessImpactAnalysis | null> {
    return BusinessContinuityService.updateBusinessImpactAnalysis(id, { status: 'archived' });
  },

  // ── Continuity Tests ──

  async createContinuityTest(organizationId: string, workspaceId: string, input: CreateContinuityTestInput, createdBy: string): Promise<ContinuityTest> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      planId: input.planId ?? null,
      testDate: input.testDate ?? null,
      duration: input.duration ?? 0,
      participants: input.participants ?? 0,
      results: input.results ?? '',
      gaps: input.gaps ?? '',
      recommendations: input.recommendations ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'continuity_test',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['continuity_test', content.type, content.status]),
        createdBy,
      },
    });
    return toContinuityTest(row as MemoryRow);
  },

  async getContinuityTest(id: string): Promise<ContinuityTest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'continuity_test') return null;
    return toContinuityTest(row as MemoryRow);
  },

  async listContinuityTests(organizationId: string, opts: ListContinuityTestsOpts = {}): Promise<ContinuityTest[]> {
    const where: Record<string, unknown> = { organizationId, type: 'continuity_test' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContinuityTest);
  },

  async updateContinuityTest(id: string, input: UpdateContinuityTestInput): Promise<ContinuityTest | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.testDate !== undefined && { testDate: input.testDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.gaps !== undefined && { gaps: input.gaps }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['continuity_test', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContinuityTest(row as MemoryRow);
  },

  async deleteContinuityTest(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleContinuityTest(id: string, _scheduledBy: string): Promise<ContinuityTest | null> {
    return BusinessContinuityService.updateContinuityTest(id, { status: 'scheduled' });
  },

  async startContinuityTest(id: string, _startedBy: string): Promise<ContinuityTest | null> {
    return BusinessContinuityService.updateContinuityTest(id, { status: 'in_progress' });
  },

  async completeContinuityTest(id: string, _completedBy: string): Promise<ContinuityTest | null> {
    return BusinessContinuityService.updateContinuityTest(id, { status: 'completed', testDate: new Date().toISOString() });
  },

  async failContinuityTest(id: string, _failedBy: string): Promise<ContinuityTest | null> {
    return BusinessContinuityService.updateContinuityTest(id, { status: 'failed' });
  },

  async cancelContinuityTest(id: string, _cancelledBy: string): Promise<ContinuityTest | null> {
    return BusinessContinuityService.updateContinuityTest(id, { status: 'cancelled' });
  },

  // ── Metrics & Stats ──

  async getBusinessContinuityMetrics(organizationId: string): Promise<BusinessContinuityMetrics> {
    const [plans, strategies, bias, tests] = await Promise.all([
      BusinessContinuityService.listContinuityPlans(organizationId),
      BusinessContinuityService.listRecoveryStrategies(organizationId),
      BusinessContinuityService.listBusinessImpactAnalyses(organizationId),
      BusinessContinuityService.listContinuityTests(organizationId),
    ]);
    return {
      activePlans: plans.filter((p) => p.status === 'active').length,
      implementedStrategies: strategies.filter((s) => s.status === 'implemented').length,
      completedBIAs: bias.filter((b) => b.status === 'completed').length,
      scheduledTests: tests.filter((t) => t.status === 'scheduled').length,
      completedTests: tests.filter((t) => t.status === 'completed').length,
    };
  },

  async getBusinessContinuityStats(organizationId: string): Promise<BusinessContinuityStats> {
    const [plans, strategies, bias, tests] = await Promise.all([
      BusinessContinuityService.listContinuityPlans(organizationId),
      BusinessContinuityService.listRecoveryStrategies(organizationId),
      BusinessContinuityService.listBusinessImpactAnalyses(organizationId),
      BusinessContinuityService.listContinuityTests(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byStrategyType: Record<string, number> = {};
    const byStrategyStatus: Record<string, number> = {};
    const byBIAType: Record<string, number> = {};
    const byBIAStatus: Record<string, number> = {};
    const byTestType: Record<string, number> = {};
    const byTestStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const s of strategies) { byStrategyType[s.type] = (byStrategyType[s.type] ?? 0) + 1; byStrategyStatus[s.status] = (byStrategyStatus[s.status] ?? 0) + 1; }
    for (const b of bias) { byBIAType[b.type] = (byBIAType[b.type] ?? 0) + 1; byBIAStatus[b.status] = (byBIAStatus[b.status] ?? 0) + 1; }
    for (const t of tests) { byTestType[t.type] = (byTestType[t.type] ?? 0) + 1; byTestStatus[t.status] = (byTestStatus[t.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      strategyCount: strategies.length,
      biaCount: bias.length,
      testCount: tests.length,
      byPlanType, byPlanStatus, byStrategyType, byStrategyStatus, byBIAType, byBIAStatus, byTestType, byTestStatus,
    };
  },
};
