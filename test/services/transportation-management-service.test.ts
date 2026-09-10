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
    type: 'fleet_vehicle',
    content: JSON.stringify({
      name: 'Company Van 1',
      type: 'van',
      description: 'Passenger van',
      status: 'active',
      plateNumber: 'VAN-001',
      make: 'Ford',
      model: 'Transit',
      year: 2024,
      capacity: 12,
      fuelType: 'diesel',
      mileage: 15000,
      lastServiceDate: '2028-01-01',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['fleet_vehicle', 'van', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRouteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-rt1',
    type: 'transport_route',
    content: JSON.stringify({
      name: 'Downtown Shuttle',
      type: 'employee_shuttle',
      description: 'Morning shuttle to downtown',
      status: 'active',
      origin: 'HQ',
      destination: 'Downtown Office',
      stops: ['Stop A', 'Stop B', 'Stop C'],
      distance: 15,
      estimatedDuration: 45,
      schedule: '7:00 AM - 9:00 AM',
      notes: '',
    }),
    tags: JSON.stringify(['transport_route', 'employee_shuttle', 'active']),
    ...overrides,
  });
}

function makeAssignmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-asg1',
    type: 'driver_assignment',
    content: JSON.stringify({
      vehicleId: 'mem-1',
      routeId: 'mem-rt1',
      type: 'primary',
      description: 'Primary driver assignment',
      status: 'assigned',
      driverName: 'Bob Driver',
      driverLicense: 'DL-12345',
      startDate: '2028-01-01',
      endDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['driver_assignment', 'primary', 'assigned']),
    ...overrides,
  });
}

function makeTripRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-trip1',
    type: 'transport_trip',
    content: JSON.stringify({
      vehicleId: 'mem-1',
      routeId: 'mem-rt1',
      assignmentId: 'mem-asg1',
      type: 'scheduled',
      description: 'Morning shuttle trip',
      status: 'scheduled',
      driverName: 'Bob Driver',
      passengerCount: 10,
      scheduledDate: '2028-02-01',
      startDate: null,
      completedDate: null,
      origin: 'HQ',
      destination: 'Downtown Office',
      notes: '',
    }),
    tags: JSON.stringify(['transport_trip', 'scheduled', 'scheduled']),
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

