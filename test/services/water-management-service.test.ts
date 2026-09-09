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
    type: 'water_meter',
    content: JSON.stringify({
      name: 'Main Water Meter',
      type: 'main',
      description: 'Building main water meter',
      status: 'pending',
      location: 'Basement',
      building: 'Building A',
      unit: 'gallons',
      capacity: 10000,
      lastCalibrated: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['water_meter', 'main', 'pending']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeReadingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'water_reading',
    content: JSON.stringify({
      meterId: 'mem-1',
      type: 'consumption',
      description: 'Monthly reading',
      status: 'pending',
      value: 5000,
      unit: 'gallons',
      readingDate: '2028-01-15',
      previousValue: 4500,
      consumption: 500,
      cost: 50,
      notes: '',
    }),
    tags: JSON.stringify(['water_reading', 'consumption', 'pending']),
    ...overrides,
  });
}

function makeTestRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'water_quality_test',
    content: JSON.stringify({
      meterId: 'mem-1',
      type: 'ph',
      description: 'pH test',
      status: 'scheduled',
      scheduledDate: '2028-02-01',
      completedDate: null,
      result: '',
      parameter: 'pH',
      value: 0,
      unit: '',
      passFail: '',
      notes: '',
    }),
    tags: JSON.stringify(['water_quality_test', 'ph', 'scheduled']),
    ...overrides,
  });
}

function makeProgramRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'conservation_program',
    content: JSON.stringify({
      name: 'Leak Detection Program',
      type: 'leak_detection',
      description: 'Building leak detection',
      status: 'planned',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      targetReduction: 20,
      actualReduction: 0,
      unit: '%',
      participants: 30,
      coordinator: 'Alice',
      notes: '',
    }),
    tags: JSON.stringify(['conservation_program', 'leak_detection', 'planned']),
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

