import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PipelineType = 'batch' | 'streaming' | 'real_time' | 'micro_batch' | 'change_data_capture';
export type PipelineStatus = 'draft' | 'active' | 'paused' | 'error' | 'deprecated' | 'archived';
export type JobType = 'extract' | 'transform' | 'load' | 'full_refresh' | 'incremental' | 'validate';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
export type ModelType = 'star_schema' | 'snowflake' | 'fact' | 'dimension' | 'view' | 'materialized_view' | 'aggregate' | 'staging';
export type ModelStatus = 'draft' | 'published' | 'deprecated' | 'archived';
export type QualityType = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity' | 'uniqueness' | 'integrity';
export type QualityStatus = 'pass' | 'fail' | 'warning' | 'pending';

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

export interface DataPipeline {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PipelineType;
  description: string;
  sourceSystem: string;
  targetSystem: string;
  status: PipelineStatus;
  schedule: string;
  owner: string;
  lastRun: Date | null;
  lastStatus: string;
  recordsProcessed: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EtlJob {
  id: string;
  organizationId: string;
  workspaceId: string;
  pipelineId: string;
  name: string;
  type: JobType;
  description: string;
  status: JobStatus;
  startDate: Date | null;
  endDate: Date | null;
  duration: number;
  recordsIn: number;
  recordsOut: number;
  errorMessage: string;
  triggeredBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataModel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ModelType;
  description: string;
  schema: string;
  status: ModelStatus;
  version: string;
  owner: string;
  dependencies: string[];
  refreshFrequency: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataQuality {
  id: string;
  organizationId: string;
  workspaceId: string;
  modelId: string | null;
  pipelineId: string | null;
  type: QualityType;
  status: QualityStatus;
  score: number;
  description: string;
  threshold: number;
  measuredDate: Date | null;
  measuredBy: string;
  issues: string[];
  recommendations: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataWarehouseMetrics {
  activePipelines: number;
  runningJobs: number;
  failedJobs: number;
  publishedModels: number;
  qualityPassRate: number;
}

export interface DataWarehouseStats {
  pipelineCount: number;
  jobCount: number;
  modelCount: number;
  qualityCount: number;
  byPipelineType: Record<string, number>;
  byPipelineStatus: Record<string, number>;
  byJobType: Record<string, number>;
  byJobStatus: Record<string, number>;
  byModelType: Record<string, number>;
  byModelStatus: Record<string, number>;
  byQualityType: Record<string, number>;
  byQualityStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePipelineInput {
  name: string;
  type: PipelineType;
  description?: string;
  sourceSystem?: string;
  targetSystem?: string;
  status?: PipelineStatus;
  schedule?: string;
  owner?: string;
  lastRun?: string;
  lastStatus?: string;
  recordsProcessed?: number;
  notes?: string;
}

export interface UpdatePipelineInput {
  name?: string;
  type?: PipelineType;
  description?: string;
  sourceSystem?: string;
  targetSystem?: string;
  status?: PipelineStatus;
  schedule?: string;
  owner?: string;
  lastRun?: string;
  lastStatus?: string;
  recordsProcessed?: number;
  notes?: string;
}

export interface ListPipelinesOpts {
  type?: PipelineType;
  status?: PipelineStatus;
}

export interface CreateJobInput {
  pipelineId: string;
  name: string;
  type: JobType;
  description?: string;
  status?: JobStatus;
  startDate?: string;
  endDate?: string;
  duration?: number;
  recordsIn?: number;
  recordsOut?: number;
  errorMessage?: string;
  triggeredBy?: string;
  notes?: string;
}

export interface UpdateJobInput {
  name?: string;
  type?: JobType;
  description?: string;
  status?: JobStatus;
  startDate?: string;
  endDate?: string;
  duration?: number;
  recordsIn?: number;
  recordsOut?: number;
  errorMessage?: string;
  triggeredBy?: string;
  notes?: string;
}

export interface ListJobsOpts {
  pipelineId?: string;
  type?: JobType;
  status?: JobStatus;
}

export interface CreateModelInput {
  name: string;
  type: ModelType;
  description?: string;
  schema?: string;
  status?: ModelStatus;
  version?: string;
  owner?: string;
  dependencies?: string[];
  refreshFrequency?: string;
  notes?: string;
}

export interface UpdateModelInput {
  name?: string;
  type?: ModelType;
  description?: string;
  schema?: string;
  status?: ModelStatus;
  version?: string;
  owner?: string;
  dependencies?: string[];
  refreshFrequency?: string;
  notes?: string;
}

export interface ListModelsOpts {
  type?: ModelType;
  status?: ModelStatus;
}

export interface CreateQualityInput {
  modelId?: string;
  pipelineId?: string;
  type: QualityType;
  status: QualityStatus;
  score: number;
  description?: string;
  threshold?: number;
  measuredDate?: string;
  measuredBy?: string;
  issues?: string[];
  recommendations?: string[];
  notes?: string;
}

export interface UpdateQualityInput {
  modelId?: string;
  pipelineId?: string;
  type?: QualityType;
  status?: QualityStatus;
  score?: number;
  description?: string;
  threshold?: number;
  measuredDate?: string;
  measuredBy?: string;
  issues?: string[];
  recommendations?: string[];
  notes?: string;
}

export interface ListQualitiesOpts {
  modelId?: string;
  pipelineId?: string;
  type?: QualityType;
  status?: QualityStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toPipeline(row: MemoryRow): DataPipeline {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PipelineType) ?? 'batch',
    description: (c.description as string) ?? '',
    sourceSystem: (c.sourceSystem as string) ?? '',
    targetSystem: (c.targetSystem as string) ?? '',
    status: (c.status as PipelineStatus) ?? 'draft',
    schedule: (c.schedule as string) ?? '',
    owner: (c.owner as string) ?? '',
    lastRun: c.lastRun ? new Date(c.lastRun as string) : null,
    lastStatus: (c.lastStatus as string) ?? '',
    recordsProcessed: (c.recordsProcessed as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toJob(row: MemoryRow): EtlJob {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    pipelineId: (c.pipelineId as string) ?? '',
    name: (c.name as string) ?? '',
    type: (c.type as JobType) ?? 'extract',
    description: (c.description as string) ?? '',
    status: (c.status as JobStatus) ?? 'pending',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    duration: (c.duration as number) ?? 0,
    recordsIn: (c.recordsIn as number) ?? 0,
    recordsOut: (c.recordsOut as number) ?? 0,
    errorMessage: (c.errorMessage as string) ?? '',
    triggeredBy: (c.triggeredBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toModel(row: MemoryRow): DataModel {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ModelType) ?? 'fact',
    description: (c.description as string) ?? '',
    schema: (c.schema as string) ?? '',
    status: (c.status as ModelStatus) ?? 'draft',
    version: (c.version as string) ?? '1.0',
    owner: (c.owner as string) ?? '',
    dependencies: (c.dependencies as string[]) ?? [],
    refreshFrequency: (c.refreshFrequency as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toQuality(row: MemoryRow): DataQuality {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    modelId: (c.modelId as string) ?? null,
    pipelineId: (c.pipelineId as string) ?? null,
    type: (c.type as QualityType) ?? 'completeness',
    status: (c.status as QualityStatus) ?? 'pending',
    score: (c.score as number) ?? 0,
    description: (c.description as string) ?? '',
    threshold: (c.threshold as number) ?? 0,
    measuredDate: c.measuredDate ? new Date(c.measuredDate as string) : null,
    measuredBy: (c.measuredBy as string) ?? '',
    issues: (c.issues as string[]) ?? [],
    recommendations: (c.recommendations as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const DataWarehouseService = {
  // ── Pipelines ──

  async createPipeline(organizationId: string, workspaceId: string, input: CreatePipelineInput, createdBy: string): Promise<DataPipeline> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      sourceSystem: input.sourceSystem ?? '',
      targetSystem: input.targetSystem ?? '',
      status: input.status ?? 'draft',
      schedule: input.schedule ?? '',
      owner: input.owner ?? '',
      lastRun: input.lastRun ?? null,
      lastStatus: input.lastStatus ?? '',
      recordsProcessed: input.recordsProcessed ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'dw_pipeline',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dw_pipeline', content.type, content.status]),
        createdBy,
      },
    });
    return toPipeline(row as MemoryRow);
  },

  async getPipeline(id: string): Promise<DataPipeline | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dw_pipeline') return null;
    return toPipeline(row as MemoryRow);
  },

  async listPipelines(organizationId: string, opts: ListPipelinesOpts = {}): Promise<DataPipeline[]> {
    const where: Record<string, unknown> = { organizationId, type: 'dw_pipeline' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPipeline);
  },

  async updatePipeline(id: string, input: UpdatePipelineInput): Promise<DataPipeline | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sourceSystem !== undefined && { sourceSystem: input.sourceSystem }),
      ...(input.targetSystem !== undefined && { targetSystem: input.targetSystem }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.schedule !== undefined && { schedule: input.schedule }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.lastRun !== undefined && { lastRun: input.lastRun }),
      ...(input.lastStatus !== undefined && { lastStatus: input.lastStatus }),
      ...(input.recordsProcessed !== undefined && { recordsProcessed: input.recordsProcessed }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const pipelineType = content.type as PipelineType;
    const pipelineStatus = content.status as PipelineStatus;
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['dw_pipeline', pipelineType, pipelineStatus]) },
    }), null);
    if (!row) return null;
    return toPipeline(row as MemoryRow);
  },

