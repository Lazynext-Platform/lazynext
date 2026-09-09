import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'dw_pipeline',
    content: JSON.stringify({
      name: 'Sales Data Pipeline',
      type: 'batch',
      description: 'Nightly sales data load',
      sourceSystem: 'PostgreSQL',
      targetSystem: 'Snowflake',
      status: 'draft',
      schedule: '0 2 * * *',
      owner: 'Jane Doe',
      lastRun: '2028-01-01',
      lastStatus: 'success',
      recordsProcessed: 1000000,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['dw_pipeline', 'batch', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeJobRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-j1',
    type: 'etl_job',
    content: JSON.stringify({
      pipelineId: 'mem-1',
      name: 'Extract Sales Data',
      type: 'extract',
      description: 'Extract from source DB',
      status: 'pending',
      startDate: '2028-01-01',
      endDate: null,
      duration: 0,
      recordsIn: 0,
      recordsOut: 0,
      errorMessage: '',
      triggeredBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['etl_job', 'extract', 'pending']),
    ...overrides,
  });
}

function makeModelRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'data_model',
    content: JSON.stringify({
      name: 'Sales Fact Table',
      type: 'fact',
      description: 'Sales fact table',
      schema: 'public',
      status: 'draft',
      version: '1.0',
      owner: 'Alice',
      dependencies: ['dim_date', 'dim_product'],
      refreshFrequency: 'daily',
      notes: '',
    }),
    tags: JSON.stringify(['data_model', 'fact', 'draft']),
    ...overrides,
  });
}

function makeQualityRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-q1',
    type: 'data_quality',
    content: JSON.stringify({
      modelId: 'mem-m1',
      pipelineId: null,
      type: 'completeness',
      status: 'pass',
      score: 98,
      description: 'Completeness check',
      threshold: 95,
      measuredDate: '2028-01-01',
      measuredBy: 'Bob',
      issues: [],
      recommendations: [],
      notes: '',
    }),
    tags: JSON.stringify(['data_quality', 'completeness', 'pass']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
}

