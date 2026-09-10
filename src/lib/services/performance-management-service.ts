import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ReviewType = 'annual' | 'mid_year' | 'quarterly' | 'probationary' | 'project' | '360_review' | 'self_assessment' | 'peer_review';
export type ReviewStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'reviewed' | 'completed' | 'cancelled';
export type ReviewRating = 'exceeds' | 'meets' | 'below' | 'unsatisfactory' | 'not_applicable';
export type GoalType = 'performance' | 'development' | 'behavioral' | 'strategic' | 'team' | 'individual';
export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'missed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackType = 'positive' | 'constructive' | 'recognition' | 'improvement' | 'peer' | 'manager';
export type FeedbackStatus = 'pending' | 'delivered' | 'acknowledged' | 'actioned';
export type PlanType = 'career' | 'skill' | 'leadership' | 'succession' | 'pip' | 'onboarding';
export type PlanStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';

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

export interface PerfReview {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  type: ReviewType;
  status: ReviewStatus;
  rating: ReviewRating;
  description: string;
  period: string;
  reviewerId: string;
  reviewerName: string;
  startDate: Date | null;
  endDate: Date | null;
  selfAssessment: string;
  managerAssessment: string;
  goals: string;
  strengths: string;
  areasForImprovement: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerfGoal {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  type: GoalType;
  status: GoalStatus;
  priority: GoalPriority;
  title: string;
  description: string;
  progress: number;
  targetDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerfFeedback {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  type: FeedbackType;
  status: FeedbackStatus;
  title: string;
  description: string;
  givenBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevelopmentPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  type: PlanType;
  status: PlanStatus;
  title: string;
  description: string;
  progress: number;
  targetDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceManagementMetrics {
  activeReviews: number;
  completedReviews: number;
  activeGoals: number;
  achievedGoals: number;
  pendingFeedback: number;
  activePlans: number;
}

export interface PerformanceManagementStats {
  reviewCount: number;
  goalCount: number;
  feedbackCount: number;
  planCount: number;
  byReviewType: Record<string, number>;
  byReviewStatus: Record<string, number>;
  byReviewRating: Record<string, number>;
  byGoalType: Record<string, number>;
  byGoalStatus: Record<string, number>;
  byFeedbackType: Record<string, number>;
  byFeedbackStatus: Record<string, number>;
  byPlanType: Record<string, number>;
  byPlanStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateReviewInput {
  employeeId: string;
  employeeName: string;
  type: ReviewType;
  description?: string;
  status?: ReviewStatus;
  rating?: ReviewRating;
  period?: string;
  reviewerId?: string;
  reviewerName?: string;
  startDate?: string;
  endDate?: string;
  selfAssessment?: string;
  managerAssessment?: string;
  goals?: string;
  strengths?: string;
  areasForImprovement?: string;
  notes?: string;
}

export interface UpdateReviewInput {
  employeeId?: string;
  employeeName?: string;
  type?: ReviewType;
  description?: string;
  status?: ReviewStatus;
  rating?: ReviewRating;
  period?: string;
  reviewerId?: string;
  reviewerName?: string;
  startDate?: string;
  endDate?: string;
  selfAssessment?: string;
  managerAssessment?: string;
  goals?: string;
  strengths?: string;
  areasForImprovement?: string;
  notes?: string;
}

export interface ListReviewsOpts {
  employeeId?: string;
  type?: ReviewType;
  status?: ReviewStatus;
}

export interface CreateGoalInput {
  employeeId: string;
  employeeName: string;
  type: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  title: string;
  description?: string;
  progress?: number;
  targetDate?: string;
  notes?: string;
}

export interface UpdateGoalInput {
  employeeId?: string;
  employeeName?: string;
  type?: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  title?: string;
  description?: string;
  progress?: number;
  targetDate?: string;
  notes?: string;
}

export interface ListGoalsOpts {
  employeeId?: string;
  type?: GoalType;
  status?: GoalStatus;
}

export interface CreateFeedbackInput {
  employeeId: string;
  employeeName: string;
  type: FeedbackType;
  status?: FeedbackStatus;
  title: string;
  description?: string;
  givenBy?: string;
  notes?: string;
}

export interface UpdateFeedbackInput {
  employeeId?: string;
  employeeName?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  title?: string;
  description?: string;
  givenBy?: string;
  notes?: string;
}

export interface ListFeedbackOpts {
  employeeId?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
}

export interface CreatePlanInput {
  employeeId: string;
  employeeName: string;
  type: PlanType;
  status?: PlanStatus;
  title: string;
  description?: string;
  progress?: number;
  targetDate?: string;
  notes?: string;
}

export interface UpdatePlanInput {
  employeeId?: string;
  employeeName?: string;
  type?: PlanType;
  status?: PlanStatus;
  title?: string;
  description?: string;
  progress?: number;
  targetDate?: string;
  notes?: string;
}

export interface ListPlansOpts {
  employeeId?: string;
  type?: PlanType;
  status?: PlanStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toReview(row: MemoryRow): PerfReview {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as ReviewType) ?? 'annual',
    status: (c.status as ReviewStatus) ?? 'draft',
    rating: (c.rating as ReviewRating) ?? 'not_applicable',
    description: (c.description as string) ?? '',
    period: (c.period as string) ?? '',
    reviewerId: (c.reviewerId as string) ?? '',
    reviewerName: (c.reviewerName as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    selfAssessment: (c.selfAssessment as string) ?? '',
    managerAssessment: (c.managerAssessment as string) ?? '',
    goals: (c.goals as string) ?? '',
    strengths: (c.strengths as string) ?? '',
    areasForImprovement: (c.areasForImprovement as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toGoal(row: MemoryRow): PerfGoal {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as GoalType) ?? 'performance',
    status: (c.status as GoalStatus) ?? 'not_started',
    priority: (c.priority as GoalPriority) ?? 'medium',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    progress: (c.progress as number) ?? 0,
    targetDate: c.targetDate ? new Date(c.targetDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toFeedback(row: MemoryRow): PerfFeedback {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as FeedbackType) ?? 'positive',
    status: (c.status as FeedbackStatus) ?? 'pending',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    givenBy: (c.givenBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPlan(row: MemoryRow): DevelopmentPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    employeeId: (c.employeeId as string) ?? '',
    employeeName: (c.employeeName as string) ?? '',
    type: (c.type as PlanType) ?? 'career',
    status: (c.status as PlanStatus) ?? 'draft',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    progress: (c.progress as number) ?? 0,
    targetDate: c.targetDate ? new Date(c.targetDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PerformanceManagementService = {
  // ── Reviews ──

  async createReview(organizationId: string, workspaceId: string, input: CreateReviewInput, createdBy: string): Promise<PerfReview> {
    const content = {
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      status: input.status ?? 'draft',
      rating: input.rating ?? 'not_applicable',
      description: input.description ?? '',
      period: input.period ?? '',
      reviewerId: input.reviewerId ?? '',
      reviewerName: input.reviewerName ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      selfAssessment: input.selfAssessment ?? '',
      managerAssessment: input.managerAssessment ?? '',
      goals: input.goals ?? '',
      strengths: input.strengths ?? '',
      areasForImprovement: input.areasForImprovement ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'perf_review',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['perf_review', content.type, content.status, content.rating]),
        createdBy,
      },
    });
    return toReview(row as MemoryRow);
  },

  async getReview(id: string): Promise<PerfReview | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'perf_review') return null;
    return toReview(row as MemoryRow);
  },

  async listReviews(organizationId: string, opts: ListReviewsOpts = {}): Promise<PerfReview[]> {
    const where: Record<string, unknown> = { organizationId, type: 'perf_review' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toReview);
  },

  async updateReview(id: string, input: UpdateReviewInput): Promise<PerfReview | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.reviewerId !== undefined && { reviewerId: input.reviewerId }),
      ...(input.reviewerName !== undefined && { reviewerName: input.reviewerName }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.selfAssessment !== undefined && { selfAssessment: input.selfAssessment }),
      ...(input.managerAssessment !== undefined && { managerAssessment: input.managerAssessment }),
      ...(input.goals !== undefined && { goals: input.goals }),
      ...(input.strengths !== undefined && { strengths: input.strengths }),
      ...(input.areasForImprovement !== undefined && { areasForImprovement: input.areasForImprovement }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['perf_review', content.type, content.status, content.rating]) },
    }), null);
    if (!row) return null;
    return toReview(row as MemoryRow);
  },

  async deleteReview(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async sendReview(id: string, _sentBy: string): Promise<PerfReview | null> {
    return PerformanceManagementService.updateReview(id, { status: 'sent' });
  },

  async submitReview(id: string, _submittedBy: string): Promise<PerfReview | null> {
    return PerformanceManagementService.updateReview(id, { status: 'submitted' });
  },

  async completeReview(id: string, _completedBy: string): Promise<PerfReview | null> {
    return PerformanceManagementService.updateReview(id, { status: 'completed' });
  },

  // ── Goals ──

  async createGoal(organizationId: string, workspaceId: string, input: CreateGoalInput, createdBy: string): Promise<PerfGoal> {
    const content = {
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      status: input.status ?? 'not_started',
      priority: input.priority ?? 'medium',
      title: input.title.trim(),
      description: input.description ?? '',
      progress: input.progress ?? 0,
      targetDate: input.targetDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'perf_goal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['perf_goal', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toGoal(row as MemoryRow);
  },

  async getGoal(id: string): Promise<PerfGoal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'perf_goal') return null;
    return toGoal(row as MemoryRow);
  },

  async listGoals(organizationId: string, opts: ListGoalsOpts = {}): Promise<PerfGoal[]> {
    const where: Record<string, unknown> = { organizationId, type: 'perf_goal' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGoal);
  },

  async updateGoal(id: string, input: UpdateGoalInput): Promise<PerfGoal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['perf_goal', content.type, content.status, content.priority]) },
    }), null);
    if (!row) return null;
    return toGoal(row as MemoryRow);
  },

  async deleteGoal(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startGoal(id: string, _startedBy: string): Promise<PerfGoal | null> {
    return PerformanceManagementService.updateGoal(id, { status: 'in_progress' });
  },

  async achieveGoal(id: string, _achievedBy: string): Promise<PerfGoal | null> {
    return PerformanceManagementService.updateGoal(id, { status: 'achieved', progress: 100 });
  },

  async missGoal(id: string, _missedBy: string): Promise<PerfGoal | null> {
    return PerformanceManagementService.updateGoal(id, { status: 'missed' });
  },

  // ── Feedback ──

  async createFeedback(organizationId: string, workspaceId: string, input: CreateFeedbackInput, createdBy: string): Promise<PerfFeedback> {
    const content = {
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      status: input.status ?? 'pending',
      title: input.title.trim(),
      description: input.description ?? '',
      givenBy: input.givenBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'perf_feedback',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['perf_feedback', content.type, content.status]),
        createdBy,
      },
    });
    return toFeedback(row as MemoryRow);
  },

  async getFeedback(id: string): Promise<PerfFeedback | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'perf_feedback') return null;
    return toFeedback(row as MemoryRow);
  },

  async listFeedback(organizationId: string, opts: ListFeedbackOpts = {}): Promise<PerfFeedback[]> {
    const where: Record<string, unknown> = { organizationId, type: 'perf_feedback' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toFeedback);
  },

  async updateFeedback(id: string, input: UpdateFeedbackInput): Promise<PerfFeedback | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.givenBy !== undefined && { givenBy: input.givenBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['perf_feedback', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toFeedback(row as MemoryRow);
  },

  async deleteFeedback(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async deliverFeedback(id: string, _deliveredBy: string): Promise<PerfFeedback | null> {
    return PerformanceManagementService.updateFeedback(id, { status: 'delivered' });
  },

  async acknowledgeFeedback(id: string, _acknowledgedBy: string): Promise<PerfFeedback | null> {
    return PerformanceManagementService.updateFeedback(id, { status: 'acknowledged' });
  },

  async actionFeedback(id: string, _actionedBy: string): Promise<PerfFeedback | null> {
    return PerformanceManagementService.updateFeedback(id, { status: 'actioned' });
  },

  // ── Plans ──

  async createPlan(organizationId: string, workspaceId: string, input: CreatePlanInput, createdBy: string): Promise<DevelopmentPlan> {
    const content = {
      employeeId: input.employeeId,
      employeeName: input.employeeName.trim(),
      type: input.type,
      status: input.status ?? 'draft',
      title: input.title.trim(),
      description: input.description ?? '',
      progress: input.progress ?? 0,
      targetDate: input.targetDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'development_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.employeeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['development_plan', content.type, content.status]),
        createdBy,
      },
    });
    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<DevelopmentPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'development_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<DevelopmentPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'development_plan' };
    const conditions: unknown[] = [];
    if (opts.employeeId) conditions.push({ content: { contains: `"employeeId":"${opts.employeeId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<DevelopmentPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
      ...(input.employeeName !== undefined && { employeeName: input.employeeName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['development_plan', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePlan(id: string, _activatedBy: string): Promise<DevelopmentPlan | null> {
    return PerformanceManagementService.updatePlan(id, { status: 'active' });
  },

  async completePlan(id: string, _completedBy: string): Promise<DevelopmentPlan | null> {
    return PerformanceManagementService.updatePlan(id, { status: 'completed', progress: 100 });
  },

  async holdPlan(id: string, _holdBy: string): Promise<DevelopmentPlan | null> {
    return PerformanceManagementService.updatePlan(id, { status: 'on_hold' });
  },

  // ── Metrics & Stats ──

  async getPerformanceManagementMetrics(organizationId: string): Promise<PerformanceManagementMetrics> {
    const [reviews, goals, feedback, plans] = await Promise.all([
      PerformanceManagementService.listReviews(organizationId),
      PerformanceManagementService.listGoals(organizationId),
      PerformanceManagementService.listFeedback(organizationId),
      PerformanceManagementService.listPlans(organizationId),
    ]);
    const activeReviews = reviews.filter((r) => r.status === 'in_progress' || r.status === 'sent' || r.status === 'submitted').length;
    const completedReviews = reviews.filter((r) => r.status === 'completed').length;
    const activeGoals = goals.filter((g) => g.status === 'in_progress').length;
    const achievedGoals = goals.filter((g) => g.status === 'achieved').length;
    const pendingFeedback = feedback.filter((f) => f.status === 'pending').length;
    const activePlans = plans.filter((p) => p.status === 'active').length;
    return { activeReviews, completedReviews, activeGoals, achievedGoals, pendingFeedback, activePlans };
  },

  async getPerformanceManagementStats(organizationId: string): Promise<PerformanceManagementStats> {
    const [reviews, goals, feedback, plans] = await Promise.all([
      PerformanceManagementService.listReviews(organizationId),
      PerformanceManagementService.listGoals(organizationId),
      PerformanceManagementService.listFeedback(organizationId),
      PerformanceManagementService.listPlans(organizationId),
    ]);
    const byReviewType: Record<string, number> = {};
    const byReviewStatus: Record<string, number> = {};
    const byReviewRating: Record<string, number> = {};
    const byGoalType: Record<string, number> = {};
    const byGoalStatus: Record<string, number> = {};
    const byFeedbackType: Record<string, number> = {};
    const byFeedbackStatus: Record<string, number> = {};
    const byPlanType: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    for (const r of reviews) { byReviewType[r.type] = (byReviewType[r.type] ?? 0) + 1; byReviewStatus[r.status] = (byReviewStatus[r.status] ?? 0) + 1; byReviewRating[r.rating] = (byReviewRating[r.rating] ?? 0) + 1; }
    for (const g of goals) { byGoalType[g.type] = (byGoalType[g.type] ?? 0) + 1; byGoalStatus[g.status] = (byGoalStatus[g.status] ?? 0) + 1; }
    for (const f of feedback) { byFeedbackType[f.type] = (byFeedbackType[f.type] ?? 0) + 1; byFeedbackStatus[f.status] = (byFeedbackStatus[f.status] ?? 0) + 1; }
    for (const p of plans) { byPlanType[p.type] = (byPlanType[p.type] ?? 0) + 1; byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; }
    return {
      reviewCount: reviews.length,
      goalCount: goals.length,
      feedbackCount: feedback.length,
      planCount: plans.length,
      byReviewType, byReviewStatus, byReviewRating, byGoalType, byGoalStatus, byFeedbackType, byFeedbackStatus, byPlanType, byPlanStatus,
    };
  },
};
