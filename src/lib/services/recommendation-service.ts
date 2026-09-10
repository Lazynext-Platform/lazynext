import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RecommendationType = 'next_action' | 'optimization' | 'improvement' | 'alert' | 'opportunity' | 'risk' | 'resource' | 'priority' | 'strategy' | 'tactic' | 'correction' | 'prevention';
export type RecommendationStatus = 'generated' | 'presented' | 'accepted' | 'rejected' | 'acted' | 'dismissed' | 'archived';
export type RecommendationFeedbackType = 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment' | 'correction' | 'suggestion' | 'override';
export type RecommendationFeedbackStatus = 'recorded' | 'reviewed' | 'incorporated' | 'archived';
export type RecommendationActionType = 'apply' | 'defer' | 'modify' | 'escalate' | 'delegate' | 'automate' | 'schedule' | 'ignore';
export type RecommendationActionStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type RecommendationModelType = 'rule_based' | 'collaborative' | 'content_based' | 'hybrid' | 'ml' | 'heuristic' | 'expert' | 'contextual';
export type RecommendationModelStatus = 'draft' | 'active' | 'evaluating' | 'deprecated' | 'archived';

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

export interface Recommendation {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecommendationType;
  description: string;
  status: RecommendationStatus;
  category: string;
  priority: string;
  confidence: number;
  reasoning: string;
  source: string;
  target: string;
  targetId: string | null;
  expectedImpact: string;
  actualImpact: string;
  generatedAt: Date | null;
  actedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationFeedback {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecommendationFeedbackType;
  description: string;
  status: RecommendationFeedbackStatus;
  recommendationId: string | null;
  feedback: string;
  rating: number;
  comment: string;
  userId: string;
  recordedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationAction {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecommendationActionType;
  description: string;
  status: RecommendationActionStatus;
  recommendationId: string | null;
  action: string;
  assignee: string;
  dueDate: Date | null;
  result: string;
  completedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationModel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RecommendationModelType;
  description: string;
  status: RecommendationModelStatus;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  lastTrained: Date | null;
  trainingData: string;
  config: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationEngineMetrics {
  generatedRecommendations: number;
  acceptedRecommendations: number;
  actedRecommendations: number;
  activeModels: number;
  avgConfidence: number;
}

export interface RecommendationEngineStats {
  recommendationCount: number;
  feedbackCount: number;
  actionCount: number;
  modelCount: number;
  byRecommendationType: Record<string, number>;
  byRecommendationStatus: Record<string, number>;
  byFeedbackType: Record<string, number>;
  byFeedbackStatus: Record<string, number>;
  byActionType: Record<string, number>;
  byActionStatus: Record<string, number>;
  byModelType: Record<string, number>;
  byModelStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateRecommendationInput {
  name: string;
  type: RecommendationType;
  description?: string;
  status?: RecommendationStatus;
  category?: string;
  priority?: string;
  confidence?: number;
  reasoning?: string;
  source?: string;
  target?: string;
  targetId?: string;
  expectedImpact?: string;
  actualImpact?: string;
  generatedAt?: string;
  actedAt?: string;
  notes?: string;
}

export interface UpdateRecommendationInput {
  name?: string;
  type?: RecommendationType;
  description?: string;
  status?: RecommendationStatus;
  category?: string;
  priority?: string;
  confidence?: number;
  reasoning?: string;
  source?: string;
  target?: string;
  targetId?: string;
  expectedImpact?: string;
  actualImpact?: string;
  generatedAt?: string;
  actedAt?: string;
  notes?: string;
}

export interface ListRecommendationsOpts {
  type?: RecommendationType;
  status?: RecommendationStatus;
}

export interface CreateRecommendationFeedbackInput {
  name: string;
  type: RecommendationFeedbackType;
  description?: string;
  status?: RecommendationFeedbackStatus;
  recommendationId?: string;
  feedback?: string;
  rating?: number;
  comment?: string;
  userId?: string;
  recordedAt?: string;
  notes?: string;
}

export interface UpdateRecommendationFeedbackInput {
  name?: string;
  type?: RecommendationFeedbackType;
  description?: string;
  status?: RecommendationFeedbackStatus;
  recommendationId?: string;
  feedback?: string;
  rating?: number;
  comment?: string;
  userId?: string;
  recordedAt?: string;
  notes?: string;
}

export interface ListRecommendationFeedbacksOpts {
  type?: RecommendationFeedbackType;
  status?: RecommendationFeedbackStatus;
  recommendationId?: string;
}

export interface CreateRecommendationActionInput {
  name: string;
  type: RecommendationActionType;
  description?: string;
  status?: RecommendationActionStatus;
  recommendationId?: string;
  action?: string;
  assignee?: string;
  dueDate?: string;
  result?: string;
  completedAt?: string;
  notes?: string;
}

export interface UpdateRecommendationActionInput {
  name?: string;
  type?: RecommendationActionType;
  description?: string;
  status?: RecommendationActionStatus;
  recommendationId?: string;
  action?: string;
  assignee?: string;
  dueDate?: string;
  result?: string;
  completedAt?: string;
  notes?: string;
}

export interface ListRecommendationActionsOpts {
  type?: RecommendationActionType;
  status?: RecommendationActionStatus;
  recommendationId?: string;
}

export interface CreateRecommendationModelInput {
  name: string;
  type: RecommendationModelType;
  description?: string;
  status?: RecommendationModelStatus;
  version?: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  lastTrained?: string;
  trainingData?: string;
  config?: string;
  notes?: string;
}

export interface UpdateRecommendationModelInput {
  name?: string;
  type?: RecommendationModelType;
  description?: string;
  status?: RecommendationModelStatus;
  version?: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  lastTrained?: string;
  trainingData?: string;
  config?: string;
  notes?: string;
}

export interface ListRecommendationModelsOpts {
  type?: RecommendationModelType;
  status?: RecommendationModelStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toRecommendation(row: MemoryRow): Recommendation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecommendationType) ?? 'next_action',
    description: (c.description as string) ?? '',
    status: (c.status as RecommendationStatus) ?? 'generated',
    category: (c.category as string) ?? '',
    priority: (c.priority as string) ?? '',
    confidence: (c.confidence as number) ?? 0,
    reasoning: (c.reasoning as string) ?? '',
    source: (c.source as string) ?? '',
    target: (c.target as string) ?? '',
    targetId: (c.targetId as string) ?? null,
    expectedImpact: (c.expectedImpact as string) ?? '',
    actualImpact: (c.actualImpact as string) ?? '',
    generatedAt: c.generatedAt ? new Date(c.generatedAt as string) : null,
    actedAt: c.actedAt ? new Date(c.actedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecommendationFeedback(row: MemoryRow): RecommendationFeedback {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecommendationFeedbackType) ?? 'thumbs_up',
    description: (c.description as string) ?? '',
    status: (c.status as RecommendationFeedbackStatus) ?? 'recorded',
    recommendationId: (c.recommendationId as string) ?? null,
    feedback: (c.feedback as string) ?? '',
    rating: (c.rating as number) ?? 0,
    comment: (c.comment as string) ?? '',
    userId: (c.userId as string) ?? '',
    recordedAt: c.recordedAt ? new Date(c.recordedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecommendationAction(row: MemoryRow): RecommendationAction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecommendationActionType) ?? 'apply',
    description: (c.description as string) ?? '',
    status: (c.status as RecommendationActionStatus) ?? 'planned',
    recommendationId: (c.recommendationId as string) ?? null,
    action: (c.action as string) ?? '',
    assignee: (c.assignee as string) ?? '',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    result: (c.result as string) ?? '',
    completedAt: c.completedAt ? new Date(c.completedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRecommendationModel(row: MemoryRow): RecommendationModel {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RecommendationModelType) ?? 'rule_based',
    description: (c.description as string) ?? '',
    status: (c.status as RecommendationModelStatus) ?? 'draft',
    version: (c.version as string) ?? '',
    accuracy: (c.accuracy as number) ?? 0,
    precision: (c.precision as number) ?? 0,
    recall: (c.recall as number) ?? 0,
    lastTrained: c.lastTrained ? new Date(c.lastTrained as string) : null,
    trainingData: (c.trainingData as string) ?? '',
    config: (c.config as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const RecommendationService = {
  // ── Recommendations ──

  async createRecommendation(organizationId: string, workspaceId: string, input: CreateRecommendationInput, createdBy: string): Promise<Recommendation> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'generated',
      category: input.category ?? '',
      priority: input.priority ?? '',
      confidence: input.confidence ?? 0,
      reasoning: input.reasoning ?? '',
      source: input.source ?? '',
      target: input.target ?? '',
      targetId: input.targetId ?? null,
      expectedImpact: input.expectedImpact ?? '',
      actualImpact: input.actualImpact ?? '',
      generatedAt: input.generatedAt ?? null,
      actedAt: input.actedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recommendation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.targetId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recommendation', content.type, content.status]),
        createdBy,
      },
    });
    return toRecommendation(row as MemoryRow);
  },

  async getRecommendation(id: string): Promise<Recommendation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recommendation') return null;
    return toRecommendation(row as MemoryRow);
  },

  async listRecommendations(organizationId: string, opts: ListRecommendationsOpts = {}): Promise<Recommendation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recommendation' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecommendation);
  },

  async updateRecommendation(id: string, input: UpdateRecommendationInput): Promise<Recommendation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.confidence !== undefined && { confidence: input.confidence }),
      ...(input.reasoning !== undefined && { reasoning: input.reasoning }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.target !== undefined && { target: input.target }),
      ...(input.targetId !== undefined && { targetId: input.targetId }),
      ...(input.expectedImpact !== undefined && { expectedImpact: input.expectedImpact }),
      ...(input.actualImpact !== undefined && { actualImpact: input.actualImpact }),
      ...(input.generatedAt !== undefined && { generatedAt: input.generatedAt }),
      ...(input.actedAt !== undefined && { actedAt: input.actedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recommendation', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecommendation(row as MemoryRow);
  },

  async deleteRecommendation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async presentRecommendation(id: string, _presentedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'presented' });
  },

  async acceptRecommendation(id: string, _acceptedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'accepted' });
  },

  async rejectRecommendation(id: string, _rejectedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'rejected' });
  },

  async actRecommendation(id: string, _actedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'acted', actedAt: new Date().toISOString() });
  },

  async dismissRecommendation(id: string, _dismissedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'dismissed' });
  },

  async archiveRecommendation(id: string, _archivedBy: string): Promise<Recommendation | null> {
    return RecommendationService.updateRecommendation(id, { status: 'archived' });
  },

  // ── Recommendation Feedback ──

  async createRecommendationFeedback(organizationId: string, workspaceId: string, input: CreateRecommendationFeedbackInput, createdBy: string): Promise<RecommendationFeedback> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'recorded',
      recommendationId: input.recommendationId ?? null,
      feedback: input.feedback ?? '',
      rating: input.rating ?? 0,
      comment: input.comment ?? '',
      userId: input.userId ?? '',
      recordedAt: input.recordedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recommendation_feedback',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.recommendationId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recommendation_feedback', content.type, content.status]),
        createdBy,
      },
    });
    return toRecommendationFeedback(row as MemoryRow);
  },

  async getRecommendationFeedback(id: string): Promise<RecommendationFeedback | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recommendation_feedback') return null;
    return toRecommendationFeedback(row as MemoryRow);
  },

  async listRecommendationFeedbacks(organizationId: string, opts: ListRecommendationFeedbacksOpts = {}): Promise<RecommendationFeedback[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recommendation_feedback' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.recommendationId) conditions.push({ content: { contains: `"recommendationId":"${opts.recommendationId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecommendationFeedback);
  },

  async updateRecommendationFeedback(id: string, input: UpdateRecommendationFeedbackInput): Promise<RecommendationFeedback | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.recommendationId !== undefined && { recommendationId: input.recommendationId }),
      ...(input.feedback !== undefined && { feedback: input.feedback }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.comment !== undefined && { comment: input.comment }),
      ...(input.userId !== undefined && { userId: input.userId }),
      ...(input.recordedAt !== undefined && { recordedAt: input.recordedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recommendation_feedback', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecommendationFeedback(row as MemoryRow);
  },

  async deleteRecommendationFeedback(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async recordFeedback(id: string, _recordedBy: string): Promise<RecommendationFeedback | null> {
    return RecommendationService.updateRecommendationFeedback(id, { status: 'recorded', recordedAt: new Date().toISOString() });
  },

  async reviewFeedback(id: string, _reviewedBy: string): Promise<RecommendationFeedback | null> {
    return RecommendationService.updateRecommendationFeedback(id, { status: 'reviewed' });
  },

  async incorporateFeedback(id: string, _incorporatedBy: string): Promise<RecommendationFeedback | null> {
    return RecommendationService.updateRecommendationFeedback(id, { status: 'incorporated' });
  },

  async archiveFeedback(id: string, _archivedBy: string): Promise<RecommendationFeedback | null> {
    return RecommendationService.updateRecommendationFeedback(id, { status: 'archived' });
  },

  // ── Recommendation Actions ──

  async createRecommendationAction(organizationId: string, workspaceId: string, input: CreateRecommendationActionInput, createdBy: string): Promise<RecommendationAction> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      recommendationId: input.recommendationId ?? null,
      action: input.action ?? '',
      assignee: input.assignee ?? '',
      dueDate: input.dueDate ?? null,
      result: input.result ?? '',
      completedAt: input.completedAt ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recommendation_action',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.recommendationId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recommendation_action', content.type, content.status]),
        createdBy,
      },
    });
    return toRecommendationAction(row as MemoryRow);
  },

  async getRecommendationAction(id: string): Promise<RecommendationAction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recommendation_action') return null;
    return toRecommendationAction(row as MemoryRow);
  },

  async listRecommendationActions(organizationId: string, opts: ListRecommendationActionsOpts = {}): Promise<RecommendationAction[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recommendation_action' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.recommendationId) conditions.push({ content: { contains: `"recommendationId":"${opts.recommendationId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecommendationAction);
  },

  async updateRecommendationAction(id: string, input: UpdateRecommendationActionInput): Promise<RecommendationAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.recommendationId !== undefined && { recommendationId: input.recommendationId }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.completedAt !== undefined && { completedAt: input.completedAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recommendation_action', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecommendationAction(row as MemoryRow);
  },

  async deleteRecommendationAction(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startRecommendationAction(id: string, _startedBy: string): Promise<RecommendationAction | null> {
    return RecommendationService.updateRecommendationAction(id, { status: 'in_progress' });
  },

  async completeRecommendationAction(id: string, _completedBy: string): Promise<RecommendationAction | null> {
    return RecommendationService.updateRecommendationAction(id, { status: 'completed', completedAt: new Date().toISOString() });
  },

  async failRecommendationAction(id: string, _failedBy: string): Promise<RecommendationAction | null> {
    return RecommendationService.updateRecommendationAction(id, { status: 'failed' });
  },

  async cancelRecommendationAction(id: string, _cancelledBy: string): Promise<RecommendationAction | null> {
    return RecommendationService.updateRecommendationAction(id, { status: 'cancelled' });
  },

  // ── Recommendation Models ──

  async createRecommendationModel(organizationId: string, workspaceId: string, input: CreateRecommendationModelInput, createdBy: string): Promise<RecommendationModel> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      version: input.version ?? '',
      accuracy: input.accuracy ?? 0,
      precision: input.precision ?? 0,
      recall: input.recall ?? 0,
      lastTrained: input.lastTrained ?? null,
      trainingData: input.trainingData ?? '',
      config: input.config ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'recommendation_model',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['recommendation_model', content.type, content.status]),
        createdBy,
      },
    });
    return toRecommendationModel(row as MemoryRow);
  },

  async getRecommendationModel(id: string): Promise<RecommendationModel | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'recommendation_model') return null;
    return toRecommendationModel(row as MemoryRow);
  },

  async listRecommendationModels(organizationId: string, opts: ListRecommendationModelsOpts = {}): Promise<RecommendationModel[]> {
    const where: Record<string, unknown> = { organizationId, type: 'recommendation_model' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRecommendationModel);
  },

  async updateRecommendationModel(id: string, input: UpdateRecommendationModelInput): Promise<RecommendationModel | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.accuracy !== undefined && { accuracy: input.accuracy }),
      ...(input.precision !== undefined && { precision: input.precision }),
      ...(input.recall !== undefined && { recall: input.recall }),
      ...(input.lastTrained !== undefined && { lastTrained: input.lastTrained }),
      ...(input.trainingData !== undefined && { trainingData: input.trainingData }),
      ...(input.config !== undefined && { config: input.config }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['recommendation_model', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRecommendationModel(row as MemoryRow);
  },

  async deleteRecommendationModel(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRecommendationModel(id: string, _activatedBy: string): Promise<RecommendationModel | null> {
    return RecommendationService.updateRecommendationModel(id, { status: 'active' });
  },

  async evaluateRecommendationModel(id: string, _evaluatedBy: string): Promise<RecommendationModel | null> {
    return RecommendationService.updateRecommendationModel(id, { status: 'evaluating' });
  },

  async deprecateRecommendationModel(id: string, _deprecatedBy: string): Promise<RecommendationModel | null> {
    return RecommendationService.updateRecommendationModel(id, { status: 'deprecated' });
  },

  async archiveRecommendationModel(id: string, _archivedBy: string): Promise<RecommendationModel | null> {
    return RecommendationService.updateRecommendationModel(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getRecommendationEngineMetrics(organizationId: string): Promise<RecommendationEngineMetrics> {
    const [recommendations, models] = await Promise.all([
      RecommendationService.listRecommendations(organizationId),
      RecommendationService.listRecommendationModels(organizationId),
    ]);
    return {
      generatedRecommendations: recommendations.filter((r) => r.status === 'generated' || r.status === 'presented').length,
      acceptedRecommendations: recommendations.filter((r) => r.status === 'accepted').length,
      actedRecommendations: recommendations.filter((r) => r.status === 'acted').length,
      activeModels: models.filter((m) => m.status === 'active').length,
      avgConfidence: recommendations.length ? recommendations.reduce((sum, r) => sum + (r.confidence ?? 0), 0) / recommendations.length : 0,
    };
  },

  async getRecommendationEngineStats(organizationId: string): Promise<RecommendationEngineStats> {
    const [recommendations, feedbacks, actions, models] = await Promise.all([
      RecommendationService.listRecommendations(organizationId),
      RecommendationService.listRecommendationFeedbacks(organizationId),
      RecommendationService.listRecommendationActions(organizationId),
      RecommendationService.listRecommendationModels(organizationId),
    ]);
    const byRecommendationType: Record<string, number> = {};
    const byRecommendationStatus: Record<string, number> = {};
    const byFeedbackType: Record<string, number> = {};
    const byFeedbackStatus: Record<string, number> = {};
    const byActionType: Record<string, number> = {};
    const byActionStatus: Record<string, number> = {};
    const byModelType: Record<string, number> = {};
    const byModelStatus: Record<string, number> = {};
    for (const r of recommendations) { byRecommendationType[r.type] = (byRecommendationType[r.type] ?? 0) + 1; byRecommendationStatus[r.status] = (byRecommendationStatus[r.status] ?? 0) + 1; }
    for (const f of feedbacks) { byFeedbackType[f.type] = (byFeedbackType[f.type] ?? 0) + 1; byFeedbackStatus[f.status] = (byFeedbackStatus[f.status] ?? 0) + 1; }
    for (const a of actions) { byActionType[a.type] = (byActionType[a.type] ?? 0) + 1; byActionStatus[a.status] = (byActionStatus[a.status] ?? 0) + 1; }
    for (const m of models) { byModelType[m.type] = (byModelType[m.type] ?? 0) + 1; byModelStatus[m.status] = (byModelStatus[m.status] ?? 0) + 1; }
    return {
      recommendationCount: recommendations.length,
      feedbackCount: feedbacks.length,
      actionCount: actions.length,
      modelCount: models.length,
      byRecommendationType, byRecommendationStatus, byFeedbackType, byFeedbackStatus, byActionType, byActionStatus, byModelType, byModelStatus,
    };
  },
};
