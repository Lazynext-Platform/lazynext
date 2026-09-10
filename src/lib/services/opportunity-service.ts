import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type OpportunityType = 'growth' | 'efficiency' | 'cost_saving' | 'revenue' | 'market' | 'product' | 'partnership' | 'acquisition' | 'talent' | 'innovation' | 'risk_mitigation' | 'process' | 'customer' | 'competitive';
export type OpportunityStatus = 'detected' | 'evaluating' | 'approved' | 'rejected' | 'pursuing' | 'realized' | 'archived';
export type DetectionRuleType = 'threshold' | 'pattern' | 'anomaly' | 'trend' | 'comparison' | 'schedule' | 'event' | 'metric' | 'ml' | 'manual';
export type DetectionRuleStatus = 'draft' | 'active' | 'paused' | 'deprecated' | 'archived';
export type OpportunityScoreType = 'impact_effort' | 'roi' | 'risk_reward' | 'strategic' | 'urgency' | 'composite' | 'custom';
export type OpportunityScoreStatus = 'calculated' | 'reviewed' | 'adjusted' | 'archived';
export type OpportunityActionType = 'investigate' | 'validate' | 'plan' | 'execute' | 'monitor' | 'report' | 'escalate' | 'delegate';
export type OpportunityActionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

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

export interface Opportunity {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: OpportunityType;
  description: string;
  status: OpportunityStatus;
  source: string;
  confidence: number;
  impact: number;
  effort: number;
  score: number;
  category: string;
  detectedBy: string;
  detectedAt: Date | null;
  evaluatedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetectionRule {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: DetectionRuleType;
  description: string;
  status: DetectionRuleStatus;
  rule: string;
  conditions: string;
  actions: string;
  schedule: string;
  lastTriggered: Date | null;
  triggerCount: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityScore {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: OpportunityScoreType;
  description: string;
  status: OpportunityScoreStatus;
  opportunityId: string | null;
  criteria: string;
  weights: string;
  scores: string;
  total: number;
  calculatedAt: Date | null;
  calculatedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityAction {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: OpportunityActionType;
  description: string;
  status: OpportunityActionStatus;
  opportunityId: string | null;
  action: string;
  assignee: string;
  dueDate: Date | null;
  priority: string;
  result: string;
  completedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityDetectionMetrics {
  detectedOpportunities: number;
  approvedOpportunities: number;
  pursuingOpportunities: number;
  realizedOpportunities: number;
  activeRules: number;
}

export interface OpportunityDetectionStats {
  opportunityCount: number;
  ruleCount: number;
  scoreCount: number;
  actionCount: number;
  byOpportunityType: Record<string, number>;
  byOpportunityStatus: Record<string, number>;
  byRuleType: Record<string, number>;
  byRuleStatus: Record<string, number>;
  byScoreType: Record<string, number>;
  byScoreStatus: Record<string, number>;
  byActionType: Record<string, number>;
  byActionStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateOpportunityInput {
  name: string;
  type: OpportunityType;
  description?: string;
  status?: OpportunityStatus;
  source?: string;
  confidence?: number;
  impact?: number;
  effort?: number;
  score?: number;
  category?: string;
  detectedBy?: string;
  detectedAt?: string;
  evaluatedAt?: string;
  notes?: string;
}

export interface UpdateOpportunityInput {
  name?: string;
  type?: OpportunityType;
  description?: string;
  status?: OpportunityStatus;
  source?: string;
  confidence?: number;
  impact?: number;
  effort?: number;
  score?: number;
  category?: string;
  detectedBy?: string;
  detectedAt?: string;
  evaluatedAt?: string;
  notes?: string;
}

export interface ListOpportunitiesOpts {
  type?: OpportunityType;
  status?: OpportunityStatus;
}

export interface CreateDetectionRuleInput {
  name: string;
  type: DetectionRuleType;
  description?: string;
  status?: DetectionRuleStatus;
  rule?: string;
  conditions?: string;
  actions?: string;
  schedule?: string;
  lastTriggered?: string;
  triggerCount?: number;
  notes?: string;
}

export interface UpdateDetectionRuleInput {
  name?: string;
  type?: DetectionRuleType;
  description?: string;
  status?: DetectionRuleStatus;
  rule?: string;
  conditions?: string;
  actions?: string;
  schedule?: string;
  lastTriggered?: string;
  triggerCount?: number;
  notes?: string;
}

export interface ListDetectionRulesOpts {
  type?: DetectionRuleType;
  status?: DetectionRuleStatus;
}

export interface CreateOpportunityScoreInput {
  name: string;
  type: OpportunityScoreType;
  description?: string;
  status?: OpportunityScoreStatus;
  opportunityId?: string;
  criteria?: string;
  weights?: string;
  scores?: string;
  total?: number;
  calculatedAt?: string;
  calculatedBy?: string;
  notes?: string;
}

export interface UpdateOpportunityScoreInput {
  name?: string;
  type?: OpportunityScoreType;
  description?: string;
  status?: OpportunityScoreStatus;
  opportunityId?: string;
  criteria?: string;
  weights?: string;
  scores?: string;
  total?: number;
  calculatedAt?: string;
  calculatedBy?: string;
  notes?: string;
}

export interface ListOpportunityScoresOpts {
  opportunityId?: string;
  type?: OpportunityScoreType;
  status?: OpportunityScoreStatus;
}

export interface CreateOpportunityActionInput {
  name: string;
  type: OpportunityActionType;
  description?: string;
  status?: OpportunityActionStatus;
  opportunityId?: string;
  action?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
  result?: string;
  completedAt?: string;
  notes?: string;
}

export interface UpdateOpportunityActionInput {
  name?: string;
  type?: OpportunityActionType;
  description?: string;
  status?: OpportunityActionStatus;
  opportunityId?: string;
  action?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
  result?: string;
  completedAt?: string;
  notes?: string;
}

export interface ListOpportunityActionsOpts {
  opportunityId?: string;
  type?: OpportunityActionType;
  status?: OpportunityActionStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toOpportunity(row: MemoryRow): Opportunity {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as OpportunityType) ?? 'growth',
    description: (c.description as string) ?? '',
    status: (c.status as OpportunityStatus) ?? 'detected',
    source: (c.source as string) ?? '',
    confidence: (c.confidence as number) ?? 0,
    impact: (c.impact as number) ?? 0,
    effort: (c.effort as number) ?? 0,
    score: (c.score as number) ?? 0,
    category: (c.category as string) ?? '',
    detectedBy: (c.detectedBy as string) ?? '',
    detectedAt: c.detectedAt ? new Date(c.detectedAt as string) : null,
    evaluatedAt: c.evaluatedAt ? new Date(c.evaluatedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDetectionRule(row: MemoryRow): DetectionRule {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as DetectionRuleType) ?? 'threshold',
    description: (c.description as string) ?? '',
    status: (c.status as DetectionRuleStatus) ?? 'draft',
    rule: (c.rule as string) ?? '',
    conditions: (c.conditions as string) ?? '',
    actions: (c.actions as string) ?? '',
    schedule: (c.schedule as string) ?? '',
    lastTriggered: c.lastTriggered ? new Date(c.lastTriggered as string) : null,
    triggerCount: (c.triggerCount as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toOpportunityScore(row: MemoryRow): OpportunityScore {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as OpportunityScoreType) ?? 'impact_effort',
    description: (c.description as string) ?? '',
    status: (c.status as OpportunityScoreStatus) ?? 'calculated',
    opportunityId: (c.opportunityId as string) ?? null,
    criteria: (c.criteria as string) ?? '',
    weights: (c.weights as string) ?? '',
    scores: (c.scores as string) ?? '',
    total: (c.total as number) ?? 0,
    calculatedAt: c.calculatedAt ? new Date(c.calculatedAt as string) : null,
    calculatedBy: (c.calculatedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toOpportunityAction(row: MemoryRow): OpportunityAction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as OpportunityActionType) ?? 'investigate',
    description: (c.description as string) ?? '',
    status: (c.status as OpportunityActionStatus) ?? 'planned',
    opportunityId: (c.opportunityId as string) ?? null,
    action: (c.action as string) ?? '',
    assignee: (c.assignee as string) ?? '',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    priority: (c.priority as string) ?? '',
    result: (c.result as string) ?? '',
    completedAt: c.completedAt ? new Date(c.completedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const OpportunityService = {
  // ── Opportunities ──

  async createOpportunity(organizationId: string, workspaceId: string, input: CreateOpportunityInput, createdBy: string): Promise<Opportunity> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'detected',
      source: input.source ?? '',
      confidence: input.confidence ?? 0,
      impact: input.impact ?? 0,
      effort: input.effort ?? 0,
      score: input.score ?? 0,
      category: input.category ?? '',
      detectedBy: input.detectedBy ?? '',
      detectedAt: input.detectedAt ?? null,
      evaluatedAt: input.evaluatedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'opportunity',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['opportunity', content.type, content.status]),
        createdBy,
      },
    });
    return toOpportunity(row as MemoryRow);
  },

  async getOpportunity(id: string): Promise<Opportunity | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'opportunity') return null;
    return toOpportunity(row as MemoryRow);
  },

  async listOpportunities(organizationId: string, opts: ListOpportunitiesOpts = {}): Promise<Opportunity[]> {
    const where: Record<string, unknown> = { organizationId, type: 'opportunity' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOpportunity);
  },

  async updateOpportunity(id: string, input: UpdateOpportunityInput): Promise<Opportunity | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.confidence !== undefined && { confidence: input.confidence }),
      ...(input.impact !== undefined && { impact: input.impact }),
      ...(input.effort !== undefined && { effort: input.effort }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.detectedBy !== undefined && { detectedBy: input.detectedBy }),
      ...(input.detectedAt !== undefined && { detectedAt: input.detectedAt }),
      ...(input.evaluatedAt !== undefined && { evaluatedAt: input.evaluatedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['opportunity', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toOpportunity(row as MemoryRow);
  },

  async deleteOpportunity(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async evaluateOpportunity(id: string, _evaluatedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'evaluating', evaluatedAt: new Date().toISOString() });
  },

  async approveOpportunity(id: string, _approvedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'approved' });
  },

