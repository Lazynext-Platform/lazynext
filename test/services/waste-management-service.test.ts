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
    type: 'waste_stream',
    content: JSON.stringify({
      name: 'General Waste Stream',
      type: 'general',
      description: 'Standard general waste',
      status: 'draft',
      source: 'Office Building A',
      volume: 500,
      unit: 'kg',
      frequency: 'weekly',
      handler: 'WasteCo',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['waste_stream', 'general', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeProgramRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'recycling_program',
    content: JSON.stringify({
      name: 'Paper Recycling Program',
      type: 'paper',
      description: 'Office paper recycling',
      status: 'planned',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      targetVolume: 1000,
      actualVolume: 200,
      unit: 'kg',
      participants: 50,
      coordinator: 'Alice',
      notes: '',
    }),
    tags: JSON.stringify(['recycling_program', 'paper', 'planned']),
    ...overrides,
  });
}

function makeDisposalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'waste_disposal',
    content: JSON.stringify({
      streamId: 'mem-1',
      vendorId: 'mem-v1',
      type: 'landfill',
      description: 'Weekly landfill disposal',
      status: 'pending',
      volume: 300,
      unit: 'kg',
      scheduledDate: '2028-02-15',
      executedDate: null,
      cost: 150,
      manifest: 'MAN-001',
      notes: '',
    }),
    tags: JSON.stringify(['waste_disposal', 'landfill', 'pending']),
    ...overrides,
  });
}

function makeVendorRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-v1',
    type: 'waste_vendor',
    content: JSON.stringify({
      name: 'GreenWaste Solutions',
      type: 'recycler',
      description: 'Full-service waste recycler',
      status: 'active',
      contactName: 'Bob Green',
      email: 'bob@greenwaste.com',
      phone: '555-0100',
      address: '100 Eco St',
      certification: 'ISO 14001',
      rating: 4.5,
      contractTerms: 'Net 30',
      notes: '',
    }),
    tags: JSON.stringify(['waste_vendor', 'recycler', 'active']),
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