  async deletePipeline(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activatePipeline(id: string, _activatedBy: string): Promise<DataPipeline | null> {
    return DataWarehouseService.updatePipeline(id, { status: 'active' });
  },

  async pausePipeline(id: string, _pausedBy: string): Promise<DataPipeline | null> {
    return DataWarehouseService.updatePipeline(id, { status: 'paused' });
  },

  // ── Jobs ──

  async createJob(organizationId: string, workspaceId: string, input: CreateJobInput, createdBy: string): Promise<EtlJob> {
    const content = {
      pipelineId: input.pipelineId,
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      duration: input.duration ?? 0,
      recordsIn: input.recordsIn ?? 0,
      recordsOut: input.recordsOut ?? 0,
      errorMessage: input.errorMessage ?? '',
      triggeredBy: input.triggeredBy ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'etl_job',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.pipelineId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['etl_job', content.type, content.status]),
        createdBy,
      },
    });
    return toJob(row as MemoryRow);
  },

  async getJob(id: string): Promise<EtlJob | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'etl_job') return null;
    return toJob(row as MemoryRow);
  },

  async listJobs(organizationId: string, opts: ListJobsOpts = {}): Promise<EtlJob[]> {
    const where: Record<string, unknown> = { organizationId, type: 'etl_job' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.pipelineId) conditions.push({ content: { contains: `"pipelineId":"${opts.pipelineId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toJob);
  },

  async updateJob(id: string, input: UpdateJobInput): Promise<EtlJob | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.recordsIn !== undefined && { recordsIn: input.recordsIn }),
      ...(input.recordsOut !== undefined && { recordsOut: input.recordsOut }),
      ...(input.errorMessage !== undefined && { errorMessage: input.errorMessage }),
      ...(input.triggeredBy !== undefined && { triggeredBy: input.triggeredBy }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const jobType = content.type as JobType;
    const jobStatus = content.status as JobStatus;
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['etl_job', jobType, jobStatus]) },
    }), null);
    if (!row) return null;
    return toJob(row as MemoryRow);
  },

  async deleteJob(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async runJob(id: string, triggeredBy: string): Promise<EtlJob | null> {
    return DataWarehouseService.updateJob(id, { status: 'running', triggeredBy, startDate: new Date().toISOString() });
  },

  async completeJob(id: string, _completedBy: string): Promise<EtlJob | null> {
    return DataWarehouseService.updateJob(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async failJob(id: string, errorMessage: string, _failedBy: string): Promise<EtlJob | null> {
    return DataWarehouseService.updateJob(id, { status: 'failed', errorMessage, endDate: new Date().toISOString() });
  },

  // ── Models ──

  async createModel(organizationId: string, workspaceId: string, input: CreateModelInput, createdBy: string): Promise<DataModel> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      schema: input.schema ?? '',
      status: input.status ?? 'draft',
      version: input.version ?? '1.0',
      owner: input.owner ?? '',
      dependencies: input.dependencies ?? [],
      refreshFrequency: input.refreshFrequency ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'data_model',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['data_model', content.type, content.status]),
        createdBy,
      },
    });
    return toModel(row as MemoryRow);
  },

  async getModel(id: string): Promise<DataModel | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'data_model') return null;
    return toModel(row as MemoryRow);
  },

  async listModels(organizationId: string, opts: ListModelsOpts = {}): Promise<DataModel[]> {
    const where: Record<string, unknown> = { organizationId, type: 'data_model' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toModel);
  },

  async updateModel(id: string, input: UpdateModelInput): Promise<DataModel | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.schema !== undefined && { schema: input.schema }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.owner !== undefined && { owner: input.owner }),
      ...(input.dependencies !== undefined && { dependencies: input.dependencies }),
      ...(input.refreshFrequency !== undefined && { refreshFrequency: input.refreshFrequency }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const modelType = content.type as ModelType;
    const modelStatus = content.status as ModelStatus;
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['data_model', modelType, modelStatus]) },
    }), null);
    if (!row) return null;
    return toModel(row as MemoryRow);
  },

  async deleteModel(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishModel(id: string, _publishedBy: string): Promise<DataModel | null> {
    return DataWarehouseService.updateModel(id, { status: 'published' });
  },

  async deprecateModel(id: string, _deprecatedBy: string): Promise<DataModel | null> {
    return DataWarehouseService.updateModel(id, { status: 'deprecated' });
  },

  // ── Quality ──

  async createQuality(organizationId: string, workspaceId: string, input: CreateQualityInput, createdBy: string): Promise<DataQuality> {
    const content = {
      modelId: input.modelId ?? null,
      pipelineId: input.pipelineId ?? null,
      type: input.type,
      status: input.status,
      score: input.score,
      description: input.description ?? '',
      threshold: input.threshold ?? 0,
      measuredDate: input.measuredDate ?? null,
      measuredBy: input.measuredBy ?? '',
      issues: input.issues ?? [],
      recommendations: input.recommendations ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'data_quality',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.modelId ?? input.pipelineId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['data_quality', content.type, content.status]),
        createdBy,
      },
    });
    return toQuality(row as MemoryRow);
  },

  async getQuality(id: string): Promise<DataQuality | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'data_quality') return null;
    return toQuality(row as MemoryRow);
  },

  async listQualities(organizationId: string, opts: ListQualitiesOpts = {}): Promise<DataQuality[]> {
    const where: Record<string, unknown> = { organizationId, type: 'data_quality' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.modelId) conditions.push({ content: { contains: `"modelId":"${opts.modelId}"` } });
    if (opts.pipelineId) conditions.push({ content: { contains: `"pipelineId":"${opts.pipelineId}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toQuality);
  },

  async updateQuality(id: string, input: UpdateQualityInput): Promise<DataQuality | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.modelId !== undefined && { modelId: input.modelId }),
      ...(input.pipelineId !== undefined && { pipelineId: input.pipelineId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.score !== undefined && { score: input.score }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.threshold !== undefined && { threshold: input.threshold }),
      ...(input.measuredDate !== undefined && { measuredDate: input.measuredDate }),
      ...(input.measuredBy !== undefined && { measuredBy: input.measuredBy }),
      ...(input.issues !== undefined && { issues: input.issues }),
      ...(input.recommendations !== undefined && { recommendations: input.recommendations }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const qualityType = content.type as QualityType;
    const qualityStatus = content.status as QualityStatus;
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['data_quality', qualityType, qualityStatus]) },
    }), null);
    if (!row) return null;
    return toQuality(row as MemoryRow);
  },

  async deleteQuality(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getDataWarehouseMetrics(organizationId: string): Promise<DataWarehouseMetrics> {
    const [pipelines, jobs, models, qualities] = await Promise.all([
      DataWarehouseService.listPipelines(organizationId),
      DataWarehouseService.listJobs(organizationId),
      DataWarehouseService.listModels(organizationId),
      DataWarehouseService.listQualities(organizationId),
    ]);
    const activePipelines = pipelines.filter((p) => p.status === 'active').length;
    const runningJobs = jobs.filter((j) => j.status === 'running').length;
    const failedJobs = jobs.filter((j) => j.status === 'failed').length;
    const publishedModels = models.filter((m) => m.status === 'published').length;
    const passCount = qualities.filter((q) => q.status === 'pass').length;
    const qualityPassRate = qualities.length > 0 ? Math.round((passCount / qualities.length) * 100) : 0;
    return { activePipelines, runningJobs, failedJobs, publishedModels, qualityPassRate };
  },

  async getDataWarehouseStats(organizationId: string): Promise<DataWarehouseStats> {
    const [pipelines, jobs, models, qualities] = await Promise.all([
      DataWarehouseService.listPipelines(organizationId),
      DataWarehouseService.listJobs(organizationId),
      DataWarehouseService.listModels(organizationId),
      DataWarehouseService.listQualities(organizationId),
    ]);
    const byPipelineType: Record<string, number> = {};
    const byPipelineStatus: Record<string, number> = {};
    const byJobType: Record<string, number> = {};
    const byJobStatus: Record<string, number> = {};
    const byModelType: Record<string, number> = {};
    const byModelStatus: Record<string, number> = {};
    const byQualityType: Record<string, number> = {};
    const byQualityStatus: Record<string, number> = {};
    for (const p of pipelines) { byPipelineType[p.type] = (byPipelineType[p.type] ?? 0) + 1; byPipelineStatus[p.status] = (byPipelineStatus[p.status] ?? 0) + 1; }
    for (const j of jobs) { byJobType[j.type] = (byJobType[j.type] ?? 0) + 1; byJobStatus[j.status] = (byJobStatus[j.status] ?? 0) + 1; }
    for (const m of models) { byModelType[m.type] = (byModelType[m.type] ?? 0) + 1; byModelStatus[m.status] = (byModelStatus[m.status] ?? 0) + 1; }
    for (const q of qualities) { byQualityType[q.type] = (byQualityType[q.type] ?? 0) + 1; byQualityStatus[q.status] = (byQualityStatus[q.status] ?? 0) + 1; }
    return {
      pipelineCount: pipelines.length,
      jobCount: jobs.length,
      modelCount: models.length,
      qualityCount: qualities.length,
      byPipelineType, byPipelineStatus, byJobType, byJobStatus, byModelType, byModelStatus, byQualityType, byQualityStatus,
    };
  },
};
