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
    type: 'ghg_emission',
    content: JSON.stringify({
      name: 'Stationary Emission',
      type: 'stationary',
      description: 'Boiler emissions',
      status: 'draft',
      scope: 'scope1',
      period: '2028',
      amount: 500,
      unit: 'tCO2e',
      co2e: 500,
      source: 'Boiler A',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['ghg_emission', 'stationary', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeFactorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-f1',
    type: 'emission_factor',
    content: JSON.stringify({
      name: 'Natural Gas Factor',
      type: 'fuel',
      description: 'Natural gas emission factor',
      status: 'draft',
      factor: 0.2,
      unit: 'kgCO2e/kWh',
      source: 'EPA',
      validFrom: '2028-01-01',
      validTo: null,
      notes: '',
    }),
    tags: JSON.stringify(['emission_factor', 'fuel', 'draft']),
    ...overrides,
  });
}

function makeReportRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'ghg_report',
    content: JSON.stringify({
      name: 'Annual GHG Report',
      type: 'annual',
      description: 'Annual GHG inventory report',
      status: 'draft',
      period: '2028',
      totalEmissions: 10000,
      scope1: 3000,
      scope2: 2000,
      scope3: 5000,
      unit: 'tCO2e',
      submittedBy: '',
      submittedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['ghg_report', 'annual', 'draft']),
    ...overrides,
  });
}

function makeSourceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'emission_source',
    content: JSON.stringify({
      name: 'Main Facility',
      type: 'facility',
      description: 'Primary manufacturing facility',
      status: 'active',
      scope: 'scope1',
      location: 'Plant A',
      fuelType: 'natural_gas',
      capacity: '10 MW',
      notes: '',
    }),
    tags: JSON.stringify(['emission_source', 'facility', 'active']),
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