  async rejectOpportunity(id: string, _rejectedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'rejected' });
  },

  async pursueOpportunity(id: string, _pursuedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'pursuing' });
  },

  async realizeOpportunity(id: string, _realizedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'realized' });
  },

  async archiveOpportunity(id: string, _archivedBy: string): Promise<Opportunity | null> {
    return OpportunityService.updateOpportunity(id, { status: 'archived' });
  },

  // ── Detection Rules ──

  async createDetectionRule(organizationId: string, workspaceId: string, input: CreateDetectionRuleInput, createdBy: string): Promise<DetectionRule> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      rule: input.rule ?? '',
      conditions: input.conditions ?? '',
      actions: input.actions ?? '',
      schedule: input.schedule ?? '',
      lastTriggered: input.lastTriggered ?? null,
      triggerCount: input.triggerCount ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'detection_rule',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['detection_rule', content.type, content.status]),
        createdBy,
      },
    });
    return toDetectionRule(row as MemoryRow);
  },

  async getDetectionRule(id: string): Promise<DetectionRule | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'detection_rule') return null;
    return toDetectionRule(row as MemoryRow);
  },

  async listDetectionRules(organizationId: string, opts: ListDetectionRulesOpts = {}): Promise<DetectionRule[]> {
    const where: Record<string, unknown> = { organizationId, type: 'detection_rule' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDetectionRule);
  },

  async updateDetectionRule(id: string, input: UpdateDetectionRuleInput): Promise<DetectionRule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.rule !== undefined && { rule: input.rule }),
      ...(input.conditions !== undefined && { conditions: input.conditions }),
      ...(input.actions !== undefined && { actions: input.actions }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
      ...(input.lastTriggered !== undefined && { lastTriggered: input.lastTriggered }),
      ...(input.triggerCount !== undefined && { triggerCount: input.triggerCount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['detection_rule', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDetectionRule(row as MemoryRow);
  },

  async deleteDetectionRule(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateDetectionRule(id: string, _activatedBy: string): Promise<DetectionRule | null> {
    return OpportunityService.updateDetectionRule(id, { status: 'active' });
  },

  async pauseDetectionRule(id: string, _pausedBy: string): Promise<DetectionRule | null> {
    return OpportunityService.updateDetectionRule(id, { status: 'paused' });
  },

  async deprecateDetectionRule(id: string, _deprecatedBy: string): Promise<DetectionRule | null> {
    return OpportunityService.updateDetectionRule(id, { status: 'deprecated' });
  },

  async archiveDetectionRule(id: string, _archivedBy: string): Promise<DetectionRule | null> {
    return OpportunityService.updateDetectionRule(id, { status: 'archived' });
  },

  // ── Opportunity Scores ──

  async createOpportunityScore(organizationId: string, workspaceId: string, input: CreateOpportunityScoreInput, createdBy: string): Promise<OpportunityScore> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'calculated',
      opportunityId: input.opportunityId ?? null,
      criteria: input.criteria ?? '',
      weights: input.weights ?? '',
      scores: input.scores ?? '',
      total: input.total ?? 0,
      calculatedAt: input.calculatedAt ?? null,
      calculatedBy: input.calculatedBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'opportunity_score',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.opportunityId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['opportunity_score', content.type, content.status]),
        createdBy,
      },
    });
    return toOpportunityScore(row as MemoryRow);
  },

  async getOpportunityScore(id: string): Promise<OpportunityScore | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'opportunity_score') return null;
    return toOpportunityScore(row as MemoryRow);
  },

  async listOpportunityScores(organizationId: string, opts: ListOpportunityScoresOpts = {}): Promise<OpportunityScore[]> {
    const where: Record<string, unknown> = { organizationId, type: 'opportunity_score' };
    const conditions: unknown[] = [];
    if (opts.opportunityId) conditions.push({ content: { contains: `"opportunityId":"${opts.opportunityId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOpportunityScore);
  },

  async updateOpportunityScore(id: string, input: UpdateOpportunityScoreInput): Promise<OpportunityScore | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.opportunityId !== undefined && { opportunityId: input.opportunityId }),
      ...(input.criteria !== undefined && { criteria: input.criteria }),
      ...(input.weights !== undefined && { weights: input.weights }),
      ...(input.scores !== undefined && { scores: input.scores }),
      ...(input.total !== undefined && { total: input.total }),
      ...(input.calculatedAt !== undefined && { calculatedAt: input.calculatedAt }),
      ...(input.calculatedBy !== undefined && { calculatedBy: input.calculatedBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['opportunity_score', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toOpportunityScore(row as MemoryRow);
  },

  async deleteOpportunityScore(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async calculateScore(id: string, _calculatedBy: string): Promise<OpportunityScore | null> {
    return OpportunityService.updateOpportunityScore(id, { status: 'calculated', calculatedAt: new Date().toISOString() });
  },

  async reviewScore(id: string, _reviewedBy: string): Promise<OpportunityScore | null> {
    return OpportunityService.updateOpportunityScore(id, { status: 'reviewed' });
  },

  async adjustScore(id: string, _adjustedBy: string): Promise<OpportunityScore | null> {
    return OpportunityService.updateOpportunityScore(id, { status: 'adjusted' });
  },

  async archiveScore(id: string, _archivedBy: string): Promise<OpportunityScore | null> {
    return OpportunityService.updateOpportunityScore(id, { status: 'archived' });
  },

  // ── Opportunity Actions ──

  async createOpportunityAction(organizationId: string, workspaceId: string, input: CreateOpportunityActionInput, createdBy: string): Promise<OpportunityAction> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      opportunityId: input.opportunityId ?? null,
      action: input.action ?? '',
      assignee: input.assignee ?? '',
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? '',
      result: input.result ?? '',
      completedAt: input.completedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'opportunity_action',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.opportunityId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['opportunity_action', content.type, content.status]),
        createdBy,
      },
    });
    return toOpportunityAction(row as MemoryRow);
  },

  async getOpportunityAction(id: string): Promise<OpportunityAction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'opportunity_action') return null;
    return toOpportunityAction(row as MemoryRow);
  },

  async listOpportunityActions(organizationId: string, opts: ListOpportunityActionsOpts = {}): Promise<OpportunityAction[]> {
    const where: Record<string, unknown> = { organizationId, type: 'opportunity_action' };
    const conditions: unknown[] = [];
    if (opts.opportunityId) conditions.push({ content: { contains: `"opportunityId":"${opts.opportunityId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toOpportunityAction);
  },

  async updateOpportunityAction(id: string, input: UpdateOpportunityActionInput): Promise<OpportunityAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.opportunityId !== undefined && { opportunityId: input.opportunityId }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.completedAt !== undefined && { completedAt: input.completedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['opportunity_action', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toOpportunityAction(row as MemoryRow);
  },

  async deleteOpportunityAction(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startOpportunityAction(id: string, _startedBy: string): Promise<OpportunityAction | null> {
    return OpportunityService.updateOpportunityAction(id, { status: 'in_progress' });
  },

  async completeOpportunityAction(id: string, _completedBy: string): Promise<OpportunityAction | null> {
    return OpportunityService.updateOpportunityAction(id, { status: 'completed', completedAt: new Date().toISOString() });
  },

  async cancelOpportunityAction(id: string, _cancelledBy: string): Promise<OpportunityAction | null> {
    return OpportunityService.updateOpportunityAction(id, { status: 'cancelled' });
  },

  async failOpportunityAction(id: string, _failedBy: string): Promise<OpportunityAction | null> {
    return OpportunityService.updateOpportunityAction(id, { status: 'failed' });
  },

  // ── Metrics & Stats ──

  async getOpportunityDetectionMetrics(organizationId: string): Promise<OpportunityDetectionMetrics> {
    const [opportunities, rules] = await Promise.all([
      OpportunityService.listOpportunities(organizationId),
      OpportunityService.listDetectionRules(organizationId),
    ]);
    return {
      detectedOpportunities: opportunities.filter((o) => o.status === 'detected').length,
      approvedOpportunities: opportunities.filter((o) => o.status === 'approved').length,
      pursuingOpportunities: opportunities.filter((o) => o.status === 'pursuing').length,
      realizedOpportunities: opportunities.filter((o) => o.status === 'realized').length,
      activeRules: rules.filter((r) => r.status === 'active').length,
    };
  },

  async getOpportunityDetectionStats(organizationId: string): Promise<OpportunityDetectionStats> {
    const [opportunities, rules, scores, actions] = await Promise.all([
      OpportunityService.listOpportunities(organizationId),
      OpportunityService.listDetectionRules(organizationId),
      OpportunityService.listOpportunityScores(organizationId),
      OpportunityService.listOpportunityActions(organizationId),
    ]);
    const byOpportunityType: Record<string, number> = {};
    const byOpportunityStatus: Record<string, number> = {};
    const byRuleType: Record<string, number> = {};
    const byRuleStatus: Record<string, number> = {};
    const byScoreType: Record<string, number> = {};
    const byScoreStatus: Record<string, number> = {};
    const byActionType: Record<string, number> = {};
    const byActionStatus: Record<string, number> = {};
    for (const o of opportunities) { byOpportunityType[o.type] = (byOpportunityType[o.type] ?? 0) + 1; byOpportunityStatus[o.status] = (byOpportunityStatus[o.status] ?? 0) + 1; }
    for (const r of rules) { byRuleType[r.type] = (byRuleType[r.type] ?? 0) + 1; byRuleStatus[r.status] = (byRuleStatus[r.status] ?? 0) + 1; }
    for (const s of scores) { byScoreType[s.type] = (byScoreType[s.type] ?? 0) + 1; byScoreStatus[s.status] = (byScoreStatus[s.status] ?? 0) + 1; }
    for (const a of actions) { byActionType[a.type] = (byActionType[a.type] ?? 0) + 1; byActionStatus[a.status] = (byActionStatus[a.status] ?? 0) + 1; }
    return {
      opportunityCount: opportunities.length,
      ruleCount: rules.length,
      scoreCount: scores.length,
      actionCount: actions.length,
      byOpportunityType, byOpportunityStatus, byRuleType, byRuleStatus, byScoreType, byScoreStatus, byActionType, byActionStatus,
    };
  },
};
