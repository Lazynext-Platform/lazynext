import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RecoveryPlanType = 'it_system' | 'data_center' | 'cloud' | 'network' | 'application' | 'database' | 'facility' | 'full_infrastructure';
export type RecoveryPlanStatus = 'draft' | 'approved' | 'active' | 'tested' | 'deprecated' | 'archived';
export type BackupStrategyType = 'full' | 'incremental' | 'differential' | 'snapshot' | 'mirror' | 'replication' | 'archive' | 'continuous';
export type BackupStrategyStatus = 'active' | 'paused' | 'failed' | 'deprecated';
export type RecoveryTestType = 'tabletop' | 'simulation' | 'full_failover' | 'partial_failover' | 'data_restore' | 'system_restore' | 'network_failover';
export type RecoveryTestStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type RecoverySiteType = 'primary' | 'secondary' | 'hot_site' | 'warm_site' | 'cold_site' | 'cloud' | 'colocation' | 'mobile';
export type RecoverySiteStatus = 'active' | 'standby' | 'testing' | 'failed' | 'decommissioned';

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

export interface RecoveryPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecoveryPlanType;
  description: string;
  status: RecoveryPlanStatus;
  scope: string;
  owner: string;
  rto: string;
  rpo: string;
  priority: string;
  lastTested: Date | null;
  nextTest: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupStrategy {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: BackupStrategyType;
  description: string;
  status: BackupStrategyStatus;
  systemId: string | null;
  frequency: string;
  retention: string;
  storage: string;
  encryption: string;
  lastBackup: Date | null;
  nextBackup: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecoveryTest {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecoveryTestType;
  description: string;
  status: RecoveryTestStatus;
  planId: string | null;
  testDate: Date | null;
  duration: number;
  scope: string;
  results: string;
  issues: string;
  improvements: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecoverySite {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecoverySiteType;
  description: string;
  status: RecoverySiteStatus;
  location: string;
  capacity: string;
  systems: string;
  rto: string;
  rpo: string;
  lastTested: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisasterRecoveryMetrics {
  activePlans: number;
  activeBackups: number;
  scheduledTests: number;
  activeSites: number;
  completedTests: number;
}

export interface DisasterRecoveryStats {
  planCount: number;
  backupCount: number;
  testCount: number;
  siteCount: number;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byBackupType: Record<string, number>;
  byBackupStatus: Record<string, number>;
  byTestType: Record<string, number>;
  byTestStatus: Record<string, number>;
  bySiteType: Record<string, number>;
  bySiteStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateRecoveryPlanInput {
  name: string;
  type: RecoveryPlanType;
  description?: string;
  status?: RecoveryPlanStatus;
  scope?: string;
  owner?: string;
  rto?: string;
  rpo?: string;
  priority?: string;
  lastTested?: string;
  nextTest?: string;
  notes?: string;
}

export interface UpdateRecoveryPlanInput {
  name?: string;
  type?: RecoveryPlanType;
  description?: string;
  status?: RecoveryPlanStatus;
  scope?: string;
  owner?: string;
  rto?: string;
  rpo?: string;
  priority?: string;
  lastTested?: string;
  nextTest?: string;
  notes?: string;
}

export interface ListRecoveryPlansOpts {
  type?: RecoveryPlanType;
  status?: RecoveryPlanStatus;
}

export interface CreateBackupStrategyInput {
  name: string;
  type: BackupStrategyType;
  description?: string;
  status?: BackupStrategyStatus;
  systemId?: string;
  frequency?: string;
  retention?: string;
  storage?: string;
  encryption?: string;
  lastBackup?: string;
  nextBackup?: string;
  notes?: string;
}

export interface UpdateBackupStrategyInput {
  name?: string;
  type?: BackupStrategyType;
  description?: string;
  status?: BackupStrategyStatus;
  systemId?: string;
  frequency?: string;
  retention?: string;
  storage?: string;
  encryption?: string;
  lastBackup?: string;
  nextBackup?: string;
  notes?: string;
}

export interface ListBackupStrategiesOpts {
  type?: BackupStrategyType;
  status?: BackupStrategyStatus;
  systemId?: string;
}

export interface CreateRecoveryTestInput {
  name: string;
  type: RecoveryTestType;
  description?: string;
  status?: RecoveryTestStatus;
  planId?: string;
  testDate?: string;
  duration?: number;
  scope?: string;
  results?: string;
  issues?: string;
  improvements?: string;
  notes?: string;
}

export interface UpdateRecoveryTestInput {
  name?: string;
  type?: RecoveryTestType;
  description?: string;
  status?: RecoveryTestStatus;
  planId?: string;
  testDate?: string;
  duration?: number;
  scope?: string;
  results?: string;
  issues?: string;
  improvements?: string;
  notes?: string;
}

export interface ListRecoveryTestsOpts {
  type?: RecoveryTestType;
  status?: RecoveryTestStatus;
  planId?: string;
}

export interface CreateRecoverySiteInput {
  name: string;
  type: RecoverySiteType;
  description?: string;
  status?: RecoverySiteStatus;
  location?: string;
  capacity?: string;
  systems?: string;
  rto?: string;
  rpo?: string;
  lastTested?: string;
  notes?: string;
}

export interface UpdateRecoverySiteInput {
  name?: string;
  type?: RecoverySiteType;
  description?: string;
  status?: RecoverySiteStatus;
  location?: string;
  capacity?: string;
  systems?: string;
  rto?: string;
  rpo?: string;
  lastTested?: string;
  notes?: string;
}

export interface ListRecoverySitesOpts {
  type?: RecoverySiteType;
  status?: RecoverySiteStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toRecoveryPlan(row: MemoryRow): RecoveryPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecoveryPlanType) ?? 'it_system',
    description: (c.description as string) ?? '',
    status: (c.status as RecoveryPlanStatus) ?? 'draft',
    scope: (c.scope as string) ?? '',
    owner: (c.owner as string) ?? '',
    rto: (c.rto as string) ?? '',
    rpo: (c.rpo as string) ?? '',
    priority: (c.priority as string) ?? '',
    lastTested: c.lastTested ? new Date(c.lastTested as string) : null,
    nextTest: c.nextTest ? new Date(c.nextTest as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBackupStrategy(row: MemoryRow): BackupStrategy {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as BackupStrategyType) ?? 'full',
    description: (c.description as string) ?? '',
    status: (c.status as BackupStrategyStatus) ?? 'active',
    systemId: (c.systemId as string) ?? null,
    frequency: (c.frequency as string) ?? '',
    retention: (c.retention as string) ?? '',
    storage: (c.storage as string) ?? '',
    encryption: (c.encryption as string) ?? '',
    lastBackup: c.lastBackup ? new Date(c.lastBackup as string) : null,
    nextBackup: c.nextBackup ? new Date(c.nextBackup as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecoveryTest(row: MemoryRow): RecoveryTest {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecoveryTestType) ?? 'tabletop',
    description: (c.description as string) ?? '',
    status: (c.status as RecoveryTestStatus) ?? 'scheduled',
    planId: (c.planId as string) ?? null,
    testDate: c.testDate ? new Date(c.testDate as string) : null,
    duration: (c.duration as number) ?? 0,
    scope: (c.scope as string) ?? '',
    results: (c.results as string) ?? '',
    issues: (c.issues as string) ?? '',
    improvements: (c.improvements as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecoverySite(row: MemoryRow): RecoverySite {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecoverySiteType) ?? 'primary',
    description: (c.description as string) ?? '',
    status: (c.status as RecoverySiteStatus) ?? 'active',
    location: (c.location as string) ?? '',
    capacity: (c.capacity as string) ?? '',
    systems: (c.systems as string) ?? '',
    rto: (c.rto as string) ?? '',
    rpo: (c.rpo as string) ?? '',
    lastTested: c.lastTested ? new Date(c.lastTested as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const DisasterRecoveryService = {
  // ── Recovery Plans ──

  async createRecoveryPlan(organizationId: string, workspaceId: string, input: CreateRecoveryPlanInput, createdBy: string): Promise<RecoveryPlan> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      scope: input.scope ?? '',
      owner: input.owner ?? '',
      rto: input.rto ?? '',
      rpo: input.rpo ?? '',
      priority: input.priority ?? '',
      lastTested: input.lastTested ?? null,
      nextTest: input.nextTest ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recovery_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recovery_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toRecoveryPlan(row as MemoryRow);
  },

  async getRecoveryPlan(id: string): Promise<RecoveryPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recovery_plan') return null;
    return toRecoveryPlan(row as MemoryRow);
  },

  async listRecoveryPlans(organizationId: string, opts: ListRecoveryPlansOpts = {}): Promise<RecoveryPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recovery_plan' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecoveryPlan);
  },

  async updateRecoveryPlan(id: string, input: UpdateRecoveryPlanInput): Promise<RecoveryPlan | null> {
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
      ...(input.rto !== undefined && { rto: input.rto }),
      ...(input.rpo !== undefined && { rpo: input.rpo }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.lastTested !== undefined && { lastTested: input.lastTested }),
      ...(input.nextTest !== undefined && { nextTest: input.nextTest }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recovery_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecoveryPlan(row as MemoryRow);
  },

  async deleteRecoveryPlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveRecoveryPlan(id: string, _approvedBy: string): Promise<RecoveryPlan | null> {
    return DisasterRecoveryService.updateRecoveryPlan(id, { status: 'approved' });
  },

  async activateRecoveryPlan(id: string, _activatedBy: string): Promise<RecoveryPlan | null> {
    return DisasterRecoveryService.updateRecoveryPlan(id, { status: 'active' });
  },

  async testRecoveryPlan(id: string, _testedBy: string): Promise<RecoveryPlan | null> {
    return DisasterRecoveryService.updateRecoveryPlan(id, { status: 'tested', lastTested: new Date().toISOString() });
  },

  async deprecateRecoveryPlan(id: string, _deprecatedBy: string): Promise<RecoveryPlan | null> {
    return DisasterRecoveryService.updateRecoveryPlan(id, { status: 'deprecated' });
  },

  async archiveRecoveryPlan(id: string, _archivedBy: string): Promise<RecoveryPlan | null> {
    return DisasterRecoveryService.updateRecoveryPlan(id, { status: 'archived' });
  },

  // ── Backup Strategies ──

  async createBackupStrategy(organizationId: string, workspaceId: string, input: CreateBackupStrategyInput, createdBy: string): Promise<BackupStrategy> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      systemId: input.systemId ?? null,
      frequency: input.frequency ?? '',
      retention: input.retention ?? '',
      storage: input.storage ?? '',
      encryption: input.encryption ?? '',
      lastBackup: input.lastBackup ?? null,
      nextBackup: input.nextBackup ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'backup_strategy',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.systemId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['backup_strategy', content.type, content.status]),
        createdBy,
      },
    });
    return toBackupStrategy(row as MemoryRow);
  },

  async getBackupStrategy(id: string): Promise<BackupStrategy | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'backup_strategy') return null;
    return toBackupStrategy(row as MemoryRow);
  },

  async listBackupStrategies(organizationId: string, opts: ListBackupStrategiesOpts = {}): Promise<BackupStrategy[]> {
    const where: Record<string, unknown> = { organizationId, type: 'backup_strategy' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.systemId) conditions.push({ content: { contains: `"systemId":"${opts.systemId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBackupStrategy);
  },

  async updateBackupStrategy(id: string, input: UpdateBackupStrategyInput): Promise<BackupStrategy | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.systemId !== undefined && { systemId: input.systemId }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.retention !== undefined && { retention: input.retention }),
      ...(input.storage !== undefined && { storage: input.storage }),
      ...(input.encryption !== undefined && { encryption: input.encryption }),
      ...(input.lastBackup !== undefined && { lastBackup: input.lastBackup }),
      ...(input.nextBackup !== undefined && { nextBackup: input.nextBackup }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['backup_strategy', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBackupStrategy(row as MemoryRow);
  },

  async deleteBackupStrategy(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateBackupStrategy(id: string, _activatedBy: string): Promise<BackupStrategy | null> {
    return DisasterRecoveryService.updateBackupStrategy(id, { status: 'active' });
  },

  async pauseBackupStrategy(id: string, _pausedBy: string): Promise<BackupStrategy | null> {
    return DisasterRecoveryService.updateBackupStrategy(id, { status: 'paused' });
  },

  async failBackupStrategy(id: string, _failedBy: string): Promise<BackupStrategy | null> {
    return DisasterRecoveryService.updateBackupStrategy(id, { status: 'failed' });
  },

  async deprecateBackupStrategy(id: string, _deprecatedBy: string): Promise<BackupStrategy | null> {
    return DisasterRecoveryService.updateBackupStrategy(id, { status: 'deprecated' });
  },

  // ── Recovery Tests ──

  async createRecoveryTest(organizationId: string, workspaceId: string, input: CreateRecoveryTestInput, createdBy: string): Promise<RecoveryTest> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'scheduled',
      planId: input.planId ?? null,
      testDate: input.testDate ?? null,
      duration: input.duration ?? 0,
      scope: input.scope ?? '',
      results: input.results ?? '',
      issues: input.issues ?? '',
      improvements: input.improvements ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recovery_test',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recovery_test', content.type, content.status]),
        createdBy,
      },
    });
    return toRecoveryTest(row as MemoryRow);
  },

  async getRecoveryTest(id: string): Promise<RecoveryTest | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recovery_test') return null;
    return toRecoveryTest(row as MemoryRow);
  },

  async listRecoveryTests(organizationId: string, opts: ListRecoveryTestsOpts = {}): Promise<RecoveryTest[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recovery_test' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecoveryTest);
  },

  async updateRecoveryTest(id: string, input: UpdateRecoveryTestInput): Promise<RecoveryTest | null> {
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
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.results !== undefined && { results: input.results }),
      ...(input.issues !== undefined && { issues: input.issues }),
      ...(input.improvements !== undefined && { improvements: input.improvements }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recovery_test', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecoveryTest(row as MemoryRow);
  },

  async deleteRecoveryTest(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async scheduleRecoveryTest(id: string, _scheduledBy: string): Promise<RecoveryTest | null> {
    return DisasterRecoveryService.updateRecoveryTest(id, { status: 'scheduled' });
  },

  async startRecoveryTest(id: string, _startedBy: string): Promise<RecoveryTest | null> {
    return DisasterRecoveryService.updateRecoveryTest(id, { status: 'in_progress' });
  },

  async completeRecoveryTest(id: string, _completedBy: string): Promise<RecoveryTest | null> {
    return DisasterRecoveryService.updateRecoveryTest(id, { status: 'completed', testDate: new Date().toISOString() });
  },

  async failRecoveryTest(id: string, _failedBy: string): Promise<RecoveryTest | null> {
    return DisasterRecoveryService.updateRecoveryTest(id, { status: 'failed' });
  },

  async cancelRecoveryTest(id: string, _cancelledBy: string): Promise<RecoveryTest | null> {
    return DisasterRecoveryService.updateRecoveryTest(id, { status: 'cancelled' });
  },

  // ── Recovery Sites ──

  async createRecoverySite(organizationId: string, workspaceId: string, input: CreateRecoverySiteInput, createdBy: string): Promise<RecoverySite> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      capacity: input.capacity ?? '',
      systems: input.systems ?? '',
      rto: input.rto ?? '',
      rpo: input.rpo ?? '',
      lastTested: input.lastTested ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recovery_site',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recovery_site', content.type, content.status]),
        createdBy,
      },
    });
    return toRecoverySite(row as MemoryRow);
  },

  async getRecoverySite(id: string): Promise<RecoverySite | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recovery_site') return null;
    return toRecoverySite(row as MemoryRow);
  },

  async listRecoverySites(organizationId: string, opts: ListRecoverySitesOpts = {}): Promise<RecoverySite[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recovery_site' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecoverySite);
  },

  async updateRecoverySite(id: string, input: UpdateRecoverySiteInput): Promise<RecoverySite | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.systems !== undefined && { systems: input.systems }),
      ...(input.rto !== undefined && { rto: input.rto }),
      ...(input.rpo !== undefined && { rpo: input.rpo }),
      ...(input.lastTested !== undefined && { lastTested: input.lastTested }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recovery_site', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecoverySite(row as MemoryRow);
  },

  async deleteRecoverySite(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRecoverySite(id: string, _activatedBy: string): Promise<RecoverySite | null> {
    return DisasterRecoveryService.updateRecoverySite(id, { status: 'active' });
  },

  async standbyRecoverySite(id: string, _standbyBy: string): Promise<RecoverySite | null> {
    return DisasterRecoveryService.updateRecoverySite(id, { status: 'standby' });
  },

  async testRecoverySite(id: string, _testedBy: string): Promise<RecoverySite | null> {
    return DisasterRecoveryService.updateRecoverySite(id, { status: 'testing', lastTested: new Date().toISOString() });
  },

  async failRecoverySite(id: string, _failedBy: string): Promise<RecoverySite | null> {
    return DisasterRecoveryService.updateRecoverySite(id, { status: 'failed' });
  },

  async decommissionRecoverySite(id: string, _decommissionedBy: string): Promise<RecoverySite | null> {
    return DisasterRecoveryService.updateRecoverySite(id, { status: 'decommissioned' });
  },

  // ── Metrics & Stats ──

  async getDisasterRecoveryMetrics(organizationId: string): Promise<DisasterRecoveryMetrics> {
    const [plans, backups, tests, sites] = await Promise.all([
      DisasterRecoveryService.listRecoveryPlans(organizationId),
      DisasterRecoveryService.listBackupStrategies(organizationId),
      DisasterRecoveryService.listRecoveryTests(organizationId),
      DisasterRecoveryService.listRecoverySites(organizationId),
    ]);
    return {
      activePlans: plans.filter((p) => p.status === 'active').length,
      activeBackups: backups.filter((b) => b.status === 'active').length,
      scheduledTests: tests.filter((t) => t.status === 'scheduled').length,
      activeSites: sites.filter((s) => s.status === 'active').length,
      completedTests: tests.filter((t) => t.status === 'completed').length,
    };
  },

  async getDisasterRecoveryStats(organizationId: string): Promise<DisasterRecoveryStats> {
    const [plans, backups, tests, sites] = await Promise.all([
      DisasterRecoveryService.listRecoveryPlans(organizationId),
      DisasterRecoveryService.listBackupStrategies(organizationId),
      DisasterRecoveryService.listRecoveryTests(organizationId),
      DisasterRecoveryService.listRecoverySites(organizationId),
    ]);
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byBackupType: Record<string, number> = {};
    const byBackupStatus: Record<string, number> = {};
    const byTestType: Record<string, number> = {};
    const byTestStatus: Record<string, number> = {};
    const bySiteType: Record<string, number> = {};
    const bySiteStatus: Record<string, number> = {};
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const b of backups) { byBackupType[b.type] = (byBackupType[b.type] ?? 0) + 1; byBackupStatus[b.status] = (byBackupStatus[b.status] ?? 0) + 1; }
    for (const t of tests) { byTestType[t.type] = (byTestType[t.type] ?? 0) + 1; byTestStatus[t.status] = (byTestStatus[t.status] ?? 0) + 1; }
    for (const s of sites) { bySiteType[s.type] = (bySiteType[s.type] ?? 0) + 1; bySiteStatus[s.status] = (bySiteStatus[s.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      backupCount: backups.length,
      testCount: tests.length,
      siteCount: sites.length,
      byPlanType, byPlanStatus, byBackupType, byBackupStatus, byTestType, byTestStatus, bySiteType, bySiteStatus,
    };
  },
};
