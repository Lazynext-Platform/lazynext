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
    type: 'parking_spot',
    content: JSON.stringify({
      name: 'Spot A-1',
      type: 'standard',
      description: 'Standard parking spot',
      status: 'active',
      location: 'Lot A',
      level: '1',
      zone: 'A',
      assignedTo: '',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['parking_spot', 'standard', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePermitRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-perm1',
    type: 'parking_permit',
    content: JSON.stringify({
      holderName: 'John Doe',
      type: 'employee',
      description: 'Employee parking permit',
      status: 'pending',
      vehiclePlate: 'ABC-123',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      issuedDate: null,
      expiryDate: '2028-12-31',
      approvedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['parking_permit', 'employee', 'pending']),
    ...overrides,
  });
}

function makeAllocationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-alloc1',
    type: 'parking_allocation',
    content: JSON.stringify({
      spotId: 'mem-1',
      permitId: 'mem-perm1',
      type: 'permanent',
      description: 'Permanent allocation',
      status: 'assigned',
      assignee: 'John Doe',
      department: 'Engineering',
      assignedDate: '2028-01-01',
      releasedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['parking_allocation', 'permanent', 'assigned']),
    ...overrides,
  });
}

function makeVisitorParkingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-vp1',
    type: 'visitor_parking',
    content: JSON.stringify({
      visitorName: 'Jane Smith',
      type: 'short_term',
      description: 'Short-term visitor',
      status: 'pending',
      host: 'Alice',
      vehiclePlate: 'XYZ-789',
      spotId: 'mem-1',
      checkInDate: null,
      checkOutDate: null,
      expectedDuration: '2 hours',
      notes: '',
    }),
    tags: JSON.stringify(['visitor_parking', 'short_term', 'pending']),
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

