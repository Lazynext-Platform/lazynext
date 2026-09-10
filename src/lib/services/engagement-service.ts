import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SurveyType = 'annual' | 'pulse' | 'onboarding' | 'exit' | '360_feedback' | 'engagement' | 'satisfaction' | 'custom';
export type SurveyStatus = 'draft' | 'published' | 'active' | 'closed' | 'archived';
export type QuestionType = 'rating' | 'multiple_choice' | 'open_ended' | 'yes_no' | 'ranking' | 'nps';
export type ResponseStatus = 'pending' | 'submitted' | 'in_progress';
export type ActionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

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

export interface EngagementSurvey {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  surveyType: SurveyType;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  status: SurveyStatus;
  anonymous: boolean;
  targetAudience: string;
  expectedResponses: number;
  publishedBy: string;
  publishedAt: Date | null;
  closedBy: string;
  closedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestion {
  id: string;
  organizationId: string;
  workspaceId: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  required: boolean;
  order: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyResponse {
  id: string;
  organizationId: string;
  workspaceId: string;
  surveyId: string;
  questionId: string | null;
  respondentId: string;
  responseValue: string;
  ratingValue: number;
  comments: string;
  status: ResponseStatus;
  submittedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementAction {
  id: string;
  organizationId: string;
  workspaceId: string;
  surveyId: string | null;
  title: string;
  description: string;
  owner: string;
  priority: ActionPriority;
  status: ActionStatus;
  progress: number;
  dueDate: Date | null;
  startedBy: string;
  startedAt: Date | null;
  completedBy: string;
  completedAt: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementMetrics {
  responseRate: number;
  averageScore: number;
  actionCompletion: number;
  totalSurveys: number;
  totalResponses: number;
}

export interface EngagementStats {
  surveyCount: number;
  activeSurveyCount: number;
  questionCount: number;
  responseCount: number;
  actionCount: number;
  completedActionCount: number;
  bySurveyType: Record<string, number>;
  bySurveyStatus: Record<string, number>;
  byActionStatus: Record<string, number>;
  byActionPriority: Record<string, number>;
}

// ── Input / Options ──

export interface CreateSurveyInput {
  title: string;
  surveyType: SurveyType;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: SurveyStatus;
  anonymous?: boolean;
  targetAudience?: string;
  expectedResponses?: number;
  notes?: string;
}

export interface UpdateSurveyInput {
  title?: string;
  surveyType?: SurveyType;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: SurveyStatus;
  anonymous?: boolean;
  targetAudience?: string;
  expectedResponses?: number;
  notes?: string;
}

export interface ListSurveysOpts {
  surveyType?: SurveyType;
  status?: SurveyStatus;
}

export interface CreateQuestionInput {
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  required?: boolean;
  order?: number;
  notes?: string;
}

export interface UpdateQuestionInput {
  questionText?: string;
  questionType?: QuestionType;
  options?: string[];
  required?: boolean;
  order?: number;
  notes?: string;
}

export interface ListQuestionsOpts {
  surveyId?: string;
  questionType?: QuestionType;
}

export interface CreateResponseInput {
  surveyId: string;
  questionId?: string;
  respondentId: string;
  responseValue?: string;
  ratingValue?: number;
  comments?: string;
  status?: ResponseStatus;
}

export interface UpdateResponseInput {
  responseValue?: string;
  ratingValue?: number;
  comments?: string;
  status?: ResponseStatus;
}

export interface ListResponsesOpts {
  surveyId?: string;
  questionId?: string;
  status?: ResponseStatus;
}

export interface CreateActionInput {
  surveyId?: string;
  title: string;
  description?: string;
  owner?: string;
  priority?: ActionPriority;
  status?: ActionStatus;
  progress?: number;
  dueDate?: string;
  notes?: string;
}

export interface UpdateActionInput {
  title?: string;
  description?: string;
  owner?: string;
  priority?: ActionPriority;
  status?: ActionStatus;
  progress?: number;
  dueDate?: string;
  notes?: string;
}

export interface ListActionsOpts {
  surveyId?: string;
  status?: ActionStatus;
  priority?: ActionPriority;
  owner?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSurvey(row: MemoryRow): EngagementSurvey {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    surveyType: (c.surveyType as SurveyType) ?? 'engagement',
    description: (c.description as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    status: (c.status as SurveyStatus) ?? 'draft',
    anonymous: (c.anonymous as boolean) ?? true,
    targetAudience: (c.targetAudience as string) ?? '',
    expectedResponses: (c.expectedResponses as number) ?? 0,
    publishedBy: (c.publishedBy as string) ?? '',
    publishedAt: c.publishedAt ? new Date(c.publishedAt as string) : null,
    closedBy: (c.closedBy as string) ?? '',
    closedAt: c.closedAt ? new Date(c.closedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toQuestion(row: MemoryRow): SurveyQuestion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    surveyId: (c.surveyId as string) ?? '',
    questionText: (c.questionText as string) ?? '',
    questionType: (c.questionType as QuestionType) ?? 'rating',
    options: (c.options as string[]) ?? [],
    required: (c.required as boolean) ?? true,
    order: (c.order as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toResponse(row: MemoryRow): SurveyResponse {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    surveyId: (c.surveyId as string) ?? '',
    questionId: (c.questionId as string) ?? null,
    respondentId: (c.respondentId as string) ?? '',
    responseValue: (c.responseValue as string) ?? '',
    ratingValue: (c.ratingValue as number) ?? 0,
    comments: (c.comments as string) ?? '',
    status: (c.status as ResponseStatus) ?? 'submitted',
    submittedAt: c.submittedAt ? new Date(c.submittedAt as string) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAction(row: MemoryRow): EngagementAction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    surveyId: (c.surveyId as string) ?? null,
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    owner: (c.owner as string) ?? '',
    priority: (c.priority as ActionPriority) ?? 'medium',
    status: (c.status as ActionStatus) ?? 'planned',
    progress: (c.progress as number) ?? 0,
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    startedBy: (c.startedBy as string) ?? '',
    startedAt: c.startedAt ? new Date(c.startedAt as string) : null,
    completedBy: (c.completedBy as string) ?? '',
    completedAt: c.completedAt ? new Date(c.completedAt as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EngagementService = {
  // ── Surveys ──

  async createSurvey(organizationId: string, workspaceId: string, input: CreateSurveyInput, createdBy: string): Promise<EngagementSurvey> {
    const content = {
      title: input.title.trim(),
      surveyType: input.surveyType,
      description: input.description ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: input.status ?? 'draft',
      anonymous: input.anonymous ?? true,
      targetAudience: input.targetAudience ?? '',
      expectedResponses: input.expectedResponses ?? 0,
      publishedBy: '',
      publishedAt: null,
      closedBy: '',
      closedAt: null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'engagement_survey',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['engagement_survey', content.surveyType, content.status]),
        createdBy,
      },
    });
    return toSurvey(row as MemoryRow);
  },

  async getSurvey(id: string): Promise<EngagementSurvey | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'engagement_survey') return null;
    return toSurvey(row as MemoryRow);
  },

  async listSurveys(organizationId: string, opts: ListSurveysOpts = {}): Promise<EngagementSurvey[]> {
    const where: Record<string, unknown> = { organizationId, type: 'engagement_survey' };
    const conditions: unknown[] = [];
    if (opts.surveyType) conditions.push({ content: { contains: `"surveyType":"${opts.surveyType}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSurvey);
  },

  async updateSurvey(id: string, input: UpdateSurveyInput): Promise<EngagementSurvey | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.surveyType !== undefined && { surveyType: input.surveyType }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.anonymous !== undefined && { anonymous: input.anonymous }),
      ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience }),
      ...(input.expectedResponses !== undefined && { expectedResponses: input.expectedResponses }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_survey', content.surveyType, content.status]) },
    }), null);
    if (!row) return null;
    return toSurvey(row as MemoryRow);
  },

  async deleteSurvey(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishSurvey(id: string, publishedBy: string): Promise<EngagementSurvey | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const surveyType = c.surveyType as string;
    const content = { ...c, status: 'published', publishedBy, publishedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_survey', surveyType, 'published']) },
    }), null);
    if (!row) return null;
    return toSurvey(row as MemoryRow);
  },

  async closeSurvey(id: string, closedBy: string): Promise<EngagementSurvey | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'closed', closedBy, closedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_survey', c.surveyType, 'closed']) },
    }), null);
    if (!row) return null;
    return toSurvey(row as MemoryRow);
  },

  // ── Questions ──

  async createQuestion(organizationId: string, workspaceId: string, input: CreateQuestionInput, createdBy: string): Promise<SurveyQuestion> {
    const content = {
      surveyId: input.surveyId,
      questionText: input.questionText.trim(),
      questionType: input.questionType,
      options: input.options ?? [],
      required: input.required ?? true,
      order: input.order ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'survey_question',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.surveyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['survey_question', content.questionType]),
        createdBy,
      },
    });
    return toQuestion(row as MemoryRow);
  },

  async getQuestion(id: string): Promise<SurveyQuestion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'survey_question') return null;
    return toQuestion(row as MemoryRow);
  },

  async listQuestions(organizationId: string, opts: ListQuestionsOpts = {}): Promise<SurveyQuestion[]> {
    const where: Record<string, unknown> = { organizationId, type: 'survey_question' };
    const conditions: unknown[] = [];
    if (opts.questionType) conditions.push({ content: { contains: `"questionType":"${opts.questionType}"` } });
    if (opts.surveyId) conditions.push({ content: { contains: `"surveyId":"${opts.surveyId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toQuestion);
  },

  async updateQuestion(id: string, input: UpdateQuestionInput): Promise<SurveyQuestion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.questionText !== undefined && { questionText: input.questionText.trim() }),
      ...(input.questionType !== undefined && { questionType: input.questionType }),
      ...(input.options !== undefined && { options: input.options }),
      ...(input.required !== undefined && { required: input.required }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['survey_question', content.questionType]) },
    }), null);
    if (!row) return null;
    return toQuestion(row as MemoryRow);
  },

  async deleteQuestion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Responses ──

  async createResponse(organizationId: string, workspaceId: string, input: CreateResponseInput, createdBy: string): Promise<SurveyResponse> {
    const content = {
      surveyId: input.surveyId,
      questionId: input.questionId ?? null,
      respondentId: input.respondentId,
      responseValue: input.responseValue ?? '',
      ratingValue: input.ratingValue ?? 0,
      comments: input.comments ?? '',
      status: input.status ?? 'submitted',
      submittedAt: input.status === 'submitted' || !input.status ? new Date().toISOString() : null,
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'survey_response',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.surveyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['survey_response', content.status]),
        createdBy,
      },
    });
    return toResponse(row as MemoryRow);
  },

