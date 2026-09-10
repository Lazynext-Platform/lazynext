import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SurveyType = 'engagement' | 'satisfaction' | 'pulse' | 'feedback' | 'onboarding' | 'exit' | '360_review' | 'wellness' | 'culture' | 'custom';
export type SurveyStatus = 'draft' | 'published' | 'active' | 'paused' | 'closed' | 'archived';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'scale_5' | 'scale_10' | 'open_text' | 'yes_no' | 'ranking' | 'matrix';
export type ResponseStatus = 'pending' | 'submitted' | 'partial' | 'cancelled';
export type CampaignType = 'quarterly' | 'annual' | 'monthly' | 'weekly' | 'ad_hoc' | 'event_driven';
export type CampaignStatus = 'planned' | 'active' | 'completed' | 'cancelled';

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

export interface SurveyForm {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: SurveyType;
  description: string;
  status: SurveyStatus;
  anonymous: boolean;
  startDate: Date | null;
  endDate: Date | null;
  targetCount: number;
  responseCount: number;
  questions: string[];
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
  respondentId: string;
  respondentName: string;
  status: ResponseStatus;
  submittedDate: Date | null;
  answers: string[];
  score: number;
  sentiment: string;
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
  text: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  scale: number;
  order: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyCampaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CampaignType;
  description: string;
  status: CampaignStatus;
  surveyIds: string[];
  startDate: Date | null;
  endDate: Date | null;
  targetAudience: string;
  participationRate: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSurveyMetrics {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  submittedResponses: number;
  averageScore: number;
  activeCampaigns: number;
  participationRate: number;
}

export interface EmployeeSurveyStats {
  surveyCount: number;
  activeSurveyCount: number;
  responseCount: number;
  submittedResponseCount: number;
  questionCount: number;
  campaignCount: number;
  activeCampaignCount: number;
  bySurveyType: Record<string, number>;
  bySurveyStatus: Record<string, number>;
  byResponseStatus: Record<string, number>;
  byQuestionType: Record<string, number>;
  byCampaignType: Record<string, number>;
  byCampaignStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateSurveyInput {
  title: string;
  type: SurveyType;
  description?: string;
  status?: SurveyStatus;
  anonymous?: boolean;
  startDate?: string;
  endDate?: string;
  targetCount?: number;
  responseCount?: number;
  questions?: string[];
  notes?: string;
}

export interface UpdateSurveyInput {
  title?: string;
  type?: SurveyType;
  description?: string;
  status?: SurveyStatus;
  anonymous?: boolean;
  startDate?: string;
  endDate?: string;
  targetCount?: number;
  responseCount?: number;
  questions?: string[];
  notes?: string;
}

export interface ListSurveysOpts {
  type?: SurveyType;
  status?: SurveyStatus;
}

export interface CreateResponseInput {
  surveyId: string;
  respondentId?: string;
  respondentName?: string;
  status?: ResponseStatus;
  submittedDate?: string;
  answers?: string[];
  score?: number;
  sentiment?: string;
  notes?: string;
}

export interface UpdateResponseInput {
  respondentId?: string;
  respondentName?: string;
  status?: ResponseStatus;
  submittedDate?: string;
  answers?: string[];
  score?: number;
  sentiment?: string;
  notes?: string;
}

export interface ListResponsesOpts {
  surveyId?: string;
  status?: ResponseStatus;
}

export interface CreateQuestionInput {
  surveyId: string;
  text: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  scale?: number;
  order?: number;
  notes?: string;
}

export interface UpdateQuestionInput {
  text?: string;
  type?: QuestionType;
  required?: boolean;
  options?: string[];
  scale?: number;
  order?: number;
  notes?: string;
}

export interface ListQuestionsOpts {
  surveyId?: string;
  type?: QuestionType;
}

export interface CreateCampaignInput {
  name: string;
  type: CampaignType;
  description?: string;
  status?: CampaignStatus;
  surveyIds?: string[];
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  participationRate?: number;
  notes?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: CampaignType;
  description?: string;
  status?: CampaignStatus;
  surveyIds?: string[];
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  participationRate?: number;
  notes?: string;
}

export interface ListCampaignsOpts {
  type?: CampaignType;
  status?: CampaignStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toSurvey(row: MemoryRow): SurveyForm {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as SurveyType) ?? 'engagement',
    description: (c.description as string) ?? '',
    status: (c.status as SurveyStatus) ?? 'draft',
    anonymous: (c.anonymous as boolean) ?? false,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    targetCount: (c.targetCount as number) ?? 0,
    responseCount: (c.responseCount as number) ?? 0,
    questions: (c.questions as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toResponse(row: MemoryRow): SurveyResponse {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    surveyId: (c.surveyId as string) ?? '',
    respondentId: (c.respondentId as string) ?? '',
    respondentName: (c.respondentName as string) ?? '',
    status: (c.status as ResponseStatus) ?? 'pending',
    submittedDate: c.submittedDate ? new Date(c.submittedDate as string) : null,
    answers: (c.answers as string[]) ?? [],
    score: (c.score as number) ?? 0,
    sentiment: (c.sentiment as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toQuestion(row: MemoryRow): SurveyQuestion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    surveyId: (c.surveyId as string) ?? '',
    text: (c.text as string) ?? '',
    type: (c.type as QuestionType) ?? 'open_text',
    required: (c.required as boolean) ?? false,
    options: (c.options as string[]) ?? [],
    scale: (c.scale as number) ?? 0,
    order: (c.order as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCampaign(row: MemoryRow): SurveyCampaign {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CampaignType) ?? 'ad_hoc',
    description: (c.description as string) ?? '',
    status: (c.status as CampaignStatus) ?? 'planned',
    surveyIds: (c.surveyIds as string[]) ?? [],
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    targetAudience: (c.targetAudience as string) ?? '',
    participationRate: (c.participationRate as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const EmployeeSurveysService = {
  // ── Surveys ──

  async createSurvey(organizationId: string, workspaceId: string, input: CreateSurveyInput, createdBy: string): Promise<SurveyForm> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      anonymous: input.anonymous ?? false,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      targetCount: input.targetCount ?? 0,
      responseCount: input.responseCount ?? 0,
      questions: input.questions ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'survey_form',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['survey_form', content.type, content.status]),
        createdBy,
      },
    });
    return toSurvey(row as MemoryRow);
  },

  async getSurvey(id: string): Promise<SurveyForm | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'survey_form') return null;
    return toSurvey(row as MemoryRow);
  },

