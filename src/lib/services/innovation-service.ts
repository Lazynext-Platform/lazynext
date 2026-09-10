import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type IdeaCategory = 'product' | 'process' | 'service' | 'business_model' | 'technology' | 'customer_experience';
export type IdeaStage = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'in_development' | 'launched' | 'archived';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PatentStatus = 'idea' | 'filing_preparation' | 'filed' | 'under_review' | 'granted' | 'rejected' | 'abandoned';
export type PatentType = 'utility' | 'design' | 'plant' | 'provisional';
export type ChallengeStatus = 'open' | 'judging' | 'closed';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string | null;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface IdeaContent {
  title: string;
  description: string;
  category: IdeaCategory;
  submittedBy: string;
  stage: IdeaStage;
  tags: string[];
  estimatedValue: number | null;
  estimatedEffort: number | null;
  votes: string[];
  advancedBy: string;
  advancedAt: string | null;
}

interface Milestone {
  name: string;
  dueDate: string | null;
  status: MilestoneStatus;
}

interface ProjectContent {
  ideaId: string | null;
  name: string;
  description: string;
  category: IdeaCategory;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  teamLead: string;
  teamMembers: string[];
  milestones: Milestone[];
  successMetrics: string[];
}

interface PatentContent {
  title: string;
  applicationNumber: string;
  filingDate: string | null;
  status: PatentStatus;
  inventor: string;
  assignee: string;
  abstract: string;
  claims: string[];
  patentType: PatentType;
  jurisdiction: string;
  grantedDate: string | null;
  expiryDate: string | null;
}

interface MetricContent {
  name: string;
  category: string;
  value: number;
  unit: string;
  period: string;
  target: number | null;
  previousValue: number | null;
  trend: string;
}

interface ChallengeContent {
  title: string;
  description: string;
  category: IdeaCategory;
  prize: string;
  deadline: string | null;
  status: ChallengeStatus;
  participants: string[];
  submissions: string[];
  winnerId: string | null;
  criteria: string[];
  selectedBy: string;
  selectedAt: string | null;
}

// ── Public interfaces ──

