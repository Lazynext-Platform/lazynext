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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'esg_metric',
    content: JSON.stringify({
      name: 'Carbon Intensity', category: 'environmental', unit: 'tCO2e',
      value: 500, target: 300, period: '2024-Q1', description: '', trend: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'medium',
    expiresAt: null,
    tags: JSON.stringify(['esg_metric', 'environmental']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { SustainabilityService } = await import('@/lib/services/sustainability-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityService', () => {
  beforeEach(() => { resetMock(); });

  // ── Metrics ──

  describe('createMetric', () => {
    it('creates a metric with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_metric', content: args.data.content as string });
      const m = await SustainabilityService.createMetric('org-1', 'ws-1', {
        name: 'Water Usage', category: 'environmental', unit: 'gallons', value: 100000, period: '2024-Q1',
      }, 'user-1');
      assert.equal(m.name, 'Water Usage');
      assert.equal(m.category, 'environmental');
      assert.equal(m.unit, 'gallons');
      assert.equal(m.value, 100000);
      assert.equal(m.target, 0);
      assert.equal(m.description, '');
      assert.equal(m.trend, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_metric', content: args.data.content as string });
      const m = await SustainabilityService.createMetric('org-1', 'ws-1', {
        name: 'Diversity', category: 'social', unit: '%', value: 40, target: 50,
        period: '2024', description: 'desc', trend: 'up',
      }, 'user-1');
      assert.equal(m.category, 'social');
      assert.equal(m.target, 50);
      assert.equal(m.description, 'desc');
      assert.equal(m.trend, 'up');
    });
  });

  describe('getMetric', () => {
    it('returns a metric when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_metric' });
      const m = await SustainabilityService.getMetric('mem-1');
      assert.ok(m);
      assert.equal(m!.id, 'mem-1');
      assert.equal(m!.name, 'Carbon Intensity');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const m = await SustainabilityService.getMetric('nope');
      assert.equal(m, null);
    });
  });

  describe('listMetrics', () => {
    it('lists metrics and filters by category and period', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', content: JSON.stringify({ name: 'A', category: 'environmental', unit: '', value: 0, target: 0, period: '2024-Q1', description: '', trend: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', category: 'social', unit: '', value: 0, target: 0, period: '2024-Q2', description: '', trend: '' }) }),
      ];
      const list = await SustainabilityService.listMetrics('org-1', { category: 'environmental', period: '2024-Q1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].category, 'environmental');
    });
  });

  describe('updateMetric', () => {
    it('updates metric fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_metric' });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_metric', content: args.data.content as string });
      const m = await SustainabilityService.updateMetric('mem-1', { value: 450, trend: 'down' });
      assert.ok(m);
      assert.equal(m!.value, 450);
      assert.equal(m!.trend, 'down');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const m = await SustainabilityService.updateMetric('nope', { value: 100 });
      assert.equal(m, null);
    });
  });

  describe('deleteMetric', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await SustainabilityService.deleteMetric('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await SustainabilityService.deleteMetric('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Targets ──

  describe('createTarget', () => {
    it('creates a target with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_target', content: args.data.content as string });
      const t = await SustainabilityService.createTarget('org-1', 'ws-1', {
        name: 'Reduce Emissions', category: 'environmental', baseline: 1000, target: 500, targetDate: '2030-01-01',
      }, 'user-1');
      assert.equal(t.name, 'Reduce Emissions');
      assert.equal(t.baseline, 1000);
      assert.equal(t.target, 500);
      assert.equal(t.current, 1000);
      assert.equal(t.status, 'on_track');
      assert.equal(t.description, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_target', content: args.data.content as string });
      const t = await SustainabilityService.createTarget('org-1', 'ws-1', {
        name: 'Diversity', category: 'social', baseline: 30, target: 50, targetDate: '2025-01-01',
        current: 35, status: 'behind', description: 'desc', metricId: 'm1',
      }, 'user-1');
      assert.equal(t.current, 35);
      assert.equal(t.status, 'behind');
      assert.equal(t.metricId, 'm1');
    });
  });

  describe('getTarget', () => {
    it('returns a target when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_target', content: JSON.stringify({ metricId: '', name: 'T', category: 'environmental', baseline: 0, target: 0, targetDate: '', current: 0, status: 'on_track', description: '' }) });
      const t = await SustainabilityService.getTarget('mem-1');
      assert.ok(t);
      assert.equal(t!.name, 'T');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await SustainabilityService.getTarget('nope');
      assert.equal(t, null);
    });
  });

  describe('listTargets', () => {
    it('lists targets and filters by category and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'esg_target', content: JSON.stringify({ metricId: '', name: 'A', category: 'environmental', baseline: 0, target: 0, targetDate: '', current: 0, status: 'on_track', description: '' }) }),
        makeRow({ id: 't2', type: 'esg_target', content: JSON.stringify({ metricId: '', name: 'B', category: 'social', baseline: 0, target: 0, targetDate: '', current: 0, status: 'achieved', description: '' }) }),
      ];
      const list = await SustainabilityService.listTargets('org-1', { category: 'environmental', status: 'on_track' });
      assert.equal(list.length, 1);
      assert.equal(list[0].category, 'environmental');
    });
  });

  describe('updateTarget', () => {
    it('updates target fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_target', content: JSON.stringify({ metricId: '', name: 'Old', category: 'environmental', baseline: 100, target: 50, targetDate: '2030-01-01', current: 80, status: 'on_track', description: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_target', content: args.data.content as string });
      const t = await SustainabilityService.updateTarget('mem-1', { current: 60, status: 'ahead' });
      assert.ok(t);
      assert.equal(t!.current, 60);
      assert.equal(t!.status, 'ahead');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const t = await SustainabilityService.updateTarget('nope', { current: 10 });
      assert.equal(t, null);
    });
  });

  describe('deleteTarget', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await SustainabilityService.deleteTarget('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Initiatives ──

  describe('createInitiative', () => {
    it('creates an initiative with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_initiative', content: args.data.content as string });
      const i = await SustainabilityService.createInitiative('org-1', 'ws-1', {
        name: 'Solar Panels', category: 'environmental', startDate: '2024-06-01',
      }, 'user-1');
      assert.equal(i.name, 'Solar Panels');
      assert.equal(i.status, 'planned');
      assert.equal(i.owner, '');
      assert.equal(i.budget, 0);
      assert.equal(i.sdgGoals.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_initiative', content: args.data.content as string });
      const i = await SustainabilityService.createInitiative('org-1', 'ws-1', {
        name: 'Training', category: 'social', description: 'desc', startDate: '2024-01-01',
        endDate: '2024-12-31', status: 'in_progress', owner: 'alice', budget: 50000,
        impact: 'high', sdgGoals: ['SDG 4'],
      }, 'user-1');
      assert.equal(i.status, 'in_progress');
      assert.equal(i.owner, 'alice');
      assert.equal(i.budget, 50000);
      assert.equal(i.sdgGoals.length, 1);
    });
  });

  describe('getInitiative', () => {
    it('returns an initiative when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_initiative', content: JSON.stringify({ name: 'I', category: 'environmental', description: '', startDate: '', endDate: '', status: 'planned', owner: '', budget: 0, impact: '', sdgGoals: [] }) });
      const i = await SustainabilityService.getInitiative('mem-1');
      assert.ok(i);
      assert.equal(i!.name, 'I');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const i = await SustainabilityService.getInitiative('nope');
      assert.equal(i, null);
    });
  });

  describe('listInitiatives', () => {
    it('lists initiatives and filters by category and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'i1', type: 'esg_initiative', content: JSON.stringify({ name: 'A', category: 'environmental', description: '', startDate: '', endDate: '', status: 'in_progress', owner: '', budget: 0, impact: '', sdgGoals: [] }) }),
        makeRow({ id: 'i2', type: 'esg_initiative', content: JSON.stringify({ name: 'B', category: 'social', description: '', startDate: '', endDate: '', status: 'completed', owner: '', budget: 0, impact: '', sdgGoals: [] }) }),
      ];
      const list = await SustainabilityService.listInitiatives('org-1', { category: 'environmental', status: 'in_progress' });
      assert.equal(list.length, 1);
      assert.equal(list[0].category, 'environmental');
    });
  });

  describe('updateInitiative', () => {
    it('updates initiative fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_initiative', content: JSON.stringify({ name: 'Old', category: 'environmental', description: '', startDate: '', endDate: '', status: 'planned', owner: '', budget: 0, impact: '', sdgGoals: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_initiative', content: args.data.content as string });
      const i = await SustainabilityService.updateInitiative('mem-1', { status: 'completed', budget: 100000 });
      assert.ok(i);
      assert.equal(i!.status, 'completed');
      assert.equal(i!.budget, 100000);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const i = await SustainabilityService.updateInitiative('nope', { name: 'X' });
      assert.equal(i, null);
    });
  });

  describe('deleteInitiative', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await SustainabilityService.deleteInitiative('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Reports ──

  describe('createReport', () => {
    it('creates a report with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_report', content: args.data.content as string });
      const r = await SustainabilityService.createReport('org-1', 'ws-1', {
        title: 'Annual ESG Report', type: 'annual', period: '2024',
      }, 'user-1');
      assert.equal(r.title, 'Annual ESG Report');
      assert.equal(r.type, 'annual');
      assert.equal(r.status, 'draft');
      assert.equal(r.summary, '');
      assert.equal(r.frameworks.length, 0);
      assert.equal(r.publishedDate, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_report', content: args.data.content as string });
      const r = await SustainabilityService.createReport('org-1', 'ws-1', {
        title: 'Q1 Report', type: 'quarterly', period: '2024-Q1', summary: 'sum',
        frameworks: ['GRI'], status: 'in_review',
      }, 'user-1');
      assert.equal(r.type, 'quarterly');
      assert.equal(r.summary, 'sum');
      assert.equal(r.frameworks.length, 1);
      assert.equal(r.status, 'in_review');
    });
  });

  describe('getReport', () => {
    it('returns a report when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_report', content: JSON.stringify({ title: 'R', type: 'annual', period: '', summary: '', frameworks: [], status: 'draft', publishedDate: null, publishedBy: '' }) });
      const r = await SustainabilityService.getReport('mem-1');
      assert.ok(r);
      assert.equal(r!.title, 'R');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await SustainabilityService.getReport('nope');
      assert.equal(r, null);
    });
  });

  describe('listReports', () => {
    it('lists reports and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'esg_report', content: JSON.stringify({ title: 'A', type: 'annual', period: '', summary: '', frameworks: [], status: 'draft', publishedDate: null, publishedBy: '' }) }),
        makeRow({ id: 'r2', type: 'esg_report', content: JSON.stringify({ title: 'B', type: 'quarterly', period: '', summary: '', frameworks: [], status: 'published', publishedDate: null, publishedBy: '' }) }),
      ];
      const list = await SustainabilityService.listReports('org-1', { type: 'annual', status: 'draft' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'annual');
    });
  });

  describe('updateReport', () => {
    it('updates report fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_report', content: JSON.stringify({ title: 'Old', type: 'annual', period: '', summary: '', frameworks: [], status: 'draft', publishedDate: null, publishedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_report', content: args.data.content as string });
      const r = await SustainabilityService.updateReport('mem-1', { title: 'New', status: 'in_review' });
      assert.ok(r);
      assert.equal(r!.title, 'New');
      assert.equal(r!.status, 'in_review');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await SustainabilityService.updateReport('nope', { title: 'X' });
      assert.equal(r, null);
    });
  });

  describe('publishReport', () => {
    it('publishes a report', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_report', content: JSON.stringify({ title: 'R', type: 'annual', period: '', summary: '', frameworks: [], status: 'in_review', publishedDate: null, publishedBy: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_report', content: args.data.content as string });
      const r = await SustainabilityService.publishReport('mem-1', 'publisher');
      assert.ok(r);
      assert.equal(r!.status, 'published');
      assert.equal(r!.publishedBy, 'publisher');
      assert.ok(r!.publishedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await SustainabilityService.publishReport('nope', 'u');
      assert.equal(r, null);
    });
  });

  // ── Carbon Emissions ──

  describe('createCarbonEmission', () => {
    it('creates a carbon emission with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'carbon_emission', content: args.data.content as string });
      const e = await SustainabilityService.createCarbonEmission('org-1', 'ws-1', {
        scope: 1, source: 'Natural Gas', amount: 500, unit: 'tons_co2e', period: '2024-Q1',
      }, 'user-1');
      assert.equal(e.scope, 1);
      assert.equal(e.source, 'Natural Gas');
      assert.equal(e.amount, 500);
      assert.equal(e.offset, 0);
      assert.equal(e.netEmission, 500);
      assert.equal(e.facility, '');
    });

    it('passes through provided fields and computes net emission', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'carbon_emission', content: args.data.content as string });
      const e = await SustainabilityService.createCarbonEmission('org-1', 'ws-1', {
        scope: 2, source: 'Electricity', amount: 1000, unit: 'tons_co2e', period: '2024',
        facility: 'Plant A', offset: 200,
      }, 'user-1');
      assert.equal(e.scope, 2);
      assert.equal(e.facility, 'Plant A');
      assert.equal(e.offset, 200);
      assert.equal(e.netEmission, 800);
    });
  });

  describe('getCarbonEmission', () => {
    it('returns a carbon emission when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'carbon_emission', content: JSON.stringify({ scope: 1, source: 'S', amount: 100, unit: 'tons_co2e', period: '', facility: '', offset: 0, netEmission: 100 }) });
      const e = await SustainabilityService.getCarbonEmission('mem-1');
      assert.ok(e);
      assert.equal(e!.source, 'S');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await SustainabilityService.getCarbonEmission('nope');
      assert.equal(e, null);
    });
  });

  describe('listCarbonEmissions', () => {
    it('lists emissions and filters by scope and period', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'carbon_emission', content: JSON.stringify({ scope: 1, source: 'A', amount: 100, unit: 'tons_co2e', period: '2024-Q1', facility: '', offset: 0, netEmission: 100 }) }),
        makeRow({ id: 'e2', type: 'carbon_emission', content: JSON.stringify({ scope: 2, source: 'B', amount: 200, unit: 'tons_co2e', period: '2024-Q2', facility: '', offset: 0, netEmission: 200 }) }),
      ];
      const list = await SustainabilityService.listCarbonEmissions('org-1', { scope: 1, period: '2024-Q1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].scope, 1);
    });
  });

  describe('updateCarbonEmission', () => {
    it('updates carbon emission fields and recomputes net', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'carbon_emission', content: JSON.stringify({ scope: 1, source: 'S', amount: 500, unit: 'tons_co2e', period: '', facility: '', offset: 100, netEmission: 400 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'carbon_emission', content: args.data.content as string });
      const e = await SustainabilityService.updateCarbonEmission('mem-1', { amount: 600, offset: 200 });
      assert.ok(e);
      assert.equal(e!.amount, 600);
      assert.equal(e!.offset, 200);
      assert.equal(e!.netEmission, 400);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const e = await SustainabilityService.updateCarbonEmission('nope', { amount: 10 });
      assert.equal(e, null);
    });
  });

  describe('deleteCarbonEmission', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await SustainabilityService.deleteCarbonEmission('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Assessments ──

  describe('createAssessment', () => {
    it('creates an assessment with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_assessment', content: args.data.content as string });
      const a = await SustainabilityService.createAssessment('org-1', 'ws-1', {
        framework: 'GRI', assessmentDate: '2024-06-01',
      }, 'user-1');
      assert.equal(a.framework, 'GRI');
      assert.equal(a.rating, '');
      assert.equal(a.score, 0);
      assert.equal(a.status, 'pending');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esg_assessment', content: args.data.content as string });
      const a = await SustainabilityService.createAssessment('org-1', 'ws-1', {
        framework: 'CDP', rating: 'A', score: 85, assessor: 'MSCI',
        assessmentDate: '2024-01-01', findings: 'f', recommendations: 'r', status: 'completed',
      }, 'user-1');
      assert.equal(a.rating, 'A');
      assert.equal(a.score, 85);
      assert.equal(a.assessor, 'MSCI');
      assert.equal(a.status, 'completed');
    });
  });

  describe('getAssessment', () => {
    it('returns an assessment when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_assessment', content: JSON.stringify({ framework: 'GRI', rating: '', score: 0, assessor: '', assessmentDate: '', findings: '', recommendations: '', status: 'pending' }) });
      const a = await SustainabilityService.getAssessment('mem-1');
      assert.ok(a);
      assert.equal(a!.framework, 'GRI');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await SustainabilityService.getAssessment('nope');
      assert.equal(a, null);
    });
  });

  describe('listAssessments', () => {
    it('lists assessments and filters by framework and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', type: 'esg_assessment', content: JSON.stringify({ framework: 'GRI', rating: '', score: 0, assessor: '', assessmentDate: '', findings: '', recommendations: '', status: 'pending' }) }),
        makeRow({ id: 'a2', type: 'esg_assessment', content: JSON.stringify({ framework: 'CDP', rating: '', score: 0, assessor: '', assessmentDate: '', findings: '', recommendations: '', status: 'completed' }) }),
      ];
      const list = await SustainabilityService.listAssessments('org-1', { framework: 'GRI', status: 'pending' });
      assert.equal(list.length, 1);
      assert.equal(list[0].framework, 'GRI');
    });
  });

  describe('updateAssessment', () => {
    it('updates assessment fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esg_assessment', content: JSON.stringify({ framework: 'GRI', rating: '', score: 0, assessor: '', assessmentDate: '', findings: '', recommendations: '', status: 'pending' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esg_assessment', content: args.data.content as string });
      const a = await SustainabilityService.updateAssessment('mem-1', { score: 90, status: 'completed' });
      assert.ok(a);
      assert.equal(a!.score, 90);
      assert.equal(a!.status, 'completed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const a = await SustainabilityService.updateAssessment('nope', { score: 50 });
      assert.equal(a, null);
    });
  });

  // ── Analytics ──

  describe('getCarbonFootprint', () => {
    it('computes carbon footprint by scope with kg normalization', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'carbon_emission', content: JSON.stringify({ scope: 1, source: 'A', amount: 100, unit: 'tons_co2e', period: '', facility: '', offset: 10, netEmission: 90 }) }),
        makeRow({ id: 'e2', type: 'carbon_emission', content: JSON.stringify({ scope: 2, source: 'B', amount: 5000, unit: 'kg_co2e', period: '', facility: '', offset: 1000, netEmission: 4000 }) }),
        makeRow({ id: 'e3', type: 'carbon_emission', content: JSON.stringify({ scope: 3, source: 'C', amount: 200, unit: 'tons_co2e', period: '', facility: '', offset: 0, netEmission: 200 }) }),
      ];
      const cf = await SustainabilityService.getCarbonFootprint('org-1');
      assert.equal(cf.scope1, 100);
      assert.equal(cf.scope2, 5);
      assert.equal(cf.scope3, 200);
      assert.equal(cf.total, 305);
      assert.equal(cf.totalOffset, 11);
      assert.equal(cf.netTotal, 294);
    });
  });

  describe('getESGScore', () => {
    it('computes ESG score from metrics', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'esg_metric') return [
          makeRow({ id: 'm1', content: JSON.stringify({ name: 'E1', category: 'environmental', unit: '', value: 80, target: 100, period: '', description: '', trend: '' }) }),
          makeRow({ id: 'm2', content: JSON.stringify({ name: 'S1', category: 'social', unit: '', value: 50, target: 100, period: '', description: '', trend: '' }) }),
          makeRow({ id: 'm3', content: JSON.stringify({ name: 'G1', category: 'governance', unit: '', value: 90, target: 100, period: '', description: '', trend: '' }) }),
        ];
        return [];
      };
      const score = await SustainabilityService.getESGScore('org-1');
      assert.equal(score.environmental, 80);
      assert.equal(score.social, 50);
      assert.equal(score.governance, 90);
      assert.equal(score.overall, 73.3);
    });

    it('returns zero scores when no metrics', async () => {
      memFindManyImpl = async () => [];
      const score = await SustainabilityService.getESGScore('org-1');
      assert.equal(score.environmental, 0);
      assert.equal(score.social, 0);
      assert.equal(score.governance, 0);
      assert.equal(score.overall, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'esg_metric') return [makeRow({ type: 'esg_metric' })];
        if (where.type === 'esg_target') return [makeRow({ type: 'esg_target', content: JSON.stringify({ metricId: '', name: '', category: 'environmental', baseline: 0, target: 0, targetDate: '', current: 0, status: 'on_track', description: '' }) })];
        if (where.type === 'esg_initiative') return [makeRow({ type: 'esg_initiative', content: JSON.stringify({ name: '', category: 'environmental', description: '', startDate: '', endDate: '', status: 'planned', owner: '', budget: 0, impact: '', sdgGoals: [] }) })];
        if (where.type === 'esg_report') return [makeRow({ type: 'esg_report', content: JSON.stringify({ title: '', type: 'annual', period: '', summary: '', frameworks: [], status: 'draft', publishedDate: null, publishedBy: '' }) })];
        if (where.type === 'carbon_emission') return [
          makeRow({ type: 'carbon_emission', content: JSON.stringify({ scope: 1, source: '', amount: 100, unit: 'tons_co2e', period: '', facility: '', offset: 20, netEmission: 80 }) }),
        ];
        if (where.type === 'esg_assessment') return [makeRow({ type: 'esg_assessment', content: JSON.stringify({ framework: 'GRI', rating: '', score: 0, assessor: '', assessmentDate: '', findings: '', recommendations: '', status: 'pending' }) })];
        return [];
      };
      const stats = await SustainabilityService.getStats('org-1');
      assert.equal(stats.metricCount, 1);
      assert.equal(stats.targetCount, 1);
      assert.equal(stats.initiativeCount, 1);
      assert.equal(stats.reportCount, 1);
      assert.equal(stats.carbonEmissionCount, 1);
      assert.equal(stats.assessmentCount, 1);
      assert.equal(stats.totalEmissions, 100);
      assert.equal(stats.totalOffset, 20);
      assert.equal(stats.netEmissions, 80);
    });
  });
});
