import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type JourneyStatus = 'draft' | 'active' | 'archived' | 'under_review';
export type StageType = 'awareness' | 'consideration' | 'purchase' | 'onboarding' | 'retention' | 'advocacy' | 'churn_risk' | 'win_back';
export type TouchpointType = 'website' | 'email' | 'social_media' | 'phone' | 'in_person' | 'mobile_app' | 'chat' | 'advertisement' | 'event' | 'document' | 'other';
export type TouchpointStatus = 'active' | 'inactive' | 'planned' | 'deprecated';
export type ScoreType = 'csat' | 'nps' | 'ces' | 'sentiment' | 'effort' | 'satisfaction' | 'loyalty';
export type ScoreStatus = 'pending' | 'collected' | 'analyzed' | 'actioned';

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

export interface JourneyMap {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  persona: string;
  status: JourneyStatus;
  startDate: Date | null;
  endDate: Date | null;
  owner: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JourneyStage {
  id: string;
  organizationId: string;
  workspaceId: string;
  journeyId: string;
  name: string;
  type: StageType;
  description: string;
  order: number;
  goals: string;
  painPoints: string;
  opportunities: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Touchpoint {
  id: string;
  organizationId: string;
  workspaceId: string;
  journeyId: string;
  stageId: string | null;
  name: string;
  type: TouchpointType;
  description: string;
  channel: string;
  status: TouchpointStatus;
  owner: string;
  frequency: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceScore {
  id: string;
  organizationId: string;
  workspaceId: string;
  journeyId: string | null;
  touchpointId: string | null;
  stageId: string | null;
  type: ScoreType;
  value: number;
  maxValue: number;
  respondentId: string;
  respondentName: string;
  comment: string;
  collectedDate: Date | null;
  status: ScoreStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerJourneyMetrics {
  activeJourneys: number;
  totalTouchpoints: number;
  averageScore: number;
  stagesCoverage: number;
}

export interface CustomerJourneyStats {
  journeyCount: number;
  activeJourneyCount: number;
  stageCount: number;
  touchpointCount: number;
  activeTouchpointCount: number;
  scoreCount: number;
  analyzedScoreCount: number;
  byJourneyStatus: Record<string, number>;
  byStageType: Record<string, number>;
  byTouchpointType: Record<string, number>;
  byTouchpointStatus: Record<string, number>;
  byScoreType: Record<string, number>;
  byScoreStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateJourneyInput {
  title: string;
  description?: string;
  persona?: string;
  status?: JourneyStatus;
  startDate?: string;
  endDate?: string;
  owner?: string;
  notes?: string;
}

export interface UpdateJourneyInput {
  title?: string;
  description?: string;
  persona?: string;
  status?: JourneyStatus;
  startDate?: string;
  endDate?: string;
  owner?: string;
  notes?: string;
}

export interface ListJourneysOpts {
  status?: JourneyStatus;
}

export interface CreateStageInput {
  journeyId: string;
  name: string;
  type: StageType;
  description?: string;
  order?: number;
  goals?: string;
  painPoints?: string;
  opportunities?: string;
  status?: string;
  notes?: string;
}

export interface UpdateStageInput {
  name?: string;
  type?: StageType;
  description?: string;
  order?: number;
  goals?: string;
  painPoints?: string;
  opportunities?: string;
  status?: string;
  notes?: string;
}

export interface ListStagesOpts {
  journeyId?: string;
  type?: StageType;
}

export interface CreateTouchpointInput {
  journeyId: string;
  stageId?: string;
  name: string;
  type: TouchpointType;
  description?: string;
  channel?: string;
  status?: TouchpointStatus;
  owner?: string;
  frequency?: string;
  notes?: string;
}

export interface UpdateTouchpointInput {
  name?: string;
  type?: TouchpointType;
  description?: string;
  channel?: string;
  status?: TouchpointStatus;
  owner?: string;
  frequency?: string;
  notes?: string;
}

export interface ListTouchpointsOpts {
  journeyId?: string;
  stageId?: string;
  type?: TouchpointType;
  status?: TouchpointStatus;
}

export interface CreateScoreInput {
  journeyId?: string;
  touchpointId?: string;
  stageId?: string;
  type: ScoreType;
  value: number;
  maxValue?: number;
  respondentId?: string;
  respondentName?: string;
  comment?: string;
  collectedDate?: string;
  status?: ScoreStatus;
  notes?: string;
}

export interface UpdateScoreInput {
  type?: ScoreType;
  value?: number;
  maxValue?: number;
  respondentId?: string;
  respondentName?: string;
  comment?: string;
  collectedDate?: string;
  status?: ScoreStatus;
  notes?: string;
}

export interface ListScoresOpts {
  journeyId?: string;
  touchpointId?: string;
  type?: ScoreType;
  status?: ScoreStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toJourney(row: MemoryRow): JourneyMap {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    persona: (c.persona as string) ?? '',
    status: (c.status as JourneyStatus) ?? 'draft',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    owner: (c.owner as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toStage(row: MemoryRow): JourneyStage {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    journeyId: (c.journeyId as string) ?? '',
    name: (c.name as string) ?? '',
    type: (c.type as StageType) ?? 'awareness',
    description: (c.description as string) ?? '',
    order: (c.order as number) ?? 0,
    goals: (c.goals as string) ?? '',
    painPoints: (c.painPoints as string) ?? '',
    opportunities: (c.opportunities as string) ?? '',
    status: (c.status as string) ?? 'active',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTouchpoint(row: MemoryRow): Touchpoint {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    journeyId: (c.journeyId as string) ?? '',
    stageId: (c.stageId as string) ?? null,
    name: (c.name as string) ?? '',
    type: (c.type as TouchpointType) ?? 'other',
    description: (c.description as string) ?? '',
    channel: (c.channel as string) ?? '',
    status: (c.status as TouchpointStatus) ?? 'active',
    owner: (c.owner as string) ?? '',
    frequency: (c.frequency as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toScore(row: MemoryRow): ExperienceScore {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    journeyId: (c.journeyId as string) ?? null,
    touchpointId: (c.touchpointId as string) ?? null,
    stageId: (c.stageId as string) ?? null,
    type: (c.type as ScoreType) ?? 'csat',
    value: (c.value as number) ?? 0,
    maxValue: (c.maxValue as number) ?? 10,
    respondentId: (c.respondentId as string) ?? '',
    respondentName: (c.respondentName as string) ?? '',
    comment: (c.comment as string) ?? '',
    collectedDate: c.collectedDate ? new Date(c.collectedDate as string) : null,
    status: (c.status as ScoreStatus) ?? 'collected',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CustomerJourneyService = {
  // ── Journeys ──

  async createJourney(organizationId: string, workspaceId: string, input: CreateJourneyInput, createdBy: string): Promise<JourneyMap> {
    const content = {
      title: input.title.trim(),
      description: input.description ?? '',
      persona: input.persona ?? '',
      status: input.status ?? 'draft',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      owner: input.owner ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'journey_map',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['journey_map', content.status]),
        createdBy,
      },
    });
    return toJourney(row as MemoryRow);
  },

  async getJourney(id: string): Promise<JourneyMap | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'journey_map') return null;
    return toJourney(row as MemoryRow);
  },

  async listJourneys(organizationId: string, opts: ListJourneysOpts = {}): Promise<JourneyMap[]> {
    const where: Record<string, unknown> = { organizationId, type: 'journey_map' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toJourney);
  },

  async updateJourney(id: string, input: UpdateJourneyInput): Promise<JourneyMap | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const title = input.title !== undefined ? input.title.trim() : (c.title as string);
    const description = input.description !== undefined ? input.description : (c.description as string);
    const persona = input.persona !== undefined ? input.persona : (c.persona as string);
    const status = input.status !== undefined ? input.status : (c.status as JourneyStatus);
    const startDate = input.startDate !== undefined ? input.startDate : (c.startDate as string | null);
    const endDate = input.endDate !== undefined ? input.endDate : (c.endDate as string | null);
    const owner = input.owner !== undefined ? input.owner : (c.owner as string);
    const notes = input.notes !== undefined ? input.notes : (c.notes as string);
    const content = {
      ...c,
      title, description, persona, status, startDate, endDate, owner, notes,
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['journey_map', status]) },
    }), null);
    if (!row) return null;
    return toJourney(row as MemoryRow);
  },

  async deleteJourney(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateJourney(id: string, _activatedBy: string): Promise<JourneyMap | null> {
    return CustomerJourneyService.updateJourney(id, { status: 'active' });
  },

  async archiveJourney(id: string, _archivedBy: string): Promise<JourneyMap | null> {
    return CustomerJourneyService.updateJourney(id, { status: 'archived' });
  },

  // ── Stages ──

  async createStage(organizationId: string, workspaceId: string, input: CreateStageInput, createdBy: string): Promise<JourneyStage> {
    const content = {
      journeyId: input.journeyId,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      order: input.order ?? 0,
      goals: input.goals ?? '',
      painPoints: input.painPoints ?? '',
      opportunities: input.opportunities ?? '',
      status: input.status ?? 'active',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'journey_stage',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.journeyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['journey_stage', content.type, content.status]),
        createdBy,
      },
    });
    return toStage(row as MemoryRow);
  },

