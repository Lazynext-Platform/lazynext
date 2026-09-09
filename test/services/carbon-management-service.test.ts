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
    type: 'carbon_inventory',
    content: JSON.stringify({
      name: 'Scope 1 Inventory',
      type: 'scope1',
      description: 'Direct emissions inventory',
      status: 'draft',
      period: '2028',
      emissions: 1000,
      unit: 'tCO2e',
      source: 'Facility A',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['carbon_inventory', 'scope1', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeOffsetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-o1',
    type: 'carbon_offset',
    content: JSON.stringify({
      name: 'Reforestation Project',
      type: 'reforestation',
      description: 'Amazon reforestation',
      status: 'planned',
      provider: 'EcoOffset',
      amount: 500,
      unit: 'tCO2e',
      cost: 7500,
      certification: 'VCS',
      retirementDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['carbon_offset', 'reforestation', 'planned']),
    ...overrides,
  });
}

function makeTargetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'carbon_target',
    content: JSON.stringify({
      name: 'Net Zero by 2030',
      type: 'net_zero',
      description: 'Net zero emissions target',
      status: 'draft',
      baselineYear: 2020,
      targetYear: 2030,
      baselineValue: 10000,
      targetValue: 0,
      currentValue: 8000,
      unit: 'tCO2e',
      progress: 20,
      notes: '',
    }),
    tags: JSON.stringify(['carbon_target', 'net_zero', 'draft']),
    ...overrides,
  });
}

function makeCreditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'carbon_credit',
    content: JSON.stringify({
      name: 'Verra Credit Batch',
      type: 'verra',
      description: 'Verra certified credits',
      status: 'held',
      serialNumber: 'VCS-001',
      amount: 100,
      unit: 'tCO2e',
      price: 15,
      vintage: 2024,
      project: 'Forest Project',
      notes: '',
    }),
    tags: JSON.stringify(['carbon_credit', 'verra', 'held']),
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

