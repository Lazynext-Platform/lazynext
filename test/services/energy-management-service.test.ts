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
    type: 'energy_meter',
    content: JSON.stringify({
      name: 'Main Electric Meter',
      type: 'electric',
      description: 'Building main meter',
      status: 'pending',
      location: 'Basement',
      building: 'Building A',
      unit: 'kWh',
      capacity: 1000,
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
    tags: JSON.stringify(['energy_meter', 'electric', 'pending']),
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
    type: 'energy_reading',
    content: JSON.stringify({
      meterId: 'mem-1',
      type: 'consumption',
      description: 'Monthly reading',
      status: 'pending',
      value: 5000,
      unit: 'kWh',
      readingDate: '2028-01-15',
      previousValue: 4500,
      consumption: 500,
      cost: 75,
      notes: '',
    }),
    tags: JSON.stringify(['energy_reading', 'consumption', 'pending']),
    ...overrides,
  });
}

function makeTargetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'efficiency_target',
    content: JSON.stringify({
      name: 'Reduce Consumption 10%',
      type: 'reduction',
      description: 'Annual reduction target',
      status: 'set',
      targetValue: 10,
      actualValue: 0,
      unit: '%',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      progress: 0,
      notes: '',
    }),
    tags: JSON.stringify(['efficiency_target', 'reduction', 'set']),
    ...overrides,
  });
}

function makeTariffRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-tf1',
    type: 'energy_tariff',
    content: JSON.stringify({
      name: 'Standard Rate',
      type: 'fixed',
      description: 'Fixed rate tariff',
      status: 'pending',
      provider: 'PowerCo',
      rate: 0.15,
      unit: 'kWh',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      contractTerms: 'Net 30',
      notes: '',
    }),
    tags: JSON.stringify(['energy_tariff', 'fixed', 'pending']),
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

