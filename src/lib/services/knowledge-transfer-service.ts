import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ArticleType = 'guide' | 'tutorial' | 'reference' | 'faq' | 'best_practice' | 'lesson_learned' | 'case_study' | 'runbook' | 'whitepaper';
export type ArticleStatus = 'draft' | 'in_review' | 'published' | 'archived' | 'outdated';
export type MentorshipStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';
export type SessionType = 'workshop' | 'shadowing' | 'presentation' | 'demo' | 'review' | 'pairing' | 'training' | 'debrief';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type PlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PlanPriority = 'low' | 'medium' | 'high' | 'critical';

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

export interface KtArticle {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ArticleType;
  description: string;
  content: string;
  tags: string[];
  status: ArticleStatus;
  author: string;
  department: string;
  version: string;
  publishedDate: Date | null;
  reviewedBy: string;
  reviewedDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mentorship {
  id: string;
  organizationId: string;
  workspaceId: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  description: string;
  goals: string[];
  status: MentorshipStatus;
  startDate: Date | null;
  endDate: Date | null;
  department: string;
  skills: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KtSession {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: SessionType;
  description: string;
  mentorshipId: string | null;
  presenter: string;
  attendees: string[];
  scheduledDate: Date | null;
  duration: number;
  location: string;
  status: SessionStatus;
  materials: string[];
  feedback: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  owner: string;
  priority: PlanPriority;
  status: PlanStatus;
  sourcePerson: string;
  targetPerson: string;
  department: string;
  skills: string[];
  startDate: Date | null;
  endDate: Date | null;
  milestones: string[];
  progress: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeTransferMetrics {
  publishedArticles: number;
  activeMentorships: number;
  scheduledSessions: number;
  activePlans: number;
  completionRate: number;
}

export interface KnowledgeTransferStats {
  articleCount: number;
  mentorshipCount: number;
  sessionCount: number;
  planCount: number;
  byArticleType: Record<string, number>;
  byArticleStatus: Record<string, number>;
  byMentorshipStatus: Record<string, number>;
  bySessionType: Record<string, number>;
  bySessionStatus: Record<string, number>;
  byPlanStatus: Record<string, number>;
  byPlanPriority: Record<string, number>;
}

// ── Input / Options ──

export interface CreateArticleInput {
  title: string;
  type: ArticleType;
  description?: string;
  content?: string;
  tags?: string[];
  status?: ArticleStatus;
  author?: string;
  department?: string;
  version?: string;
  publishedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
}

export interface UpdateArticleInput {
  title?: string;
  type?: ArticleType;
  description?: string;
  content?: string;
  tags?: string[];
  status?: ArticleStatus;
  author?: string;
  department?: string;
  version?: string;
  publishedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
}

export interface ListArticlesOpts {
  type?: ArticleType;
  status?: ArticleStatus;
  department?: string;
}

export interface CreateMentorshipInput {
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  description?: string;
  goals?: string[];
  status?: MentorshipStatus;
  startDate?: string;
  endDate?: string;
  department?: string;
  skills?: string[];
  notes?: string;
}

export interface UpdateMentorshipInput {
  mentorId?: string;
  mentorName?: string;
  menteeId?: string;
  menteeName?: string;
  description?: string;
  goals?: string[];
  status?: MentorshipStatus;
  startDate?: string;
  endDate?: string;
  department?: string;
  skills?: string[];
  notes?: string;
}

export interface ListMentorshipsOpts {
  status?: MentorshipStatus;
  department?: string;
}

export interface CreateSessionInput {
  title: string;
  type: SessionType;
  description?: string;
  mentorshipId?: string;
  presenter?: string;
  attendees?: string[];
  scheduledDate?: string;
  duration?: number;
  location?: string;
  status?: SessionStatus;
  materials?: string[];
  feedback?: string;
  notes?: string;
}

export interface UpdateSessionInput {
  title?: string;
  type?: SessionType;
  description?: string;
  mentorshipId?: string;
  presenter?: string;
  attendees?: string[];
  scheduledDate?: string;
  duration?: number;
  location?: string;
  status?: SessionStatus;
  materials?: string[];
  feedback?: string;
  notes?: string;
}

export interface ListSessionsOpts {
  mentorshipId?: string;
  type?: SessionType;
  status?: SessionStatus;
}

export interface CreatePlanInput {
  title: string;
  description?: string;
  owner?: string;
  priority?: PlanPriority;
  status?: PlanStatus;
  sourcePerson?: string;
  targetPerson?: string;
  department?: string;
  skills?: string[];
  startDate?: string;
  endDate?: string;
  milestones?: string[];
  progress?: number;
  notes?: string;
}

export interface UpdatePlanInput {
  title?: string;
  description?: string;
  owner?: string;
  priority?: PlanPriority;
  status?: PlanStatus;
  sourcePerson?: string;
  targetPerson?: string;
  department?: string;
  skills?: string[];
  startDate?: string;
  endDate?: string;
  milestones?: string[];
  progress?: number;
  notes?: string;
}

export interface ListPlansOpts {
  status?: PlanStatus;
  priority?: PlanPriority;
  department?: string;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toArticle(row: MemoryRow): KtArticle {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as ArticleType) ?? 'guide',
    description: (c.description as string) ?? '',
    content: (c.content as string) ?? '',
    tags: (c.tags as string[]) ?? [],
    status: (c.status as ArticleStatus) ?? 'draft',
    author: (c.author as string) ?? '',
    department: (c.department as string) ?? '',
    version: (c.version as string) ?? '1.0',
    publishedDate: c.publishedDate ? new Date(c.publishedDate as string) : null,
    reviewedBy: (c.reviewedBy as string) ?? '',
    reviewedDate: c.reviewedDate ? new Date(c.reviewedDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMentorship(row: MemoryRow): Mentorship {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    mentorId: (c.mentorId as string) ?? '',
    mentorName: (c.mentorName as string) ?? '',
    menteeId: (c.menteeId as string) ?? '',
    menteeName: (c.menteeName as string) ?? '',
    description: (c.description as string) ?? '',
    goals: (c.goals as string[]) ?? [],
    status: (c.status as MentorshipStatus) ?? 'active',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    department: (c.department as string) ?? '',
    skills: (c.skills as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSession(row: MemoryRow): KtSession {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as SessionType) ?? 'workshop',
    description: (c.description as string) ?? '',
    mentorshipId: (c.mentorshipId as string) ?? null,
    presenter: (c.presenter as string) ?? '',
    attendees: (c.attendees as string[]) ?? [],
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate as string) : null,
    duration: (c.duration as number) ?? 0,
    location: (c.location as string) ?? '',
    status: (c.status as SessionStatus) ?? 'scheduled',
    materials: (c.materials as string[]) ?? [],
    feedback: (c.feedback as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPlan(row: MemoryRow): TransferPlan {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    owner: (c.owner as string) ?? '',
    priority: (c.priority as PlanPriority) ?? 'medium',
    status: (c.status as PlanStatus) ?? 'draft',
    sourcePerson: (c.sourcePerson as string) ?? '',
    targetPerson: (c.targetPerson as string) ?? '',
    department: (c.department as string) ?? '',
    skills: (c.skills as string[]) ?? [],
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    milestones: (c.milestones as string[]) ?? [],
    progress: (c.progress as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const KnowledgeTransferService = {
  // ── Articles ──

  async createArticle(organizationId: string, workspaceId: string, input: CreateArticleInput, createdBy: string): Promise<KtArticle> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      content: input.content ?? '',
      tags: input.tags ?? [],
      status: input.status ?? 'draft',
      author: input.author ?? '',
      department: input.department ?? '',
      version: input.version ?? '1.0',
      publishedDate: input.publishedDate ?? null,
      reviewedBy: input.reviewedBy ?? '',
      reviewedDate: input.reviewedDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kt_article',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kt_article', content.type, content.status]),
        createdBy,
      },
    });
    return toArticle(row as MemoryRow);
  },

  async getArticle(id: string): Promise<KtArticle | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kt_article') return null;
    return toArticle(row as MemoryRow);
  },

  async listArticles(organizationId: string, opts: ListArticlesOpts = {}): Promise<KtArticle[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kt_article' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.department) conditions.push({ content: { contains: `"department":"${opts.department}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toArticle);
  },

  async updateArticle(id: string, input: UpdateArticleInput): Promise<KtArticle | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const articleType = input.type !== undefined ? input.type : (c.type as ArticleType) ?? 'guide';
    const status = input.status !== undefined ? input.status : (c.status as ArticleStatus) ?? 'draft';
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.publishedDate !== undefined && { publishedDate: input.publishedDate }),
      ...(input.reviewedBy !== undefined && { reviewedBy: input.reviewedBy }),
      ...(input.reviewedDate !== undefined && { reviewedDate: input.reviewedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kt_article', articleType, status]) },
    }), null);
    if (!row) return null;
    return toArticle(row as MemoryRow);
  },

  async deleteArticle(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishArticle(id: string, _publishedBy: string): Promise<KtArticle | null> {
    return KnowledgeTransferService.updateArticle(id, { status: 'published', publishedDate: new Date().toISOString() });
  },

  async archiveArticle(id: string, _archivedBy: string): Promise<KtArticle | null> {
    return KnowledgeTransferService.updateArticle(id, { status: 'archived' });
  },

  // ── Mentorships ──

  async createMentorship(organizationId: string, workspaceId: string, input: CreateMentorshipInput, createdBy: string): Promise<Mentorship> {
    const content = {
      mentorId: input.mentorId,
      mentorName: input.mentorName,
      menteeId: input.menteeId,
      menteeName: input.menteeName,
      description: input.description ?? '',
      goals: input.goals ?? [],
      status: input.status ?? 'active',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      department: input.department ?? '',
      skills: input.skills ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'mentorship',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['mentorship', content.status]),
        createdBy,
      },
    });
    return toMentorship(row as MemoryRow);
  },

  async getMentorship(id: string): Promise<Mentorship | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'mentorship') return null;
    return toMentorship(row as MemoryRow);
  },

  async listMentorships(organizationId: string, opts: ListMentorshipsOpts = {}): Promise<Mentorship[]> {
    const where: Record<string, unknown> = { organizationId, type: 'mentorship' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.department) conditions.push({ content: { contains: `"department":"${opts.department}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toMentorship);
  },

  async updateMentorship(id: string, input: UpdateMentorshipInput): Promise<Mentorship | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const status = input.status !== undefined ? input.status : (c.status as MentorshipStatus) ?? 'active';
    const content = {
      ...c,
      ...(input.mentorId !== undefined && { mentorId: input.mentorId }),
      ...(input.mentorName !== undefined && { mentorName: input.mentorName }),
      ...(input.menteeId !== undefined && { menteeId: input.menteeId }),
      ...(input.menteeName !== undefined && { menteeName: input.menteeName }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.goals !== undefined && { goals: input.goals }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.skills !== undefined && { skills: input.skills }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['mentorship', status]) },
    }), null);
    if (!row) return null;
    return toMentorship(row as MemoryRow);
  },

  async deleteMentorship(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async completeMentorship(id: string, _completedBy: string): Promise<Mentorship | null> {
    return KnowledgeTransferService.updateMentorship(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async holdMentorship(id: string, _holdBy: string): Promise<Mentorship | null> {
    return KnowledgeTransferService.updateMentorship(id, { status: 'on_hold' });
  },

  // ── Sessions ──

  async createSession(organizationId: string, workspaceId: string, input: CreateSessionInput, createdBy: string): Promise<KtSession> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      mentorshipId: input.mentorshipId ?? null,
      presenter: input.presenter ?? '',
      attendees: input.attendees ?? [],
      scheduledDate: input.scheduledDate ?? null,
      duration: input.duration ?? 0,
      location: input.location ?? '',
      status: input.status ?? 'scheduled',
      materials: input.materials ?? [],
      feedback: input.feedback ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'kt_session',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.mentorshipId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['kt_session', content.type, content.status]),
        createdBy,
      },
    });
    return toSession(row as MemoryRow);
  },

  async getSession(id: string): Promise<KtSession | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'kt_session') return null;
    return toSession(row as MemoryRow);
  },

  async listSessions(organizationId: string, opts: ListSessionsOpts = {}): Promise<KtSession[]> {
    const where: Record<string, unknown> = { organizationId, type: 'kt_session' };
    const conditions: unknown[] = [];
    if (opts.mentorshipId) conditions.push({ content: { contains: `"mentorshipId":"${opts.mentorshipId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSession);
  },

  async updateSession(id: string, input: UpdateSessionInput): Promise<KtSession | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const sessionType = input.type !== undefined ? input.type : (c.type as SessionType) ?? 'workshop';
    const status = input.status !== undefined ? input.status : (c.status as SessionStatus) ?? 'scheduled';
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.mentorshipId !== undefined && { mentorshipId: input.mentorshipId }),
      ...(input.presenter !== undefined && { presenter: input.presenter }),
      ...(input.attendees !== undefined && { attendees: input.attendees }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.materials !== undefined && { materials: input.materials }),
      ...(input.feedback !== undefined && { feedback: input.feedback }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['kt_session', sessionType, status]) },
    }), null);
    if (!row) return null;
    return toSession(row as MemoryRow);
  },

  async deleteSession(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startSession(id: string, _startedBy: string): Promise<KtSession | null> {
    return KnowledgeTransferService.updateSession(id, { status: 'in_progress' });
  },

  async completeSession(id: string, _completedBy: string): Promise<KtSession | null> {
    return KnowledgeTransferService.updateSession(id, { status: 'completed' });
  },

  async postponeSession(id: string, newDate: string, _postponedBy: string): Promise<KtSession | null> {
    return KnowledgeTransferService.updateSession(id, { status: 'postponed', scheduledDate: newDate });
  },

  // ── Plans ──

  async createPlan(organizationId: string, workspaceId: string, input: CreatePlanInput, createdBy: string): Promise<TransferPlan> {
    const content = {
      title: input.title.trim(),
      description: input.description ?? '',
      owner: input.owner ?? '',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'draft',
      sourcePerson: input.sourcePerson ?? '',
      targetPerson: input.targetPerson ?? '',
      department: input.department ?? '',
      skills: input.skills ?? [],
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      milestones: input.milestones ?? [],
      progress: input.progress ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'transfer_plan',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['transfer_plan', content.priority, content.status]),
        createdBy,
      },
    });
    return toPlan(row as MemoryRow);
  },

  async getPlan(id: string): Promise<TransferPlan | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'transfer_plan') return null;
    return toPlan(row as MemoryRow);
  },

  async listPlans(organizationId: string, opts: ListPlansOpts = {}): Promise<TransferPlan[]> {
    const where: Record<string, unknown> = { organizationId, type: 'transfer_plan' };
    const conditions: unknown[] = [];
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (opts.department) conditions.push({ content: { contains: `"department":"${opts.department}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<TransferPlan | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const priority = input.priority !== undefined ? input.priority : (c.priority as PlanPriority) ?? 'medium';
    const status = input.status !== undefined ? input.status : (c.status as PlanStatus) ?? 'draft';
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sourcePerson !== undefined && { sourcePerson: input.sourcePerson }),
      ...(input.targetPerson !== undefined && { targetPerson: input.targetPerson }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.skills !== undefined && { skills: input.skills }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.milestones !== undefined && { milestones: input.milestones }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['transfer_plan', priority, status]) },
    }), null);
    if (!row) return null;
    return toPlan(row as MemoryRow);
  },

  async deletePlan(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePlan(id: string, _activatedBy: string): Promise<TransferPlan | null> {
    return KnowledgeTransferService.updatePlan(id, { status: 'active' });
  },

  async completePlan(id: string, _completedBy: string): Promise<TransferPlan | null> {
    return KnowledgeTransferService.updatePlan(id, { status: 'completed', progress: 100 });
  },

  // ── Metrics & Stats ──

  async getKnowledgeTransferMetrics(organizationId: string): Promise<KnowledgeTransferMetrics> {
    const [articles, mentorships, sessions, plans] = await Promise.all([
      KnowledgeTransferService.listArticles(organizationId),
      KnowledgeTransferService.listMentorships(organizationId),
      KnowledgeTransferService.listSessions(organizationId),
      KnowledgeTransferService.listPlans(organizationId),
    ]);
    const publishedArticles = articles.filter((a) => a.status === 'published').length;
    const activeMentorships = mentorships.filter((m) => m.status === 'active').length;
    const scheduledSessions = sessions.filter((s) => s.status === 'scheduled').length;
    const activePlans = plans.filter((p) => p.status === 'active').length;
    const completedPlans = plans.filter((p) => p.status === 'completed').length;
    const completionRate = plans.length > 0 ? Math.round((completedPlans / plans.length) * 100) : 0;
    return { publishedArticles, activeMentorships, scheduledSessions, activePlans, completionRate };
  },

  async getKnowledgeTransferStats(organizationId: string): Promise<KnowledgeTransferStats> {
    const [articles, mentorships, sessions, plans] = await Promise.all([
      KnowledgeTransferService.listArticles(organizationId),
      KnowledgeTransferService.listMentorships(organizationId),
      KnowledgeTransferService.listSessions(organizationId),
      KnowledgeTransferService.listPlans(organizationId),
    ]);
    const byArticleType: Record<string, number> = {};
    const byArticleStatus: Record<string, number> = {};
    const byMentorshipStatus: Record<string, number> = {};
    const bySessionType: Record<string, number> = {};
    const bySessionStatus: Record<string, number> = {};
    const byPlanStatus: Record<string, number> = {};
    const byPlanPriority: Record<string, number> = {};
    for (const a of articles) { byArticleType[a.type] = (byArticleType[a.type] ?? 0) + 1; byArticleStatus[a.status] = (byArticleStatus[a.status] ?? 0) + 1; }
    for (const m of mentorships) { byMentorshipStatus[m.status] = (byMentorshipStatus[m.status] ?? 0) + 1; }
    for (const s of sessions) { bySessionType[s.type] = (bySessionType[s.type] ?? 0) + 1; bySessionStatus[s.status] = (bySessionStatus[s.status] ?? 0) + 1; }
    for (const p of plans) { byPlanStatus[p.status] = (byPlanStatus[p.status] ?? 0) + 1; byPlanPriority[p.priority] = (byPlanPriority[p.priority] ?? 0) + 1; }
    return {
      articleCount: articles.length,
      mentorshipCount: mentorships.length,
      sessionCount: sessions.length,
      planCount: plans.length,
      byArticleType, byArticleStatus, byMentorshipStatus, bySessionType, bySessionStatus, byPlanStatus, byPlanPriority,
    };
  },
};