const { TransportationManagementService } = await import('@/lib/services/transportation-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Vehicles
// ─────────────────────────────────────────────────────────────────────────────

describe('TransportationManagementService — Vehicles', () => {
  beforeEach(() => resetMock());

  it('creates a vehicle with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const v = await TransportationManagementService.createVehicle('org-1', 'ws-1', {
      name: 'Sedan 1', type: 'sedan',
    }, 'user-1');
    assert.equal(v.name, 'Sedan 1');
    assert.equal(v.status, 'active');
    assert.equal(v.capacity, 1);
  });

  it('creates a vehicle with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const v = await TransportationManagementService.createVehicle('org-1', 'ws-1', {
      name: 'Electric Bus', type: 'electric', description: 'EV shuttle bus',
      status: 'maintained', plateNumber: 'EV-100', make: 'Tesla',
      model: 'Semi', year: 2025, capacity: 40, fuelType: 'electric',
      mileage: 5000, lastServiceDate: '2028-01-15', notes: 'Charging at depot',
    }, 'user-1');
    assert.equal(v.name, 'Electric Bus');
    assert.equal(v.type, 'electric');
    assert.equal(v.capacity, 40);
    assert.equal(v.year, 2025);
  });

  it('gets a vehicle by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const v = await TransportationManagementService.getVehicle('mem-1');
    assert.ok(v);
    assert.equal(v!.id, 'mem-1');
    assert.equal(v!.name, 'Company Van 1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'transport_route' });
    const v = await TransportationManagementService.getVehicle('mem-1');
    assert.equal(v, null);
  });

  it('returns null when vehicle not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await TransportationManagementService.getVehicle('nope');
    assert.equal(v, null);
  });

  it('lists vehicles by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'fleet_vehicle') return [makeRow()];
      return [];
    };
    const list = await TransportationManagementService.listVehicles('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Company Van 1');
  });

  it('updates a vehicle', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await TransportationManagementService.updateVehicle('mem-1', { status: 'maintained' });
    assert.ok(v);
    assert.equal(v!.status, 'maintained');
  });

  it('deletes a vehicle', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await TransportationManagementService.deleteVehicle('mem-1');
    assert.equal(ok, true);
  });

  it('activateVehicle sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await TransportationManagementService.activateVehicle('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'active');
  });

  it('maintainVehicle sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await TransportationManagementService.maintainVehicle('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'maintained');
  });

  it('retireVehicle sets status to retired', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await TransportationManagementService.retireVehicle('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'retired');
  });

  it('decommissionVehicle sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await TransportationManagementService.decommissionVehicle('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Routes
// ─────────────────────────────────────────────────────────────────────────────

describe('TransportationManagementService — Routes', () => {
  beforeEach(() => resetMock());

  it('creates a route with defaults', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await TransportationManagementService.createRoute('org-1', 'ws-1', {
      name: 'Airport Route', type: 'airport',
    }, 'user-1');
    assert.equal(r.name, 'Airport Route');
    assert.equal(r.status, 'active');
    assert.equal(r.stops.length, 0);
  });

  it('creates a route with full input', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await TransportationManagementService.createRoute('org-1', 'ws-1', {
      name: 'Intercampus Express', type: 'intercampus', description: 'Express between campuses',
      status: 'suspended', origin: 'North Campus', destination: 'South Campus',
      stops: ['Central', 'Library'], distance: 25, estimatedDuration: 30,
      schedule: 'Every 30 min', notes: 'Suspended during holidays',
    }, 'user-1');
    assert.equal(r.name, 'Intercampus Express');
    assert.equal(r.type, 'intercampus');
    assert.equal(r.stops.length, 2);
    assert.equal(r.distance, 25);
  });

  it('gets a route by id', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    const r = await TransportationManagementService.getRoute('mem-rt1');
    assert.ok(r);
    assert.equal(r!.name, 'Downtown Shuttle');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRouteRow({ type: 'fleet_vehicle' });
    const r = await TransportationManagementService.getRoute('mem-rt1');
    assert.equal(r, null);
  });

  it('returns null when route not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await TransportationManagementService.getRoute('nope');
    assert.equal(r, null);
  });

  it('lists routes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'transport_route') return [makeRouteRow()];
      return [];
    };
    const list = await TransportationManagementService.listRoutes('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a route', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await TransportationManagementService.updateRoute('mem-rt1', { status: 'suspended' });
    assert.ok(r);
    assert.equal(r!.status, 'suspended');
  });

  it('deletes a route', async () => {
    memDeleteImpl = async () => ({ id: 'mem-rt1' });
    const ok = await TransportationManagementService.deleteRoute('mem-rt1');
    assert.equal(ok, true);
  });

  it('activateRoute sets status to active', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await TransportationManagementService.activateRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('suspendRoute sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await TransportationManagementService.suspendRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'suspended');
  });

  it('deactivateRoute sets status to deactivated', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-rt1', content: args.data.content as string });
    const r = await TransportationManagementService.deactivateRoute('mem-rt1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'deactivated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assignments
// ─────────────────────────────────────────────────────────────────────────────

describe('TransportationManagementService — Assignments', () => {
  beforeEach(() => resetMock());

  it('creates an assignment with defaults', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await TransportationManagementService.createAssignment('org-1', 'ws-1', {
      type: 'backup',
    }, 'user-1');
    assert.equal(a.type, 'backup');
    assert.equal(a.status, 'assigned');
    assert.equal(a.driverName, '');
  });

  it('creates an assignment with full input', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await TransportationManagementService.createAssignment('org-1', 'ws-1', {
      vehicleId: 'mem-1', routeId: 'mem-rt1', type: 'training', description: 'Training assignment',
      status: 'assigned', driverName: 'Trainee Tim', driverLicense: 'DL-99999',
      startDate: '2028-02-01', endDate: '2028-03-01', notes: 'Training period',
    }, 'user-1');
    assert.equal(a.type, 'training');
    assert.equal(a.driverName, 'Trainee Tim');
    assert.equal(a.driverLicense, 'DL-99999');
  });

  it('gets an assignment by id', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    const a = await TransportationManagementService.getAssignment('mem-asg1');
    assert.ok(a);
    assert.equal(a!.driverName, 'Bob Driver');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow({ type: 'fleet_vehicle' });
    const a = await TransportationManagementService.getAssignment('mem-asg1');
    assert.equal(a, null);
  });

  it('returns null when assignment not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await TransportationManagementService.getAssignment('nope');
    assert.equal(a, null);
  });

  it('lists assignments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'driver_assignment') return [makeAssignmentRow()];
      return [];
    };
    const list = await TransportationManagementService.listAssignments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an assignment', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-asg1', content: args.data.content as string });
    const a = await TransportationManagementService.updateAssignment('mem-asg1', { status: 'completed' });
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('deletes an assignment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-asg1' });
    const ok = await TransportationManagementService.deleteAssignment('mem-asg1');
    assert.equal(ok, true);
  });

  it('assignAssignment sets status to assigned', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-asg1', content: args.data.content as string });
    const a = await TransportationManagementService.assignAssignment('mem-asg1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'assigned');
  });

  it('completeAssignment sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-asg1', content: args.data.content as string });
    const a = await TransportationManagementService.completeAssignment('mem-asg1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('cancelAssignment sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-asg1', content: args.data.content as string });
    const a = await TransportationManagementService.cancelAssignment('mem-asg1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Trips
// ─────────────────────────────────────────────────────────────────────────────

describe('TransportationManagementService — Trips', () => {
  beforeEach(() => resetMock());

  it('creates a trip with defaults', async () => {
    memCreateImpl = async (args) => makeTripRow({ content: args.data.content as string });
    const t = await TransportationManagementService.createTrip('org-1', 'ws-1', {
      type: 'shuttle',
    }, 'user-1');
    assert.equal(t.type, 'shuttle');
    assert.equal(t.status, 'scheduled');
    assert.equal(t.passengerCount, 0);
  });

  it('creates a trip with full input', async () => {
    memCreateImpl = async (args) => makeTripRow({ content: args.data.content as string });
    const t = await TransportationManagementService.createTrip('org-1', 'ws-1', {
      vehicleId: 'mem-1', routeId: 'mem-rt1', assignmentId: 'mem-asg1', type: 'charter',
      description: 'VIP charter trip', status: 'in_progress', driverName: 'Bob Driver',
      passengerCount: 8, scheduledDate: '2028-05-01', startDate: '2028-05-01',
      origin: 'Hotel', destination: 'Convention Center', notes: 'VIP guests',
    }, 'user-1');
    assert.equal(t.type, 'charter');
    assert.equal(t.driverName, 'Bob Driver');
    assert.equal(t.passengerCount, 8);
  });

  it('gets a trip by id', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    const t = await TransportationManagementService.getTrip('mem-trip1');
    assert.ok(t);
    assert.equal(t!.driverName, 'Bob Driver');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTripRow({ type: 'fleet_vehicle' });
    const t = await TransportationManagementService.getTrip('mem-trip1');
    assert.equal(t, null);
  });

  it('returns null when trip not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await TransportationManagementService.getTrip('nope');
    assert.equal(t, null);
  });

  it('lists trips by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'transport_trip') return [makeTripRow()];
      return [];
    };
    const list = await TransportationManagementService.listTrips('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a trip', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    memUpdateImpl = async (args) => makeTripRow({ id: 'mem-trip1', content: args.data.content as string });
    const t = await TransportationManagementService.updateTrip('mem-trip1', { status: 'completed' });
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('deletes a trip', async () => {
    memDeleteImpl = async () => ({ id: 'mem-trip1' });
    const ok = await TransportationManagementService.deleteTrip('mem-trip1');
    assert.equal(ok, true);
  });

  it('startTrip sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    memUpdateImpl = async (args) => makeTripRow({ id: 'mem-trip1', content: args.data.content as string });
    const t = await TransportationManagementService.startTrip('mem-trip1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('completeTrip sets status to completed', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    memUpdateImpl = async (args) => makeTripRow({ id: 'mem-trip1', content: args.data.content as string });
    const t = await TransportationManagementService.completeTrip('mem-trip1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('cancelTrip sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    memUpdateImpl = async (args) => makeTripRow({ id: 'mem-trip1', content: args.data.content as string });
    const t = await TransportationManagementService.cancelTrip('mem-trip1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'cancelled');
  });

  it('noShowTrip sets status to no_show', async () => {
    memFindUniqueImpl = async () => makeTripRow();
    memUpdateImpl = async (args) => makeTripRow({ id: 'mem-trip1', content: args.data.content as string });
    const t = await TransportationManagementService.noShowTrip('mem-trip1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'no_show');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('TransportationManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getTransportationManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'fleet_vehicle') return [
        makeRow({ content: JSON.stringify({ name: 'V1', type: 'van', status: 'active', description: '', plateNumber: '', make: '', model: '', year: 0, capacity: 1, fuelType: '', mileage: 0, lastServiceDate: null, notes: '' }) }),
      ];
      if (t === 'transport_route') return [
        makeRouteRow({ content: JSON.stringify({ name: 'R1', type: 'employee_shuttle', status: 'active', description: '', origin: '', destination: '', stops: [], distance: 0, estimatedDuration: 0, schedule: '', notes: '' }) }),
      ];
      if (t === 'driver_assignment') return [
        makeAssignmentRow({ content: JSON.stringify({ vehicleId: null, routeId: null, type: 'primary', status: 'assigned', description: '', driverName: '', driverLicense: '', startDate: null, endDate: null, notes: '' }) }),
      ];
      if (t === 'transport_trip') return [
        makeTripRow({ content: JSON.stringify({ vehicleId: null, routeId: null, assignmentId: null, type: 'scheduled', status: 'scheduled', description: '', driverName: '', passengerCount: 0, scheduledDate: null, startDate: null, completedDate: null, origin: '', destination: '', notes: '' }) }),
        makeTripRow({ id: 't2', content: JSON.stringify({ vehicleId: null, routeId: null, assignmentId: null, type: 'scheduled', status: 'completed', description: '', driverName: '', passengerCount: 0, scheduledDate: null, startDate: null, completedDate: null, origin: '', destination: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await TransportationManagementService.getTransportationManagementMetrics('org-1');
    assert.equal(m.activeVehicles, 1);
    assert.equal(m.activeRoutes, 1);
    assert.equal(m.activeAssignments, 1);
    assert.equal(m.scheduledTrips, 1);
    assert.equal(m.completedTrips, 1);
  });

  it('getTransportationManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'fleet_vehicle') return [makeRow()];
      if (t === 'transport_route') return [makeRouteRow()];
      if (t === 'driver_assignment') return [makeAssignmentRow()];
      if (t === 'transport_trip') return [makeTripRow()];
      return [];
    };
    const s = await TransportationManagementService.getTransportationManagementStats('org-1');
    assert.equal(s.vehicleCount, 1);
    assert.equal(s.routeCount, 1);
    assert.equal(s.assignmentCount, 1);
    assert.equal(s.tripCount, 1);
    assert.equal(s.byVehicleType['van'], 1);
    assert.equal(s.byRouteType['employee_shuttle'], 1);
    assert.equal(s.byAssignmentType['primary'], 1);
    assert.equal(s.byTripStatus['scheduled'], 1);
  });
});