  async getResponse(id: string): Promise<SurveyResponse | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'survey_response') return null;
    return toResponse(row as MemoryRow);
  },

  async listResponses(organizationId: string, opts: ListResponsesOpts = {}): Promise<SurveyResponse[]> {
    const where: Record<string, unknown> = { organizationId, type: 'survey_response' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.surveyId) conditions.push({ content: { contains: `"surveyId":"${opts.surveyId}"` } });
    if (opts.questionId) conditions.push({ content: { contains: `"questionId":"${opts.questionId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toResponse);
  },

  async updateResponse(id: string, input: UpdateResponseInput): Promise<SurveyResponse | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.responseValue !== undefined && { responseValue: input.responseValue }),
      ...(input.ratingValue !== undefined && { ratingValue: input.ratingValue }),
      ...(input.comments !== undefined && { comments: input.comments }),
      ...(input.status !== undefined && { status: input.status }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['survey_response', content.status]) },
    }), null);
    if (!row) return null;
    return toResponse(row as MemoryRow);
  },

  async deleteResponse(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Actions ──

  async createAction(organizationId: string, workspaceId: string, input: CreateActionInput, createdBy: string): Promise<EngagementAction> {
    const content = {
      surveyId: input.surveyId ?? null,
      title: input.title.trim(),
      description: input.description ?? '',
      owner: input.owner ?? '',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'planned',
      progress: input.progress ?? 0,
      dueDate: input.dueDate ?? null,
      startedBy: '',
      startedAt: null,
      completedBy: '',
      completedAt: null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'engagement_action',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.surveyId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['engagement_action', content.priority, content.status]),
        createdBy,
      },
    });
    return toAction(row as MemoryRow);
  },

  async getAction(id: string): Promise<EngagementAction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'engagement_action') return null;
    return toAction(row as MemoryRow);
  },

  async listActions(organizationId: string, opts: ListActionsOpts = {}): Promise<EngagementAction[]> {
    const where: Record<string, unknown> = { organizationId, type: 'engagement_action' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (opts.surveyId) conditions.push({ content: { contains: `"surveyId":"${opts.surveyId}"` } });
    if (opts.owner) conditions.push({ content: { contains: `"owner":"${opts.owner}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAction);
  },

  async updateAction(id: string, input: UpdateActionInput): Promise<EngagementAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_action', content.priority, content.status]) },
    }), null);
    if (!row) return null;
    return toAction(row as MemoryRow);
  },

  async startAction(id: string, startedBy: string): Promise<EngagementAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'in_progress', startedBy, startedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_action', c.priority, 'in_progress']) },
    }), null);
    if (!row) return null;
    return toAction(row as MemoryRow);
  },

  async completeAction(id: string, completedBy: string): Promise<EngagementAction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'completed', progress: 100, completedBy, completedAt: new Date().toISOString() };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['engagement_action', c.priority, 'completed']) },
    }), null);
    if (!row) return null;
    return toAction(row as MemoryRow);
  },

  // ── Metrics & Stats ──

  async getEngagementMetrics(organizationId: string): Promise<EngagementMetrics> {
    const [surveys, responses, actions] = await Promise.all([
      EngagementService.listSurveys(organizationId),
      EngagementService.listResponses(organizationId),
      EngagementService.listActions(organizationId),
    ]);
    const publishedSurveys = surveys.filter((s) => s.status === 'published' || s.status === 'active' || s.status === 'closed');
    const expectedTotal = publishedSurveys.reduce((sum, s) => sum + s.expectedResponses, 0);
    const responseRate = expectedTotal > 0 ? Math.round((responses.length / expectedTotal) * 100) : 0;
    const ratedResponses = responses.filter((r) => r.ratingValue > 0);
    const averageScore = ratedResponses.length > 0 ? Math.round((ratedResponses.reduce((sum, r) => sum + r.ratingValue, 0) / ratedResponses.length) * 10) / 10 : 0;
    const completedActions = actions.filter((a) => a.status === 'completed').length;
    const actionCompletion = actions.length > 0 ? Math.round((completedActions / actions.length) * 100) : 0;
    return { responseRate, averageScore, actionCompletion, totalSurveys: surveys.length, totalResponses: responses.length };
  },

  async getEngagementStats(organizationId: string): Promise<EngagementStats> {
    const [surveys, questions, responses, actions] = await Promise.all([
      EngagementService.listSurveys(organizationId),
      EngagementService.listQuestions(organizationId),
      EngagementService.listResponses(organizationId),
      EngagementService.listActions(organizationId),
    ]);
    const bySurveyType: Record<string, number> = {};
    const bySurveyStatus: Record<string, number> = {};
    const byActionStatus: Record<string, number> = {};
    const byActionPriority: Record<string, number> = {};
    for (const s of surveys) { bySurveyType[s.surveyType] = (bySurveyType[s.surveyType] ?? 0) + 1; bySurveyStatus[s.status] = (bySurveyStatus[s.status] ?? 0) + 1; }
    for (const a of actions) { byActionStatus[a.status] = (byActionStatus[a.status] ?? 0) + 1; byActionPriority[a.priority] = (byActionPriority[a.priority] ?? 0) + 1; }
    return {
      surveyCount: surveys.length,
      activeSurveyCount: surveys.filter((s) => s.status === 'active' || s.status === 'published').length,
      questionCount: questions.length,
      responseCount: responses.length,
      actionCount: actions.length,
      completedActionCount: actions.filter((a) => a.status === 'completed').length,
      bySurveyType, bySurveyStatus, byActionStatus, byActionPriority,
    };
  },
};