const { WaterManagementService } = await import('@/lib/services/water-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Water Meters
// ─────────────────────────────────────────────────────────────────────────────

describe('WaterManagementService — Water Meters', () => {
  beforeEach(() => resetMock());

  it('creates a water meter with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await WaterManagementService.createWaterMeter('org-1', 'ws-1', {
      name: 'Irrigation Meter', type: 'irrigation',
    }, 'user-1');
    assert.equal(m.name, 'Irrigation Meter');
    assert.equal(m.status, 'pending');
    assert.equal(m.capacity, 0);
  });

  it('creates a water meter with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await WaterManagementService.createWaterMeter('org-1', 'ws-1', {
      name: 'Smart Water Meter', type: 'smart', description: 'IoT smart meter',
      status: 'active', location: 'Floor 1', building: 'Building B',
      unit: 'liters', capacity: 5000, lastCalibrated: '2028-01-01',
      notes: 'Calibrated annually',
    }, 'user-1');
    assert.equal(m.name, 'Smart Water Meter');
    assert.equal(m.type, 'smart');
    assert.equal(m.capacity, 5000);
    assert.equal(m.building, 'Building B');
  });

  it('gets a water meter by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const m = await WaterManagementService.getWaterMeter('mem-1');
    assert.ok(m);
    assert.equal(m!.id, 'mem-1');
    assert.equal(m!.name, 'Main Water Meter');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'water_reading' });
    const m = await WaterManagementService.getWaterMeter('mem-1');
    assert.equal(m, null);
  });

  it('returns null when water meter not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await WaterManagementService.getWaterMeter('nope');
    assert.equal(m, null);
  });

  it('lists water meters by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'water_meter') return [makeRow()];
      return [];
    };
    const list = await WaterManagementService.listWaterMeters('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Main Water Meter');
  });

  it('updates a water meter', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await WaterManagementService.updateWaterMeter('mem-1', { status: 'active' });
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('deletes a water meter', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await WaterManagementService.deleteWaterMeter('mem-1');
    assert.equal(ok, true);
  });

  it('activateWaterMeter sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await WaterManagementService.activateWaterMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('maintainWaterMeter sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await WaterManagementService.maintainWaterMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'maintained');
  });

  it('calibrateWaterMeter sets status to calibrating', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await WaterManagementService.calibrateWaterMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'calibrating');
  });

  it('decommissionWaterMeter sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await WaterManagementService.decommissionWaterMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Water Readings
// ─────────────────────────────────────────────────────────────────────────────

describe('WaterManagementService — Water Readings', () => {
  beforeEach(() => resetMock());

  it('creates a water reading with defaults', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await WaterManagementService.createWaterReading('org-1', 'ws-1', {
      type: 'estimated',
    }, 'user-1');
    assert.equal(r.type, 'estimated');
    assert.equal(r.status, 'pending');
    assert.equal(r.value, 0);
  });

  it('creates a water reading with full input', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await WaterManagementService.createWaterReading('org-1', 'ws-1', {
      meterId: 'mem-1', type: 'peak', description: 'Peak usage reading',
      status: 'submitted', value: 8000, unit: 'gallons',
      readingDate: '2028-06-15', previousValue: 7500,
      consumption: 500, cost: 100, notes: 'Summer peak',
    }, 'user-1');
    assert.equal(r.type, 'peak');
    assert.equal(r.value, 8000);
    assert.equal(r.consumption, 500);
    assert.equal(r.cost, 100);
  });

  it('gets a water reading by id', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    const r = await WaterManagementService.getWaterReading('mem-r1');
    assert.ok(r);
    assert.equal(r!.type, 'consumption');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReadingRow({ type: 'water_meter' });
    const r = await WaterManagementService.getWaterReading('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when water reading not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await WaterManagementService.getWaterReading('nope');
    assert.equal(r, null);
  });

  it('lists water readings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'water_reading') return [makeReadingRow()];
      return [];
    };
    const list = await WaterManagementService.listWaterReadings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a water reading', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WaterManagementService.updateWaterReading('mem-r1', { status: 'verified' });
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('deletes a water reading', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await WaterManagementService.deleteWaterReading('mem-r1');
    assert.equal(ok, true);
  });

  it('submitWaterReading sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WaterManagementService.submitWaterReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('verifyWaterReading sets status to verified', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WaterManagementService.verifyWaterReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('flagWaterReading sets status to flagged', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WaterManagementService.flagWaterReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'flagged');
  });

  it('archiveWaterReading sets status to archived', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WaterManagementService.archiveWaterReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Water Quality Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('WaterManagementService — Water Quality Tests', () => {
  beforeEach(() => resetMock());

  it('creates a water quality test with defaults', async () => {
    memCreateImpl = async (args) => makeTestRow({ content: args.data.content as string });
    const t = await WaterManagementService.createWaterQualityTest('org-1', 'ws-1', {
      type: 'chlorine',
    }, 'user-1');
    assert.equal(t.type, 'chlorine');
    assert.equal(t.status, 'scheduled');
    assert.equal(t.value, 0);
  });

  it('creates a water quality test with full input', async () => {
    memCreateImpl = async (args) => makeTestRow({ content: args.data.content as string });
    const t = await WaterManagementService.createWaterQualityTest('org-1', 'ws-1', {
      meterId: 'mem-1', type: 'lead', description: 'Lead contamination test',
      status: 'in_progress', scheduledDate: '2028-03-01',
      result: '', parameter: 'Lead', value: 0, unit: 'ppb',
      passFail: '', notes: 'Quarterly test',
    }, 'user-1');
    assert.equal(t.type, 'lead');
    assert.equal(t.status, 'in_progress');
    assert.equal(t.parameter, 'Lead');
  });

  it('gets a water quality test by id', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    const t = await WaterManagementService.getWaterQualityTest('mem-t1');
    assert.ok(t);
    assert.equal(t!.type, 'ph');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTestRow({ type: 'water_meter' });
    const t = await WaterManagementService.getWaterQualityTest('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when water quality test not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await WaterManagementService.getWaterQualityTest('nope');
    assert.equal(t, null);
  });

  it('lists water quality tests by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'water_quality_test') return [makeTestRow()];
      return [];
    };
    const list = await WaterManagementService.listWaterQualityTests('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a water quality test', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await WaterManagementService.updateWaterQualityTest('mem-t1', { status: 'in_progress' });
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('deletes a water quality test', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await WaterManagementService.deleteWaterQualityTest('mem-t1');
    assert.equal(ok, true);
  });

  it('startWaterQualityTest sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await WaterManagementService.startWaterQualityTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('completeWaterQualityTest sets status to completed', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await WaterManagementService.completeWaterQualityTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('failWaterQualityTest sets status to failed', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await WaterManagementService.failWaterQualityTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'failed');
  });

  it('retestWaterQualityTest sets status to retest', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await WaterManagementService.retestWaterQualityTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'retest');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Conservation Programs
// ─────────────────────────────────────────────────────────────────────────────

describe('WaterManagementService — Conservation Programs', () => {
  beforeEach(() => resetMock());

  it('creates a conservation program with defaults', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await WaterManagementService.createConservationProgram('org-1', 'ws-1', {
      name: 'Rainwater Harvesting', type: 'rainwater',
    }, 'user-1');
    assert.equal(p.name, 'Rainwater Harvesting');
    assert.equal(p.status, 'planned');
    assert.equal(p.targetReduction, 0);
  });

  it('creates a conservation program with full input', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await WaterManagementService.createConservationProgram('org-1', 'ws-1', {
      name: 'Greywater Reuse', type: 'greywater', description: 'Greywater recycling system',
      status: 'active', startDate: '2028-01-01', endDate: '2028-12-31',
      targetReduction: 30, actualReduction: 10, unit: '%',
      participants: 50, coordinator: 'Jane', notes: 'On track',
    }, 'user-1');
    assert.equal(p.name, 'Greywater Reuse');
    assert.equal(p.type, 'greywater');
    assert.equal(p.targetReduction, 30);
    assert.equal(p.participants, 50);
  });

  it('gets a conservation program by id', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    const p = await WaterManagementService.getConservationProgram('mem-p1');
    assert.ok(p);
    assert.equal(p!.name, 'Leak Detection Program');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeProgramRow({ type: 'water_meter' });
    const p = await WaterManagementService.getConservationProgram('mem-p1');
    assert.equal(p, null);
  });

  it('returns null when conservation program not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await WaterManagementService.getConservationProgram('nope');
    assert.equal(p, null);
  });

  it('lists conservation programs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'conservation_program') return [makeProgramRow()];
      return [];
    };
    const list = await WaterManagementService.listConservationPrograms('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a conservation program', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WaterManagementService.updateConservationProgram('mem-p1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a conservation program', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await WaterManagementService.deleteConservationProgram('mem-p1');
    assert.equal(ok, true);
  });

  it('launchConservationProgram sets status to active', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WaterManagementService.launchConservationProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('suspendConservationProgram sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WaterManagementService.suspendConservationProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'suspended');
  });

  it('completeConservationProgram sets status to completed', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WaterManagementService.completeConservationProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('archiveConservationProgram sets status to archived', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WaterManagementService.archiveConservationProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('WaterManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getWaterManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'water_meter') return [
        makeRow({ content: JSON.stringify({ name: 'M1', type: 'main', status: 'active', description: '', location: '', building: '', unit: '', capacity: 0, lastCalibrated: null, notes: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'M2', type: 'main', status: 'pending', description: '', location: '', building: '', unit: '', capacity: 0, lastCalibrated: null, notes: '' }) }),
      ];
      if (t === 'water_reading') return [
        makeReadingRow({ content: JSON.stringify({ meterId: null, type: 'consumption', status: 'pending', description: '', value: 0, unit: '', readingDate: null, previousValue: 0, consumption: 100, cost: 0, notes: '' }) }),
        makeReadingRow({ id: 'r2', content: JSON.stringify({ meterId: null, type: 'consumption', status: 'submitted', description: '', value: 0, unit: '', readingDate: null, previousValue: 0, consumption: 200, cost: 0, notes: '' }) }),
      ];
      if (t === 'water_quality_test') return [
        makeTestRow({ content: JSON.stringify({ meterId: null, type: 'ph', status: 'scheduled', description: '', scheduledDate: null, completedDate: null, result: '', parameter: '', value: 0, unit: '', passFail: '', notes: '' }) }),
        makeTestRow({ id: 't2', content: JSON.stringify({ meterId: null, type: 'ph', status: 'in_progress', description: '', scheduledDate: null, completedDate: null, result: '', parameter: '', value: 0, unit: '', passFail: '', notes: '' }) }),
      ];
      if (t === 'conservation_program') return [
        makeProgramRow({ content: JSON.stringify({ name: 'P1', type: 'reduction', status: 'active', description: '', startDate: null, endDate: null, targetReduction: 0, actualReduction: 0, unit: '', participants: 0, coordinator: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await WaterManagementService.getWaterManagementMetrics('org-1');
    assert.equal(m.activeMeters, 1);
    assert.equal(m.pendingReadings, 2);
    assert.equal(m.pendingTests, 2);
    assert.equal(m.activePrograms, 1);
    assert.equal(m.totalConsumption, 300);
  });

  it('getWaterManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'water_meter') return [makeRow()];
      if (t === 'water_reading') return [makeReadingRow()];
      if (t === 'water_quality_test') return [makeTestRow()];
      if (t === 'conservation_program') return [makeProgramRow()];
      return [];
    };
    const s = await WaterManagementService.getWaterManagementStats('org-1');
    assert.equal(s.meterCount, 1);
    assert.equal(s.readingCount, 1);
    assert.equal(s.testCount, 1);
    assert.equal(s.programCount, 1);
    assert.equal(s.byMeterType['main'], 1);
    assert.equal(s.byReadingType['consumption'], 1);
    assert.equal(s.byTestType['ph'], 1);
    assert.equal(s.byProgramType['leak_detection'], 1);
  });
});