const { EnergyManagementService } = await import('@/lib/services/energy-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Energy Meters
// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyManagementService — Energy Meters', () => {
  beforeEach(() => resetMock());

  it('creates an energy meter with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await EnergyManagementService.createEnergyMeter('org-1', 'ws-1', {
      name: 'Solar Meter', type: 'solar',
    }, 'user-1');
    assert.equal(m.name, 'Solar Meter');
    assert.equal(m.status, 'pending');
    assert.equal(m.capacity, 0);
  });

  it('creates an energy meter with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const m = await EnergyManagementService.createEnergyMeter('org-1', 'ws-1', {
      name: 'Smart Meter', type: 'smart', description: 'IoT smart meter',
      status: 'active', location: 'Floor 3', building: 'Building B',
      unit: 'kWh', capacity: 2000, lastCalibrated: '2028-01-01',
      notes: 'Calibrated annually',
    }, 'user-1');
    assert.equal(m.name, 'Smart Meter');
    assert.equal(m.type, 'smart');
    assert.equal(m.capacity, 2000);
    assert.equal(m.building, 'Building B');
  });

  it('gets an energy meter by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const m = await EnergyManagementService.getEnergyMeter('mem-1');
    assert.ok(m);
    assert.equal(m!.id, 'mem-1');
    assert.equal(m!.name, 'Main Electric Meter');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'energy_reading' });
    const m = await EnergyManagementService.getEnergyMeter('mem-1');
    assert.equal(m, null);
  });

  it('returns null when energy meter not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await EnergyManagementService.getEnergyMeter('nope');
    assert.equal(m, null);
  });

  it('lists energy meters by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'energy_meter') return [makeRow()];
      return [];
    };
    const list = await EnergyManagementService.listEnergyMeters('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Main Electric Meter');
  });

  it('updates an energy meter', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EnergyManagementService.updateEnergyMeter('mem-1', { status: 'active' });
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('deletes an energy meter', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EnergyManagementService.deleteEnergyMeter('mem-1');
    assert.equal(ok, true);
  });

  it('activateEnergyMeter sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EnergyManagementService.activateEnergyMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'active');
  });

  it('maintainEnergyMeter sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EnergyManagementService.maintainEnergyMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'maintained');
  });

  it('calibrateEnergyMeter sets status to calibrating', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EnergyManagementService.calibrateEnergyMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'calibrating');
  });

  it('decommissionEnergyMeter sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const m = await EnergyManagementService.decommissionEnergyMeter('mem-1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Energy Readings
// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyManagementService — Energy Readings', () => {
  beforeEach(() => resetMock());

  it('creates an energy reading with defaults', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await EnergyManagementService.createEnergyReading('org-1', 'ws-1', {
      type: 'demand',
    }, 'user-1');
    assert.equal(r.type, 'demand');
    assert.equal(r.status, 'pending');
    assert.equal(r.value, 0);
  });

  it('creates an energy reading with full input', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await EnergyManagementService.createEnergyReading('org-1', 'ws-1', {
      meterId: 'mem-1', type: 'peak', description: 'Peak demand reading',
      status: 'submitted', value: 8000, unit: 'kWh',
      readingDate: '2028-06-15', previousValue: 7500,
      consumption: 500, cost: 120, notes: 'Summer peak',
    }, 'user-1');
    assert.equal(r.type, 'peak');
    assert.equal(r.value, 8000);
    assert.equal(r.consumption, 500);
    assert.equal(r.cost, 120);
  });

  it('gets an energy reading by id', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    const r = await EnergyManagementService.getEnergyReading('mem-r1');
    assert.ok(r);
    assert.equal(r!.type, 'consumption');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReadingRow({ type: 'energy_meter' });
    const r = await EnergyManagementService.getEnergyReading('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when energy reading not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await EnergyManagementService.getEnergyReading('nope');
    assert.equal(r, null);
  });

  it('lists energy readings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'energy_reading') return [makeReadingRow()];
      return [];
    };
    const list = await EnergyManagementService.listEnergyReadings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an energy reading', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnergyManagementService.updateEnergyReading('mem-r1', { status: 'verified' });
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('deletes an energy reading', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await EnergyManagementService.deleteEnergyReading('mem-r1');
    assert.equal(ok, true);
  });

  it('submitEnergyReading sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnergyManagementService.submitEnergyReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('verifyEnergyReading sets status to verified', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnergyManagementService.verifyEnergyReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('flagEnergyReading sets status to flagged', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnergyManagementService.flagEnergyReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'flagged');
  });

  it('archiveEnergyReading sets status to archived', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnergyManagementService.archiveEnergyReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Efficiency Targets
// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyManagementService — Efficiency Targets', () => {
  beforeEach(() => resetMock());

  it('creates an efficiency target with defaults', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await EnergyManagementService.createEfficiencyTarget('org-1', 'ws-1', {
      name: 'Emission Target', type: 'emission',
    }, 'user-1');
    assert.equal(t.name, 'Emission Target');
    assert.equal(t.status, 'set');
    assert.equal(t.targetValue, 0);
  });

  it('creates an efficiency target with full input', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await EnergyManagementService.createEfficiencyTarget('org-1', 'ws-1', {
      name: 'Renewable 50%', type: 'renewable', description: '50% renewable energy',
      status: 'approved', targetValue: 50, actualValue: 20,
      unit: '%', startDate: '2028-01-01', endDate: '2028-12-31',
      progress: 40, notes: 'On track',
    }, 'user-1');
    assert.equal(t.name, 'Renewable 50%');
    assert.equal(t.type, 'renewable');
    assert.equal(t.targetValue, 50);
    assert.equal(t.progress, 40);
  });

  it('gets an efficiency target by id', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    const t = await EnergyManagementService.getEfficiencyTarget('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'Reduce Consumption 10%');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTargetRow({ type: 'energy_meter' });
    const t = await EnergyManagementService.getEfficiencyTarget('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when efficiency target not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await EnergyManagementService.getEfficiencyTarget('nope');
    assert.equal(t, null);
  });

  it('lists efficiency targets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'efficiency_target') return [makeTargetRow()];
      return [];
    };
    const list = await EnergyManagementService.listEfficiencyTargets('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an efficiency target', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await EnergyManagementService.updateEfficiencyTarget('mem-t1', { status: 'approved' });
    assert.ok(t);
    assert.equal(t!.status, 'approved');
  });

  it('deletes an efficiency target', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await EnergyManagementService.deleteEfficiencyTarget('mem-t1');
    assert.equal(ok, true);
  });

  it('approveEfficiencyTarget sets status to approved', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await EnergyManagementService.approveEfficiencyTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'approved');
  });

  it('achieveEfficiencyTarget sets status to achieved', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await EnergyManagementService.achieveEfficiencyTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'achieved');
  });

  it('missEfficiencyTarget sets status to missed', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await EnergyManagementService.missEfficiencyTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'missed');
  });

  it('reviewEfficiencyTarget sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await EnergyManagementService.reviewEfficiencyTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'under_review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Energy Tariffs
// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyManagementService — Energy Tariffs', () => {
  beforeEach(() => resetMock());

  it('creates an energy tariff with defaults', async () => {
    memCreateImpl = async (args) => makeTariffRow({ content: args.data.content as string });
    const t = await EnergyManagementService.createEnergyTariff('org-1', 'ws-1', {
      name: 'TOU Rate', type: 'time_of_use',
    }, 'user-1');
    assert.equal(t.name, 'TOU Rate');
    assert.equal(t.status, 'pending');
    assert.equal(t.rate, 0);
  });

  it('creates an energy tariff with full input', async () => {
    memCreateImpl = async (args) => makeTariffRow({ content: args.data.content as string });
    const t = await EnergyManagementService.createEnergyTariff('org-1', 'ws-1', {
      name: 'Green Tariff', type: 'renewable', description: '100% renewable rate',
      status: 'active', provider: 'EcoEnergy', rate: 0.20,
      unit: 'kWh', startDate: '2028-01-01', endDate: '2028-12-31',
      contractTerms: 'Net 15', notes: 'Green energy',
    }, 'user-1');
    assert.equal(t.name, 'Green Tariff');
    assert.equal(t.type, 'renewable');
    assert.equal(t.rate, 0.20);
    assert.equal(t.provider, 'EcoEnergy');
  });

  it('gets an energy tariff by id', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    const t = await EnergyManagementService.getEnergyTariff('mem-tf1');
    assert.ok(t);
    assert.equal(t!.name, 'Standard Rate');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTariffRow({ type: 'energy_meter' });
    const t = await EnergyManagementService.getEnergyTariff('mem-tf1');
    assert.equal(t, null);
  });

  it('returns null when energy tariff not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await EnergyManagementService.getEnergyTariff('nope');
    assert.equal(t, null);
  });

  it('lists energy tariffs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'energy_tariff') return [makeTariffRow()];
      return [];
    };
    const list = await EnergyManagementService.listEnergyTariffs('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an energy tariff', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-tf1', content: args.data.content as string });
    const t = await EnergyManagementService.updateEnergyTariff('mem-tf1', { status: 'active' });
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deletes an energy tariff', async () => {
    memDeleteImpl = async () => ({ id: 'mem-tf1' });
    const ok = await EnergyManagementService.deleteEnergyTariff('mem-tf1');
    assert.equal(ok, true);
  });

  it('activateEnergyTariff sets status to active', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-tf1', content: args.data.content as string });
    const t = await EnergyManagementService.activateEnergyTariff('mem-tf1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('suspendEnergyTariff sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-tf1', content: args.data.content as string });
    const t = await EnergyManagementService.suspendEnergyTariff('mem-tf1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'suspended');
  });

  it('expireEnergyTariff sets status to expired', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-tf1', content: args.data.content as string });
    const t = await EnergyManagementService.expireEnergyTariff('mem-tf1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'expired');
  });

  it('renewEnergyTariff sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-tf1', content: args.data.content as string });
    const t = await EnergyManagementService.renewEnergyTariff('mem-tf1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'renewed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EnergyManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getEnergyManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'energy_meter') return [
        makeRow({ content: JSON.stringify({ name: 'M1', type: 'electric', status: 'active', description: '', location: '', building: '', unit: '', capacity: 0, lastCalibrated: null, notes: '' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'M2', type: 'electric', status: 'pending', description: '', location: '', building: '', unit: '', capacity: 0, lastCalibrated: null, notes: '' }) }),
      ];
      if (t === 'energy_reading') return [
        makeReadingRow({ content: JSON.stringify({ meterId: null, type: 'consumption', status: 'pending', description: '', value: 0, unit: '', readingDate: null, previousValue: 0, consumption: 100, cost: 0, notes: '' }) }),
        makeReadingRow({ id: 'r2', content: JSON.stringify({ meterId: null, type: 'consumption', status: 'submitted', description: '', value: 0, unit: '', readingDate: null, previousValue: 0, consumption: 200, cost: 0, notes: '' }) }),
      ];
      if (t === 'efficiency_target') return [
        makeTargetRow({ content: JSON.stringify({ name: 'T1', type: 'reduction', status: 'approved', description: '', targetValue: 0, actualValue: 0, unit: '', startDate: null, endDate: null, progress: 0, notes: '' }) }),
      ];
      if (t === 'energy_tariff') return [
        makeTariffRow({ content: JSON.stringify({ name: 'TF1', type: 'fixed', status: 'active', description: '', provider: '', rate: 0, unit: '', startDate: null, endDate: null, contractTerms: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await EnergyManagementService.getEnergyManagementMetrics('org-1');
    assert.equal(m.activeMeters, 1);
    assert.equal(m.pendingReadings, 2);
    assert.equal(m.activeTargets, 1);
    assert.equal(m.activeTariffs, 1);
    assert.equal(m.totalConsumption, 300);
  });

  it('getEnergyManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'energy_meter') return [makeRow()];
      if (t === 'energy_reading') return [makeReadingRow()];
      if (t === 'efficiency_target') return [makeTargetRow()];
      if (t === 'energy_tariff') return [makeTariffRow()];
      return [];
    };
    const s = await EnergyManagementService.getEnergyManagementStats('org-1');
    assert.equal(s.meterCount, 1);
    assert.equal(s.readingCount, 1);
    assert.equal(s.targetCount, 1);
    assert.equal(s.tariffCount, 1);
    assert.equal(s.byMeterType['electric'], 1);
    assert.equal(s.byReadingType['consumption'], 1);
    assert.equal(s.byTargetType['reduction'], 1);
    assert.equal(s.byTariffType['fixed'], 1);
  });
});
