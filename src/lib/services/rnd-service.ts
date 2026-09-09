import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ProjectType = 'applied' | 'basic' | 'experimental' | 'product' | 'process' | 'technology' | 'materials';
export type ProjectStatus = 'concept' | 'proposed' | 'approved' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type ExperimentType = 'lab' | 'field' | 'simulation' | 'prototype' | 'clinical' | 'user_test' | 'benchmark';
export type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ExperimentResult = 'success' | 'partial' | 'failure' | 'inconclusive' | 'pending';
export type PatentType = 'utility' | 'design' | 'plant' | 'provisional' | 'pct';
export type PatentStatus = 'draft' | 'filed' | 'pending' | 'granted' | 'rejected' | 'expired' | 'abandoned';
export type InnovationType = 'product' | 'process' | 'business_model' | 'service' | 'technology' | 'disruptive' | 'incremental';
export type InnovationStatus = 'idea' | 'evaluating' | 'approved' | 'in_development' | 'launched' | 'archived';
export type InnovationStage = 'discovery' | 'ideation' | 'concept' | 'prototype' | 'testing' | 'launch' | 'scale';

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

export interface RndProject {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ProjectType;
  description: string;
  status: ProjectStatus;
  budget: number;
  startDate: Date | null;
  endDate: Date | null;
  lead: string;
  team: string[];
  objectives: string;
  milestones: unknown;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RndExperiment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ExperimentType;
  projectId: string | null;
  description: string;
  status: ExperimentStatus;
  result: ExperimentResult;
  hypothesis: string;
  methodology: string;
  parameters: unknown;
  observations: string;
  conclusion: string;
  startDate: Date | null;
  endDate: Date | null;
  researcher: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RndPatent {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: PatentType;
  description: string;
  status: PatentStatus;
  applicationNumber: string;
  filingDate: Date | null;
  grantDate: Date | null;
  inventor: string;
  assignee: string;
  claims: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RndInnovation {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: InnovationType;
  description: string;
  status: InnovationStatus;
  stage: InnovationStage;
  impact: string;
  feasibility: string;
  estimatedValue: number;
  owner: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RndMetrics {
  activeProjects: number;
  completedProjects: number;
  activeExperiments: number;
  grantedPatents: number;
  launchedInnovations: number;
}

export interface RndStats {
  projectCount: number;
  experimentCount: number;
  patentCount: number;
  innovationCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  grantedPatentCount: number;
  launchedInnovationCount: number;
  byProjectType: Record<string, number>;
  byProjectStatus: Record<string, number>;
  byExperimentStatus: Record<string, number>;
  byPatentStatus: Record<string, number>;
  byInnovationStatus: Record<string, number>;
  byInnovationStage: Record<string, number>;
}

// ── Input / Options ──

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  description?: string;
  status?: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
  lead?: string;
  team?: string[];
  objectives?: string;
  milestones?: unknown;
  notes?: string;
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  description?: string;
  status?: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
  lead?: string;
  team?: string[];
  objectives?: string;
  milestones?: unknown;
  notes?: string;
}

export interface ListProjectsOpts {
  type?: ProjectType;
  status?: ProjectStatus;
}

export interface CreateExperimentInput {
  name: string;
  type: ExperimentType;
  projectId?: string;
  description?: string;
  status?: ExperimentStatus;
  result?: ExperimentResult;
  hypothesis?: string;
  methodology?: string;
  parameters?: unknown;
  observations?: string;
  conclusion?: string;
  startDate?: string;
  endDate?: string;
  researcher?: string;
  notes?: string;
}

export interface UpdateExperimentInput {
  name?: string;
  type?: ExperimentType;
  projectId?: string;
  description?: string;
  status?: ExperimentStatus;
  result?: ExperimentResult;
  hypothesis?: string;
  methodology?: string;
  parameters?: unknown;
  observations?: string;
  conclusion?: string;
  startDate?: string;
  endDate?: string;
  researcher?: string;
  notes?: string;
}

export interface ListExperimentsOpts {
  projectId?: string;
  type?: ExperimentType;
  status?: ExperimentStatus;
  result?: ExperimentResult;
}

export interface CreatePatentInput {
  title: string;
  type: PatentType;
  description?: string;
  status?: PatentStatus;
  applicationNumber?: string;
  filingDate?: string;
  grantDate?: string;
  inventor?: string;
  assignee?: string;
  claims?: string;
  notes?: string;
}

export interface UpdatePatentInput {
  title?: string;
  type?: PatentType;
  description?: string;
  status?: PatentStatus;
  applicationNumber?: string;
  filingDate?: string;
  grantDate?: string;
  inventor?: string;
  assignee?: string;
  claims?: string;
  notes?: string;
}

export interface ListPatentsOpts {
  type?: PatentType;
  status?: PatentStatus;
}

export interface CreateInnovationInput {
  title: string;
  type: InnovationType;
  description?: string;
  status?: InnovationStatus;
  stage?: InnovationStage;
  impact?: string;
  feasibility?: string;
  estimatedValue?: number;
  owner?: string;
  notes?: string;
}

export interface UpdateInnovationInput {
  title?: string;
  type?: InnovationType;
  description?: string;
  status?: InnovationStatus;
  stage?: InnovationStage;
  impact?: string;
  feasibility?: string;
  estimatedValue?: number;
  owner?: string;
  notes?: string;
}

export interface ListInnovationsOpts {
  type?: InnovationType;
  status?: InnovationStatus;
  stage?: InnovationStage;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toProject(row: MemoryRow): RndProject {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ProjectType) ?? 'applied',
    description: (c.description as string) ?? '',
    status: (c.status as ProjectStatus) ?? 'concept',
    budget: (c.budget as number) ?? 0,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    lead: (c.lead as string) ?? '',
    team: (c.team as string[]) ?? [],
    objectives: (c.objectives as string) ?? '',
    milestones: c.milestones ?? null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toExperiment(row: MemoryRow): RndExperiment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ExperimentType) ?? 'lab',
    projectId: (c.projectId as string) ?? null,
    description: (c.description as string) ?? '',
    status: (c.status as ExperimentStatus) ?? 'planned',
    result: (c.result as ExperimentResult) ?? 'pending',
    hypothesis: (c.hypothesis as string) ?? '',
    methodology: (c.methodology as string) ?? '',
    parameters: c.parameters ?? null,
    observations: (c.observations as string) ?? '',
    conclusion: (c.conclusion as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    researcher: (c.researcher as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPatent(row: MemoryRow): RndPatent {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as PatentType) ?? 'utility',
    description: (c.description as string) ?? '',
    status: (c.status as PatentStatus) ?? 'draft',
    applicationNumber: (c.applicationNumber as string) ?? '',
    filingDate: c.filingDate ? new Date(c.filingDate as string) : null,
    grantDate: c.grantDate ? new Date(c.grantDate as string) : null,
    inventor: (c.inventor as string) ?? '',
    assignee: (c.assignee as string) ?? '',
    claims: (c.claims as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toInnovation(row: MemoryRow): RndInnovation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as InnovationType) ?? 'product',
    description: (c.description as string) ?? '',
    status: (c.status as InnovationStatus) ?? 'idea',
    stage: (c.stage as InnovationStage) ?? 'discovery',
    impact: (c.impact as string) ?? '',
    feasibility: (c.feasibility as string) ?? '',
    estimatedValue: (c.estimatedValue as number) ?? 0,
    owner: (c.owner as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const RndService = {
  // ── Projects ──

  async createProject(organizationId: string, workspaceId: string, input: CreateProjectInput, createdBy: string): Promise<RndProject> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'concept',
      budget: input.budget ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      lead: input.lead ?? '',
      team: input.team ?? [],
      objectives: input.objectives ?? '',
      milestones: input.milestones ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'rnd_project',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['rnd_project', content.type, content.status]),
        createdBy,
      },
    });
    return toProject(row as MemoryRow);
  },