const { GHGEmissionsManagementService } = await import('@/lib/services/ghg-emissions-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — GHG Emissions
// ─────────────────────────────────────────────────────────────────────────────

describe('GHGEmissionsManagementService — GHG Emissions', () => {
  beforeEach(() => resetMock());

  it('creates a GHG emission with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const e = await GHGEmissionsManagementService.createGHGEmission('org-1', 'ws-1', {
      name: 'Mobile Emission', type: 'mobile',
    }, 'user-1');
    assert.equal(e.name, 'Mobile Emission');
    assert.equal(e.status, 'draft');
    assert.equal(e.amount, 0);
  });

  it('creates a GHG emission with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const e = await GHGEmissionsManagementService.createGHGEmission('org-1', 'ws-1', {
      name: 'Fugitive Emission', type: 'fugitive', description: 'Refrigerant leak',
      status: 'calculated', scope: 'scope1', period: '2028-Q1',
      amount: 100, unit: 'tCO2e', co2e: 100, source: 'HVAC',
      notes: 'Refrigerant leakage',
    }, 'user-1');
    assert.equal(e.name, 'Fugitive Emission');
    assert.equal(e.type, 'fugitive');
    assert.equal(e.amount, 100);
    assert.equal(e.co2e, 100);
  });

  it('gets a GHG emission by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const e = await GHGEmissionsManagementService.getGHGEmission('mem-1');
    assert.ok(e);
    assert.equal(e!.id, 'mem-1');
    assert.equal(e!.name, 'Stationary Emission');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'emission_factor' });
    const e = await GHGEmissionsManagementService.getGHGEmission('mem-1');
    assert.equal(e, null);
  });

  it('returns null when GHG emission not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await GHGEmissionsManagementService.getGHGEmission('nope');
    assert.equal(e, null);
  });

  it('lists GHG emissions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'ghg_emission') return [makeRow()];
      return [];
    };
    const list = await GHGEmissionsManagementService.listGHGEmissions('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Stationary Emission');
  });

  it('updates a GHG emission', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const e = await GHGEmissionsManagementService.updateGHGEmission('mem-1', { status: 'calculated' });
    assert.ok(e);
    assert.equal(e!.status, 'calculated');
  });

  it('deletes a GHG emission', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await GHGEmissionsManagementService.deleteGHGEmission('mem-1');
    assert.equal(ok, true);
  });

  it('calculateGHGEmission sets status to calculated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const e = await GHGEmissionsManagementService.calculateGHGEmission('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'calculated');
  });

  it('verifyGHGEmission sets status to verified', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const e = await GHGEmissionsManagementService.verifyGHGEmission('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'verified');
  });

  it('submitGHGEmission sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const e = await GHGEmissionsManagementService.submitGHGEmission('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'submitted');
  });

  it('archiveGHGEmission sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const e = await GHGEmissionsManagementService.archiveGHGEmission('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emission Factors
// ─────────────────────────────────────────────────────────────────────────────

describe('GHGEmissionsManagementService — Emission Factors', () => {
  beforeEach(() => resetMock());

  it('creates an emission factor with defaults', async () => {
    memCreateImpl = async (args) => makeFactorRow({ content: args.data.content as string });
    const f = await GHGEmissionsManagementService.createEmissionFactor('org-1', 'ws-1', {
      name: 'Electricity Factor', type: 'electricity',
    }, 'user-1');
    assert.equal(f.name, 'Electricity Factor');
    assert.equal(f.status, 'draft');
    assert.equal(f.factor, 0);
  });

  it('creates an emission factor with full input', async () => {
    memCreateImpl = async (args) => makeFactorRow({ content: args.data.content as string });
    const f = await GHGEmissionsManagementService.createEmissionFactor('org-1', 'ws-1', {
      name: 'Diesel Factor', type: 'fuel', description: 'Diesel emission factor',
      status: 'active', factor: 0.26, unit: 'kgCO2e/L',
      source: 'DEFRA', validFrom: '2028-01-01', validTo: '2028-12-31',
      notes: 'UK DEFRA factor',
    }, 'user-1');
    assert.equal(f.name, 'Diesel Factor');
    assert.equal(f.type, 'fuel');
    assert.equal(f.factor, 0.26);
    assert.equal(f.source, 'DEFRA');
  });

  it('gets an emission factor by id', async () => {
    memFindUniqueImpl = async () => makeFactorRow();
    const f = await GHGEmissionsManagementService.getEmissionFactor('mem-f1');
    assert.ok(f);
    assert.equal(f!.name, 'Natural Gas Factor');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFactorRow({ type: 'ghg_emission' });
    const f = await GHGEmissionsManagementService.getEmissionFactor('mem-f1');
    assert.equal(f, null);
  });

  it('returns null when emission factor not found', async () => {
    memFindUniqueImpl = async () => null;
    const f = await GHGEmissionsManagementService.getEmissionFactor('nope');
    assert.equal(f, null);
  });

  it('lists emission factors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emission_factor') return [makeFactorRow()];
      return [];
    };
    const list = await GHGEmissionsManagementService.listEmissionFactors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an emission factor', async () => {
    memFindUniqueImpl = async () => makeFactorRow();
    memUpdateImpl = async (args) => makeFactorRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await GHGEmissionsManagementService.updateEmissionFactor('mem-f1', { status: 'active' });
    assert.ok(f);
    assert.equal(f!.status, 'active');
  });

  it('deletes an emission factor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-f1' });
    const ok = await GHGEmissionsManagementService.deleteEmissionFactor('mem-f1');
    assert.equal(ok, true);
  });

  it('activateEmissionFactor sets status to active', async () => {
    memFindUniqueImpl = async () => makeFactorRow();
    memUpdateImpl = async (args) => makeFactorRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await GHGEmissionsManagementService.activateEmissionFactor('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'active');
  });

  it('deprecateEmissionFactor sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeFactorRow();
    memUpdateImpl = async (args) => makeFactorRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await GHGEmissionsManagementService.deprecateEmissionFactor('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'deprecated');
  });

  it('archiveEmissionFactor sets status to archived', async () => {
    memFindUniqueImpl = async () => makeFactorRow();
    memUpdateImpl = async (args) => makeFactorRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await GHGEmissionsManagementService.archiveEmissionFactor('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — GHG Reports
// ─────────────────────────────────────────────────────────────────────────────

describe('GHGEmissionsManagementService — GHG Reports', () => {
  beforeEach(() => resetMock());

  it('creates a GHG report with defaults', async () => {
    memCreateImpl = async (args) => makeReportRow({ content: args.data.content as string });
    const r = await GHGEmissionsManagementService.createGHGReport('org-1', 'ws-1', {
      name: 'Quarterly Report', type: 'quarterly',
    }, 'user-1');
    assert.equal(r.name, 'Quarterly Report');
    assert.equal(r.status, 'draft');
    assert.equal(r.totalEmissions, 0);
  });

  it('creates a GHG report with full input', async () => {
    memCreateImpl = async (args) => makeReportRow({ content: args.data.content as string });
    const r = await GHGEmissionsManagementService.createGHGReport('org-1', 'ws-1', {
      name: 'CDP Report', type: 'cdp', description: 'CDP climate report',
      status: 'submitted', period: '2028', totalEmissions: 15000,
      scope1: 4000, scope2: 3000, scope3: 8000, unit: 'tCO2e',
      submittedBy: 'Jane', submittedDate: '2028-03-01', notes: 'CDP submission',
    }, 'user-1');
    assert.equal(r.name, 'CDP Report');
    assert.equal(r.type, 'cdp');
    assert.equal(r.totalEmissions, 15000);
    assert.equal(r.scope1, 4000);
  });

  it('gets a GHG report by id', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    const r = await GHGEmissionsManagementService.getGHGReport('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Annual GHG Report');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReportRow({ type: 'ghg_emission' });
    const r = await GHGEmissionsManagementService.getGHGReport('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when GHG report not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await GHGEmissionsManagementService.getGHGReport('nope');
    assert.equal(r, null);
  });

  it('lists GHG reports by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'ghg_report') return [makeReportRow()];
      return [];
    };
    const list = await GHGEmissionsManagementService.listGHGReports('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a GHG report', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GHGEmissionsManagementService.updateGHGReport('mem-r1', { status: 'submitted' });
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('deletes a GHG report', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await GHGEmissionsManagementService.deleteGHGReport('mem-r1');
    assert.equal(ok, true);
  });

  it('submitGHGReport sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GHGEmissionsManagementService.submitGHGReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('approveGHGReport sets status to approved', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GHGEmissionsManagementService.approveGHGReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'approved');
  });

  it('publishGHGReport sets status to published', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GHGEmissionsManagementService.publishGHGReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'published');
  });

  it('archiveGHGReport sets status to archived', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await GHGEmissionsManagementService.archiveGHGReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emission Sources
// ─────────────────────────────────────────────────────────────────────────────

describe('GHGEmissionsManagementService — Emission Sources', () => {
  beforeEach(() => resetMock());

  it('creates an emission source with defaults', async () => {
    memCreateImpl = async (args) => makeSourceRow({ content: args.data.content as string });
    const s = await GHGEmissionsManagementService.createEmissionSource('org-1', 'ws-1', {
      name: 'Company Vehicles', type: 'vehicle',
    }, 'user-1');
    assert.equal(s.name, 'Company Vehicles');
    assert.equal(s.status, 'active');
    assert.equal(s.scope, '');
  });

  it('creates an emission source with full input', async () => {
    memCreateImpl = async (args) => makeSourceRow({ content: args.data.content as string });
    const s = await GHGEmissionsManagementService.createEmissionSource('org-1', 'ws-1', {
      name: 'Boiler System', type: 'equipment', description: 'Industrial boiler',
      status: 'monitored', scope: 'scope1', location: 'Plant B',
      fuelType: 'diesel', capacity: '5 MW', notes: 'High emission source',
    }, 'user-1');
    assert.equal(s.name, 'Boiler System');
    assert.equal(s.type, 'equipment');
    assert.equal(s.fuelType, 'diesel');
    assert.equal(s.capacity, '5 MW');
  });

  it('gets an emission source by id', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    const s = await GHGEmissionsManagementService.getEmissionSource('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Main Facility');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSourceRow({ type: 'ghg_emission' });
    const s = await GHGEmissionsManagementService.getEmissionSource('mem-s1');
    assert.equal(s, null);
  });

  it('returns null when emission source not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await GHGEmissionsManagementService.getEmissionSource('nope');
    assert.equal(s, null);
  });

  it('lists emission sources by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emission_source') return [makeSourceRow()];
      return [];
    };
    const list = await GHGEmissionsManagementService.listEmissionSources('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an emission source', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await GHGEmissionsManagementService.updateEmissionSource('mem-s1', { status: 'monitored' });
    assert.ok(s);
    assert.equal(s!.status, 'monitored');
  });

  it('deletes an emission source', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await GHGEmissionsManagementService.deleteEmissionSource('mem-s1');
    assert.equal(ok, true);
  });

  it('activateEmissionSource sets status to active', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await GHGEmissionsManagementService.activateEmissionSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('monitorEmissionSource sets status to monitored', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await GHGEmissionsManagementService.monitorEmissionSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'monitored');
  });

  it('decommissionEmissionSource sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeSourceRow();
    memUpdateImpl = async (args) => makeSourceRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await GHGEmissionsManagementService.decommissionEmissionSource('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('GHGEmissionsManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getGHGEmissionsManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'ghg_emission') return [
        makeRow({ content: JSON.stringify({ name: 'E1', type: 'stationary', status: 'calculated', description: '', scope: '', period: '', amount: 0, unit: '', co2e: 0, source: '', notes: '' }) }),
        makeRow({ id: 'e2', content: JSON.stringify({ name: 'E2', type: 'stationary', status: 'verified', description: '', scope: '', period: '', amount: 0, unit: '', co2e: 0, source: '', notes: '' }) }),
      ];
      if (t === 'emission_factor') return [
        makeFactorRow({ content: JSON.stringify({ name: 'F1', type: 'fuel', status: 'active', description: '', factor: 0, unit: '', source: '', validFrom: null, validTo: null, notes: '' }) }),
      ];
      if (t === 'ghg_report') return [
        makeReportRow({ content: JSON.stringify({ name: 'R1', type: 'annual', status: 'submitted', description: '', period: '', totalEmissions: 0, scope1: 0, scope2: 0, scope3: 0, unit: '', submittedBy: '', submittedDate: null, notes: '' }) }),
      ];
      if (t === 'emission_source') return [
        makeSourceRow({ content: JSON.stringify({ name: 'S1', type: 'facility', status: 'active', description: '', scope: '', location: '', fuelType: '', capacity: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await GHGEmissionsManagementService.getGHGEmissionsManagementMetrics('org-1');
    assert.equal(m.calculatedEmissions, 2);
    assert.equal(m.verifiedEmissions, 1);
    assert.equal(m.activeFactors, 1);
    assert.equal(m.submittedReports, 1);
    assert.equal(m.activeSources, 1);
  });

  it('getGHGEmissionsManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'ghg_emission') return [makeRow()];
      if (t === 'emission_factor') return [makeFactorRow()];
      if (t === 'ghg_report') return [makeReportRow()];
      if (t === 'emission_source') return [makeSourceRow()];
      return [];
    };
    const s = await GHGEmissionsManagementService.getGHGEmissionsManagementStats('org-1');
    assert.equal(s.emissionCount, 1);
    assert.equal(s.factorCount, 1);
    assert.equal(s.reportCount, 1);
    assert.equal(s.sourceCount, 1);
    assert.equal(s.byEmissionType['stationary'], 1);
    assert.equal(s.byFactorType['fuel'], 1);
    assert.equal(s.byReportType['annual'], 1);
    assert.equal(s.bySourceType['facility'], 1);
  });
});