const { DataWarehouseService } = await import('@/lib/services/data-warehouse-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Pipelines
// ─────────────────────────────────────────────────────────────────────────────

describe('DataWarehouseService — Pipelines', () => {
  beforeEach(() => resetMock());

  it('creates a pipeline with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await DataWarehouseService.createPipeline('org-1', 'ws-1', {
      name: 'Sales Pipeline', type: 'batch',
    }, 'user-1');
    assert.equal(p.name, 'Sales Pipeline');
    assert.equal(p.status, 'draft');
    assert.equal(p.recordsProcessed, 0);
    assert.equal(p.description, '');
  });

  it('creates a pipeline with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await DataWarehouseService.createPipeline('org-1', 'ws-1', {
      name: 'Streaming Pipeline', type: 'streaming', description: 'Real-time stream',
      sourceSystem: 'Kafka', targetSystem: 'BigQuery', status: 'active',
      schedule: 'continuous', owner: 'John', lastRun: '2028-01-01', lastStatus: 'success',
      recordsProcessed: 5000, notes: 'High throughput',
    }, 'user-1');
    assert.equal(p.name, 'Streaming Pipeline');
    assert.equal(p.type, 'streaming');
    assert.equal(p.sourceSystem, 'Kafka');
    assert.equal(p.targetSystem, 'BigQuery');
    assert.equal(p.status, 'active');
    assert.equal(p.recordsProcessed, 5000);
  });

  it('gets a pipeline by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await DataWarehouseService.getPipeline('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Sales Data Pipeline');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'etl_job' });
    const p = await DataWarehouseService.getPipeline('mem-1');
    assert.equal(p, null);
  });

  it('returns null when pipeline not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await DataWarehouseService.getPipeline('nope');
    assert.equal(p, null);
  });

  it('lists pipelines by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dw_pipeline') return [makeRow()];
      return [];
    };
    const list = await DataWarehouseService.listPipelines('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Sales Data Pipeline');
  });

  it('updates a pipeline', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DataWarehouseService.updatePipeline('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a pipeline', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DataWarehouseService.deletePipeline('mem-1');
    assert.equal(ok, true);
  });

  it('activatePipeline sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DataWarehouseService.activatePipeline('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('pausePipeline sets status to paused', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DataWarehouseService.pausePipeline('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'paused');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Jobs
// ─────────────────────────────────────────────────────────────────────────────

describe('DataWarehouseService — Jobs', () => {
  beforeEach(() => resetMock());

  it('creates a job with defaults', async () => {
    memCreateImpl = async (args) => makeJobRow({ content: args.data.content as string });
    const j = await DataWarehouseService.createJob('org-1', 'ws-1', {
      pipelineId: 'mem-1', name: 'Extract Job', type: 'extract',
    }, 'user-1');
    assert.equal(j.name, 'Extract Job');
    assert.equal(j.status, 'pending');
    assert.equal(j.duration, 0);
  });

  it('creates a job with full input', async () => {
    memCreateImpl = async (args) => makeJobRow({ content: args.data.content as string });
    const j = await DataWarehouseService.createJob('org-1', 'ws-1', {
      pipelineId: 'mem-1', name: 'Transform Job', type: 'transform', description: 'Transform data',
      status: 'running', startDate: '2028-01-01', duration: 120, recordsIn: 1000, recordsOut: 950,
      triggeredBy: 'scheduler', notes: 'Automated',
    }, 'user-1');
    assert.equal(j.name, 'Transform Job');
    assert.equal(j.type, 'transform');
    assert.equal(j.status, 'running');
    assert.equal(j.duration, 120);
    assert.equal(j.recordsIn, 1000);
  });

  it('gets a job by id', async () => {
    memFindUniqueImpl = async () => makeJobRow();
    const j = await DataWarehouseService.getJob('mem-j1');
    assert.ok(j);
    assert.equal(j!.name, 'Extract Sales Data');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeJobRow({ type: 'dw_pipeline' });
    const j = await DataWarehouseService.getJob('mem-j1');
    assert.equal(j, null);
  });

  it('lists jobs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'etl_job') return [makeJobRow()];
      return [];
    };
    const list = await DataWarehouseService.listJobs('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a job', async () => {
    memFindUniqueImpl = async () => makeJobRow();
    memUpdateImpl = async (args) => makeJobRow({ id: 'mem-j1', content: args.data.content as string });
    const j = await DataWarehouseService.updateJob('mem-j1', { status: 'completed' });
    assert.ok(j);
    assert.equal(j!.status, 'completed');
  });

  it('deletes a job', async () => {
    memDeleteImpl = async () => ({ id: 'mem-j1' });
    const ok = await DataWarehouseService.deleteJob('mem-j1');
    assert.equal(ok, true);
  });

  it('runJob sets status to running', async () => {
    memFindUniqueImpl = async () => makeJobRow();
    memUpdateImpl = async (args) => makeJobRow({ id: 'mem-j1', content: args.data.content as string });
    const j = await DataWarehouseService.runJob('mem-j1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'running');
  });

  it('completeJob sets status to completed', async () => {
    memFindUniqueImpl = async () => makeJobRow();
    memUpdateImpl = async (args) => makeJobRow({ id: 'mem-j1', content: args.data.content as string });
    const j = await DataWarehouseService.completeJob('mem-j1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'completed');
  });

  it('failJob sets status to failed with errorMessage', async () => {
    memFindUniqueImpl = async () => makeJobRow();
    memUpdateImpl = async (args) => makeJobRow({ id: 'mem-j1', content: args.data.content as string });
    const j = await DataWarehouseService.failJob('mem-j1', 'Connection timeout', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'failed');
    assert.equal(j!.errorMessage, 'Connection timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Models
// ─────────────────────────────────────────────────────────────────────────────

describe('DataWarehouseService — Models', () => {
  beforeEach(() => resetMock());

  it('creates a model with defaults', async () => {
    memCreateImpl = async (args) => makeModelRow({ content: args.data.content as string });
    const m = await DataWarehouseService.createModel('org-1', 'ws-1', {
      name: 'Dim Customer', type: 'dimension',
    }, 'user-1');
    assert.equal(m.name, 'Dim Customer');
    assert.equal(m.status, 'draft');
    assert.equal(m.version, '1.0');
    assert.equal(m.dependencies.length, 0);
  });

  it('creates a model with full input', async () => {
    memCreateImpl = async (args) => makeModelRow({ content: args.data.content as string });
    const m = await DataWarehouseService.createModel('org-1', 'ws-1', {
      name: 'Star Schema', type: 'star_schema', description: 'Enterprise star schema',
      schema: 'analytics', status: 'published', version: '2.0', owner: 'Alice',
      dependencies: ['fact_sales', 'dim_date'], refreshFrequency: 'hourly', notes: 'Production',
    }, 'user-1');
    assert.equal(m.name, 'Star Schema');
    assert.equal(m.type, 'star_schema');
    assert.equal(m.version, '2.0');
    assert.equal(m.dependencies.length, 2);
  });

  it('gets a model by id', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    const m = await DataWarehouseService.getModel('mem-m1');
    assert.ok(m);
    assert.equal(m!.name, 'Sales Fact Table');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeModelRow({ type: 'dw_pipeline' });
    const m = await DataWarehouseService.getModel('mem-m1');
    assert.equal(m, null);
  });

  it('lists models by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'data_model') return [makeModelRow()];
      return [];
    };
    const list = await DataWarehouseService.listModels('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a model', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await DataWarehouseService.updateModel('mem-m1', { version: '2.0' });
    assert.ok(m);
    assert.equal(m!.version, '2.0');
  });

  it('deletes a model', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await DataWarehouseService.deleteModel('mem-m1');
    assert.equal(ok, true);
  });

  it('publishModel sets status to published', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await DataWarehouseService.publishModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'published');
  });

  it('deprecateModel sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeModelRow();
    memUpdateImpl = async (args) => makeModelRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await DataWarehouseService.deprecateModel('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Quality
// ─────────────────────────────────────────────────────────────────────────────

describe('DataWarehouseService — Quality', () => {
  beforeEach(() => resetMock());

  it('creates a quality check with defaults', async () => {
    memCreateImpl = async (args) => makeQualityRow({ content: args.data.content as string });
    const q = await DataWarehouseService.createQuality('org-1', 'ws-1', {
      type: 'completeness', status: 'pass', score: 95,
    }, 'user-1');
    assert.equal(q.type, 'completeness');
    assert.equal(q.status, 'pass');
    assert.equal(q.score, 95);
    assert.equal(q.threshold, 0);
    assert.equal(q.issues.length, 0);
  });

  it('creates a quality check with full input', async () => {
    memCreateImpl = async (args) => makeQualityRow({ content: args.data.content as string });
    const q = await DataWarehouseService.createQuality('org-1', 'ws-1', {
      type: 'accuracy', status: 'warning', score: 88, modelId: 'mem-m1',
      description: 'Accuracy check', threshold: 90, measuredDate: '2028-01-01',
      measuredBy: 'Bob', issues: ['Missing values'], recommendations: ['Backfill data'],
      notes: 'Investigate',
    }, 'user-1');
    assert.equal(q.type, 'accuracy');
    assert.equal(q.status, 'warning');
    assert.equal(q.score, 88);
    assert.equal(q.threshold, 90);
    assert.equal(q.modelId, 'mem-m1');
    assert.equal(q.issues.length, 1);
  });

  it('gets a quality check by id', async () => {
    memFindUniqueImpl = async () => makeQualityRow();
    const q = await DataWarehouseService.getQuality('mem-q1');
    assert.ok(q);
    assert.equal(q!.type, 'completeness');
    assert.equal(q!.status, 'pass');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeQualityRow({ type: 'dw_pipeline' });
    const q = await DataWarehouseService.getQuality('mem-q1');
    assert.equal(q, null);
  });

  it('lists quality checks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'data_quality') return [makeQualityRow()];
      return [];
    };
    const list = await DataWarehouseService.listQualities('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a quality check', async () => {
    memFindUniqueImpl = async () => makeQualityRow();
    memUpdateImpl = async (args) => makeQualityRow({ id: 'mem-q1', content: args.data.content as string });
    const q = await DataWarehouseService.updateQuality('mem-q1', { score: 99 });
    assert.ok(q);
    assert.equal(q!.score, 99);
  });

  it('deletes a quality check', async () => {
    memDeleteImpl = async () => ({ id: 'mem-q1' });
    const ok = await DataWarehouseService.deleteQuality('mem-q1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('DataWarehouseService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getDataWarehouseMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dw_pipeline') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'batch', status: 'active', sourceSystem: '', targetSystem: '', schedule: '', owner: '', lastRun: null, lastStatus: '', recordsProcessed: 0, description: '', notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'streaming', status: 'draft', sourceSystem: '', targetSystem: '', schedule: '', owner: '', lastRun: null, lastStatus: '', recordsProcessed: 0, description: '', notes: '' }) }),
      ];
      if (t === 'etl_job') return [
        makeJobRow({ content: JSON.stringify({ pipelineId: 'mem-1', name: 'J1', type: 'extract', status: 'running', description: '', startDate: null, endDate: null, duration: 0, recordsIn: 0, recordsOut: 0, errorMessage: '', triggeredBy: '', notes: '' }) }),
        makeJobRow({ id: 'j2', content: JSON.stringify({ pipelineId: 'mem-1', name: 'J2', type: 'load', status: 'failed', description: '', startDate: null, endDate: null, duration: 0, recordsIn: 0, recordsOut: 0, errorMessage: 'err', triggeredBy: '', notes: '' }) }),
      ];
      if (t === 'data_model') return [
        makeModelRow({ content: JSON.stringify({ name: 'M1', type: 'fact', status: 'published', description: '', schema: '', version: '1.0', owner: '', dependencies: [], refreshFrequency: '', notes: '' }) }),
      ];
      if (t === 'data_quality') return [
        makeQualityRow({ content: JSON.stringify({ modelId: null, pipelineId: null, type: 'completeness', status: 'pass', score: 95, description: '', threshold: 0, measuredDate: null, measuredBy: '', issues: [], recommendations: [], notes: '' }) }),
        makeQualityRow({ id: 'q2', content: JSON.stringify({ modelId: null, pipelineId: null, type: 'accuracy', status: 'fail', score: 60, description: '', threshold: 0, measuredDate: null, measuredBy: '', issues: [], recommendations: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await DataWarehouseService.getDataWarehouseMetrics('org-1');
    assert.equal(m.activePipelines, 1);
    assert.equal(m.runningJobs, 1);
    assert.equal(m.failedJobs, 1);
    assert.equal(m.publishedModels, 1);
    assert.equal(m.qualityPassRate, 50);
  });

  it('getDataWarehouseStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'dw_pipeline') return [makeRow()];
      if (t === 'etl_job') return [makeJobRow()];
      if (t === 'data_model') return [makeModelRow()];
      if (t === 'data_quality') return [makeQualityRow()];
      return [];
    };
    const s = await DataWarehouseService.getDataWarehouseStats('org-1');
    assert.equal(s.pipelineCount, 1);
    assert.equal(s.jobCount, 1);
    assert.equal(s.modelCount, 1);
    assert.equal(s.qualityCount, 1);
    assert.equal(s.byPipelineType['batch'], 1);
    assert.equal(s.byPipelineStatus['draft'], 1);
    assert.equal(s.byJobType['extract'], 1);
    assert.equal(s.byJobStatus['pending'], 1);
    assert.equal(s.byModelType['fact'], 1);
    assert.equal(s.byModelStatus['draft'], 1);
    assert.equal(s.byQualityType['completeness'], 1);
    assert.equal(s.byQualityStatus['pass'], 1);
  });
});