export interface InnovationIdea {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  submittedBy: string;
  stage: IdeaStage;
  tags: string[];
  estimatedValue: number | null;
  estimatedEffort: number | null;
  votes: string[];
  advancedBy: string;
  advancedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationProject {
  id: string;
  organizationId: string;
  workspaceId: string;
  ideaId: string | null;
  name: string;
  description: string;
  category: IdeaCategory;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  teamLead: string;
  teamMembers: string[];
  milestones: Milestone[];
  successMetrics: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationPatent {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  applicationNumber: string;
  filingDate: Date | null;
  status: PatentStatus;
  inventor: string;
  assignee: string;
  abstract: string;
  claims: string[];
  patentType: PatentType;
  jurisdiction: string;
  grantedDate: Date | null;
  expiryDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationMetric {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  period: string;
  target: number | null;
  previousValue: number | null;
  trend: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationChallenge {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  prize: string;
  deadline: Date | null;
  status: ChallengeStatus;
  participants: string[];
  submissions: string[];
  winnerId: string | null;
  criteria: string[];
  selectedBy: string;
  selectedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InnovationMetricsSummary {
  ideasByStage: Record<string, number>;
  totalIdeas: number;
  activeProjects: number;
  totalProjects: number;
  patentsByStatus: Record<string, number>;
  totalPatents: number;
  avgTimeToLaunch: number;
  launchedIdeas: number;
  innovationROI: number;
  totalEstimatedValue: number;
  totalEstimatedEffort: number;
}

export interface InnovationStats {
  ideaCount: number;
  projectCount: number;
  patentCount: number;
  metricCount: number;
  challengeCount: number;
  openChallengeCount: number;
  activeProjectCount: number;
  launchedIdeaCount: number;
  byIdeaStage: Record<string, number>;
  byProjectStatus: Record<string, number>;
  byPatentStatus: Record<string, number>;
  byChallengeStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateIdeaInput {
  title: string;
  description?: string;
  category: IdeaCategory;
  submittedBy: string;
  stage?: IdeaStage;
  tags?: string[];
  estimatedValue?: number;
  estimatedEffort?: number;
  votes?: string[];
}

export interface UpdateIdeaInput {
  title?: string;
  description?: string;
  category?: IdeaCategory;
  stage?: IdeaStage;
  tags?: string[];
  estimatedValue?: number;
  estimatedEffort?: number;
}

export interface ListIdeasOpts {
  category?: IdeaCategory;
  stage?: IdeaStage;
  submittedBy?: string;
}

export interface MilestoneInput {
  name: string;
  dueDate?: string;
  status?: MilestoneStatus;
}

export interface CreateProjectInput {
  ideaId?: string;
  name: string;
  description?: string;
  category: IdeaCategory;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamLead?: string;
  teamMembers?: string[];
  milestones?: MilestoneInput[];
  successMetrics?: string[];
}

export interface UpdateProjectInput {
  ideaId?: string;
  name?: string;
  description?: string;
  category?: IdeaCategory;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamLead?: string;
  teamMembers?: string[];
  milestones?: MilestoneInput[];
  successMetrics?: string[];
}

export interface ListProjectsOpts {
  category?: IdeaCategory;
  status?: ProjectStatus;
  teamLead?: string;
}

export interface CreatePatentInput {
  title: string;
  applicationNumber?: string;
  filingDate?: string;
  status: PatentStatus;
  inventor?: string;
  assignee?: string;
  abstract?: string;
  claims?: string[];
  patentType?: PatentType;
  jurisdiction?: string;
  grantedDate?: string;
  expiryDate?: string;
}

export interface UpdatePatentInput {
  title?: string;
  applicationNumber?: string;
  filingDate?: string;
  status?: PatentStatus;
  inventor?: string;
  assignee?: string;
  abstract?: string;
  claims?: string[];
  patentType?: PatentType;
  jurisdiction?: string;
  grantedDate?: string;
  expiryDate?: string;
}

export interface ListPatentsOpts {
  status?: PatentStatus;
  patentType?: PatentType;
  jurisdiction?: string;
}

export interface CreateMetricInput {
  name: string;
  category: string;
  value: number;
  unit: string;
  period: string;
  target?: number;
  previousValue?: number;
  trend?: string;
}

export interface UpdateMetricInput {
  name?: string;
  category?: string;
  value?: number;
  unit?: string;
  period?: string;
  target?: number;
  previousValue?: number;
  trend?: string;
}

export interface ListMetricsOpts {
  category?: string;
  period?: string;
}

export interface CreateChallengeInput {
  title: string;
  description?: string;
  category: IdeaCategory;
  prize?: string;
  deadline?: string;
  status?: ChallengeStatus;
  participants?: string[];
  submissions?: string[];
  winnerId?: string;
  criteria?: string[];
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string;
  category?: IdeaCategory;
  prize?: string;
  deadline?: string;
  status?: ChallengeStatus;
  participants?: string[];
  submissions?: string[];
  winnerId?: string;
  criteria?: string[];
}

export interface ListChallengesOpts {
  category?: IdeaCategory;
  status?: ChallengeStatus;
}

// ── Helpers ──

const fallbackIdea: IdeaContent = {
  title: '', description: '', category: 'product', submittedBy: '', stage: 'submitted',
  tags: [], estimatedValue: null, estimatedEffort: null, votes: [], advancedBy: '', advancedAt: null,
};

const fallbackProject: ProjectContent = {
  ideaId: null, name: '', description: '', category: 'product', status: 'planning',
  startDate: null, endDate: null, budget: null, teamLead: '', teamMembers: [],
  milestones: [], successMetrics: [],
};

const fallbackPatent: PatentContent = {
  title: '', applicationNumber: '', filingDate: null, status: 'idea', inventor: '',
  assignee: '', abstract: '', claims: [], patentType: 'utility', jurisdiction: '',
  grantedDate: null, expiryDate: null,
};

const fallbackMetric: MetricContent = {
  name: '', category: '', value: 0, unit: '', period: '', target: null,
  previousValue: null, trend: '',
};

const fallbackChallenge: ChallengeContent = {
  title: '', description: '', category: 'product', prize: '', deadline: null,
  status: 'open', participants: [], submissions: [], winnerId: null, criteria: [],
  selectedBy: '', selectedAt: null,
};

function parseIdea(raw: string): IdeaContent {
  if (!raw) return fallbackIdea;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      category: (p.category as IdeaCategory) ?? 'product',
      submittedBy: p.submittedBy ?? '',
      stage: (p.stage as IdeaStage) ?? 'submitted',
      tags: Array.isArray(p.tags) ? p.tags : [],
      estimatedValue: p.estimatedValue ?? null,
      estimatedEffort: p.estimatedEffort ?? null,
      votes: Array.isArray(p.votes) ? p.votes : [],
      advancedBy: p.advancedBy ?? '',
      advancedAt: p.advancedAt ?? null,
    };
  } catch { return fallbackIdea; }
}

function parseProject(raw: string): ProjectContent {
  if (!raw) return fallbackProject;
  try {
    const p = JSON.parse(raw);
    return {
      ideaId: p.ideaId ?? null,
      name: p.name ?? '',
      description: p.description ?? '',
      category: (p.category as IdeaCategory) ?? 'product',
      status: (p.status as ProjectStatus) ?? 'planning',
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      budget: p.budget ?? null,
      teamLead: p.teamLead ?? '',
      teamMembers: Array.isArray(p.teamMembers) ? p.teamMembers : [],
      milestones: Array.isArray(p.milestones) ? p.milestones : [],
      successMetrics: Array.isArray(p.successMetrics) ? p.successMetrics : [],
    };
  } catch { return fallbackProject; }
}

function parsePatent(raw: string): PatentContent {
  if (!raw) return fallbackPatent;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      applicationNumber: p.applicationNumber ?? '',
      filingDate: p.filingDate ?? null,
      status: (p.status as PatentStatus) ?? 'idea',
      inventor: p.inventor ?? '',
      assignee: p.assignee ?? '',
      abstract: p.abstract ?? '',
      claims: Array.isArray(p.claims) ? p.claims : [],
      patentType: (p.patentType as PatentType) ?? 'utility',
      jurisdiction: p.jurisdiction ?? '',
      grantedDate: p.grantedDate ?? null,
      expiryDate: p.expiryDate ?? null,
    };
  } catch { return fallbackPatent; }
}

function parseMetric(raw: string): MetricContent {
  if (!raw) return fallbackMetric;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      category: p.category ?? '',
      value: typeof p.value === 'number' ? p.value : 0,
      unit: p.unit ?? '',
      period: p.period ?? '',
      target: p.target ?? null,
      previousValue: p.previousValue ?? null,
      trend: p.trend ?? '',
    };
  } catch { return fallbackMetric; }
}

