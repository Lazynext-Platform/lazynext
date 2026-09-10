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
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'kpi_definition',
    content: JSON.stringify({
      name: 'Revenue KPI',
      type: 'revenue',
      description: 'Monthly revenue KPI',
      status: 'draft',
      metric: 'revenue',
      unit: 'USD',
      formula: 'sum(sales)',
      frequency: 'monthly',
      owner: 'Finance',
      category: 'financial',
      target: 100000,
      direction: 'increase',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['kpi_definition', 'revenue', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeTargetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'kpi_target',
    content: JSON.stringify({
      name: 'Q1 Revenue Target',
      type: 'quarterly',
      description: 'Q1 revenue target',
      status: 'draft',
      kpiId: 'mem-1',
      target: 300000,
      minimum: 250000,
      stretch: 350000,
      startDate: '2028-01-01',
      endDate: '2028-03-31',
      progress: 0,
      notes: '',
    }),
    tags: JSON.stringify(['kpi_target', 'quarterly', 'draft']),
    ...overrides,
  });
}

function makeMeasurementRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'kpi_measurement',
    content: JSON.stringify({
      name: 'January Revenue',
      type: 'actual',
      description: 'January actual revenue',
      status: 'recorded',
      kpiId: 'mem-1',
      targetId: 'mem-t1',
      value: 95000,
      previousValue: 90000,
      change: 5000,
      measuredAt: '2028-01-31',
      measuredBy: 'Finance Team',
      notes: '',
    }),
    tags: JSON.stringify(['kpi_measurement', 'actual', 'recorded']),
    ...overrides,
  });
}

function makeDashboardRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'kpi_dashboard',
    content: JSON.stringify({
      name: 'Executive Dashboard',
      type: 'executive',
      description: 'Executive KPI dashboard',
      status: 'draft',
      kpis: ['mem-1', 'mem-2'],
      layout: 'grid',
      filters: 'quarter=Q1',
      refreshInterval: 'daily',
      owner: 'CEO',
      shared: true,
      notes: '',
    }),
    tags: JSON.stringify(['kpi_dashboard', 'executive', 'draft']),
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
  memCountImpl = async () => 0;
}