  async getStage(id: string): Promise<JourneyStage | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'journey_stage') return null;
    return toStage(row as MemoryRow);
  },

  async listStages(organizationId: string, opts: ListStagesOpts = {}): Promise<JourneyStage[]> {
    const where: Record<string, unknown> = { organizationId, type: 'journey_stage' };
    const conditions: unknown[] = [];
    if (opts.journeyId) conditions.push({ content: { contains: `"journeyId":"${opts.journeyId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toStage);
  },

  async updateStage(id: string, input: UpdateStageInput): Promise<JourneyStage | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const name = input.name !== undefined ? input.name.trim() : (c.name as string);
    const type = input.type !== undefined ? input.type : (c.type as StageType);
    const description = input.description !== undefined ? input.description : (c.description as string);
    const order = input.order !== undefined ? input.order : (c.order as number);
    const goals = input.goals !== undefined ? input.goals : (c.goals as string);
    const painPoints = input.painPoints !== undefined ? input.painPoints : (c.painPoints as string);
    const opportunities = input.opportunities !== undefined ? input.opportunities : (c.opportunities as string);
    const status = input.status !== undefined ? input.status : (c.status as string);
    const notes = input.notes !== undefined ? input.notes : (c.notes as string);
    const content = {
      ...c,
      name, type, description, order, goals, painPoints, opportunities, status, notes,
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['journey_stage', type, status]) },
    }), null);
    if (!row) return null;
    return toStage(row as MemoryRow);
  },

  async deleteStage(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Touchpoints ──

  async createTouchpoint(organizationId: string, workspaceId: string, input: CreateTouchpointInput, createdBy: string): Promise<Touchpoint> {
    const content = {
      journeyId: input.journeyId,
      stageId: input.stageId ?? null,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      channel: input.channel ?? '',
      status: input.status ?? 'active',
      owner: input.owner ?? '',
      frequency: input.frequency ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'touchpoint',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.journeyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['touchpoint', content.type, content.status]),
        createdBy,
      },
    });
    return toTouchpoint(row as MemoryRow);
  },

  async getTouchpoint(id: string): Promise<Touchpoint | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'touchpoint') return null;
    return toTouchpoint(row as MemoryRow);
  },

  async listTouchpoints(organizationId: string, opts: ListTouchpointsOpts = {}): Promise<Touchpoint[]> {
    const where: Record<string, unknown> = { organizationId, type: 'touchpoint' };
    const conditions: unknown[] = [];
    if (opts.journeyId) conditions.push({ content: { contains: `"journeyId":"${opts.journeyId}"` } });
    if (opts.stageId) conditions.push({ content: { contains: `"stageId":"${opts.stageId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTouchpoint);
  },

  async updateTouchpoint(id: string, input: UpdateTouchpointInput): Promise<Touchpoint | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const name = input.name !== undefined ? input.name.trim() : (c.name as string);
    const type = input.type !== undefined ? input.type : (c.type as TouchpointType);
    const description = input.description !== undefined ? input.description : (c.description as string);
    const channel = input.channel !== undefined ? input.channel : (c.channel as string);
    const status = input.status !== undefined ? input.status : (c.status as TouchpointStatus);
    const owner = input.owner !== undefined ? input.owner : (c.owner as string);
    const frequency = input.frequency !== undefined ? input.frequency : (c.frequency as string);
    const notes = input.notes !== undefined ? input.notes : (c.notes as string);
    const content = {
      ...c,
      name, type, description, channel, status, owner, frequency, notes,
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['touchpoint', type, status]) },
    }), null);
    if (!row) return null;
    return toTouchpoint(row as MemoryRow);
  },

  async deleteTouchpoint(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async deactivateTouchpoint(id: string, _deactivatedBy: string): Promise<Touchpoint | null> {
    return CustomerJourneyService.updateTouchpoint(id, { status: 'inactive' });
  },

  // ── Scores ──

  async createScore(organizationId: string, workspaceId: string, input: CreateScoreInput, createdBy: string): Promise<ExperienceScore> {
    const content = {
      journeyId: input.journeyId ?? null,
      touchpointId: input.touchpointId ?? null,
      stageId: input.stageId ?? null,
      type: input.type,
      value: input.value,
      maxValue: input.maxValue ?? 10,
      respondentId: input.respondentId ?? '',
      respondentName: input.respondentName ?? '',
      comment: input.comment ?? '',
      collectedDate: input.collectedDate ?? null,
      status: input.status ?? 'collected',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'experience_score',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.touchpointId ?? input.journeyId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['experience_score', content.type, content.status]),
        createdBy,
      },
    });
    return toScore(row as MemoryRow);
  },

  async getScore(id: string): Promise<ExperienceScore | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'experience_score') return null;
    return toScore(row as MemoryRow);
  },

  async listScores(organizationId: string, opts: ListScoresOpts = {}): Promise<ExperienceScore[]> {
    const where: Record<string, unknown> = { organizationId, type: 'experience_score' };
    const conditions: unknown[] = [];
    if (opts.journeyId) conditions.push({ content: { contains: `"journeyId":"${opts.journeyId}"` } });
    if (opts.touchpointId) conditions.push({ content: { contains: `"touchpointId":"${opts.touchpointId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toScore);
  },

  async updateScore(id: string, input: UpdateScoreInput): Promise<ExperienceScore | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const type = input.type !== undefined ? input.type : (c.type as ScoreType);
    const value = input.value !== undefined ? input.value : (c.value as number);
    const maxValue = input.maxValue !== undefined ? input.maxValue : (c.maxValue as number);
    const respondentId = input.respondentId !== undefined ? input.respondentId : (c.respondentId as string);
    const respondentName = input.respondentName !== undefined ? input.respondentName : (c.respondentName as string);
    const comment = input.comment !== undefined ? input.comment : (c.comment as string);
    const collectedDate = input.collectedDate !== undefined ? input.collectedDate : (c.collectedDate as string | null);
    const status = input.status !== undefined ? input.status : (c.status as ScoreStatus);
    const notes = input.notes !== undefined ? input.notes : (c.notes as string);
    const content = {
      ...c,
      type, value, maxValue, respondentId, respondentName, comment, collectedDate, status, notes,
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['experience_score', type, status]) },
    }), null);
    if (!row) return null;
    return toScore(row as MemoryRow);
  },

  async deleteScore(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async analyzeScore(id: string, _analyzedBy: string): Promise<ExperienceScore | null> {
    return CustomerJourneyService.updateScore(id, { status: 'analyzed' });
  },

  async actionScore(id: string, _actionedBy: string): Promise<ExperienceScore | null> {
    return CustomerJourneyService.updateScore(id, { status: 'actioned' });
  },

  // ── Metrics & Stats ──

  async getCustomerJourneyMetrics(organizationId: string): Promise<CustomerJourneyMetrics> {
    const [journeys, touchpoints, scores, stages] = await Promise.all([
      CustomerJourneyService.listJourneys(organizationId),
      CustomerJourneyService.listTouchpoints(organizationId),
      CustomerJourneyService.listScores(organizationId),
      CustomerJourneyService.listStages(organizationId),
    ]);
    const activeJourneys = journeys.filter((j) => j.status === 'active').length;
    const totalTouchpoints = touchpoints.length;
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + (s.maxValue > 0 ? (s.value / s.maxValue) * 100 : 0), 0) / scores.length) * 10) / 10
      : 0;
    const stageTypes = new Set(stages.map((s) => s.type));
    const stagesCoverage = stageTypes.size;
    return { activeJourneys, totalTouchpoints, averageScore, stagesCoverage };
  },

  async getCustomerJourneyStats(organizationId: string): Promise<CustomerJourneyStats> {
    const [journeys, stages, touchpoints, scores] = await Promise.all([
      CustomerJourneyService.listJourneys(organizationId),
      CustomerJourneyService.listStages(organizationId),
      CustomerJourneyService.listTouchpoints(organizationId),
      CustomerJourneyService.listScores(organizationId),
    ]);
    const byJourneyStatus: Record<string, number> = {};
    const byStageType: Record<string, number> = {};
    const byTouchpointType: Record<string, number> = {};
    const byTouchpointStatus: Record<string, number> = {};
    const byScoreType: Record<string, number> = {};
    const byScoreStatus: Record<string, number> = {};
    for (const j of journeys) { byJourneyStatus[j.status] = (byJourneyStatus[j.status] ?? 0) + 1; }
    for (const s of stages) { byStageType[s.type] = (byStageType[s.type] ?? 0) + 1; }
    for (const t of touchpoints) { byTouchpointType[t.type] = (byTouchpointType[t.type] ?? 0) + 1; byTouchpointStatus[t.status] = (byTouchpointStatus[t.status] ?? 0) + 1; }
    for (const sc of scores) { byScoreType[sc.type] = (byScoreType[sc.type] ?? 0) + 1; byScoreStatus[sc.status] = (byScoreStatus[sc.status] ?? 0) + 1; }
    return {
      journeyCount: journeys.length,
      activeJourneyCount: journeys.filter((j) => j.status === 'active').length,
      stageCount: stages.length,
      touchpointCount: touchpoints.length,
      activeTouchpointCount: touchpoints.filter((t) => t.status === 'active').length,
      scoreCount: scores.length,
      analyzedScoreCount: scores.filter((s) => s.status === 'analyzed' || s.status === 'actioned').length,
      byJourneyStatus, byStageType, byTouchpointType, byTouchpointStatus, byScoreType, byScoreStatus,
    };
  },
};