function parseChallenge(raw: string): ChallengeContent {
  if (!raw) return fallbackChallenge;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      category: (p.category as IdeaCategory) ?? 'product',
      prize: p.prize ?? '',
      deadline: p.deadline ?? null,
      status: (p.status as ChallengeStatus) ?? 'open',
      participants: Array.isArray(p.participants) ? p.participants : [],
      submissions: Array.isArray(p.submissions) ? p.submissions : [],
      winnerId: p.winnerId ?? null,
      criteria: Array.isArray(p.criteria) ? p.criteria : [],
      selectedBy: p.selectedBy ?? '',
      selectedAt: p.selectedAt ?? null,
    };
  } catch { return fallbackChallenge; }
}

function toIdea(row: MemoryRow): InnovationIdea {
  const c = parseIdea(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, category: c.category, submittedBy: c.submittedBy,
    stage: c.stage, tags: c.tags, estimatedValue: c.estimatedValue, estimatedEffort: c.estimatedEffort,
    votes: c.votes, advancedBy: c.advancedBy,
    advancedAt: c.advancedAt ? new Date(c.advancedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toProject(row: MemoryRow): InnovationProject {
  const c = parseProject(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    ideaId: c.ideaId, name: c.name, description: c.description, category: c.category,
    status: c.status, startDate: c.startDate ? new Date(c.startDate) : null,
    endDate: c.endDate ? new Date(c.endDate) : null, budget: c.budget, teamLead: c.teamLead,
    teamMembers: c.teamMembers, milestones: c.milestones, successMetrics: c.successMetrics,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPatent(row: MemoryRow): InnovationPatent {
  const c = parsePatent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, applicationNumber: c.applicationNumber,
    filingDate: c.filingDate ? new Date(c.filingDate) : null, status: c.status,
    inventor: c.inventor, assignee: c.assignee, abstract: c.abstract, claims: c.claims,
    patentType: c.patentType, jurisdiction: c.jurisdiction,
    grantedDate: c.grantedDate ? new Date(c.grantedDate) : null,
    expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMetric(row: MemoryRow): InnovationMetric {
  const c = parseMetric(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, category: c.category, value: c.value, unit: c.unit, period: c.period,
    target: c.target, previousValue: c.previousValue, trend: c.trend,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toChallenge(row: MemoryRow): InnovationChallenge {
  const c = parseChallenge(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, category: c.category, prize: c.prize,
    deadline: c.deadline ? new Date(c.deadline) : null, status: c.status,
    participants: c.participants, submissions: c.submissions, winnerId: c.winnerId,
    criteria: c.criteria, selectedBy: c.selectedBy,
    selectedAt: c.selectedAt ? new Date(c.selectedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Innovation Service ──

export const InnovationService = {
  // ── Ideas ──

  async createIdea(
    organizationId: string,
    workspaceId: string,
    input: CreateIdeaInput,
    createdBy: string,
  ): Promise<InnovationIdea> {
    const content: IdeaContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      category: input.category,
      submittedBy: input.submittedBy.trim(),
      stage: input.stage ?? 'submitted',
      tags: input.tags ?? [],
      estimatedValue: input.estimatedValue ?? null,
      estimatedEffort: input.estimatedEffort ?? null,
      votes: input.votes ?? [],
      advancedBy: '',
      advancedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'inn_idea',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['inn_idea', content.category, content.stage]),
        createdBy,
      },
    });

    return toIdea(row as MemoryRow);
  },

  async getIdea(id: string): Promise<InnovationIdea | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'inn_idea') return null;
    return toIdea(row as MemoryRow);
  },

  async listIdeas(organizationId: string, opts: ListIdeasOpts = {}): Promise<InnovationIdea[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'inn_idea', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toIdea(r as MemoryRow));
    if (opts.category) records = records.filter((i) => i.category === opts.category);
    if (opts.stage) records = records.filter((i) => i.stage === opts.stage);
    if (opts.submittedBy) records = records.filter((i) => i.submittedBy === opts.submittedBy);
    return records;
  },

  async updateIdea(id: string, input: UpdateIdeaInput): Promise<InnovationIdea | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIdea(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.stage !== undefined) content.stage = input.stage;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.estimatedValue !== undefined) content.estimatedValue = input.estimatedValue;
    if (input.estimatedEffort !== undefined) content.estimatedEffort = input.estimatedEffort;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_idea', content.category, content.stage]),
        },
      }), null,
    );
    if (!row) return null;
    return toIdea(row as MemoryRow);
  },

  async voteForIdea(id: string, voterId: string): Promise<InnovationIdea | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIdea(existing.content);
    if (!content.votes.includes(voterId)) {
      content.votes.push(voterId);
    }

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
        },
      }), null,
    );
    if (!row) return null;
    return toIdea(row as MemoryRow);
  },

  async advanceIdea(id: string, newStage: IdeaStage, advancedBy: string): Promise<InnovationIdea | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseIdea(existing.content);
    content.stage = newStage;
    content.advancedBy = advancedBy;
    content.advancedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_idea', content.category, content.stage]),
        },
      }), null,
    );
    if (!row) return null;
    return toIdea(row as MemoryRow);
  },

  // ── Projects ──

  async createProject(
    organizationId: string,
    workspaceId: string,
    input: CreateProjectInput,
    createdBy: string,
  ): Promise<InnovationProject> {
    const content: ProjectContent = {
      ideaId: input.ideaId ?? null,
      name: input.name.trim(),
      description: input.description ?? '',
      category: input.category,
      status: input.status,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? null,
      teamLead: input.teamLead ?? '',
      teamMembers: input.teamMembers ?? [],
      milestones: (input.milestones ?? []).map((m) => ({
        name: m.name.trim(),
        dueDate: m.dueDate ?? null,
        status: m.status ?? 'pending',
      })),
      successMetrics: input.successMetrics ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'inn_project',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.ideaId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['inn_project', content.category, content.status]),
        createdBy,
      },
    });

    return toProject(row as MemoryRow);
  },

  async getProject(id: string): Promise<InnovationProject | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'inn_project') return null;
    return toProject(row as MemoryRow);
  },

  async listProjects(organizationId: string, opts: ListProjectsOpts = {}): Promise<InnovationProject[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'inn_project', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toProject(r as MemoryRow));
    if (opts.category) records = records.filter((p) => p.category === opts.category);
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    if (opts.teamLead) records = records.filter((p) => p.teamLead === opts.teamLead);
    return records;
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<InnovationProject | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseProject(existing.content);
    if (input.ideaId !== undefined) content.ideaId = input.ideaId;
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.teamLead !== undefined) content.teamLead = input.teamLead;
    if (input.teamMembers !== undefined) content.teamMembers = input.teamMembers;
    if (input.milestones !== undefined) {
      content.milestones = input.milestones.map((m) => ({
        name: m.name.trim(), dueDate: m.dueDate ?? null, status: m.status ?? 'pending',
      }));
    }
    if (input.successMetrics !== undefined) content.successMetrics = input.successMetrics;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_project', content.category, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toProject(row as MemoryRow);
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Patents ──

  async createPatent(
    organizationId: string,
    workspaceId: string,
    input: CreatePatentInput,
    createdBy: string,
  ): Promise<InnovationPatent> {
    const content: PatentContent = {
      title: input.title.trim(),
      applicationNumber: input.applicationNumber ?? '',
      filingDate: input.filingDate ?? null,
      status: input.status,
      inventor: input.inventor ?? '',
      assignee: input.assignee ?? '',
      abstract: input.abstract ?? '',
      claims: input.claims ?? [],
      patentType: input.patentType ?? 'utility',
      jurisdiction: input.jurisdiction ?? '',
      grantedDate: input.grantedDate ?? null,
      expiryDate: input.expiryDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'inn_patent',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['inn_patent', content.status, content.patentType]),
        createdBy,
      },
    });

    return toPatent(row as MemoryRow);
  },

  async getPatent(id: string): Promise<InnovationPatent | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'inn_patent') return null;
    return toPatent(row as MemoryRow);
  },

  async listPatents(organizationId: string, opts: ListPatentsOpts = {}): Promise<InnovationPatent[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'inn_patent', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toPatent(r as MemoryRow));
    if (opts.status) records = records.filter((p) => p.status === opts.status);
    if (opts.patentType) records = records.filter((p) => p.patentType === opts.patentType);
    if (opts.jurisdiction) records = records.filter((p) => p.jurisdiction === opts.jurisdiction);
    return records;
  },

  async updatePatent(id: string, input: UpdatePatentInput): Promise<InnovationPatent | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parsePatent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.applicationNumber !== undefined) content.applicationNumber = input.applicationNumber;
    if (input.filingDate !== undefined) content.filingDate = input.filingDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.inventor !== undefined) content.inventor = input.inventor;
    if (input.assignee !== undefined) content.assignee = input.assignee;
    if (input.abstract !== undefined) content.abstract = input.abstract;
    if (input.claims !== undefined) content.claims = input.claims;
    if (input.patentType !== undefined) content.patentType = input.patentType;
    if (input.jurisdiction !== undefined) content.jurisdiction = input.jurisdiction;
    if (input.grantedDate !== undefined) content.grantedDate = input.grantedDate;
    if (input.expiryDate !== undefined) content.expiryDate = input.expiryDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_patent', content.status, content.patentType]),
        },
      }), null,
    );
    if (!row) return null;
    return toPatent(row as MemoryRow);
  },

  async deletePatent(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Metrics ──

  async createMetric(
    organizationId: string,
    workspaceId: string,
    input: CreateMetricInput,
    createdBy: string,
  ): Promise<InnovationMetric> {
    const content: MetricContent = {
      name: input.name.trim(),
      category: input.category.trim(),
      value: input.value,
      unit: input.unit.trim(),
      period: input.period.trim(),
      target: input.target ?? null,
      previousValue: input.previousValue ?? null,
      trend: input.trend ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'inn_metric',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['inn_metric', content.category, content.period]),
        createdBy,
      },
    });

    return toMetric(row as MemoryRow);
  },

  async getMetric(id: string): Promise<InnovationMetric | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'inn_metric') return null;
    return toMetric(row as MemoryRow);
  },

  async listMetrics(organizationId: string, opts: ListMetricsOpts = {}): Promise<InnovationMetric[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'inn_metric', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMetric(r as MemoryRow));
    if (opts.category) records = records.filter((m) => m.category === opts.category);
    if (opts.period) records = records.filter((m) => m.period === opts.period);
    return records;
  },

  async updateMetric(id: string, input: UpdateMetricInput): Promise<InnovationMetric | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMetric(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.category !== undefined) content.category = input.category.trim();
    if (input.value !== undefined) content.value = input.value;
    if (input.unit !== undefined) content.unit = input.unit.trim();
    if (input.period !== undefined) content.period = input.period.trim();
    if (input.target !== undefined) content.target = input.target;
    if (input.previousValue !== undefined) content.previousValue = input.previousValue;
    if (input.trend !== undefined) content.trend = input.trend;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_metric', content.category, content.period]),
        },
      }), null,
    );
    if (!row) return null;
    return toMetric(row as MemoryRow);
  },

  async deleteMetric(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Challenges ──

  async createChallenge(
    organizationId: string,
    workspaceId: string,
    input: CreateChallengeInput,
    createdBy: string,
  ): Promise<InnovationChallenge> {
    const content: ChallengeContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      category: input.category,
      prize: input.prize ?? '',
      deadline: input.deadline ?? null,
      status: input.status ?? 'open',
      participants: input.participants ?? [],
      submissions: input.submissions ?? [],
      winnerId: input.winnerId ?? null,
      criteria: input.criteria ?? [],
      selectedBy: '',
      selectedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'inn_challenge',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['inn_challenge', content.category, content.status]),
        createdBy,
      },
    });

    return toChallenge(row as MemoryRow);
  },

  async getChallenge(id: string): Promise<InnovationChallenge | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'inn_challenge') return null;
    return toChallenge(row as MemoryRow);
  },

  async listChallenges(organizationId: string, opts: ListChallengesOpts = {}): Promise<InnovationChallenge[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'inn_challenge', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toChallenge(r as MemoryRow));
    if (opts.category) records = records.filter((c) => c.category === opts.category);
    if (opts.status) records = records.filter((c) => c.status === opts.status);
    return records;
  },

  async updateChallenge(id: string, input: UpdateChallengeInput): Promise<InnovationChallenge | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChallenge(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.category !== undefined) content.category = input.category;
    if (input.prize !== undefined) content.prize = input.prize;
    if (input.deadline !== undefined) content.deadline = input.deadline;
    if (input.status !== undefined) content.status = input.status;
    if (input.participants !== undefined) content.participants = input.participants;
    if (input.submissions !== undefined) content.submissions = input.submissions;
    if (input.winnerId !== undefined) content.winnerId = input.winnerId;
    if (input.criteria !== undefined) content.criteria = input.criteria;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_challenge', content.category, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toChallenge(row as MemoryRow);
  },

  async selectWinner(id: string, winnerId: string, selectedBy: string): Promise<InnovationChallenge | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseChallenge(existing.content);
    content.winnerId = winnerId;
    content.selectedBy = selectedBy;
    content.selectedAt = new Date().toISOString();
    content.status = 'closed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['inn_challenge', content.category, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toChallenge(row as MemoryRow);
  },

  // ── Innovation Metrics ──

  async getInnovationMetrics(organizationId: string): Promise<InnovationMetricsSummary> {
    const [ideas, projects, patents] = await Promise.all([
      InnovationService.listIdeas(organizationId),
      InnovationService.listProjects(organizationId),
      InnovationService.listPatents(organizationId),
    ]);

    const ideasByStage: Record<string, number> = {};
    for (const i of ideas) {
      ideasByStage[i.stage] = (ideasByStage[i.stage] || 0) + 1;
    }

    const patentsByStatus: Record<string, number> = {};
    for (const p of patents) {
      patentsByStatus[p.status] = (patentsByStatus[p.status] || 0) + 1;
    }

    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const launchedIdeas = ideas.filter((i) => i.stage === 'launched').length;

    // Avg time to launch (in days) for launched ideas
    let avgTimeToLaunch = 0;
    if (launchedIdeas > 0) {
      const launched = ideas.filter((i) => i.stage === 'launched' && i.advancedAt);
      if (launched.length > 0) {
        const totalDays = launched.reduce((sum, i) => {
          const diff = (i.advancedAt!.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, diff);
        }, 0);
        avgTimeToLaunch = Math.round(totalDays / launched.length);
      }
    }

    const totalEstimatedValue = ideas.reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    const totalEstimatedEffort = ideas.reduce((sum, i) => sum + (i.estimatedEffort ?? 0), 0);

    // Innovation ROI proxy: total estimated value / total estimated effort
    const innovationROI = totalEstimatedEffort > 0 ? Math.round((totalEstimatedValue / totalEstimatedEffort) * 100) / 100 : 0;

    return {
      ideasByStage,
      totalIdeas: ideas.length,
      activeProjects,
      totalProjects: projects.length,
      patentsByStatus,
      totalPatents: patents.length,
      avgTimeToLaunch,
      launchedIdeas,
      innovationROI,
      totalEstimatedValue,
      totalEstimatedEffort,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<InnovationStats> {
    const [ideas, projects, patents, metrics, challenges] = await Promise.all([
      InnovationService.listIdeas(organizationId),
      InnovationService.listProjects(organizationId),
      InnovationService.listPatents(organizationId),
      InnovationService.listMetrics(organizationId),
      InnovationService.listChallenges(organizationId),
    ]);

    const byIdeaStage: Record<string, number> = {};
    for (const i of ideas) {
      byIdeaStage[i.stage] = (byIdeaStage[i.stage] || 0) + 1;
    }

    const byProjectStatus: Record<string, number> = {};
    for (const p of projects) {
      byProjectStatus[p.status] = (byProjectStatus[p.status] || 0) + 1;
    }

    const byPatentStatus: Record<string, number> = {};
    for (const p of patents) {
      byPatentStatus[p.status] = (byPatentStatus[p.status] || 0) + 1;
    }

    const byChallengeStatus: Record<string, number> = {};
    let openChallengeCount = 0;
    for (const c of challenges) {
      byChallengeStatus[c.status] = (byChallengeStatus[c.status] || 0) + 1;
      if (c.status === 'open') openChallengeCount++;
    }

    const activeProjectCount = projects.filter((p) => p.status === 'active').length;
    const launchedIdeaCount = ideas.filter((i) => i.stage === 'launched').length;

    return {
      ideaCount: ideas.length,
      projectCount: projects.length,
      patentCount: patents.length,
      metricCount: metrics.length,
      challengeCount: challenges.length,
      openChallengeCount,
      activeProjectCount,
      launchedIdeaCount,
      byIdeaStage,
      byProjectStatus,
      byPatentStatus,
      byChallengeStatus,
    };
  },
};