const { KpiService } = await import('@/lib/services/kpi-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — KPI Definitions
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService — KPI Definitions', () => {
  beforeEach(() => resetMock());

  it('creates a KPI definition with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const d = await KpiService.createKpiDefinition('org-1', 'ws-1', {
      name: 'Growth KPI', type: 'growth',
    }, 'user-1');
    assert.equal(d.name, 'Growth KPI');
    assert.equal(d.status, 'draft');
    assert.equal(d.target, 0);
  });

  it('creates a KPI definition with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const d = await KpiService.createKpiDefinition('org-1', 'ws-1', {
      name: 'Efficiency KPI', type: 'efficiency', description: 'Operational efficiency',
      status: 'active', metric: 'throughput', unit: 'tasks/hr', formula: 'tasks/hours',
      frequency: 'weekly', owner: 'Ops', category: 'operational', target: 500,
      direction: 'increase', notes: 'Weekly efficiency',
    }, 'user-1');
    assert.equal(d.name, 'Efficiency KPI');
    assert.equal(d.type, 'efficiency');
    assert.equal(d.target, 500);
    assert.equal(d.direction, 'increase');
  });

  it('gets a KPI definition by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const d = await KpiService.getKpiDefinition('mem-1');
    assert.ok(d);
    assert.equal(d!.id, 'mem-1');
    assert.equal(d!.name, 'Revenue KPI');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'kpi_target' });
    const d = await KpiService.getKpiDefinition('mem-1');
    assert.equal(d, null);
  });

  it('returns null when KPI definition not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await KpiService.getKpiDefinition('nope');
    assert.equal(d, null);
  });

  it('lists KPI definitions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_definition') return [makeRow()];
      return [];
    };
    const list = await KpiService.listKpiDefinitions('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Revenue KPI');
  });

  it('updates a KPI definition', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await KpiService.updateKpiDefinition('mem-1', { status: 'active' });
    assert.ok(d);
    assert.equal(d!.status, 'active');
  });

  it('deletes a KPI definition', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await KpiService.deleteKpiDefinition('mem-1');
    assert.equal(ok, true);
  });

  it('activateKpiDefinition sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await KpiService.activateKpiDefinition('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'active');
  });

  it('deprecateKpiDefinition sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await KpiService.deprecateKpiDefinition('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'deprecated');
  });

  it('archiveKpiDefinition sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await KpiService.archiveKpiDefinition('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — KPI Targets
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService — KPI Targets', () => {
  beforeEach(() => resetMock());

  it('creates a KPI target with defaults', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await KpiService.createKpiTarget('org-1', 'ws-1', {
      name: 'Annual Target', type: 'annual',
    }, 'user-1');
    assert.equal(t.name, 'Annual Target');
    assert.equal(t.status, 'draft');
    assert.equal(t.target, 0);
  });

  it('creates a KPI target with full input', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await KpiService.createKpiTarget('org-1', 'ws-1', {
      name: 'Monthly Target', type: 'monthly', description: 'Monthly revenue target',
      status: 'active', kpiId: 'mem-1', target: 100000, minimum: 80000, stretch: 120000,
      startDate: '2028-01-01', endDate: '2028-01-31', progress: 50, notes: 'Mid-month',
    }, 'user-1');
    assert.equal(t.name, 'Monthly Target');
    assert.equal(t.type, 'monthly');
    assert.equal(t.target, 100000);
    assert.equal(t.progress, 50);
  });

  it('gets a KPI target by id', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    const t = await KpiService.getKpiTarget('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'Q1 Revenue Target');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTargetRow({ type: 'kpi_definition' });
    const t = await KpiService.getKpiTarget('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when KPI target not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await KpiService.getKpiTarget('nope');
    assert.equal(t, null);
  });

  it('lists KPI targets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_target') return [makeTargetRow()];
      return [];
    };
    const list = await KpiService.listKpiTargets('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a KPI target', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await KpiService.updateKpiTarget('mem-t1', { status: 'active' });
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deletes a KPI target', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await KpiService.deleteKpiTarget('mem-t1');
    assert.equal(ok, true);
  });

  it('activateKpiTarget sets status to active', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await KpiService.activateKpiTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('achieveKpiTarget sets status to achieved', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await KpiService.achieveKpiTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'achieved');
  });

  it('missKpiTarget sets status to missed', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await KpiService.missKpiTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'missed');
  });

  it('archiveKpiTarget sets status to archived', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await KpiService.archiveKpiTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — KPI Measurements
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService — KPI Measurements', () => {
  beforeEach(() => resetMock());

  it('creates a KPI measurement with defaults', async () => {
    memCreateImpl = async (args) => makeMeasurementRow({ content: args.data.content as string });
    const m = await KpiService.createKpiMeasurement('org-1', 'ws-1', {
      name: 'Baseline Measurement', type: 'baseline',
    }, 'user-1');
    assert.equal(m.name, 'Baseline Measurement');
    assert.equal(m.status, 'recorded');
    assert.equal(m.value, 0);
  });

  it('creates a KPI measurement with full input', async () => {
    memCreateImpl = async (args) => makeMeasurementRow({ content: args.data.content as string });
    const m = await KpiService.createKpiMeasurement('org-1', 'ws-1', {
      name: 'Forecast Measurement', type: 'forecast', description: 'Q1 forecast',
      status: 'verified', kpiId: 'mem-1', targetId: 'mem-t1', value: 310000,
      previousValue: 290000, change: 20000, measuredAt: '2028-03-15',
      measuredBy: 'Analyst', notes: 'Verified forecast',
    }, 'user-1');
    assert.equal(m.name, 'Forecast Measurement');
    assert.equal(m.type, 'forecast');
    assert.equal(m.value, 310000);
    assert.equal(m.change, 20000);
  });

  it('gets a KPI measurement by id', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    const m = await KpiService.getKpiMeasurement('mem-m1');
    assert.ok(m);
    assert.equal(m!.name, 'January Revenue');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow({ type: 'kpi_definition' });
    const m = await KpiService.getKpiMeasurement('mem-m1');
    assert.equal(m, null);
  });

  it('returns null when KPI measurement not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await KpiService.getKpiMeasurement('nope');
    assert.equal(m, null);
  });

  it('lists KPI measurements by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_measurement') return [makeMeasurementRow()];
      return [];
    };
    const list = await KpiService.listKpiMeasurements('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a KPI measurement', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    memUpdateImpl = async (args) => makeMeasurementRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KpiService.updateKpiMeasurement('mem-m1', { status: 'verified' });
    assert.ok(m);
    assert.equal(m!.status, 'verified');
  });

  it('deletes a KPI measurement', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await KpiService.deleteKpiMeasurement('mem-m1');
    assert.equal(ok, true);
  });

  it('recordMeasurement sets status to recorded', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    memUpdateImpl = async (args) => makeMeasurementRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KpiService.recordMeasurement('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'recorded');
  });

  it('verifyMeasurement sets status to verified', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    memUpdateImpl = async (args) => makeMeasurementRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KpiService.verifyMeasurement('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'verified');
  });

  it('disputeMeasurement sets status to disputed', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    memUpdateImpl = async (args) => makeMeasurementRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KpiService.disputeMeasurement('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'disputed');
  });

  it('archiveMeasurement sets status to archived', async () => {
    memFindUniqueImpl = async () => makeMeasurementRow();
    memUpdateImpl = async (args) => makeMeasurementRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await KpiService.archiveMeasurement('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — KPI Dashboards
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService — KPI Dashboards', () => {
  beforeEach(() => resetMock());

  it('creates a KPI dashboard with defaults', async () => {
    memCreateImpl = async (args) => makeDashboardRow({ content: args.data.content as string });
    const d = await KpiService.createKpiDashboard('org-1', 'ws-1', {
      name: 'Team Dashboard', type: 'team',
    }, 'user-1');
    assert.equal(d.name, 'Team Dashboard');
    assert.equal(d.status, 'draft');
    assert.equal(d.shared, false);
  });

  it('creates a KPI dashboard with full input', async () => {
    memCreateImpl = async (args) => makeDashboardRow({ content: args.data.content as string });
    const d = await KpiService.createKpiDashboard('org-1', 'ws-1', {
      name: 'Ops Dashboard', type: 'operational', description: 'Operational KPI dashboard',
      status: 'active', kpis: ['mem-1', 'mem-2', 'mem-3'], layout: 'list',
      filters: 'team=ops', refreshInterval: 'hourly', owner: 'Ops Lead',
      shared: true, notes: 'Shared dashboard',
    }, 'user-1');
    assert.equal(d.name, 'Ops Dashboard');
    assert.equal(d.type, 'operational');
    assert.equal(d.kpis.length, 3);
    assert.equal(d.shared, true);
  });

  it('gets a KPI dashboard by id', async () => {
    memFindUniqueImpl = async () => makeDashboardRow();
    const d = await KpiService.getKpiDashboard('mem-d1');
    assert.ok(d);
    assert.equal(d!.name, 'Executive Dashboard');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDashboardRow({ type: 'kpi_definition' });
    const d = await KpiService.getKpiDashboard('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when KPI dashboard not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await KpiService.getKpiDashboard('nope');
    assert.equal(d, null);
  });

  it('lists KPI dashboards by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_dashboard') return [makeDashboardRow()];
      return [];
    };
    const list = await KpiService.listKpiDashboards('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a KPI dashboard', async () => {
    memFindUniqueImpl = async () => makeDashboardRow();
    memUpdateImpl = async (args) => makeDashboardRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await KpiService.updateKpiDashboard('mem-d1', { status: 'active' });
    assert.ok(d);
    assert.equal(d!.status, 'active');
  });

  it('deletes a KPI dashboard', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await KpiService.deleteKpiDashboard('mem-d1');
    assert.equal(ok, true);
  });

  it('activateKpiDashboard sets status to active', async () => {
    memFindUniqueImpl = async () => makeDashboardRow();
    memUpdateImpl = async (args) => makeDashboardRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await KpiService.activateKpiDashboard('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'active');
  });

  it('deprecateKpiDashboard sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeDashboardRow();
    memUpdateImpl = async (args) => makeDashboardRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await KpiService.deprecateKpiDashboard('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'deprecated');
  });

  it('archiveKpiDashboard sets status to archived', async () => {
    memFindUniqueImpl = async () => makeDashboardRow();
    memUpdateImpl = async (args) => makeDashboardRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await KpiService.archiveKpiDashboard('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('KpiService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getKpiMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_definition') return [
        makeRow({ content: JSON.stringify({ name: 'D1', type: 'revenue', status: 'active', description: '', metric: '', unit: '', formula: '', frequency: '', owner: '', category: '', target: 0, direction: 'increase', notes: '' }) }),
        makeRow({ id: 'd2', content: JSON.stringify({ name: 'D2', type: 'revenue', status: 'draft', description: '', metric: '', unit: '', formula: '', frequency: '', owner: '', category: '', target: 0, direction: 'increase', notes: '' }) }),
      ];
      if (t === 'kpi_target') return [
        makeTargetRow({ content: JSON.stringify({ name: 'T1', type: 'annual', status: 'active', description: '', kpiId: null, target: 0, minimum: 0, stretch: 0, startDate: null, endDate: null, progress: 0, notes: '' }) }),
        makeTargetRow({ id: 't2', content: JSON.stringify({ name: 'T2', type: 'annual', status: 'achieved', description: '', kpiId: null, target: 0, minimum: 0, stretch: 0, startDate: null, endDate: null, progress: 0, notes: '' }) }),
      ];
      if (t === 'kpi_measurement') return [
        makeMeasurementRow({ content: JSON.stringify({ name: 'M1', type: 'actual', status: 'recorded', description: '', kpiId: null, targetId: null, value: 0, previousValue: 0, change: 0, measuredAt: null, measuredBy: '', notes: '' }) }),
      ];
      if (t === 'kpi_dashboard') return [
        makeDashboardRow({ content: JSON.stringify({ name: 'D1', type: 'executive', status: 'active', description: '', kpis: [], layout: '', filters: '', refreshInterval: '', owner: '', shared: false, notes: '' }) }),
      ];
      return [];
    };
    const m = await KpiService.getKpiMetrics('org-1');
    assert.equal(m.activeDefinitions, 1);
    assert.equal(m.activeTargets, 1);
    assert.equal(m.recordedMeasurements, 1);
    assert.equal(m.activeDashboards, 1);
    assert.equal(m.achievedTargets, 1);
  });

  it('getKpiStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'kpi_definition') return [makeRow()];
      if (t === 'kpi_target') return [makeTargetRow()];
      if (t === 'kpi_measurement') return [makeMeasurementRow()];
      if (t === 'kpi_dashboard') return [makeDashboardRow()];
      return [];
    };
    const s = await KpiService.getKpiStats('org-1');
    assert.equal(s.definitionCount, 1);
    assert.equal(s.targetCount, 1);
    assert.equal(s.measurementCount, 1);
    assert.equal(s.dashboardCount, 1);
    assert.equal(s.byDefinitionType['revenue'], 1);
    assert.equal(s.byTargetType['quarterly'], 1);
    assert.equal(s.byMeasurementType['actual'], 1);
    assert.equal(s.byDashboardType['executive'], 1);
  });
});
