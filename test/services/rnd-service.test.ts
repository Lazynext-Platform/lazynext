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
    type: 'rnd_project',
    content: JSON.stringify({
      name: 'Advanced Materials Study',
      type: 'applied',
      description: 'Study of advanced materials',
      status: 'concept',
      budget: 0,
      startDate: null,
      endDate: null,
      lead: '',
      team: [],
      objectives: '',
      milestones: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['rnd_project', 'applied', 'concept']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeExperimentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'rnd_experiment',
    content: JSON.stringify({
      name: 'Tensile Strength Test',
      type: 'lab',
      projectId: null,
      description: 'Test tensile strength',
      status: 'planned',
      result: 'pending',
      hypothesis: 'Material A is stronger',
      methodology: 'Standard tensile test',
      parameters: null,
      observations: '',
      conclusion: '',
      startDate: null,
      endDate: null,
      researcher: '',
      notes: '',
    }),
    tags: JSON.stringify(['rnd_experiment', 'lab', 'planned', 'pending']),
    ...overrides,
  });
}

function makePatentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'rnd_patent',
    content: JSON.stringify({
      title: 'Novel Composite Material',
      type: 'utility',
      description: 'A new composite material',
      status: 'draft',
      applicationNumber: '',
      filingDate: null,
      grantDate: null,
      inventor: '',
      assignee: '',
      claims: '',
      notes: '',
    }),
    tags: JSON.stringify(['rnd_patent', 'utility', 'draft']),
    ...overrides,
  });
}

function makeInnovationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-i1',
    type: 'rnd_innovation',
    content: JSON.stringify({
      title: 'AI-Powered Quality Control',
      type: 'product',
      description: 'AI quality control system',
      status: 'idea',
      stage: 'discovery',
      impact: '',
      feasibility: '',
      estimatedValue: 0,
      owner: '',
      notes: '',
    }),
    tags: JSON.stringify(['rnd_innovation', 'product', 'idea', 'discovery']),
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

