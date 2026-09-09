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
    type: 'air_sensor',
    content: JSON.stringify({
      name: 'CO2 Sensor Lobby',
      type: 'co2',
      description: 'Lobby CO2 sensor',
      status: 'pending',
      location: 'Lobby',
      building: 'Building A',
      floor: '1',
      zone: 'A',
      unit: 'ppm',
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
    tags: JSON.stringify(['air_sensor', 'co2', 'pending']),
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
    type: 'air_reading',
    content: JSON.stringify({
      sensorId: 'mem-1',
      type: 'routine',
      description: 'Routine CO2 reading',
      status: 'pending',
      parameter: 'co2',
      value: 450,
      unit: 'ppm',
      threshold: 1000,
      readingDate: '2028-01-15',
      notes: '',
    }),
    tags: JSON.stringify(['air_reading', 'routine', 'pending']),
    ...overrides,
  });
}

function makeThresholdRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-th1',
    type: 'air_threshold',
    content: JSON.stringify({
      name: 'CO2 Threshold',
      type: 'co2',
      description: 'CO2 safety threshold',
      status: 'active',
      parameter: 'co2',
      minValue: 0,
      maxValue: 1000,
      unit: 'ppm',
      severity: 'warning',
      notes: '',
    }),
    tags: JSON.stringify(['air_threshold', 'co2', 'active']),
    ...overrides,
  });
}

function makeAlertRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'air_alert',
    content: JSON.stringify({
      sensorId: 'mem-1',
      thresholdId: 'mem-th1',
      type: 'warning',
      description: 'CO2 level exceeded',
      status: 'triggered',
      severity: 'warning',
      triggeredDate: '2028-01-15',
      acknowledgedDate: null,
      resolvedDate: null,
      acknowledgedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['air_alert', 'warning', 'triggered']),
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

const { AirQualityManagementService } = await import('@/lib/services/air-quality-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Air Sensors
// ─────────────────────────────────────────────────────────────────────────────

describe('AirQualityManagementService — Air Sensors', () => {
  beforeEach(() => resetMock());

  it('creates an air sensor with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await AirQualityManagementService.createAirSensor('org-1', 'ws-1', {
      name: 'PM2.5 Sensor', type: 'pm25',
    }, 'user-1');
    assert.equal(s.name, 'PM2.5 Sensor');
    assert.equal(s.status, 'pending');
    assert.equal(s.floor, '');
  });

  it('creates an air sensor with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await AirQualityManagementService.createAirSensor('org-1', 'ws-1', {
      name: 'Multi Sensor', type: 'multi', description: 'Multi-parameter sensor',
      status: 'active', location: 'Conference Room', building: 'Building B',
      floor: '3', zone: 'B', unit: 'ppm',
      lastCalibrated: '2028-01-01', notes: 'Calibrated annually',
    }, 'user-1');
    assert.equal(s.name, 'Multi Sensor');
    assert.equal(s.type, 'multi');
    assert.equal(s.floor, '3');
    assert.equal(s.zone, 'B');
  });

  it('gets an air sensor by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await AirQualityManagementService.getAirSensor('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'CO2 Sensor Lobby');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'air_reading' });
    const s = await AirQualityManagementService.getAirSensor('mem-1');
    assert.equal(s, null);
  });

  it('returns null when air sensor not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await AirQualityManagementService.getAirSensor('nope');
    assert.equal(s, null);
  });

  it('lists air sensors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_sensor') return [makeRow()];
      return [];
    };
    const list = await AirQualityManagementService.listAirSensors('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'CO2 Sensor Lobby');
  });

  it('updates an air sensor', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await AirQualityManagementService.updateAirSensor('mem-1', { status: 'active' });
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deletes an air sensor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await AirQualityManagementService.deleteAirSensor('mem-1');
    assert.equal(ok, true);
  });

  it('activateAirSensor sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await AirQualityManagementService.activateAirSensor('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('calibrateAirSensor sets status to calibrating', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await AirQualityManagementService.calibrateAirSensor('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'calibrating');
  });

  it('maintainAirSensor sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await AirQualityManagementService.maintainAirSensor('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'maintained');
  });

  it('decommissionAirSensor sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await AirQualityManagementService.decommissionAirSensor('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Air Readings
// ─────────────────────────────────────────────────────────────────────────────

describe('AirQualityManagementService — Air Readings', () => {
  beforeEach(() => resetMock());

  it('creates an air reading with defaults', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await AirQualityManagementService.createAirReading('org-1', 'ws-1', {
      type: 'continuous',
    }, 'user-1');
    assert.equal(r.type, 'continuous');
    assert.equal(r.status, 'pending');
    assert.equal(r.value, 0);
  });

  it('creates an air reading with full input', async () => {
    memCreateImpl = async (args) => makeReadingRow({ content: args.data.content as string });
    const r = await AirQualityManagementService.createAirReading('org-1', 'ws-1', {
      sensorId: 'mem-1', type: 'incident', description: 'High CO2 incident',
      status: 'submitted', parameter: 'co2', value: 1200,
      unit: 'ppm', threshold: 1000, readingDate: '2028-06-15',
      notes: 'Above threshold',
    }, 'user-1');
    assert.equal(r.type, 'incident');
    assert.equal(r.value, 1200);
    assert.equal(r.threshold, 1000);
    assert.equal(r.parameter, 'co2');
  });

  it('gets an air reading by id', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    const r = await AirQualityManagementService.getAirReading('mem-r1');
    assert.ok(r);
    assert.equal(r!.type, 'routine');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReadingRow({ type: 'air_sensor' });
    const r = await AirQualityManagementService.getAirReading('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when air reading not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await AirQualityManagementService.getAirReading('nope');
    assert.equal(r, null);
  });

  it('lists air readings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_reading') return [makeReadingRow()];
      return [];
    };
    const list = await AirQualityManagementService.listAirReadings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an air reading', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await AirQualityManagementService.updateAirReading('mem-r1', { status: 'verified' });
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('deletes an air reading', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await AirQualityManagementService.deleteAirReading('mem-r1');
    assert.equal(ok, true);
  });

  it('submitAirReading sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await AirQualityManagementService.submitAirReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('verifyAirReading sets status to verified', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await AirQualityManagementService.verifyAirReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });

  it('flagAirReading sets status to flagged', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await AirQualityManagementService.flagAirReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'flagged');
  });

  it('archiveAirReading sets status to archived', async () => {
    memFindUniqueImpl = async () => makeReadingRow();
    memUpdateImpl = async (args) => makeReadingRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await AirQualityManagementService.archiveAirReading('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Air Thresholds
// ─────────────────────────────────────────────────────────────────────────────

describe('AirQualityManagementService — Air Thresholds', () => {
  beforeEach(() => resetMock());

  it('creates an air threshold with defaults', async () => {
    memCreateImpl = async (args) => makeThresholdRow({ content: args.data.content as string });
    const t = await AirQualityManagementService.createAirThreshold('org-1', 'ws-1', {
      name: 'PM2.5 Threshold', type: 'pm25',
    }, 'user-1');
    assert.equal(t.name, 'PM2.5 Threshold');
    assert.equal(t.status, 'active');
    assert.equal(t.maxValue, 0);
  });

  it('creates an air threshold with full input', async () => {
    memCreateImpl = async (args) => makeThresholdRow({ content: args.data.content as string });
    const t = await AirQualityManagementService.createAirThreshold('org-1', 'ws-1', {
      name: 'VOC Threshold', type: 'voc', description: 'VOC safety threshold',
      status: 'active', parameter: 'voc', minValue: 0, maxValue: 500,
      unit: 'ppb', severity: 'critical', notes: 'Immediate action required',
    }, 'user-1');
    assert.equal(t.name, 'VOC Threshold');
    assert.equal(t.type, 'voc');
    assert.equal(t.maxValue, 500);
    assert.equal(t.severity, 'critical');
  });

  it('gets an air threshold by id', async () => {
    memFindUniqueImpl = async () => makeThresholdRow();
    const t = await AirQualityManagementService.getAirThreshold('mem-th1');
    assert.ok(t);
    assert.equal(t!.name, 'CO2 Threshold');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeThresholdRow({ type: 'air_sensor' });
    const t = await AirQualityManagementService.getAirThreshold('mem-th1');
    assert.equal(t, null);
  });

  it('returns null when air threshold not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await AirQualityManagementService.getAirThreshold('nope');
    assert.equal(t, null);
  });

  it('lists air thresholds by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_threshold') return [makeThresholdRow()];
      return [];
    };
    const list = await AirQualityManagementService.listAirThresholds('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an air threshold', async () => {
    memFindUniqueImpl = async () => makeThresholdRow();
    memUpdateImpl = async (args) => makeThresholdRow({ id: 'mem-th1', content: args.data.content as string });
    const t = await AirQualityManagementService.updateAirThreshold('mem-th1', { status: 'suspended' });
    assert.ok(t);
    assert.equal(t!.status, 'suspended');
  });

  it('deletes an air threshold', async () => {
    memDeleteImpl = async () => ({ id: 'mem-th1' });
    const ok = await AirQualityManagementService.deleteAirThreshold('mem-th1');
    assert.equal(ok, true);
  });

  it('activateAirThreshold sets status to active', async () => {
    memFindUniqueImpl = async () => makeThresholdRow();
    memUpdateImpl = async (args) => makeThresholdRow({ id: 'mem-th1', content: args.data.content as string });
    const t = await AirQualityManagementService.activateAirThreshold('mem-th1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('suspendAirThreshold sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeThresholdRow();
    memUpdateImpl = async (args) => makeThresholdRow({ id: 'mem-th1', content: args.data.content as string });
    const t = await AirQualityManagementService.suspendAirThreshold('mem-th1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'suspended');
  });

  it('reviseAirThreshold sets status to revised', async () => {
    memFindUniqueImpl = async () => makeThresholdRow();
    memUpdateImpl = async (args) => makeThresholdRow({ id: 'mem-th1', content: args.data.content as string });
    const t = await AirQualityManagementService.reviseAirThreshold('mem-th1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'revised');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Air Alerts
// ─────────────────────────────────────────────────────────────────────────────

describe('AirQualityManagementService — Air Alerts', () => {
  beforeEach(() => resetMock());

  it('creates an air alert with defaults', async () => {
    memCreateImpl = async (args) => makeAlertRow({ content: args.data.content as string });
    const a = await AirQualityManagementService.createAirAlert('org-1', 'ws-1', {
      type: 'info',
    }, 'user-1');
    assert.equal(a.type, 'info');
    assert.equal(a.status, 'triggered');
    assert.equal(a.severity, '');
  });

  it('creates an air alert with full input', async () => {
    memCreateImpl = async (args) => makeAlertRow({ content: args.data.content as string });
    const a = await AirQualityManagementService.createAirAlert('org-1', 'ws-1', {
      sensorId: 'mem-1', thresholdId: 'mem-th1', type: 'critical',
      description: 'Critical CO2 breach', status: 'acknowledged',
      severity: 'critical', triggeredDate: '2028-06-15',
      acknowledgedDate: '2028-06-15', acknowledgedBy: 'admin',
      notes: 'Immediate evacuation',
    }, 'user-1');
    assert.equal(a.type, 'critical');
    assert.equal(a.severity, 'critical');
    assert.equal(a.acknowledgedBy, 'admin');
  });

  it('gets an air alert by id', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    const a = await AirQualityManagementService.getAirAlert('mem-a1');
    assert.ok(a);
    assert.equal(a!.type, 'warning');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAlertRow({ type: 'air_sensor' });
    const a = await AirQualityManagementService.getAirAlert('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when air alert not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await AirQualityManagementService.getAirAlert('nope');
    assert.equal(a, null);
  });

  it('lists air alerts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_alert') return [makeAlertRow()];
      return [];
    };
    const list = await AirQualityManagementService.listAirAlerts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an air alert', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.updateAirAlert('mem-a1', { status: 'acknowledged' });
    assert.ok(a);
    assert.equal(a!.status, 'acknowledged');
  });

  it('deletes an air alert', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await AirQualityManagementService.deleteAirAlert('mem-a1');
    assert.equal(ok, true);
  });

  it('triggerAirAlert sets status to triggered', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.triggerAirAlert('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'triggered');
  });

  it('acknowledgeAirAlert sets status to acknowledged', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.acknowledgeAirAlert('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'acknowledged');
  });

  it('resolveAirAlert sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.resolveAirAlert('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'resolved');
  });

  it('escalateAirAlert sets status to escalated', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.escalateAirAlert('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'escalated');
  });

  it('closeAirAlert sets status to closed', async () => {
    memFindUniqueImpl = async () => makeAlertRow();
    memUpdateImpl = async (args) => makeAlertRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AirQualityManagementService.closeAirAlert('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('AirQualityManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getAirQualityManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_sensor') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'co2', status: 'active', description: '', location: '', building: '', floor: '', zone: '', unit: '', lastCalibrated: null, notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'co2', status: 'pending', description: '', location: '', building: '', floor: '', zone: '', unit: '', lastCalibrated: null, notes: '' }) }),
      ];
      if (t === 'air_reading') return [
        makeReadingRow({ content: JSON.stringify({ sensorId: null, type: 'routine', status: 'pending', description: '', parameter: '', value: 0, unit: '', threshold: 0, readingDate: null, notes: '' }) }),
        makeReadingRow({ id: 'r2', content: JSON.stringify({ sensorId: null, type: 'routine', status: 'submitted', description: '', parameter: '', value: 0, unit: '', threshold: 0, readingDate: null, notes: '' }) }),
      ];
      if (t === 'air_threshold') return [
        makeThresholdRow({ content: JSON.stringify({ name: 'TH1', type: 'co2', status: 'active', description: '', parameter: '', minValue: 0, maxValue: 0, unit: '', severity: '', notes: '' }) }),
      ];
      if (t === 'air_alert') return [
        makeAlertRow({ content: JSON.stringify({ sensorId: null, thresholdId: null, type: 'warning', status: 'triggered', description: '', severity: '', triggeredDate: null, acknowledgedDate: null, resolvedDate: null, acknowledgedBy: '', notes: '' }) }),
        makeAlertRow({ id: 'a2', content: JSON.stringify({ sensorId: null, thresholdId: null, type: 'critical', status: 'acknowledged', description: '', severity: 'critical', triggeredDate: null, acknowledgedDate: null, resolvedDate: null, acknowledgedBy: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await AirQualityManagementService.getAirQualityManagementMetrics('org-1');
    assert.equal(m.activeSensors, 1);
    assert.equal(m.pendingReadings, 2);
    assert.equal(m.activeThresholds, 1);
    assert.equal(m.activeAlerts, 2);
    assert.equal(m.criticalAlerts, 1);
  });

  it('getAirQualityManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'air_sensor') return [makeRow()];
      if (t === 'air_reading') return [makeReadingRow()];
      if (t === 'air_threshold') return [makeThresholdRow()];
      if (t === 'air_alert') return [makeAlertRow()];
      return [];
    };
    const s = await AirQualityManagementService.getAirQualityManagementStats('org-1');
    assert.equal(s.sensorCount, 1);
    assert.equal(s.readingCount, 1);
    assert.equal(s.thresholdCount, 1);
    assert.equal(s.alertCount, 1);
    assert.equal(s.bySensorType['co2'], 1);
    assert.equal(s.byReadingType['routine'], 1);
    assert.equal(s.byThresholdType['co2'], 1);
    assert.equal(s.byAlertType['warning'], 1);
  });
});