const { CarbonManagementService } = await import('@/lib/services/carbon-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Carbon Inventories
// ─────────────────────────────────────────────────────────────────────────────

describe('CarbonManagementService — Carbon Inventories', () => {
  beforeEach(() => resetMock());

  it('creates a carbon inventory with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await CarbonManagementService.createCarbonInventory('org-1', 'ws-1', {
      name: 'Scope 2 Inventory', type: 'scope2',
    }, 'user-1');
    assert.equal(i.name, 'Scope 2 Inventory');
    assert.equal(i.status, 'draft');
    assert.equal(i.emissions, 0);
  });

  it('creates a carbon inventory with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await CarbonManagementService.createCarbonInventory('org-1', 'ws-1', {
      name: 'Scope 3 Inventory', type: 'scope3', description: 'Value chain emissions',
      status: 'active', period: '2028', emissions: 5000, unit: 'tCO2e',
      source: 'Supply Chain', notes: 'Full scope 3',
    }, 'user-1');
    assert.equal(i.name, 'Scope 3 Inventory');
    assert.equal(i.type, 'scope3');
    assert.equal(i.emissions, 5000);
    assert.equal(i.period, '2028');
  });

  it('gets a carbon inventory by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const i = await CarbonManagementService.getCarbonInventory('mem-1');
    assert.ok(i);
    assert.equal(i!.id, 'mem-1');
    assert.equal(i!.name, 'Scope 1 Inventory');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'carbon_offset' });
    const i = await CarbonManagementService.getCarbonInventory('mem-1');
    assert.equal(i, null);
  });

  it('returns null when carbon inventory not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await CarbonManagementService.getCarbonInventory('nope');
    assert.equal(i, null);
  });

  it('lists carbon inventories by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_inventory') return [makeRow()];
      return [];
    };
    const list = await CarbonManagementService.listCarbonInventories('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Scope 1 Inventory');
  });

  it('updates a carbon inventory', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await CarbonManagementService.updateCarbonInventory('mem-1', { status: 'active' });
    assert.ok(i);
    assert.equal(i!.status, 'active');
  });

  it('deletes a carbon inventory', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CarbonManagementService.deleteCarbonInventory('mem-1');
    assert.equal(ok, true);
  });

  it('activateCarbonInventory sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await CarbonManagementService.activateCarbonInventory('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'active');
  });

  it('archiveCarbonInventory sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await CarbonManagementService.archiveCarbonInventory('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'archived');
  });

  it('reviewCarbonInventory sets status to pending', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await CarbonManagementService.reviewCarbonInventory('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Carbon Offsets
// ─────────────────────────────────────────────────────────────────────────────

describe('CarbonManagementService — Carbon Offsets', () => {
  beforeEach(() => resetMock());

  it('creates a carbon offset with defaults', async () => {
    memCreateImpl = async (args) => makeOffsetRow({ content: args.data.content as string });
    const o = await CarbonManagementService.createCarbonOffset('org-1', 'ws-1', {
      name: 'Solar Offset', type: 'renewable_energy',
    }, 'user-1');
    assert.equal(o.name, 'Solar Offset');
    assert.equal(o.status, 'planned');
    assert.equal(o.amount, 0);
  });

  it('creates a carbon offset with full input', async () => {
    memCreateImpl = async (args) => makeOffsetRow({ content: args.data.content as string });
    const o = await CarbonManagementService.createCarbonOffset('org-1', 'ws-1', {
      name: 'Methane Capture', type: 'methane_capture', description: 'Landfill methane',
      status: 'active', provider: 'GreenCap', amount: 200, unit: 'tCO2e',
      cost: 3000, certification: 'Gold Standard', retirementDate: '2028-01-01',
      notes: 'Verified offset',
    }, 'user-1');
    assert.equal(o.name, 'Methane Capture');
    assert.equal(o.type, 'methane_capture');
    assert.equal(o.amount, 200);
    assert.equal(o.cost, 3000);
  });

  it('gets a carbon offset by id', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    const o = await CarbonManagementService.getCarbonOffset('mem-o1');
    assert.ok(o);
    assert.equal(o!.name, 'Reforestation Project');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeOffsetRow({ type: 'carbon_inventory' });
    const o = await CarbonManagementService.getCarbonOffset('mem-o1');
    assert.equal(o, null);
  });

  it('returns null when carbon offset not found', async () => {
    memFindUniqueImpl = async () => null;
    const o = await CarbonManagementService.getCarbonOffset('nope');
    assert.equal(o, null);
  });

  it('lists carbon offsets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_offset') return [makeOffsetRow()];
      return [];
    };
    const list = await CarbonManagementService.listCarbonOffsets('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a carbon offset', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    memUpdateImpl = async (args) => makeOffsetRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await CarbonManagementService.updateCarbonOffset('mem-o1', { status: 'active' });
    assert.ok(o);
    assert.equal(o!.status, 'active');
  });

  it('deletes a carbon offset', async () => {
    memDeleteImpl = async () => ({ id: 'mem-o1' });
    const ok = await CarbonManagementService.deleteCarbonOffset('mem-o1');
    assert.equal(ok, true);
  });

  it('activateCarbonOffset sets status to active', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    memUpdateImpl = async (args) => makeOffsetRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await CarbonManagementService.activateCarbonOffset('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'active');
  });

  it('verifyCarbonOffset sets status to verified', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    memUpdateImpl = async (args) => makeOffsetRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await CarbonManagementService.verifyCarbonOffset('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'verified');
  });

  it('retireCarbonOffset sets status to retired', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    memUpdateImpl = async (args) => makeOffsetRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await CarbonManagementService.retireCarbonOffset('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'retired');
  });

  it('cancelCarbonOffset sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeOffsetRow();
    memUpdateImpl = async (args) => makeOffsetRow({ id: 'mem-o1', content: args.data.content as string });
    const o = await CarbonManagementService.cancelCarbonOffset('mem-o1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Carbon Targets
// ─────────────────────────────────────────────────────────────────────────────

describe('CarbonManagementService — Carbon Targets', () => {
  beforeEach(() => resetMock());

  it('creates a carbon target with defaults', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await CarbonManagementService.createCarbonTarget('org-1', 'ws-1', {
      name: 'Absolute Reduction', type: 'absolute',
    }, 'user-1');
    assert.equal(t.name, 'Absolute Reduction');
    assert.equal(t.status, 'draft');
    assert.equal(t.baselineYear, 0);
  });

  it('creates a carbon target with full input', async () => {
    memCreateImpl = async (args) => makeTargetRow({ content: args.data.content as string });
    const t = await CarbonManagementService.createCarbonTarget('org-1', 'ws-1', {
      name: 'Science Based Target', type: 'science_based', description: 'SBTi approved',
      status: 'approved', baselineYear: 2021, targetYear: 2031,
      baselineValue: 8000, targetValue: 2000, currentValue: 6000,
      unit: 'tCO2e', progress: 33, notes: 'SBTi validated',
    }, 'user-1');
    assert.equal(t.name, 'Science Based Target');
    assert.equal(t.type, 'science_based');
    assert.equal(t.baselineYear, 2021);
    assert.equal(t.progress, 33);
  });

  it('gets a carbon target by id', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    const t = await CarbonManagementService.getCarbonTarget('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'Net Zero by 2030');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTargetRow({ type: 'carbon_inventory' });
    const t = await CarbonManagementService.getCarbonTarget('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when carbon target not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await CarbonManagementService.getCarbonTarget('nope');
    assert.equal(t, null);
  });

  it('lists carbon targets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_target') return [makeTargetRow()];
      return [];
    };
    const list = await CarbonManagementService.listCarbonTargets('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a carbon target', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.updateCarbonTarget('mem-t1', { status: 'active' });
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deletes a carbon target', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await CarbonManagementService.deleteCarbonTarget('mem-t1');
    assert.equal(ok, true);
  });

  it('approveCarbonTarget sets status to approved', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.approveCarbonTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'approved');
  });

  it('activateCarbonTarget sets status to active', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.activateCarbonTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('achieveCarbonTarget sets status to achieved', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.achieveCarbonTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'achieved');
  });

  it('missCarbonTarget sets status to missed', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.missCarbonTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'missed');
  });

  it('reviewCarbonTarget sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeTargetRow();
    memUpdateImpl = async (args) => makeTargetRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CarbonManagementService.reviewCarbonTarget('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'reviewed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Carbon Credits
// ─────────────────────────────────────────────────────────────────────────────

describe('CarbonManagementService — Carbon Credits', () => {
  beforeEach(() => resetMock());

  it('creates a carbon credit with defaults', async () => {
    memCreateImpl = async (args) => makeCreditRow({ content: args.data.content as string });
    const c = await CarbonManagementService.createCarbonCredit('org-1', 'ws-1', {
      name: 'Gold Standard Credits', type: 'gold_standard',
    }, 'user-1');
    assert.equal(c.name, 'Gold Standard Credits');
    assert.equal(c.status, 'held');
    assert.equal(c.amount, 0);
  });

  it('creates a carbon credit with full input', async () => {
    memCreateImpl = async (args) => makeCreditRow({ content: args.data.content as string });
    const c = await CarbonManagementService.createCarbonCredit('org-1', 'ws-1', {
      name: 'CAR Credits', type: 'car', description: 'Climate Action Reserve',
      status: 'sold', serialNumber: 'CAR-100', amount: 50, unit: 'tCO2e',
      price: 20, vintage: 2023, project: 'Forest Carbon', notes: 'Premium credits',
    }, 'user-1');
    assert.equal(c.name, 'CAR Credits');
    assert.equal(c.type, 'car');
    assert.equal(c.amount, 50);
    assert.equal(c.vintage, 2023);
  });

  it('gets a carbon credit by id', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    const c = await CarbonManagementService.getCarbonCredit('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Verra Credit Batch');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCreditRow({ type: 'carbon_inventory' });
    const c = await CarbonManagementService.getCarbonCredit('mem-c1');
    assert.equal(c, null);
  });

  it('returns null when carbon credit not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await CarbonManagementService.getCarbonCredit('nope');
    assert.equal(c, null);
  });

  it('lists carbon credits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_credit') return [makeCreditRow()];
      return [];
    };
    const list = await CarbonManagementService.listCarbonCredits('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a carbon credit', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    memUpdateImpl = async (args) => makeCreditRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CarbonManagementService.updateCarbonCredit('mem-c1', { amount: 200 });
    assert.ok(c);
    assert.equal(c!.amount, 200);
  });

  it('deletes a carbon credit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await CarbonManagementService.deleteCarbonCredit('mem-c1');
    assert.equal(ok, true);
  });

  it('sellCarbonCredit sets status to sold', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    memUpdateImpl = async (args) => makeCreditRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CarbonManagementService.sellCarbonCredit('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'sold');
  });

  it('retireCarbonCredit sets status to retired', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    memUpdateImpl = async (args) => makeCreditRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CarbonManagementService.retireCarbonCredit('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'retired');
  });

  it('expireCarbonCredit sets status to expired', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    memUpdateImpl = async (args) => makeCreditRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CarbonManagementService.expireCarbonCredit('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'expired');
  });

  it('holdCarbonCredit sets status to held', async () => {
    memFindUniqueImpl = async () => makeCreditRow();
    memUpdateImpl = async (args) => makeCreditRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CarbonManagementService.holdCarbonCredit('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'held');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CarbonManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCarbonManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_inventory') return [
        makeRow({ content: JSON.stringify({ name: 'I1', type: 'scope1', status: 'active', description: '', period: '', emissions: 0, unit: '', source: '', notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ name: 'I2', type: 'scope1', status: 'draft', description: '', period: '', emissions: 0, unit: '', source: '', notes: '' }) }),
      ];
      if (t === 'carbon_offset') return [
        makeOffsetRow({ content: JSON.stringify({ name: 'O1', type: 'reforestation', status: 'active', description: '', provider: '', amount: 100, unit: '', cost: 0, certification: '', retirementDate: null, notes: '' }) }),
      ];
      if (t === 'carbon_target') return [
        makeTargetRow({ content: JSON.stringify({ name: 'T1', type: 'net_zero', status: 'active', description: '', baselineYear: 0, targetYear: 0, baselineValue: 0, targetValue: 0, currentValue: 0, unit: '', progress: 0, notes: '' }) }),
      ];
      if (t === 'carbon_credit') return [
        makeCreditRow({ content: JSON.stringify({ name: 'C1', type: 'verra', status: 'held', description: '', serialNumber: '', amount: 0, unit: '', price: 0, vintage: 0, project: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await CarbonManagementService.getCarbonManagementMetrics('org-1');
    assert.equal(m.activeInventories, 1);
    assert.equal(m.activeOffsets, 1);
    assert.equal(m.activeTargets, 1);
    assert.equal(m.heldCredits, 1);
    assert.equal(m.totalOffsetAmount, 100);
  });

  it('getCarbonManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'carbon_inventory') return [makeRow()];
      if (t === 'carbon_offset') return [makeOffsetRow()];
      if (t === 'carbon_target') return [makeTargetRow()];
      if (t === 'carbon_credit') return [makeCreditRow()];
      return [];
    };
    const s = await CarbonManagementService.getCarbonManagementStats('org-1');
    assert.equal(s.inventoryCount, 1);
    assert.equal(s.offsetCount, 1);
    assert.equal(s.targetCount, 1);
    assert.equal(s.creditCount, 1);
    assert.equal(s.byInventoryType['scope1'], 1);
    assert.equal(s.byOffsetType['reforestation'], 1);
    assert.equal(s.byTargetType['net_zero'], 1);
    assert.equal(s.byCreditType['verra'], 1);
  });
});