const { WasteManagementService } = await import('@/lib/services/waste-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Waste Streams
// ─────────────────────────────────────────────────────────────────────────────

describe('WasteManagementService — Waste Streams', () => {
  beforeEach(() => resetMock());

  it('creates a waste stream with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await WasteManagementService.createWasteStream('org-1', 'ws-1', {
      name: 'Organic Waste', type: 'organic',
    }, 'user-1');
    assert.equal(s.name, 'Organic Waste');
    assert.equal(s.status, 'draft');
    assert.equal(s.volume, 0);
  });

  it('creates a waste stream with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await WasteManagementService.createWasteStream('org-1', 'ws-1', {
      name: 'Hazardous Waste', type: 'hazardous', description: 'Chemical waste',
      status: 'active', source: 'Lab', volume: 100, unit: 'kg',
      frequency: 'monthly', handler: 'HazMat Co', notes: 'Handle with care',
    }, 'user-1');
    assert.equal(s.name, 'Hazardous Waste');
    assert.equal(s.type, 'hazardous');
    assert.equal(s.volume, 100);
    assert.equal(s.frequency, 'monthly');
  });

  it('gets a waste stream by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await WasteManagementService.getWasteStream('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'General Waste Stream');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'waste_disposal' });
    const s = await WasteManagementService.getWasteStream('mem-1');
    assert.equal(s, null);
  });

  it('returns null when waste stream not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await WasteManagementService.getWasteStream('nope');
    assert.equal(s, null);
  });

  it('lists waste streams by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_stream') return [makeRow()];
      return [];
    };
    const list = await WasteManagementService.listWasteStreams('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'General Waste Stream');
  });

  it('updates a waste stream', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await WasteManagementService.updateWasteStream('mem-1', { status: 'active' });
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deletes a waste stream', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await WasteManagementService.deleteWasteStream('mem-1');
    assert.equal(ok, true);
  });

  it('activateWasteStream sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await WasteManagementService.activateWasteStream('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('suspendWasteStream sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await WasteManagementService.suspendWasteStream('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'suspended');
  });

  it('deactivateWasteStream sets status to deactivated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await WasteManagementService.deactivateWasteStream('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'deactivated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recycling Programs
// ─────────────────────────────────────────────────────────────────────────────

describe('WasteManagementService — Recycling Programs', () => {
  beforeEach(() => resetMock());

  it('creates a recycling program with defaults', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await WasteManagementService.createRecyclingProgram('org-1', 'ws-1', {
      name: 'Plastic Recycling', type: 'plastic',
    }, 'user-1');
    assert.equal(p.name, 'Plastic Recycling');
    assert.equal(p.status, 'planned');
    assert.equal(p.targetVolume, 0);
  });

  it('creates a recycling program with full input', async () => {
    memCreateImpl = async (args) => makeProgramRow({ content: args.data.content as string });
    const p = await WasteManagementService.createRecyclingProgram('org-1', 'ws-1', {
      name: 'Glass Recycling', type: 'glass', description: 'Office glass recycling',
      status: 'active', startDate: '2028-03-01', endDate: '2028-12-31',
      targetVolume: 500, actualVolume: 100, unit: 'kg',
      participants: 30, coordinator: 'Jane', notes: 'Weekly pickup',
    }, 'user-1');
    assert.equal(p.name, 'Glass Recycling');
    assert.equal(p.type, 'glass');
    assert.equal(p.targetVolume, 500);
    assert.equal(p.participants, 30);
  });

  it('gets a recycling program by id', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    const p = await WasteManagementService.getRecyclingProgram('mem-p1');
    assert.ok(p);
    assert.equal(p!.name, 'Paper Recycling Program');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeProgramRow({ type: 'waste_stream' });
    const p = await WasteManagementService.getRecyclingProgram('mem-p1');
    assert.equal(p, null);
  });

  it('returns null when recycling program not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await WasteManagementService.getRecyclingProgram('nope');
    assert.equal(p, null);
  });

  it('lists recycling programs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recycling_program') return [makeProgramRow()];
      return [];
    };
    const list = await WasteManagementService.listRecyclingPrograms('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recycling program', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WasteManagementService.updateRecyclingProgram('mem-p1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a recycling program', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await WasteManagementService.deleteRecyclingProgram('mem-p1');
    assert.equal(ok, true);
  });

  it('launchRecyclingProgram sets status to active', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WasteManagementService.launchRecyclingProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('suspendRecyclingProgram sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WasteManagementService.suspendRecyclingProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'suspended');
  });

  it('completeRecyclingProgram sets status to completed', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WasteManagementService.completeRecyclingProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('archiveRecyclingProgram sets status to archived', async () => {
    memFindUniqueImpl = async () => makeProgramRow();
    memUpdateImpl = async (args) => makeProgramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await WasteManagementService.archiveRecyclingProgram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Waste Disposals
// ─────────────────────────────────────────────────────────────────────────────

describe('WasteManagementService — Waste Disposals', () => {
  beforeEach(() => resetMock());

  it('creates a waste disposal with defaults', async () => {
    memCreateImpl = async (args) => makeDisposalRow({ content: args.data.content as string });
    const d = await WasteManagementService.createWasteDisposal('org-1', 'ws-1', {
      type: 'recycling',
    }, 'user-1');
    assert.equal(d.type, 'recycling');
    assert.equal(d.status, 'pending');
    assert.equal(d.volume, 0);
  });

  it('creates a waste disposal with full input', async () => {
    memCreateImpl = async (args) => makeDisposalRow({ content: args.data.content as string });
    const d = await WasteManagementService.createWasteDisposal('org-1', 'ws-1', {
      streamId: 'mem-1', vendorId: 'mem-v1', type: 'composting',
      description: 'Organic composting', status: 'scheduled',
      volume: 200, unit: 'kg', scheduledDate: '2028-05-01',
      cost: 75, manifest: 'MAN-002', notes: 'Compost ready',
    }, 'user-1');
    assert.equal(d.type, 'composting');
    assert.equal(d.volume, 200);
    assert.equal(d.cost, 75);
  });

  it('gets a waste disposal by id', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    const d = await WasteManagementService.getWasteDisposal('mem-d1');
    assert.ok(d);
    assert.equal(d!.type, 'landfill');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDisposalRow({ type: 'waste_stream' });
    const d = await WasteManagementService.getWasteDisposal('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when waste disposal not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await WasteManagementService.getWasteDisposal('nope');
    assert.equal(d, null);
  });

  it('lists waste disposals by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_disposal') return [makeDisposalRow()];
      return [];
    };
    const list = await WasteManagementService.listWasteDisposals('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a waste disposal', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await WasteManagementService.updateWasteDisposal('mem-d1', { status: 'scheduled' });
    assert.ok(d);
    assert.equal(d!.status, 'scheduled');
  });

  it('deletes a waste disposal', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await WasteManagementService.deleteWasteDisposal('mem-d1');
    assert.equal(ok, true);
  });

  it('scheduleWasteDisposal sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await WasteManagementService.scheduleWasteDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'scheduled');
  });

  it('executeWasteDisposal sets status to executed', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await WasteManagementService.executeWasteDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'executed');
  });

  it('cancelWasteDisposal sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await WasteManagementService.cancelWasteDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'cancelled');
  });

  it('verifyWasteDisposal sets status to verified', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await WasteManagementService.verifyWasteDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Waste Vendors
// ─────────────────────────────────────────────────────────────────────────────

describe('WasteManagementService — Waste Vendors', () => {
  beforeEach(() => resetMock());

  it('creates a waste vendor with defaults', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await WasteManagementService.createWasteVendor('org-1', 'ws-1', {
      name: 'EcoHaul', type: 'hauler',
    }, 'user-1');
    assert.equal(v.name, 'EcoHaul');
    assert.equal(v.status, 'active');
    assert.equal(v.rating, 0);
  });

  it('creates a waste vendor with full input', async () => {
    memCreateImpl = async (args) => makeVendorRow({ content: args.data.content as string });
    const v = await WasteManagementService.createWasteVendor('org-1', 'ws-1', {
      name: 'HazMat Pro', type: 'hazardous', description: 'Hazardous waste specialist',
      status: 'under_review', contactName: 'Carl Haz', email: 'carl@hazmat.com',
      phone: '555-0200', address: '200 Hazmat Ave', certification: 'EPA Cert',
      rating: 5, contractTerms: 'Net 15', notes: 'Top-rated',
    }, 'user-1');
    assert.equal(v.name, 'HazMat Pro');
    assert.equal(v.type, 'hazardous');
    assert.equal(v.rating, 5);
    assert.equal(v.certification, 'EPA Cert');
  });

  it('gets a waste vendor by id', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    const v = await WasteManagementService.getWasteVendor('mem-v1');
    assert.ok(v);
    assert.equal(v!.name, 'GreenWaste Solutions');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeVendorRow({ type: 'waste_stream' });
    const v = await WasteManagementService.getWasteVendor('mem-v1');
    assert.equal(v, null);
  });

  it('returns null when waste vendor not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await WasteManagementService.getWasteVendor('nope');
    assert.equal(v, null);
  });

  it('lists waste vendors by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_vendor') return [makeVendorRow()];
      return [];
    };
    const list = await WasteManagementService.listWasteVendors('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a waste vendor', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await WasteManagementService.updateWasteVendor('mem-v1', { rating: 5 });
    assert.ok(v);
    assert.equal(v!.rating, 5);
  });

  it('deletes a waste vendor', async () => {
    memDeleteImpl = async () => ({ id: 'mem-v1' });
    const ok = await WasteManagementService.deleteWasteVendor('mem-v1');
    assert.equal(ok, true);
  });

  it('activateWasteVendor sets status to active', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await WasteManagementService.activateWasteVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'active');
  });

  it('suspendWasteVendor sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await WasteManagementService.suspendWasteVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'suspended');
  });

  it('terminateWasteVendor sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await WasteManagementService.terminateWasteVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'terminated');
  });

  it('reviewWasteVendor sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeVendorRow();
    memUpdateImpl = async (args) => makeVendorRow({ id: 'mem-v1', content: args.data.content as string });
    const v = await WasteManagementService.reviewWasteVendor('mem-v1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'under_review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('WasteManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getWasteManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_stream') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'general', status: 'active', description: '', source: '', volume: 0, unit: '', frequency: '', handler: '', notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'general', status: 'draft', description: '', source: '', volume: 0, unit: '', frequency: '', handler: '', notes: '' }) }),
      ];
      if (t === 'recycling_program') return [
        makeProgramRow({ content: JSON.stringify({ name: 'P1', type: 'paper', status: 'active', description: '', startDate: null, endDate: null, targetVolume: 0, actualVolume: 100, unit: '', participants: 0, coordinator: '', notes: '' }) }),
      ];
      if (t === 'waste_disposal') return [
        makeDisposalRow({ content: JSON.stringify({ streamId: null, vendorId: null, type: 'landfill', status: 'pending', description: '', volume: 0, unit: '', scheduledDate: null, executedDate: null, cost: 0, manifest: '', notes: '' }) }),
        makeDisposalRow({ id: 'd2', content: JSON.stringify({ streamId: null, vendorId: null, type: 'landfill', status: 'scheduled', description: '', volume: 0, unit: '', scheduledDate: null, executedDate: null, cost: 0, manifest: '', notes: '' }) }),
      ];
      if (t === 'waste_vendor') return [
        makeVendorRow({ content: JSON.stringify({ name: 'V1', type: 'recycler', status: 'active', description: '', contactName: '', email: '', phone: '', address: '', certification: '', rating: 0, contractTerms: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await WasteManagementService.getWasteManagementMetrics('org-1');
    assert.equal(m.activeStreams, 1);
    assert.equal(m.activePrograms, 1);
    assert.equal(m.pendingDisposals, 2);
    assert.equal(m.activeVendors, 1);
    assert.equal(m.recycledVolume, 100);
  });

  it('getWasteManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_stream') return [makeRow()];
      if (t === 'recycling_program') return [makeProgramRow()];
      if (t === 'waste_disposal') return [makeDisposalRow()];
      if (t === 'waste_vendor') return [makeVendorRow()];
      return [];
    };
    const s = await WasteManagementService.getWasteManagementStats('org-1');
    assert.equal(s.streamCount, 1);
    assert.equal(s.programCount, 1);
    assert.equal(s.disposalCount, 1);
    assert.equal(s.vendorCount, 1);
    assert.equal(s.byStreamType['general'], 1);
    assert.equal(s.byProgramType['paper'], 1);
    assert.equal(s.byDisposalType['landfill'], 1);
    assert.equal(s.byVendorType['recycler'], 1);
  });
});