  async listSurveys(organizationId: string, opts: ListSurveysOpts = {}): Promise<SurveyForm[]> {
    const where: Record<string, unknown> = { organizationId, type: 'survey_form' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSurvey);
  },

  async updateSurvey(id: string, input: UpdateSurveyInput): Promise<SurveyForm | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.anonymous !== undefined && { anonymous: input.anonymous }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.targetCount !== undefined && { targetCount: input.targetCount }),
      ...(input.responseCount !== undefined && { responseCount: input.responseCount }),
      ...(input.questions !== undefined && { questions: input.questions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['survey_form', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSurvey(row as MemoryRow);
  },

  async deleteSurvey(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishSurvey(id: string, _publishedBy: string): Promise<SurveyForm | null> {
    return EmployeeSurveysService.updateSurvey(id, { status: 'published' });
  },

  async activateSurvey(id: string, _activatedBy: string): Promise<SurveyForm | null> {
    return EmployeeSurveysService.updateSurvey(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async pauseSurvey(id: string, _pausedBy: string): Promise<SurveyForm | null> {
    return EmployeeSurveysService.updateSurvey(id, { status: 'paused' });
  },

  async closeSurvey(id: string, _closedBy: string): Promise<SurveyForm | null> {
    return EmployeeSurveysService.updateSurvey(id, { status: 'closed', endDate: new Date().toISOString() });
  },

  // ── Responses ──

  async createResponse(organizationId: string, workspaceId: string, input: CreateResponseInput, createdBy: string): Promise<SurveyResponse> {
    const content = {
      surveyId: input.surveyId,
      respondentId: input.respondentId ?? '',
      respondentName: input.respondentName ?? '',
      status: input.status ?? 'pending',
      submittedDate: input.submittedDate ?? null,
      answers: input.answers ?? [],
      score: input.score ?? 0,
      sentiment: input.sentiment ?? '',
      notes: input.notes ?? '',
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
      ...(input.respondentId !== undefined && { respondentId: input.respondentId }),
      ...(input.respondentName !== undefined && { respondentName: input.respondentName }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.submittedDate !== undefined && { submittedDate: input.submittedDate }),
      ...(input.answers !== undefined && { answers: input.answers }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.sentiment !== undefined && { sentiment: input.sentiment }),
      ...(input.notes !== undefined && { notes: input.notes }),
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

  async submitResponse(id: string, _submittedBy: string): Promise<SurveyResponse | null> {
    return EmployeeSurveysService.updateResponse(id, { status: 'submitted', submittedDate: new Date().toISOString() });
  },

  // ── Questions ──

  async createQuestion(organizationId: string, workspaceId: string, input: CreateQuestionInput, createdBy: string): Promise<SurveyQuestion> {
    const content = {
      surveyId: input.surveyId,
      text: input.text.trim(),
      type: input.type,
      required: input.required ?? false,
      options: input.options ?? [],
      scale: input.scale ?? 0,
      order: input.order ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'survey_question',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.surveyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['survey_question', content.type]),
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
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
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
      ...(input.text !== undefined && { text: input.text.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.required !== undefined && { required: input.required }),
      ...(input.options !== undefined && { options: input.options }),
      ...(input.scale !== undefined && { scale: input.scale }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['survey_question', content.type]) },
    }), null);
    if (!row) return null;
    return toQuestion(row as MemoryRow);
  },

  async deleteQuestion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Campaigns ──

  async createCampaign(organizationId: string, workspaceId: string, input: CreateCampaignInput, createdBy: string): Promise<SurveyCampaign> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      surveyIds: input.surveyIds ?? [],
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      targetAudience: input.targetAudience ?? '',
      participationRate: input.participationRate ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'survey_campaign',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['survey_campaign', content.type, content.status]),
        createdBy,
      },
    });
    return toCampaign(row as MemoryRow);
  },

  async getCampaign(id: string): Promise<SurveyCampaign | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'survey_campaign') return null;
    return toCampaign(row as MemoryRow);
  },

  async listCampaigns(organizationId: string, opts: ListCampaignsOpts = {}): Promise<SurveyCampaign[]> {
    const where: Record<string, unknown> = { organizationId, type: 'survey_campaign' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCampaign);
  },

  async updateCampaign(id: string, input: UpdateCampaignInput): Promise<SurveyCampaign | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.surveyIds !== undefined && { surveyIds: input.surveyIds }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience }),
      ...(input.participationRate !== undefined && { participationRate: input.participationRate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['survey_campaign', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startCampaign(id: string, _startedBy: string): Promise<SurveyCampaign | null> {
    return EmployeeSurveysService.updateCampaign(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async completeCampaign(id: string, _completedBy: string): Promise<SurveyCampaign | null> {
    return EmployeeSurveysService.updateCampaign(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getEmployeeSurveyMetrics(organizationId: string): Promise<EmployeeSurveyMetrics> {
    const surveys = await EmployeeSurveysService.listSurveys(organizationId);
    const responses = await EmployeeSurveysService.listResponses(organizationId);
    const campaigns = await EmployeeSurveysService.listCampaigns(organizationId);
    const submitted = responses.filter((r) => r.status === 'submitted');
    const averageScore = submitted.length > 0 ? Math.round((submitted.reduce((sum, r) => sum + r.score, 0) / submitted.length) * 100) / 100 : 0;
    const participationRate = surveys.length > 0 ? Math.round((responses.length / surveys.reduce((sum, s) => sum + s.targetCount, 0 || 1)) * 100) : 0;
    return {
      totalSurveys: surveys.length,
      activeSurveys: surveys.filter((s) => s.status === 'active').length,
      totalResponses: responses.length,
      submittedResponses: submitted.length,
      averageScore,
      activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      participationRate,
    };
  },

  async getEmployeeSurveyStats(organizationId: string): Promise<EmployeeSurveyStats> {
    const [surveys, responses, questions, campaigns] = await Promise.all([
      EmployeeSurveysService.listSurveys(organizationId),
      EmployeeSurveysService.listResponses(organizationId),
      EmployeeSurveysService.listQuestions(organizationId),
      EmployeeSurveysService.listCampaigns(organizationId),
    ]);
    const bySurveyType: Record<string, number> = {};
    const bySurveyStatus: Record<string, number> = {};
    const byResponseStatus: Record<string, number> = {};
    const byQuestionType: Record<string, number> = {};
    const byCampaignType: Record<string, number> = {};
    const byCampaignStatus: Record<string, number> = {};
    for (const s of surveys) { bySurveyType[s.type] = (bySurveyType[s.type] ?? 0) + 1; bySurveyStatus[s.status] = (bySurveyStatus[s.status] ?? 0) + 1; }
    for (const r of responses) { byResponseStatus[r.status] = (byResponseStatus[r.status] ?? 0) + 1; }
    for (const q of questions) { byQuestionType[q.type] = (byQuestionType[q.type] ?? 0) + 1; }
    for (const c of campaigns) { byCampaignType[c.type] = (byCampaignType[c.type] ?? 0) + 1; byCampaignStatus[c.status] = (byCampaignStatus[c.status] ?? 0) + 1; }
    return {
      surveyCount: surveys.length,
      activeSurveyCount: surveys.filter((s) => s.status === 'active').length,
      responseCount: responses.length,
      submittedResponseCount: responses.filter((r) => r.status === 'submitted').length,
      questionCount: questions.length,
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((c) => c.status === 'active').length,
      bySurveyType, bySurveyStatus, byResponseStatus, byQuestionType, byCampaignType, byCampaignStatus,
    };
  },
};