  async getProject(id: string): Promise<RndProject | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'rnd_project') return null;
    return toProject(row as MemoryRow);
  },

  async listProjects(organizationId: string, opts: ListProjectsOpts = {}): Promise<RndProject[]> {
    const where: Record<string, unknown> = { organizationId, type: 'rnd_project' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProject);
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<RndProject | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.lead !== undefined && { lead: input.lead }),
      ...(input.team !== undefined && { team: input.team }),
      ...(input.objectives !== undefined && { objectives: input.objectives }),
      ...(input.milestones !== undefined && { milestones: input.milestones }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['rnd_project', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProject(row as MemoryRow);
  },

  async deleteProject(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveProject(id: string, _approvedBy: string): Promise<RndProject | null> {
    return RndService.updateProject(id, { status: 'approved' });
  },

  async startProject(id: string, _startedBy: string): Promise<RndProject | null> {
    return RndService.updateProject(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async pauseProject(id: string, _pausedBy: string): Promise<RndProject | null> {
    return RndService.updateProject(id, { status: 'paused' });
  },

  async completeProject(id: string, _completedBy: string): Promise<RndProject | null> {
    return RndService.updateProject(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  // ── Experiments ──

  async createExperiment(organizationId: string, workspaceId: string, input: CreateExperimentInput, createdBy: string): Promise<RndExperiment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      projectId: input.projectId ?? null,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      result: input.result ?? 'pending',
      hypothesis: input.hypothesis ?? '',
      methodology: input.methodology ?? '',
      parameters: input.parameters ?? null,
      observations: input.observations ?? '',
      conclusion: input.conclusion ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      researcher: input.researcher ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'rnd_experiment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.projectId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['rnd_experiment', content.type, content.status, content.result]),
        createdBy,
      },
    });
    return toExperiment(row as MemoryRow);
  },

  async getExperiment(id: string): Promise<RndExperiment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'rnd_experiment') return null;
    return toExperiment(row as MemoryRow);
  },

  async listExperiments(organizationId: string, opts: ListExperimentsOpts = {}): Promise<RndExperiment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'rnd_experiment' };
    const conditions: unknown[] = [];
    if (opts.projectId) conditions.push({ content: { contains: `"projectId":"${opts.projectId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.result) conditions.push({ content: { contains: `"result":"${opts.result}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toExperiment);
  },

  async updateExperiment(id: string, input: UpdateExperimentInput): Promise<RndExperiment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.result !== undefined && { result: input.result }),
      ...(input.hypothesis !== undefined && { hypothesis: input.hypothesis }),
      ...(input.methodology !== undefined && { methodology: input.methodology }),
      ...(input.parameters !== undefined && { parameters: input.parameters }),
      ...(input.observations !== undefined && { observations: input.observations }),
      ...(input.conclusion !== undefined && { conclusion: input.conclusion }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.researcher !== undefined && { researcher: input.researcher }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['rnd_experiment', content.type, content.status, content.result]) },
    }), null);
    if (!row) return null;
    return toExperiment(row as MemoryRow);
  },

  async deleteExperiment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startExperiment(id: string, _startedBy: string): Promise<RndExperiment | null> {
    return RndService.updateExperiment(id, { status: 'in_progress', startDate: new Date().toISOString() });
  },

  async completeExperiment(id: string, _completedBy: string): Promise<RndExperiment | null> {
    return RndService.updateExperiment(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  // ── Patents ──

  async createPatent(organizationId: string, workspaceId: string, input: CreatePatentInput, createdBy: string): Promise<RndPatent> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      applicationNumber: input.applicationNumber ?? '',
      filingDate: input.filingDate ?? null,
      grantDate: input.grantDate ?? null,
      inventor: input.inventor ?? '',
      assignee: input.assignee ?? '',
      claims: input.claims ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'rnd_patent',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['rnd_patent', content.type, content.status]),
        createdBy,
      },
    });
    return toPatent(row as MemoryRow);
  },

  async getPatent(id: string): Promise<RndPatent | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'rnd_patent') return null;
    return toPatent(row as MemoryRow);
  },

  async listPatents(organizationId: string, opts: ListPatentsOpts = {}): Promise<RndPatent[]> {
    const where: Record<string, unknown> = { organizationId, type: 'rnd_patent' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPatent);
  },

  async updatePatent(id: string, input: UpdatePatentInput): Promise<RndPatent | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.applicationNumber !== undefined && { applicationNumber: input.applicationNumber }),
      ...(input.filingDate !== undefined && { filingDate: input.filingDate }),
      ...(input.grantDate !== undefined && { grantDate: input.grantDate }),
      ...(input.inventor !== undefined && { inventor: input.inventor }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.claims !== undefined && { claims: input.claims }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['rnd_patent', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPatent(row as MemoryRow);
  },

  async deletePatent(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async filePatent(id: string, _filedBy: string): Promise<RndPatent | null> {
    return RndService.updatePatent(id, { status: 'filed', filingDate: new Date().toISOString() });
  },

  async grantPatent(id: string, _grantedBy: string): Promise<RndPatent | null> {
    return RndService.updatePatent(id, { status: 'granted', grantDate: new Date().toISOString() });
  },

  // ── Innovations ──

  async createInnovation(organizationId: string, workspaceId: string, input: CreateInnovationInput, createdBy: string): Promise<RndInnovation> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'idea',
      stage: input.stage ?? 'discovery',
      impact: input.impact ?? '',
      feasibility: input.feasibility ?? '',
      estimatedValue: input.estimatedValue ?? 0,
      owner: input.owner ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'rnd_innovation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['rnd_innovation', content.type, content.status, content.stage]),
        createdBy,
      },
    });
    return toInnovation(row as MemoryRow);
  },

  async getInnovation(id: string): Promise<RndInnovation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'rnd_innovation') return null;
    return toInnovation(row as MemoryRow);
  },

  async listInnovations(organizationId: string, opts: ListInnovationsOpts = {}): Promise<RndInnovation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'rnd_innovation' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.stage) conditions.push({ content: { contains: `"stage":"${opts.stage}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toInnovation);
  },

  async updateInnovation(id: string, input: UpdateInnovationInput): Promise<RndInnovation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.stage !== undefined && { stage: input.stage }),
      ...(input.impact !== undefined && { impact: input.impact }),
      ...(input.feasibility !== undefined && { feasibility: input.feasibility }),
      ...(input.estimatedValue !== undefined && { estimatedValue: input.estimatedValue }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['rnd_innovation', content.type, content.status, content.stage]) },
    }), null);
    if (!row) return null;
    return toInnovation(row as MemoryRow);
  },

  async deleteInnovation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async evaluateInnovation(id: string, _evaluatedBy: string): Promise<RndInnovation | null> {
    return RndService.updateInnovation(id, { status: 'evaluating' });
  },

  async approveInnovation(id: string, _approvedBy: string): Promise<RndInnovation | null> {
    return RndService.updateInnovation(id, { status: 'approved' });
  },

  async developInnovation(id: string, _developedBy: string): Promise<RndInnovation | null> {
    return RndService.updateInnovation(id, { status: 'in_development', stage: 'prototype' });
  },

  async launchInnovation(id: string, _launchedBy: string): Promise<RndInnovation | null> {
    return RndService.updateInnovation(id, { status: 'launched', stage: 'launch' });
  },

  // ── Metrics & Stats ──

  async getRndMetrics(organizationId: string): Promise<RndMetrics> {
    const [projects, experiments, patents, innovations] = await Promise.all([
      RndService.listProjects(organizationId),
      RndService.listExperiments(organizationId),
      RndService.listPatents(organizationId),
      RndService.listInnovations(organizationId),
    ]);
    const activeProjects = projects.filter((p) => p.status === 'in_progress').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const activeExperiments = experiments.filter((e) => e.status === 'in_progress').length;
    const grantedPatents = patents.filter((p) => p.status === 'granted').length;
    const launchedInnovations = innovations.filter((i) => i.status === 'launched').length;
    return { activeProjects, completedProjects, activeExperiments, grantedPatents, launchedInnovations };
  },

  async getRndStats(organizationId: string): Promise<RndStats> {
    const [projects, experiments, patents, innovations] = await Promise.all([
      RndService.listProjects(organizationId),
      RndService.listExperiments(organizationId),
      RndService.listPatents(organizationId),
      RndService.listInnovations(organizationId),
    ]);
    const byProjectType: Record<string, number> = {};
    const byProjectStatus: Record<string, number> = {};
    const byExperimentStatus: Record<string, number> = {};
    const byPatentStatus: Record<string, number> = {};
    const byInnovationStatus: Record<string, number> = {};
    const byInnovationStage: Record<string, number> = {};
    for (const p of projects) { byProjectType[p.type] = (byProjectType[p.type] ?? 0) + 1; byProjectStatus[p.status] = (byProjectStatus[p.status] ?? 0) + 1; }
    for (const e of experiments) { byExperimentStatus[e.status] = (byExperimentStatus[e.status] ?? 0) + 1; }
    for (const p of patents) { byPatentStatus[p.status] = (byPatentStatus[p.status] ?? 0) + 1; }
    for (const i of innovations) { byInnovationStatus[i.status] = (byInnovationStatus[i.status] ?? 0) + 1; byInnovationStage[i.stage] = (byInnovationStage[i.stage] ?? 0) + 1; }
    return {
      projectCount: projects.length,
      experimentCount: experiments.length,
      patentCount: patents.length,
      innovationCount: innovations.length,
      activeProjectCount: projects.filter((p) => p.status === 'in_progress').length,
      completedProjectCount: projects.filter((p) => p.status === 'completed').length,
      grantedPatentCount: patents.filter((p) => p.status === 'granted').length,
      launchedInnovationCount: innovations.filter((i) => i.status === 'launched').length,
      byProjectType, byProjectStatus, byExperimentStatus, byPatentStatus, byInnovationStatus, byInnovationStage,
    };
  },
};
