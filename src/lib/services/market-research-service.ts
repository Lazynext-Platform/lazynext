import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ProjectType = 'market_sizing' | 'customer_survey' | 'competitor_analysis' | 'trend_analysis' | 'product_testing' | 'brand_research' | 'pricing_research' | 'segmentation' | 'feasibility' | 'custom';
export type ProjectStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type SegmentType = 'demographic' | 'geographic' | 'psychographic' | 'behavioral' | 'firmographic' | 'technographic';
export type SegmentStatus = 'active' | 'inactive' | 'archived';
export type CompetitorType = 'direct' | 'indirect' | 'potential' | 'replacement';
export type CompetitorStatus = 'tracking' | 'watching' | 'critical' | 'archived';
export type InsightType = 'opportunity' | 'threat' | 'trend' | 'gap' | 'recommendation' | 'finding' | 'benchmark';
export type InsightStatus = 'new' | 'validated' | 'actioned' | 'archived';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

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

export interface ResearchProject {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string;
  objectives: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  lead: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketSegment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SegmentType;
  status: SegmentStatus;
  description: string;
  size: number;
  criteria: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitorAnalysis {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: CompetitorType;
  status: CompetitorStatus;
  description: string;
  strengths: string;
  weaknesses: string;
  marketShare: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchInsight {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string | null;
  type: InsightType;
  status: InsightStatus;
  priority: InsightPriority;
  title: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketResearchMetrics {
  activeProjects: number;
  completedProjects: number;
  trackedCompetitors: number;
  activeSegments: number;
  newInsights: number;
}

export interface MarketResearchStats {
  projectCount: number;
  segmentCount: number;
  competitorCount: number;
  insightCount: number;
  byProjectType: Record<string, number>;
  byProjectStatus: Record<string, number>;
  bySegmentType: Record<string, number>;
  bySegmentStatus: Record<string, number>;
  byCompetitorType: Record<string, number>;
  byCompetitorStatus: Record<string, number>;
  byInsightType: Record<string, number>;
  byInsightStatus: Record<string, number>;
  byInsightPriority: Record<string, number>;
}

// ── Input / Options ──

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  status?: ProjectStatus;
  description?: string;
  objectives?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  lead?: string;
  notes?: string;
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  description?: string;
  objectives?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  lead?: string;
  notes?: string;
}

export interface ListProjectsOpts {
  type?: ProjectType;
  status?: ProjectStatus;
}

export interface CreateSegmentInput {
  name: string;
  type: SegmentType;
  status?: SegmentStatus;
  description?: string;
  size?: number;
  criteria?: string;
  notes?: string;
}

export interface UpdateSegmentInput {
  name?: string;
  type?: SegmentType;
  status?: SegmentStatus;
  description?: string;
  size?: number;
  criteria?: string;
  notes?: string;
}

export interface ListSegmentsOpts {
  type?: SegmentType;
  status?: SegmentStatus;
}

export interface CreateCompetitorInput {
  name: string;
  type: CompetitorType;
  status?: CompetitorStatus;
  description?: string;
  strengths?: string;
  weaknesses?: string;
  marketShare?: number;
  notes?: string;
}

export interface UpdateCompetitorInput {
  name?: string;
  type?: CompetitorType;
  status?: CompetitorStatus;
  description?: string;
  strengths?: string;
  weaknesses?: string;
  marketShare?: number;
  notes?: string;
}

export interface ListCompetitorsOpts {
  type?: CompetitorType;
  status?: CompetitorStatus;
}

export interface CreateInsightInput {
  projectId?: string;
  type: InsightType;
  status?: InsightStatus;
  priority?: InsightPriority;
  title: string;
  description?: string;
  notes?: string;
}

export interface UpdateInsightInput {
  projectId?: string;
  type?: InsightType;
  status?: InsightStatus;
  priority?: InsightPriority;
  title?: string;
  description?: string;
  notes?: string;
}

export interface ListInsightsOpts {
  projectId?: string;
  type?: InsightType;
  status?: InsightStatus;
  priority?: InsightPriority;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toProject(row: MemoryRow): ResearchProject {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ProjectType) ?? 'custom',
    status: (c.status as ProjectStatus) ?? 'planned',
    description: (c.description as string) ?? '',
    objectives: (c.objectives as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    budget: (c.budget as number) ?? 0,
    lead: (c.lead as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSegment(row: MemoryRow): MarketSegment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SegmentType) ?? 'demographic',
    status: (c.status as SegmentStatus) ?? 'active',
    description: (c.description as string) ?? '',
    size: (c.size as number) ?? 0,
    criteria: (c.criteria as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toCompetitor(row: MemoryRow): CompetitorAnalysis {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as CompetitorType) ?? 'direct',
    status: (c.status as CompetitorStatus) ?? 'tracking',
    description: (c.description as string) ?? '',
    strengths: (c.strengths as string) ?? '',
    weaknesses: (c.weaknesses as string) ?? '',
    marketShare: (c.marketShare as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toInsight(row: MemoryRow): ResearchInsight {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    projectId: (c.projectId as string) ?? null,
    type: (c.type as InsightType) ?? 'finding',
    status: (c.status as InsightStatus) ?? 'new',
    priority: (c.priority as InsightPriority) ?? 'medium',
    title: (c.title as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const MarketResearchService = {
  // ── Projects ──

  async createProject(organizationId: string, workspaceId: string, input: CreateProjectInput, createdBy: string): Promise<ResearchProject> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'planned',
      description: input.description ?? '',
      objectives: input.objectives ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? 0,
      lead: input.lead ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'research_project',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['research_project', content.type, content.status]),
        createdBy,
      },
    });
    return toProject(row as MemoryRow);
  },

  async getProject(id: string): Promise<ResearchProject | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'research_project') return null;
    return toProject(row as MemoryRow);
  },

  async listProjects(organizationId: string, opts: ListProjectsOpts = {}): Promise<ResearchProject[]> {
    const where: Record<string, unknown> = { organizationId, type: 'research_project' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProject);
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<ResearchProject | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.objectives !== undefined && { objectives: input.objectives }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.lead !== undefined && { lead: input.lead }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['research_project', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProject(row as MemoryRow);
  },

  async deleteProject(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startProject(id: string, _startedBy: string): Promise<ResearchProject | null> {
    return MarketResearchService.updateProject(id, { status: 'in_progress' });
  },

  async completeProject(id: string, _completedBy: string): Promise<ResearchProject | null> {
    return MarketResearchService.updateProject(id, { status: 'completed' });
  },

  async holdProject(id: string, _holdBy: string): Promise<ResearchProject | null> {
    return MarketResearchService.updateProject(id, { status: 'on_hold' });
  },

  // ── Segments ──

  async createSegment(organizationId: string, workspaceId: string, input: CreateSegmentInput, createdBy: string): Promise<MarketSegment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'active',
      description: input.description ?? '',
      size: input.size ?? 0,
      criteria: input.criteria ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'market_segment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['market_segment', content.type, content.status]),
        createdBy,
      },
    });
    return toSegment(row as MemoryRow);
  },

  async getSegment(id: string): Promise<MarketSegment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'market_segment') return null;
    return toSegment(row as MemoryRow);
  },

  async listSegments(organizationId: string, opts: ListSegmentsOpts = {}): Promise<MarketSegment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'market_segment' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSegment);
  },

  async updateSegment(id: string, input: UpdateSegmentInput): Promise<MarketSegment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.size !== undefined && { size: input.size }),
      ...(input.criteria !== undefined && { criteria: input.criteria }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['market_segment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSegment(row as MemoryRow);
  },

  async deleteSegment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async archiveSegment(id: string, _archivedBy: string): Promise<MarketSegment | null> {
    return MarketResearchService.updateSegment(id, { status: 'archived' });
  },

  // ── Competitors ──

  async createCompetitor(organizationId: string, workspaceId: string, input: CreateCompetitorInput, createdBy: string): Promise<CompetitorAnalysis> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'tracking',
      description: input.description ?? '',
      strengths: input.strengths ?? '',
      weaknesses: input.weaknesses ?? '',
      marketShare: input.marketShare ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'competitor_analysis',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['competitor_analysis', content.type, content.status]),
        createdBy,
      },
    });
    return toCompetitor(row as MemoryRow);
  },

  async getCompetitor(id: string): Promise<CompetitorAnalysis | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'competitor_analysis') return null;
    return toCompetitor(row as MemoryRow);
  },

  async listCompetitors(organizationId: string, opts: ListCompetitorsOpts = {}): Promise<CompetitorAnalysis[]> {
    const where: Record<string, unknown> = { organizationId, type: 'competitor_analysis' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toCompetitor);
  },

  async updateCompetitor(id: string, input: UpdateCompetitorInput): Promise<CompetitorAnalysis | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.strengths !== undefined && { strengths: input.strengths }),
      ...(input.weaknesses !== undefined && { weaknesses: input.weaknesses }),
      ...(input.marketShare !== undefined && { marketShare: input.marketShare }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['competitor_analysis', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toCompetitor(row as MemoryRow);
  },

  async deleteCompetitor(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Insights ──

  async createInsight(organizationId: string, workspaceId: string, input: CreateInsightInput, createdBy: string): Promise<ResearchInsight> {
    const content = {
      projectId: input.projectId ?? null,
      type: input.type,
      status: input.status ?? 'new',
      priority: input.priority ?? 'medium',
      title: input.title.trim(),
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'research_insight',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.projectId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['research_insight', content.type, content.status, content.priority]),
        createdBy,
      },
    });
    return toInsight(row as MemoryRow);
  },

  async getInsight(id: string): Promise<ResearchInsight | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'research_insight') return null;
    return toInsight(row as MemoryRow);
  },

  async listInsights(organizationId: string, opts: ListInsightsOpts = {}): Promise<ResearchInsight[]> {
    const where: Record<string, unknown> = { organizationId, type: 'research_insight' };
    const conditions: unknown[] = [];
    if (opts.projectId) conditions.push({ content: { contains: `"projectId":"${opts.projectId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.priority) conditions.push({ content: { contains: `"priority":"${opts.priority}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toInsight);
  },

  async updateInsight(id: string, input: UpdateInsightInput): Promise<ResearchInsight | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['research_insight', content.type, content.status, content.priority]) },
    }), null);
    if (!row) return null;
    return toInsight(row as MemoryRow);
  },

  async deleteInsight(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async validateInsight(id: string, _validatedBy: string): Promise<ResearchInsight | null> {
    return MarketResearchService.updateInsight(id, { status: 'validated' });
  },

  async actionInsight(id: string, _actionedBy: string): Promise<ResearchInsight | null> {
    return MarketResearchService.updateInsight(id, { status: 'actioned' });
  },

  // ── Metrics & Stats ──

  async getMarketResearchMetrics(organizationId: string): Promise<MarketResearchMetrics> {
    const [projects, competitors, segments, insights] = await Promise.all([
      MarketResearchService.listProjects(organizationId),
      MarketResearchService.listCompetitors(organizationId),
      MarketResearchService.listSegments(organizationId),
      MarketResearchService.listInsights(organizationId),
    ]);
    const activeProjects = projects.filter((p) => p.status === 'in_progress').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const trackedCompetitors = competitors.filter((c) => c.status === 'tracking' || c.status === 'critical').length;
    const activeSegments = segments.filter((s) => s.status === 'active').length;
    const newInsights = insights.filter((i) => i.status === 'new').length;
    return { activeProjects, completedProjects, trackedCompetitors, activeSegments, newInsights };
  },

  async getMarketResearchStats(organizationId: string): Promise<MarketResearchStats> {
    const [projects, segments, competitors, insights] = await Promise.all([
      MarketResearchService.listProjects(organizationId),
      MarketResearchService.listSegments(organizationId),
      MarketResearchService.listCompetitors(organizationId),
      MarketResearchService.listInsights(organizationId),
    ]);
    const byProjectType: Record<string, number> = {};
    const byProjectStatus: Record<string, number> = {};
    const bySegmentType: Record<string, number> = {};
    const bySegmentStatus: Record<string, number> = {};
    const byCompetitorType: Record<string, number> = {};
    const byCompetitorStatus: Record<string, number> = {};
    const byInsightType: Record<string, number> = {};
    const byInsightStatus: Record<string, number> = {};
    const byInsightPriority: Record<string, number> = {};
    for (const p of projects) { byProjectType[p.type] = (byProjectType[p.type] ?? 0) + 1; byProjectStatus[p.status] = (byProjectStatus[p.status] ?? 0) + 1; }
    for (const s of segments) { bySegmentType[s.type] = (bySegmentType[s.type] ?? 0) + 1; bySegmentStatus[s.status] = (bySegmentStatus[s.status] ?? 0) + 1; }
    for (const c of competitors) { byCompetitorType[c.type] = (byCompetitorType[c.type] ?? 0) + 1; byCompetitorStatus[c.status] = (byCompetitorStatus[c.status] ?? 0) + 1; }
    for (const i of insights) { byInsightType[i.type] = (byInsightType[i.type] ?? 0) + 1; byInsightStatus[i.status] = (byInsightStatus[i.status] ?? 0) + 1; byInsightPriority[i.priority] = (byInsightPriority[i.priority] ?? 0) + 1; }
    return {
      projectCount: projects.length,
      segmentCount: segments.length,
      competitorCount: competitors.length,
      insightCount: insights.length,
      byProjectType, byProjectStatus, bySegmentType, bySegmentStatus, byCompetitorType, byCompetitorStatus, byInsightType, byInsightStatus, byInsightPriority,
    };
  },
};