const { RndService } = await import('@/lib/services/rnd-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Projects
// ─────────────────────────────────────────────────────────────────────────────

describe('RndService — Projects', () => {
  beforeEach(() => resetMock());

  it('creates a project with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await RndService.createProject('org-1', 'ws-1', {
      name: 'Nanotech Research', type: 'basic',
    }, 'user-1');
    assert.equal(p.name, 'Nanotech Research');
    assert.equal(p.status, 'concept');
    assert.equal(p.budget, 0);
    assert.equal(p.team.length, 0);
  });

  it('creates a project with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await RndService.createProject('org-1', 'ws-1', {
      name: 'Battery Tech', type: 'experimental', description: 'Next-gen batteries',
      status: 'proposed', budget: 250000, startDate: '2028-01-01', endDate: '2028-12-31',
      lead: 'Dr. Smith', team: ['Alice', 'Bob'], objectives: 'Improve energy density',
      milestones: [{ name: 'Phase 1', date: '2028-03-01' }], notes: 'High priority',
    }, 'user-1');
    assert.equal(p.name, 'Battery Tech');
    assert.equal(p.type, 'experimental');
    assert.equal(p.lead, 'Dr. Smith');
    assert.equal(p.budget, 250000);
    assert.equal(p.status, 'proposed');
  });

  it('gets a project by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await RndService.getProject('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Advanced Materials Study');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'rnd_experiment' });
    const p = await RndService.getProject('mem-1');
    assert.equal(p, null);
  });

  it('returns null when project not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await RndService.getProject('nope');
    assert.equal(p, null);
  });

  it('lists projects by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_project') return [makeRow()];
      return [];
    };
    const list = await RndService.listProjects('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Advanced Materials Study');
  });

  it('updates a project', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await RndService.updateProject('mem-1', { status: 'in_progress' });
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('deletes a project', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await RndService.deleteProject('mem-1');
    assert.equal(ok, true);
  });

  it('approveProject sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await RndService.approveProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
  });

  it('startProject sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await RndService.startProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('pauseProject sets status to paused', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await RndService.pauseProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'paused');
  });

  it('completeProject sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await RndService.completeProject('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Experiments
// ─────────────────────────────────────────────────────────────────────────────

describe('RndService — Experiments', () => {
  beforeEach(() => resetMock());

  it('creates an experiment with defaults', async () => {
    memCreateImpl = async (args) => makeExperimentRow({ content: args.data.content as string });
    const e = await RndService.createExperiment('org-1', 'ws-1', {
      name: 'Stress Test', type: 'lab',
    }, 'user-1');
    assert.equal(e.name, 'Stress Test');
    assert.equal(e.status, 'planned');
    assert.equal(e.result, 'pending');
  });

  it('creates an experiment with full input', async () => {
    memCreateImpl = async (args) => makeExperimentRow({ content: args.data.content as string });
    const e = await RndService.createExperiment('org-1', 'ws-1', {
      name: 'Field Trial', type: 'field', projectId: 'mem-1', description: 'Outdoor test',
      status: 'in_progress', result: 'success', hypothesis: 'Material withstands weather',
      methodology: 'Field exposure', parameters: { temp: 25 },
      observations: 'No degradation', conclusion: 'Hypothesis confirmed',
      startDate: '2028-01-01', endDate: '2028-06-30', researcher: 'Dr. Jones', notes: 'Good results',
    }, 'user-1');
    assert.equal(e.name, 'Field Trial');
    assert.equal(e.type, 'field');
    assert.equal(e.researcher, 'Dr. Jones');
    assert.equal(e.result, 'success');
  });

  it('gets an experiment by id', async () => {
    memFindUniqueImpl = async () => makeExperimentRow();
    const e = await RndService.getExperiment('mem-e1');
    assert.ok(e);
    assert.equal(e!.name, 'Tensile Strength Test');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeExperimentRow({ type: 'rnd_project' });
    const e = await RndService.getExperiment('mem-e1');
    assert.equal(e, null);
  });

  it('lists experiments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_experiment') return [makeExperimentRow()];
      return [];
    };
    const list = await RndService.listExperiments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an experiment', async () => {
    memFindUniqueImpl = async () => makeExperimentRow();
    memUpdateImpl = async (args) => makeExperimentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RndService.updateExperiment('mem-e1', { status: 'in_progress' });
    assert.ok(e);
    assert.equal(e!.status, 'in_progress');
  });

  it('deletes an experiment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await RndService.deleteExperiment('mem-e1');
    assert.equal(ok, true);
  });

  it('startExperiment sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeExperimentRow();
    memUpdateImpl = async (args) => makeExperimentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RndService.startExperiment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'in_progress');
  });

  it('completeExperiment sets status to completed', async () => {
    memFindUniqueImpl = async () => makeExperimentRow();
    memUpdateImpl = async (args) => makeExperimentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await RndService.completeExperiment('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Patents
// ─────────────────────────────────────────────────────────────────────────────

describe('RndService — Patents', () => {
  beforeEach(() => resetMock());

  it('creates a patent with defaults', async () => {
    memCreateImpl = async (args) => makePatentRow({ content: args.data.content as string });
    const p = await RndService.createPatent('org-1', 'ws-1', {
      title: 'New Sensor Design', type: 'utility',
    }, 'user-1');
    assert.equal(p.title, 'New Sensor Design');
    assert.equal(p.status, 'draft');
    assert.equal(p.applicationNumber, '');
  });

  it('creates a patent with full input', async () => {
    memCreateImpl = async (args) => makePatentRow({ content: args.data.content as string });
    const p = await RndService.createPatent('org-1', 'ws-1', {
      title: 'Quantum Chip', type: 'design', description: 'Quantum computing chip',
      status: 'filed', applicationNumber: 'US20280001', filingDate: '2028-01-01', grantDate: '2028-06-01',
      inventor: 'Dr. Lee', assignee: 'Lazynext Inc.', claims: '1. A quantum chip...', notes: 'Priority filing',
    }, 'user-1');
    assert.equal(p.title, 'Quantum Chip');
    assert.equal(p.type, 'design');
    assert.equal(p.inventor, 'Dr. Lee');
    assert.equal(p.applicationNumber, 'US20280001');
  });

  it('gets a patent by id', async () => {
    memFindUniqueImpl = async () => makePatentRow();
    const p = await RndService.getPatent('mem-p1');
    assert.ok(p);
    assert.equal(p!.title, 'Novel Composite Material');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePatentRow({ type: 'rnd_project' });
    const p = await RndService.getPatent('mem-p1');
    assert.equal(p, null);
  });

  it('lists patents by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_patent') return [makePatentRow()];
      return [];
    };
    const list = await RndService.listPatents('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a patent', async () => {
    memFindUniqueImpl = async () => makePatentRow();
    memUpdateImpl = async (args) => makePatentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await RndService.updatePatent('mem-p1', { status: 'pending' });
    assert.ok(p);
    assert.equal(p!.status, 'pending');
  });

  it('deletes a patent', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await RndService.deletePatent('mem-p1');
    assert.equal(ok, true);
  });

  it('filePatent sets status to filed', async () => {
    memFindUniqueImpl = async () => makePatentRow();
    memUpdateImpl = async (args) => makePatentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await RndService.filePatent('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'filed');
  });

  it('grantPatent sets status to granted', async () => {
    memFindUniqueImpl = async () => makePatentRow();
    memUpdateImpl = async (args) => makePatentRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await RndService.grantPatent('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'granted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Innovations
// ─────────────────────────────────────────────────────────────────────────────

describe('RndService — Innovations', () => {
  beforeEach(() => resetMock());

  it('creates an innovation with defaults', async () => {
    memCreateImpl = async (args) => makeInnovationRow({ content: args.data.content as string });
    const i = await RndService.createInnovation('org-1', 'ws-1', {
      title: 'Smart Factory', type: 'process',
    }, 'user-1');
    assert.equal(i.title, 'Smart Factory');
    assert.equal(i.status, 'idea');
    assert.equal(i.stage, 'discovery');
    assert.equal(i.estimatedValue, 0);
  });

  it('creates an innovation with full input', async () => {
    memCreateImpl = async (args) => makeInnovationRow({ content: args.data.content as string });
    const i = await RndService.createInnovation('org-1', 'ws-1', {
      title: 'Blockchain Supply Chain', type: 'technology', description: 'Blockchain-based supply chain',
      status: 'evaluating', stage: 'ideation', impact: 'High efficiency gains',
      feasibility: 'Medium', estimatedValue: 500000, owner: 'Alice', notes: 'Strategic priority',
    }, 'user-1');
    assert.equal(i.title, 'Blockchain Supply Chain');
    assert.equal(i.type, 'technology');
    assert.equal(i.owner, 'Alice');
    assert.equal(i.estimatedValue, 500000);
    assert.equal(i.stage, 'ideation');
  });

  it('gets an innovation by id', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    const i = await RndService.getInnovation('mem-i1');
    assert.ok(i);
    assert.equal(i!.title, 'AI-Powered Quality Control');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInnovationRow({ type: 'rnd_project' });
    const i = await RndService.getInnovation('mem-i1');
    assert.equal(i, null);
  });

  it('lists innovations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_innovation') return [makeInnovationRow()];
      return [];
    };
    const list = await RndService.listInnovations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an innovation', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    memUpdateImpl = async (args) => makeInnovationRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RndService.updateInnovation('mem-i1', { status: 'approved' });
    assert.ok(i);
    assert.equal(i!.status, 'approved');
  });

  it('deletes an innovation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-i1' });
    const ok = await RndService.deleteInnovation('mem-i1');
    assert.equal(ok, true);
  });

  it('evaluateInnovation sets status to evaluating', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    memUpdateImpl = async (args) => makeInnovationRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RndService.evaluateInnovation('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'evaluating');
  });

  it('approveInnovation sets status to approved', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    memUpdateImpl = async (args) => makeInnovationRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RndService.approveInnovation('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'approved');
  });

  it('developInnovation sets status to in_development and stage to prototype', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    memUpdateImpl = async (args) => makeInnovationRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RndService.developInnovation('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'in_development');
    assert.equal(i!.stage, 'prototype');
  });

  it('launchInnovation sets status to launched and stage to launch', async () => {
    memFindUniqueImpl = async () => makeInnovationRow();
    memUpdateImpl = async (args) => makeInnovationRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RndService.launchInnovation('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'launched');
    assert.equal(i!.stage, 'launch');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('RndService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getRndMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_project') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'applied', status: 'in_progress', budget: 0, lead: '', team: [], objectives: '', milestones: null, notes: '', description: '', startDate: null, endDate: null }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'basic', status: 'completed', budget: 0, lead: '', team: [], objectives: '', milestones: null, notes: '', description: '', startDate: null, endDate: null }) }),
      ];
      if (t === 'rnd_experiment') return [
        makeExperimentRow({ content: JSON.stringify({ name: 'E1', type: 'lab', status: 'in_progress', result: 'pending', projectId: null, description: '', hypothesis: '', methodology: '', parameters: null, observations: '', conclusion: '', startDate: null, endDate: null, researcher: '', notes: '' }) }),
      ];
      if (t === 'rnd_patent') return [
        makePatentRow({ content: JSON.stringify({ title: 'PT1', type: 'utility', status: 'granted', applicationNumber: '', filingDate: null, grantDate: '2028-01-01', inventor: '', assignee: '', claims: '', notes: '', description: '' }) }),
      ];
      if (t === 'rnd_innovation') return [
        makeInnovationRow({ content: JSON.stringify({ title: 'I1', type: 'product', status: 'launched', stage: 'launch', impact: '', feasibility: '', estimatedValue: 0, owner: '', notes: '', description: '' }) }),
      ];
      return [];
    };
    const m = await RndService.getRndMetrics('org-1');
    assert.equal(m.activeProjects, 1);
    assert.equal(m.completedProjects, 1);
    assert.equal(m.activeExperiments, 1);
    assert.equal(m.grantedPatents, 1);
    assert.equal(m.launchedInnovations, 1);
  });

  it('getRndStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'rnd_project') return [makeRow()];
      if (t === 'rnd_experiment') return [makeExperimentRow()];
      if (t === 'rnd_patent') return [makePatentRow()];
      if (t === 'rnd_innovation') return [makeInnovationRow()];
      return [];
    };
    const s = await RndService.getRndStats('org-1');
    assert.equal(s.projectCount, 1);
    assert.equal(s.experimentCount, 1);
    assert.equal(s.patentCount, 1);
    assert.equal(s.innovationCount, 1);
    assert.equal(s.byProjectType['applied'], 1);
    assert.equal(s.byProjectStatus['concept'], 1);
    assert.equal(s.byExperimentStatus['planned'], 1);
    assert.equal(s.byPatentStatus['draft'], 1);
    assert.equal(s.byInnovationStatus['idea'], 1);
    assert.equal(s.byInnovationStage['discovery'], 1);
  });
});