const { ParkingManagementService } = await import('@/lib/services/parking-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Spots
// ─────────────────────────────────────────────────────────────────────────────

describe('ParkingManagementService — Spots', () => {
  beforeEach(() => resetMock());

  it('creates a spot with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ParkingManagementService.createSpot('org-1', 'ws-1', {
      name: 'Spot B-5', type: 'accessible',
    }, 'user-1');
    assert.equal(s.name, 'Spot B-5');
    assert.equal(s.status, 'active');
    assert.equal(s.assignedTo, '');
  });

  it('creates a spot with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ParkingManagementService.createSpot('org-1', 'ws-1', {
      name: 'EV Spot 1', type: 'electric', description: 'EV charging spot',
      status: 'reserved', location: 'Garage B', level: '2', zone: 'EV',
      assignedTo: 'Bob', notes: 'Has charging station',
    }, 'user-1');
    assert.equal(s.name, 'EV Spot 1');
    assert.equal(s.type, 'electric');
    assert.equal(s.assignedTo, 'Bob');
  });

  it('gets a spot by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await ParkingManagementService.getSpot('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'Spot A-1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'parking_permit' });
    const s = await ParkingManagementService.getSpot('mem-1');
    assert.equal(s, null);
  });

  it('returns null when spot not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await ParkingManagementService.getSpot('nope');
    assert.equal(s, null);
  });

  it('lists spots by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'parking_spot') return [makeRow()];
      return [];
    };
    const list = await ParkingManagementService.listSpots('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Spot A-1');
  });

  it('updates a spot', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ParkingManagementService.updateSpot('mem-1', { status: 'maintained' });
    assert.ok(s);
    assert.equal(s!.status, 'maintained');
  });

  it('deletes a spot', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await ParkingManagementService.deleteSpot('mem-1');
    assert.equal(ok, true);
  });

  it('activateSpot sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ParkingManagementService.activateSpot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('maintainSpot sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ParkingManagementService.maintainSpot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'maintained');
  });

  it('reserveSpot sets status to reserved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ParkingManagementService.reserveSpot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'reserved');
  });

  it('offlineSpot sets status to offline', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ParkingManagementService.offlineSpot('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'offline');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permits
// ─────────────────────────────────────────────────────────────────────────────

describe('ParkingManagementService — Permits', () => {
  beforeEach(() => resetMock());

  it('creates a permit with defaults', async () => {
    memCreateImpl = async (args) => makePermitRow({ content: args.data.content as string });
    const p = await ParkingManagementService.createPermit('org-1', 'ws-1', {
      holderName: 'Jane Roe', type: 'visitor',
    }, 'user-1');
    assert.equal(p.holderName, 'Jane Roe');
    assert.equal(p.status, 'pending');
    assert.equal(p.vehiclePlate, '');
  });

  it('creates a permit with full input', async () => {
    memCreateImpl = async (args) => makePermitRow({ content: args.data.content as string });
    const p = await ParkingManagementService.createPermit('org-1', 'ws-1', {
      holderName: 'Bob Smith', type: 'permanent', description: 'Permanent employee permit',
      status: 'approved', vehiclePlate: 'DEF-456', vehicleMake: 'Honda',
      vehicleModel: 'Civic', issuedDate: '2028-01-01', expiryDate: '2029-01-01',
      approvedBy: 'admin', notes: 'Approved by HR',
    }, 'user-1');
    assert.equal(p.holderName, 'Bob Smith');
    assert.equal(p.type, 'permanent');
    assert.equal(p.vehiclePlate, 'DEF-456');
  });

  it('gets a permit by id', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    const p = await ParkingManagementService.getPermit('mem-perm1');
    assert.ok(p);
    assert.equal(p!.holderName, 'John Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePermitRow({ type: 'parking_spot' });
    const p = await ParkingManagementService.getPermit('mem-perm1');
    assert.equal(p, null);
  });

  it('returns null when permit not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await ParkingManagementService.getPermit('nope');
    assert.equal(p, null);
  });

  it('lists permits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'parking_permit') return [makePermitRow()];
      return [];
    };
    const list = await ParkingManagementService.listPermits('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a permit', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.updatePermit('mem-perm1', { status: 'issued' });
    assert.ok(p);
    assert.equal(p!.status, 'issued');
  });

  it('deletes a permit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-perm1' });
    const ok = await ParkingManagementService.deletePermit('mem-perm1');
    assert.equal(ok, true);
  });

  it('approvePermit sets status to approved', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.approvePermit('mem-perm1', 'admin-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
  });

  it('issuePermit sets status to issued', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.issuePermit('mem-perm1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'issued');
  });

  it('renewPermit sets status to renewed', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.renewPermit('mem-perm1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'renewed');
  });

  it('revokePermit sets status to revoked', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.revokePermit('mem-perm1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'revoked');
  });

  it('expirePermit sets status to expired', async () => {
    memFindUniqueImpl = async () => makePermitRow();
    memUpdateImpl = async (args) => makePermitRow({ id: 'mem-perm1', content: args.data.content as string });
    const p = await ParkingManagementService.expirePermit('mem-perm1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Allocations
// ─────────────────────────────────────────────────────────────────────────────

describe('ParkingManagementService — Allocations', () => {
  beforeEach(() => resetMock());

  it('creates an allocation with defaults', async () => {
    memCreateImpl = async (args) => makeAllocationRow({ content: args.data.content as string });
    const a = await ParkingManagementService.createAllocation('org-1', 'ws-1', {
      type: 'temporary',
    }, 'user-1');
    assert.equal(a.type, 'temporary');
    assert.equal(a.status, 'assigned');
    assert.equal(a.assignee, '');
  });

  it('creates an allocation with full input', async () => {
    memCreateImpl = async (args) => makeAllocationRow({ content: args.data.content as string });
    const a = await ParkingManagementService.createAllocation('org-1', 'ws-1', {
      spotId: 'mem-1', permitId: 'mem-perm1', type: 'priority', description: 'Priority allocation',
      status: 'assigned', assignee: 'CEO', department: 'Executive',
      assignedDate: '2028-01-15', notes: 'Reserved for executive',
    }, 'user-1');
    assert.equal(a.type, 'priority');
    assert.equal(a.assignee, 'CEO');
    assert.equal(a.department, 'Executive');
  });

  it('gets an allocation by id', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    const a = await ParkingManagementService.getAllocation('mem-alloc1');
    assert.ok(a);
    assert.equal(a!.assignee, 'John Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAllocationRow({ type: 'parking_spot' });
    const a = await ParkingManagementService.getAllocation('mem-alloc1');
    assert.equal(a, null);
  });

  it('returns null when allocation not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await ParkingManagementService.getAllocation('nope');
    assert.equal(a, null);
  });

  it('lists allocations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'parking_allocation') return [makeAllocationRow()];
      return [];
    };
    const list = await ParkingManagementService.listAllocations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an allocation', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-alloc1', content: args.data.content as string });
    const a = await ParkingManagementService.updateAllocation('mem-alloc1', { status: 'released' });
    assert.ok(a);
    assert.equal(a!.status, 'released');
  });

  it('deletes an allocation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-alloc1' });
    const ok = await ParkingManagementService.deleteAllocation('mem-alloc1');
    assert.equal(ok, true);
  });

  it('assignAllocation sets status to assigned', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-alloc1', content: args.data.content as string });
    const a = await ParkingManagementService.assignAllocation('mem-alloc1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'assigned');
  });

  it('releaseAllocation sets status to released', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-alloc1', content: args.data.content as string });
    const a = await ParkingManagementService.releaseAllocation('mem-alloc1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'released');
  });

  it('transferAllocation sets status to transferred', async () => {
    memFindUniqueImpl = async () => makeAllocationRow();
    memUpdateImpl = async (args) => makeAllocationRow({ id: 'mem-alloc1', content: args.data.content as string });
    const a = await ParkingManagementService.transferAllocation('mem-alloc1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'transferred');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Visitor Parking
// ─────────────────────────────────────────────────────────────────────────────

describe('ParkingManagementService — Visitor Parking', () => {
  beforeEach(() => resetMock());

  it('creates a visitor parking record with defaults', async () => {
    memCreateImpl = async (args) => makeVisitorParkingRow({ content: args.data.content as string });
    const v = await ParkingManagementService.createVisitorParking('org-1', 'ws-1', {
      visitorName: 'Guest 1', type: 'event',
    }, 'user-1');
    assert.equal(v.visitorName, 'Guest 1');
    assert.equal(v.status, 'pending');
    assert.equal(v.host, '');
  });

  it('creates a visitor parking record with full input', async () => {
    memCreateImpl = async (args) => makeVisitorParkingRow({ content: args.data.content as string });
    const v = await ParkingManagementService.createVisitorParking('org-1', 'ws-1', {
      visitorName: 'Contractor Bob', type: 'contractor', description: 'Long-term contractor',
      status: 'approved', host: 'Engineering Dept', vehiclePlate: 'GHI-999',
      spotId: 'mem-1', checkInDate: '2028-03-01', checkOutDate: '2028-03-05',
      expectedDuration: '5 days', notes: 'Renovation project',
    }, 'user-1');
    assert.equal(v.visitorName, 'Contractor Bob');
    assert.equal(v.type, 'contractor');
    assert.equal(v.host, 'Engineering Dept');
  });

  it('gets a visitor parking record by id', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    const v = await ParkingManagementService.getVisitorParking('mem-vp1');
    assert.ok(v);
    assert.equal(v!.visitorName, 'Jane Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow({ type: 'parking_spot' });
    const v = await ParkingManagementService.getVisitorParking('mem-vp1');
    assert.equal(v, null);
  });

  it('returns null when visitor parking not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await ParkingManagementService.getVisitorParking('nope');
    assert.equal(v, null);
  });

  it('lists visitor parking by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_parking') return [makeVisitorParkingRow()];
      return [];
    };
    const list = await ParkingManagementService.listVisitorParking('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a visitor parking record', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    memUpdateImpl = async (args) => makeVisitorParkingRow({ id: 'mem-vp1', content: args.data.content as string });
    const v = await ParkingManagementService.updateVisitorParking('mem-vp1', { status: 'approved' });
    assert.ok(v);
    assert.equal(v!.status, 'approved');
  });

  it('deletes a visitor parking record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-vp1' });
    const ok = await ParkingManagementService.deleteVisitorParking('mem-vp1');
    assert.equal(ok, true);
  });

  it('approveVisitorParking sets status to approved', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    memUpdateImpl = async (args) => makeVisitorParkingRow({ id: 'mem-vp1', content: args.data.content as string });
    const v = await ParkingManagementService.approveVisitorParking('mem-vp1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'approved');
  });

  it('checkInVisitorParking sets status to checked_in', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    memUpdateImpl = async (args) => makeVisitorParkingRow({ id: 'mem-vp1', content: args.data.content as string });
    const v = await ParkingManagementService.checkInVisitorParking('mem-vp1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'checked_in');
  });

  it('checkOutVisitorParking sets status to checked_out', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    memUpdateImpl = async (args) => makeVisitorParkingRow({ id: 'mem-vp1', content: args.data.content as string });
    const v = await ParkingManagementService.checkOutVisitorParking('mem-vp1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'checked_out');
  });

  it('expireVisitorParking sets status to expired', async () => {
    memFindUniqueImpl = async () => makeVisitorParkingRow();
    memUpdateImpl = async (args) => makeVisitorParkingRow({ id: 'mem-vp1', content: args.data.content as string });
    const v = await ParkingManagementService.expireVisitorParking('mem-vp1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('ParkingManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getParkingManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'parking_spot') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'standard', status: 'active', description: '', location: '', level: '', zone: '', assignedTo: '', notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'standard', status: 'maintained', description: '', location: '', level: '', zone: '', assignedTo: '', notes: '' }) }),
      ];
      if (t === 'parking_permit') return [
        makePermitRow({ content: JSON.stringify({ holderName: 'P1', type: 'employee', status: 'issued', description: '', vehiclePlate: '', vehicleMake: '', vehicleModel: '', issuedDate: null, expiryDate: null, approvedBy: '', notes: '' }) }),
        makePermitRow({ id: 'p2', content: JSON.stringify({ holderName: 'P2', type: 'employee', status: 'pending', description: '', vehiclePlate: '', vehicleMake: '', vehicleModel: '', issuedDate: null, expiryDate: null, approvedBy: '', notes: '' }) }),
        makePermitRow({ id: 'p3', content: JSON.stringify({ holderName: 'P3', type: 'employee', status: 'approved', description: '', vehiclePlate: '', vehicleMake: '', vehicleModel: '', issuedDate: null, expiryDate: null, approvedBy: '', notes: '' }) }),
      ];
      if (t === 'visitor_parking') return [
        makeVisitorParkingRow({ content: JSON.stringify({ visitorName: 'V1', type: 'short_term', status: 'checked_in', description: '', host: '', vehiclePlate: '', spotId: null, checkInDate: null, checkOutDate: null, expectedDuration: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await ParkingManagementService.getParkingManagementMetrics('org-1');
    assert.equal(m.totalSpots, 2);
    assert.equal(m.availableSpots, 1);
    assert.equal(m.activePermits, 1);
    assert.equal(m.activeVisitorParking, 1);
    assert.equal(m.pendingPermits, 2);
  });

  it('getParkingManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'parking_spot') return [makeRow()];
      if (t === 'parking_permit') return [makePermitRow()];
      if (t === 'parking_allocation') return [makeAllocationRow()];
      if (t === 'visitor_parking') return [makeVisitorParkingRow()];
      return [];
    };
    const s = await ParkingManagementService.getParkingManagementStats('org-1');
    assert.equal(s.spotCount, 1);
    assert.equal(s.permitCount, 1);
    assert.equal(s.allocationCount, 1);
    assert.equal(s.visitorParkingCount, 1);
    assert.equal(s.bySpotType['standard'], 1);
    assert.equal(s.byPermitType['employee'], 1);
    assert.equal(s.byAllocationType['permanent'], 1);
    assert.equal(s.byVisitorParkingStatus['pending'], 1);
  });
});
