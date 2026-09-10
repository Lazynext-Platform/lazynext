import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AuditType = 'financial' | 'operational' | 'compliance' | 'it' | 'sox' | 'fraud' | 'performance' | 'follow_up';
export type AuditStatus = 'planned' | 'in_progress' | 'fieldwork' | 'reporting' | 'completed' | 'cancelled';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'in_progress' | 'remediated' | 'verified' | 'accepted_risk' | 'wont_fix';
export type RemediationStatus = 'not_started' | 'in_progress' | 'completed' | 'verified' | 'overdue';
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';

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

export interface AuditPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  auditType: AuditType;
  description: string;
  scope: string;
  objectives: string;
  leadAuditor: string;
  teamMembers: string[];
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  status: AuditStatus;
  riskRating: string;
  budget: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditFinding {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string | null;
  title: string;
  auditType: AuditType;
  severity: FindingSeverity;
  description: string;
  criteria: string;
  condition: string;
  cause: string;
  effect: string;
  recommendation: string;
  status: FindingStatus;
  identifiedDate: Date | null;
  identifiedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditSchedule {
  id: string;
  organizationId: string;
  workspaceId: string;
  planId: string;
  title: string;
  scheduledDate: Date;
  duration: number;
  location: string;
  participants: string[];
  status: ScheduleStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditRemediation {
  id: string;
  organizationId: string;
  workspaceId: string;
  findingId: string;
  action: string;
  description: string;
  owner: string;
  dueDate: Date | null;
  status: RemediationStatus;
  progress: number;
  completedDate: Date | null;
  verifiedBy: string;
  verifiedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalAuditMetrics {
  openFindings: number;
  criticalFindings: number;
  remediationRate: number;
  overdueRemediations: number;
  auditCoverage: number;
}

export interface InternalAuditStats {
  planCount: number;
  activePlanCount: number;
  findingCount: number;
  openFindingCount: number;
  scheduleCount: number;
  remediationCount: number;
  completedRemediationCount: number;
  byAuditType: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byFindingSeverity: Record<string, number>;
  byRemediationStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePlanInput {
  title: string;
  auditType: AuditType;
  description?: string;
  scope?: string;
  objectives?: string;
  leadAuditor?: string;
  teamMembers?: string[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  status?: AuditStatus;
  riskRating?: string;
  budget?: number;
  notes?: string;
}

export interface UpdatePlanInput {
  title?: string;
  auditType?: AuditType;
  description?: string;
  scope?: string;
  objectives?: string;
  leadAuditor?: string;
  teamMembers?: string[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  status?: AuditStatus;
  riskRating?: string;
  budget?: number;
  notes?: string;
}

export interface ListPlansOpts {
  auditType?: AuditType;
  status?: AuditStatus;
  leadAuditor?: string;
}

export interface CreateFindingInput {
  planId?: string;
  title: string;
  auditType: AuditType;
  severity: FindingSeverity;
  description?: string;
  criteria?: string;
  condition?: string;
  cause?: string;
  effect?: string;
  recommendation?: string;
  status?: FindingStatus;
  identifiedDate?: string;
  identifiedBy?: string;
}

export interface UpdateFindingInput {
  title?: string;
  auditType?: AuditType;
  severity?: FindingSeverity;
  description?: string;
  criteria?: string;
  condition?: string;
  cause?: string;
  effect?: string;
  recommendation?: string;
  status?: FindingStatus;
}

export interface ListFindingsOpts {
  planId?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  auditType?: AuditType;
}

export interface CreateScheduleInput {
  planId: string;
  title: string;
  scheduledDate: string;
  duration?: number;
  location?: string;
  participants?: string[];
  status?: ScheduleStatus;
  notes?: string;
}

export interface UpdateScheduleInput {
  title?: string;
  scheduledDate?: string;
  duration?: number;
  location?: string;
  participants?: string[];
  status?: ScheduleStatus;
  notes?: string;
}

export interface ListSchedulesOpts {
  planId?: string;
  status?: ScheduleStatus;
}

export interface CreateRemediationInput {
  findingId: string;
  action: string;
  description?: string;
  owner?: string;
  dueDate?: string;
  status?: RemediationStatus;
  progress?: number;
  completedDate?: string;
  verifiedBy?: string;
  verificationDate?: string;
  notes?: string;
}

export interface UpdateRemediationInput {
  action?: string;
  description?: string;
  owner?: string;
  dueDate?: string;
  status?: RemediationStatus;
  progress?: number;
  completedDate?: string;
  notes?: string;
}

export interface ListRemediationsOpts {
  findingId?: string;
  status?: RemediationStatus;
  owner?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPlan(row: MemoryRow): AuditPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    auditType: (c.auditType as AuditType) ?? 'operational',
    description: (c.description as string) ?? '',
    scope: (c.scope as string) ?? '',
    objectives: (c.objectives as string) ?? '',
    leadAuditor: (c.leadAuditor as string) ?? '',
    teamMembers: (c.teamMembers as string[]) ?? [],
    plannedStartDate: c.plannedStartDate ? new Date(c.plannedStartDate as string) : null,
    plannedEndDate: c.plannedEndDate ? new Date(c.plannedEndDate as string) : null,
    status: (c.status as AuditStatus) ?? 'planned',
    riskRating: (c.riskRating as string) ?? '',
    budget: (c.budget as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFinding(row: MemoryRow): AuditFinding {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? null,
    title: (c.title as string) ?? '',
    auditType: (c.auditType as AuditType) ?? 'operational',
    severity: (c.severity as FindingSeverity) ?? 'medium',
    description: (c.description as string) ?? '',
    criteria: (c.criteria as string) ?? '',
    condition: (c.condition as string) ?? '',
    cause: (c.cause as string) ?? '',
    effect: (c.effect as string) ?? '',
    recommendation: (c.recommendation as string) ?? '',
    status: (c.status as FindingStatus) ?? 'open',
    identifiedDate: c.identifiedDate ? new Date(c.identifiedDate as string) : null,
    identifiedBy: (c.identifiedBy as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSchedule(row: MemoryRow): AuditSchedule {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    planId: (c.planId as string) ?? '',
    title: (c.title as string) ?? '',
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : new Date(),
    duration: (c.duration as number) ?? 0,
    location: (c.location as string) ?? '',
    participants: (c.participants as string[]) ?? [],
    status: (c.status as ScheduleStatus) ?? 'scheduled',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRemediation(row: MemoryRow): AuditRemediation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    findingId: (c.findingId as string) ?? '',
    action: (c.action as string) ?? '',
    description: (c.description as string) ?? '',
    owner: (c.owner as string) ?? '',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    status: (c.status as RemediationStatus) ?? 'not_started',
    progress: (c.progress as number) ?? 0,
    completedDate: c.completedDate ? new Date(c.completedDate as string) : null,
    verifiedBy: (c.verifiedBy as string) ?? '',
    verifiedAt: c.verifiedAt ? new Date(c.verifiedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const InternalAuditService = {
  // ── Plans ──

  async createPlan(organizationId: string, workspaceId: string, input: CreatePlanInput, createdBy: string): Promise<AuditPlan> {
    const content = {
      title: input.title.trim(),
      auditType: input.auditType,
      description: input.description ?? '',
      scope: input.scope ?? '',
      objectives: input.objectives ?? '',
      leadAuditor: input.leadAuditor ?? '',
      teamMembers: input.teamMembers ?? [],
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      status: input.status ?? 'planned',
      riskRating: input.riskRating ?? '',
      budget: input.budget ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'audit_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_plan', content.auditType, content.status]),
        createdBy,
      },
    });
    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<AuditPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<AuditPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'audit_plan' };
    if (opts.auditType) where.AND = [{ content: { contains: `"auditType":"${opts.auditType}"` } }];
    if (opts.status) where.AND = [...(where.AND as unknown[] ?? []), { content: { contains: `"status":"${opts.status}"` } }];
    if (opts.leadAuditor) where.AND = [...(where.AND as unknown[] ?? []), { content: { contains: `"leadAuditor":"${opts.leadAuditor}"` } }];
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<AuditPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.auditType !== undefined && { auditType: input.auditType }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.objectives !== undefined && { objectives: input.objectives }),
      ...(input.leadAuditor !== undefined && { leadAuditor: input.leadAuditor }),
      ...(input.teamMembers !== undefined && { teamMembers: input.teamMembers }),
      ...(input.plannedStartDate !== undefined && { plannedStartDate: input.plannedStartDate }),
      ...(input.plannedEndDate !== undefined && { plannedEndDate: input.plannedEndDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.riskRating !== undefined && { riskRating: input.riskRating }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['audit_plan', content.auditType, content.status]) },
    }), null);
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startPlan(id: string, _startedBy: string): Promise<AuditPlan | null> {
    return InternalAuditService.updatePlan(id, { status: 'in_progress' });
  },

  async completePlan(id: string, _completedBy: string): Promise<AuditPlan | null> {
    return InternalAuditService.updatePlan(id, { status: 'completed' });
  },

  // ── Findings ──

  async createFinding(organizationId: string, workspaceId: string, input: CreateFindingInput, createdBy: string): Promise<AuditFinding> {
    const content = {
      planId: input.planId ?? null,
      title: input.title.trim(),
      auditType: input.auditType,
      severity: input.severity,
      description: input.description ?? '',
      criteria: input.criteria ?? '',
      condition: input.condition ?? '',
      cause: input.cause ?? '',
      effect: input.effect ?? '',
      recommendation: input.recommendation ?? '',
      status: input.status ?? 'open',
      identifiedDate: input.identifiedDate ?? null,
      identifiedBy: input.identifiedBy ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'audit_finding',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_finding', content.auditType, content.severity, content.status]),
        createdBy,
      },
    });
    return toFinding(row as MemoryRow);
  },

  async getFinding(id: string): Promise<AuditFinding | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_finding') return null;
    return toFinding(row as MemoryRow);
  },

  async listFindings(organizationId: string, opts: ListFindingsOpts = {}): Promise<AuditFinding[]> {
    const where: Record<string, unknown> = { organizationId, type: 'audit_finding' };
    const conditions: unknown[] = [];
    if (opts.severity) conditions.push({ content: { contains: `"severity":"${opts.severity}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.auditType) conditions.push({ content: { contains: `"auditType":"${opts.auditType}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toFinding);
  },

  async updateFinding(id: string, input: UpdateFindingInput): Promise<AuditFinding | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.auditType !== undefined && { auditType: input.auditType }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.criteria !== undefined && { criteria: input.criteria }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.cause !== undefined && { cause: input.cause }),
      ...(input.effect !== undefined && { effect: input.effect }),
      ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
      ...(input.status !== undefined && { status: input.status }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['audit_finding', content.auditType, content.severity, content.status]) },
    }), null);
    if (!row) return null;
    return toFinding(row as MemoryRow);
  },

  async remediateFinding(id: string, _remediatedBy: string): Promise<AuditFinding | null> {
    return InternalAuditService.updateFinding(id, { status: 'remediated' });
  },

  async verifyFinding(id: string, verifiedBy: string): Promise<AuditFinding | null> {
    const f = await InternalAuditService.updateFinding(id, { status: 'verified' });
    if (!f) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy, verifiedAt: new Date() } }), null);
    return f;
  },

  async acceptRiskFinding(id: string, _reason: string, _acceptedBy: string): Promise<AuditFinding | null> {
    return InternalAuditService.updateFinding(id, { status: 'accepted_risk' });
  },

  // ── Schedules ──

  async createSchedule(organizationId: string, workspaceId: string, input: CreateScheduleInput, createdBy: string): Promise<AuditSchedule> {
    const content = {
      planId: input.planId,
      title: input.title.trim(),
      scheduledDate: input.scheduledDate,
      duration: input.duration ?? 0,
      location: input.location ?? '',
      participants: input.participants ?? [],
      status: input.status ?? 'scheduled',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'audit_schedule',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.planId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_schedule', content.status]),
        createdBy,
      },
    });
    return toSchedule(row as MemoryRow);
  },

  async getSchedule(id: string): Promise<AuditSchedule | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_schedule') return null;
    return toSchedule(row as MemoryRow);
  },

  async listSchedules(organizationId: string, opts: ListSchedulesOpts = {}): Promise<AuditSchedule[]> {
    const where: Record<string, unknown> = { organizationId, type: 'audit_schedule' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.planId) conditions.push({ content: { contains: `"planId":"${opts.planId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSchedule);
  },

  async updateSchedule(id: string, input: UpdateScheduleInput): Promise<AuditSchedule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['audit_schedule', content.status]) },
    }), null);
    if (!row) return null;
    return toSchedule(row as MemoryRow);
  },

  async completeSchedule(id: string, _completedBy: string): Promise<AuditSchedule | null> {
    return InternalAuditService.updateSchedule(id, { status: 'completed' });
  },

  async postponeSchedule(id: string, newDate: string, _postponedBy: string): Promise<AuditSchedule | null> {
    return InternalAuditService.updateSchedule(id, { status: 'postponed', scheduledDate: newDate });
  },

  // ── Remediations ──

  async createRemediation(organizationId: string, workspaceId: string, input: CreateRemediationInput, createdBy: string): Promise<AuditRemediation> {
    const content = {
      findingId: input.findingId,
      action: input.action.trim(),
      description: input.description ?? '',
      owner: input.owner ?? '',
      dueDate: input.dueDate ?? null,
      status: input.status ?? 'not_started',
      progress: input.progress ?? 0,
      completedDate: input.completedDate ?? null,
      verifiedBy: input.verifiedBy ?? '',
      verifiedAt: input.verificationDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'audit_remediation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.findingId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['audit_remediation', content.status]),
        createdBy,
      },
    });
    return toRemediation(row as MemoryRow);
  },

  async getRemediation(id: string): Promise<AuditRemediation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'audit_remediation') return null;
    return toRemediation(row as MemoryRow);
  },

  async listRemediations(organizationId: string, opts: ListRemediationsOpts = {}): Promise<AuditRemediation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'audit_remediation' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.findingId) conditions.push({ content: { contains: `"findingId":"${opts.findingId}"` } });
    if (opts.owner) conditions.push({ content: { contains: `"owner":"${opts.owner}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRemediation);
  },

  async updateRemediation(id: string, input: UpdateRemediationInput): Promise<AuditRemediation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.action !== undefined && { action: input.action.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.completedDate !== undefined && { completedDate: input.completedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['audit_remediation', content.status]) },
    }), null);
    if (!row) return null;
    return toRemediation(row as MemoryRow);
  },

  async startRemediation(id: string, _startedBy: string): Promise<AuditRemediation | null> {
    return InternalAuditService.updateRemediation(id, { status: 'in_progress' });
  },

  async completeRemediation(id: string, _completedBy: string): Promise<AuditRemediation | null> {
    return InternalAuditService.updateRemediation(id, { status: 'completed', progress: 100, completedDate: new Date().toISOString() });
  },

  async verifyRemediation(id: string, verifiedBy: string): Promise<AuditRemediation | null> {
    const r = await InternalAuditService.updateRemediation(id, { status: 'verified' });
    if (!r) return null;
    await safePrisma(() => prisma.memory.update({ where: { id }, data: { verifiedBy, verifiedAt: new Date() } }), null);
    return r;
  },

  // ── Metrics & Stats ──

  async getInternalAuditMetrics(organizationId: string): Promise<InternalAuditMetrics> {
    const findings = await InternalAuditService.listFindings(organizationId);
    const remediations = await InternalAuditService.listRemediations(organizationId);
    const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'in_progress').length;
    const criticalFindings = findings.filter((f) => f.severity === 'critical' && f.status !== 'verified' && f.status !== 'accepted_risk').length;
    const completedRemediations = remediations.filter((r) => r.status === 'completed' || r.status === 'verified').length;
    const remediationRate = remediations.length > 0 ? Math.round((completedRemediations / remediations.length) * 100) : 0;
    const overdueRemediations = remediations.filter((r) => r.dueDate && r.dueDate < new Date() && r.status !== 'completed' && r.status !== 'verified').length;
    return { openFindings, criticalFindings, remediationRate, overdueRemediations, auditCoverage: 0 };
  },

  async getInternalAuditStats(organizationId: string): Promise<InternalAuditStats> {
    const [plans, findings, schedules, remediations] = await Promise.all([
      InternalAuditService.listPlans(organizationId),
      InternalAuditService.listFindings(organizationId),
      InternalAuditService.listSchedules(organizationId),
      InternalAuditService.listRemediations(organizationId),
    ]);
    const byAuditType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byFindingSeverity: Record<string, number> = {};
    const byRemediationStatus: Record<string, number> = {};
    for (const p of plans) { byAuditType[p.auditType] = (byAuditType[p.auditType] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    for (const f of findings) { byFindingSeverity[f.severity] = (byFindingSeverity[f.severity] ?? 0) + 1; }
    for (const r of remediations) { byRemediationStatus[r.status] = (byRemediationStatus[r.status] ?? 0) + 1; }
    return {
      planCount: plans.length,
      activePlanCount: plans.filter((p) => p.status === 'in_progress' || p.status === 'fieldwork' || p.status === 'reporting').length,
      findingCount: findings.length,
      openFindingCount: findings.filter((f) => f.status === 'open' || f.status === 'in_progress').length,
      scheduleCount: schedules.length,
      remediationCount: remediations.length,
      completedRemediationCount: remediations.filter((r) => r.status === 'completed' || r.status === 'verified').length,
      byAuditType, byPlanStatus, byFindingSeverity, byRemediationStatus,
    };
  },
};
