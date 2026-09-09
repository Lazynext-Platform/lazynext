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
    type: 'workspace_desk',
    content: JSON.stringify({
      name: 'Desk A-1',
      type: 'sitting',
      description: 'Standard sitting desk',
      status: 'active',
      location: 'Building A',
      floor: '1st',
      zone: 'A',
      capacity: 1,
      equipment: ['monitor', 'keyboard'],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['workspace_desk', 'sitting', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRoomRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'meeting_room',
    content: JSON.stringify({
      name: 'Conference Room A',
      type: 'conference',
      description: 'Large conference room',
      status: 'active',
      location: 'Building A',
      floor: '2nd',
      capacity: 20,
      equipment: ['projector', 'whiteboard'],
      bookingRequired: true,
      hourlyRate: 50,
      notes: '',
    }),
    tags: JSON.stringify(['meeting_room', 'conference', 'active']),
    ...overrides,
  });
}

function makeLayoutRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'office_layout',
    content: JSON.stringify({
      name: 'Floor 1 Plan',
      type: 'floor_plan',
      description: 'First floor layout',
      status: 'draft',
      floor: '1st',
      zones: ['A', 'B', 'C'],
      dimensions: '100x50',
      lastUpdated: null,
      notes: '',
    }),
    tags: JSON.stringify(['office_layout', 'floor_plan', 'draft']),
    ...overrides,
  });
}

function makeBookingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-b1',
    type: 'desk_booking',
    content: JSON.stringify({
      deskId: 'mem-1',
      type: 'daily',
      description: 'Daily desk booking',
      status: 'pending',
      bookedBy: 'Alice',
      department: 'Engineering',
      startDate: '2028-01-15',
      endDate: '2028-01-15',
      checkInDate: null,
      checkOutDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['desk_booking', 'daily', 'pending']),
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

const { WorkspaceManagementService } = await import('@/lib/services/workspace-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Desks
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceManagementService — Desks', () => {
  beforeEach(() => resetMock());

  it('creates a desk with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const d = await WorkspaceManagementService.createDesk('org-1', 'ws-1', {
      name: 'Desk B-2', type: 'standing',
    }, 'user-1');
    assert.equal(d.name, 'Desk B-2');
    assert.equal(d.status, 'active');
    assert.equal(d.capacity, 1);
  });

  it('creates a desk with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const d = await WorkspaceManagementService.createDesk('org-1', 'ws-1', {
      name: 'Hot Desk 3', type: 'hot', description: 'Shared hot desk',
      status: 'reserved', location: 'Building B', floor: '3rd', zone: 'D',
      capacity: 2, equipment: ['monitor', 'dock'], notes: 'Book in advance',
    }, 'user-1');
    assert.equal(d.name, 'Hot Desk 3');
    assert.equal(d.type, 'hot');
    assert.equal(d.capacity, 2);
    assert.equal(d.equipment.length, 2);
  });

  it('gets a desk by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const d = await WorkspaceManagementService.getDesk('mem-1');
    assert.ok(d);
    assert.equal(d!.id, 'mem-1');
    assert.equal(d!.name, 'Desk A-1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'meeting_room' });
    const d = await WorkspaceManagementService.getDesk('mem-1');
    assert.equal(d, null);
  });

  it('returns null when desk not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await WorkspaceManagementService.getDesk('nope');
    assert.equal(d, null);
  });

  it('lists desks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'workspace_desk') return [makeRow()];
      return [];
    };
    const list = await WorkspaceManagementService.listDesks('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Desk A-1');
  });

  it('updates a desk', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await WorkspaceManagementService.updateDesk('mem-1', { status: 'maintained' });
    assert.ok(d);
    assert.equal(d!.status, 'maintained');
  });

  it('deletes a desk', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await WorkspaceManagementService.deleteDesk('mem-1');
    assert.equal(ok, true);
  });

  it('activateDesk sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await WorkspaceManagementService.activateDesk('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'active');
  });

  it('deactivateDesk sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await WorkspaceManagementService.deactivateDesk('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'inactive');
  });

  it('maintainDesk sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const d = await WorkspaceManagementService.maintainDesk('mem-1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'maintained');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Rooms
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceManagementService — Rooms', () => {
  beforeEach(() => resetMock());

  it('creates a room with defaults', async () => {
    memCreateImpl = async (args) => makeRoomRow({ content: args.data.content as string });
    const r = await WorkspaceManagementService.createRoom('org-1', 'ws-1', {
      name: 'Huddle Room 1', type: 'huddle',
    }, 'user-1');
    assert.equal(r.name, 'Huddle Room 1');
    assert.equal(r.status, 'active');
    assert.equal(r.capacity, 1);
  });

  it('creates a room with full input', async () => {
    memCreateImpl = async (args) => makeRoomRow({ content: args.data.content as string });
    const r = await WorkspaceManagementService.createRoom('org-1', 'ws-1', {
      name: 'Boardroom', type: 'boardroom', description: 'Executive boardroom',
      status: 'maintained', location: 'Building A', floor: '5th',
      capacity: 30, equipment: ['tv', 'conference_phone'], bookingRequired: false,
      hourlyRate: 100, notes: 'VIP only',
    }, 'user-1');
    assert.equal(r.name, 'Boardroom');
    assert.equal(r.type, 'boardroom');
    assert.equal(r.capacity, 30);
    assert.equal(r.hourlyRate, 100);
  });

  it('gets a room by id', async () => {
    memFindUniqueImpl = async () => makeRoomRow();
    const r = await WorkspaceManagementService.getRoom('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Conference Room A');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRoomRow({ type: 'workspace_desk' });
    const r = await WorkspaceManagementService.getRoom('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when room not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await WorkspaceManagementService.getRoom('nope');
    assert.equal(r, null);
  });

  it('lists rooms by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'meeting_room') return [makeRoomRow()];
      return [];
    };
    const list = await WorkspaceManagementService.listRooms('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a room', async () => {
    memFindUniqueImpl = async () => makeRoomRow();
    memUpdateImpl = async (args) => makeRoomRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WorkspaceManagementService.updateRoom('mem-r1', { capacity: 25 });
    assert.ok(r);
    assert.equal(r!.capacity, 25);
  });

  it('deletes a room', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await WorkspaceManagementService.deleteRoom('mem-r1');
    assert.equal(ok, true);
  });

  it('activateRoom sets status to active', async () => {
    memFindUniqueImpl = async () => makeRoomRow();
    memUpdateImpl = async (args) => makeRoomRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WorkspaceManagementService.activateRoom('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('maintainRoom sets status to maintained', async () => {
    memFindUniqueImpl = async () => makeRoomRow();
    memUpdateImpl = async (args) => makeRoomRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WorkspaceManagementService.maintainRoom('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'maintained');
  });

  it('deactivateRoom sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeRoomRow();
    memUpdateImpl = async (args) => makeRoomRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await WorkspaceManagementService.deactivateRoom('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'inactive');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Layouts
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceManagementService — Layouts', () => {
  beforeEach(() => resetMock());

  it('creates a layout with defaults', async () => {
    memCreateImpl = async (args) => makeLayoutRow({ content: args.data.content as string });
    const l = await WorkspaceManagementService.createLayout('org-1', 'ws-1', {
      name: 'Zone Plan', type: 'zone',
    }, 'user-1');
    assert.equal(l.name, 'Zone Plan');
    assert.equal(l.status, 'draft');
    assert.equal(l.zones.length, 0);
  });

  it('creates a layout with full input', async () => {
    memCreateImpl = async (args) => makeLayoutRow({ content: args.data.content as string });
    const l = await WorkspaceManagementService.createLayout('org-1', 'ws-1', {
      name: 'Emergency Exit Plan', type: 'emergency', description: 'Emergency evacuation plan',
      status: 'active', floor: '2nd', zones: ['exit_a', 'exit_b', 'exit_c'],
      dimensions: '200x100', lastUpdated: '2028-01-01', notes: 'Updated annually',
    }, 'user-1');
    assert.equal(l.name, 'Emergency Exit Plan');
    assert.equal(l.type, 'emergency');
    assert.equal(l.zones.length, 3);
  });

  it('gets a layout by id', async () => {
    memFindUniqueImpl = async () => makeLayoutRow();
    const l = await WorkspaceManagementService.getLayout('mem-l1');
    assert.ok(l);
    assert.equal(l!.name, 'Floor 1 Plan');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLayoutRow({ type: 'workspace_desk' });
    const l = await WorkspaceManagementService.getLayout('mem-l1');
    assert.equal(l, null);
  });

  it('returns null when layout not found', async () => {
    memFindUniqueImpl = async () => null;
    const l = await WorkspaceManagementService.getLayout('nope');
    assert.equal(l, null);
  });

  it('lists layouts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'office_layout') return [makeLayoutRow()];
      return [];
    };
    const list = await WorkspaceManagementService.listLayouts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a layout', async () => {
    memFindUniqueImpl = async () => makeLayoutRow();
    memUpdateImpl = async (args) => makeLayoutRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await WorkspaceManagementService.updateLayout('mem-l1', { status: 'active' });
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('deletes a layout', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await WorkspaceManagementService.deleteLayout('mem-l1');
    assert.equal(ok, true);
  });

  it('activateLayout sets status to active', async () => {
    memFindUniqueImpl = async () => makeLayoutRow();
    memUpdateImpl = async (args) => makeLayoutRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await WorkspaceManagementService.activateLayout('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('archiveLayout sets status to archived', async () => {
    memFindUniqueImpl = async () => makeLayoutRow();
    memUpdateImpl = async (args) => makeLayoutRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await WorkspaceManagementService.archiveLayout('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'archived');
  });

  it('revisionLayout sets status to revision', async () => {
    memFindUniqueImpl = async () => makeLayoutRow();
    memUpdateImpl = async (args) => makeLayoutRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await WorkspaceManagementService.revisionLayout('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'revision');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Bookings
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceManagementService — Bookings', () => {
  beforeEach(() => resetMock());

  it('creates a booking with defaults', async () => {
    memCreateImpl = async (args) => makeBookingRow({ content: args.data.content as string });
    const b = await WorkspaceManagementService.createBooking('org-1', 'ws-1', {
      type: 'hourly',
    }, 'user-1');
    assert.equal(b.type, 'hourly');
    assert.equal(b.status, 'pending');
    assert.equal(b.bookedBy, '');
  });

  it('creates a booking with full input', async () => {
    memCreateImpl = async (args) => makeBookingRow({ content: args.data.content as string });
    const b = await WorkspaceManagementService.createBooking('org-1', 'ws-1', {
      deskId: 'mem-1', type: 'recurring', description: 'Weekly recurring booking',
      status: 'approved', bookedBy: 'Bob', department: 'Marketing',
      startDate: '2028-02-01', endDate: '2028-12-31',
      notes: 'Every Monday',
    }, 'user-1');
    assert.equal(b.type, 'recurring');
    assert.equal(b.bookedBy, 'Bob');
    assert.equal(b.department, 'Marketing');
  });

  it('gets a booking by id', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    const b = await WorkspaceManagementService.getBooking('mem-b1');
    assert.ok(b);
    assert.equal(b!.bookedBy, 'Alice');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeBookingRow({ type: 'workspace_desk' });
    const b = await WorkspaceManagementService.getBooking('mem-b1');
    assert.equal(b, null);
  });

  it('returns null when booking not found', async () => {
    memFindUniqueImpl = async () => null;
    const b = await WorkspaceManagementService.getBooking('nope');
    assert.equal(b, null);
  });

  it('lists bookings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'desk_booking') return [makeBookingRow()];
      return [];
    };
    const list = await WorkspaceManagementService.listBookings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a booking', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.updateBooking('mem-b1', { status: 'approved' });
    assert.ok(b);
    assert.equal(b!.status, 'approved');
  });

  it('deletes a booking', async () => {
    memDeleteImpl = async () => ({ id: 'mem-b1' });
    const ok = await WorkspaceManagementService.deleteBooking('mem-b1');
    assert.equal(ok, true);
  });

  it('approveBooking sets status to approved', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.approveBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'approved');
  });

  it('cancelBooking sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.cancelBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'cancelled');
  });

  it('checkInBooking sets status to checked_in', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.checkInBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'checked_in');
  });

  it('checkOutBooking sets status to checked_out', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.checkOutBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'checked_out');
  });

  it('noShowBooking sets status to no_show', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await WorkspaceManagementService.noShowBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'no_show');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkspaceManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getWorkspaceManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'workspace_desk') return [
        makeRow({ content: JSON.stringify({ name: 'D1', type: 'sitting', status: 'active', description: '', location: '', floor: '', zone: '', capacity: 1, equipment: [], notes: '' }) }),
        makeRow({ id: 'd2', content: JSON.stringify({ name: 'D2', type: 'standing', status: 'maintained', description: '', location: '', floor: '', zone: '', capacity: 1, equipment: [], notes: '' }) }),
      ];
      if (t === 'meeting_room') return [
        makeRoomRow({ content: JSON.stringify({ name: 'R1', type: 'conference', status: 'active', description: '', location: '', floor: '', capacity: 1, equipment: [], bookingRequired: true, hourlyRate: 0, notes: '' }) }),
      ];
      if (t === 'desk_booking') return [
        makeBookingRow({ content: JSON.stringify({ deskId: null, type: 'daily', status: 'pending', description: '', bookedBy: '', department: '', startDate: null, endDate: null, checkInDate: null, checkOutDate: null, notes: '' }) }),
        makeBookingRow({ id: 'b2', content: JSON.stringify({ deskId: null, type: 'daily', status: 'approved', description: '', bookedBy: '', department: '', startDate: null, endDate: null, checkInDate: null, checkOutDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await WorkspaceManagementService.getWorkspaceManagementMetrics('org-1');
    assert.equal(m.activeDesks, 1);
    assert.equal(m.availableRooms, 1);
    assert.equal(m.activeBookings, 1);
    assert.equal(m.pendingBookings, 1);
    assert.equal(m.maintainedDesks, 1);
  });

  it('getWorkspaceManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'workspace_desk') return [makeRow()];
      if (t === 'meeting_room') return [makeRoomRow()];
      if (t === 'office_layout') return [makeLayoutRow()];
      if (t === 'desk_booking') return [makeBookingRow()];
      return [];
    };
    const s = await WorkspaceManagementService.getWorkspaceManagementStats('org-1');
    assert.equal(s.deskCount, 1);
    assert.equal(s.roomCount, 1);
    assert.equal(s.layoutCount, 1);
    assert.equal(s.bookingCount, 1);
    assert.equal(s.byDeskType['sitting'], 1);
    assert.equal(s.byRoomType['conference'], 1);
    assert.equal(s.byLayoutType['floor_plan'], 1);
    assert.equal(s.byBookingStatus['pending'], 1);
  });
});
