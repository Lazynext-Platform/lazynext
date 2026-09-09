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
    type: 'housing_property',
    content: JSON.stringify({
      name: 'Downtown Loft',
      type: 'apartment',
      description: 'Modern downtown loft',
      status: 'available',
      address: '123 Main St',
      city: 'San Francisco',
      country: 'USA',
      bedrooms: 2,
      bathrooms: 2,
      size: 1200,
      furnished: true,
      amenities: ['wifi', 'parking', 'gym'],
      monthlyRate: 5000,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['housing_property', 'apartment', 'available']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeBookingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-b1',
    type: 'housing_booking',
    content: JSON.stringify({
      propertyId: 'mem-1',
      tenantId: 'mem-t1',
      tenantName: 'John Tenant',
      type: 'short_term',
      description: 'Short-term stay',
      status: 'requested',
      checkInDate: '2028-03-01',
      checkOutDate: '2028-03-15',
      rate: 5000,
      purpose: 'Business trip',
      notes: '',
    }),
    tags: JSON.stringify(['housing_booking', 'short_term', 'requested']),
    ...overrides,
  });
}

function makeMaintenanceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'housing_maintenance',
    content: JSON.stringify({
      propertyId: 'mem-1',
      type: 'repair',
      description: 'Fix leaking faucet',
      status: 'requested',
      priority: 'medium',
      requestedDate: '2028-02-01',
      scheduledDate: null,
      completedDate: null,
      assignedTo: 'Maintenance Team',
      cost: 200,
      notes: '',
    }),
    tags: JSON.stringify(['housing_maintenance', 'repair', 'requested']),
    ...overrides,
  });
}

function makeTenantRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'housing_tenant',
    content: JSON.stringify({
      name: 'John Tenant',
      type: 'employee',
      description: 'Senior engineer',
      status: 'pending',
      email: 'john@company.com',
      phone: '555-0100',
      employeeId: 'EMP-001',
      department: 'Engineering',
      preferences: ['quiet', 'near_office'],
      notes: '',
    }),
    tags: JSON.stringify(['housing_tenant', 'employee', 'pending']),
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

const { CorporateHousingService } = await import('@/lib/services/corporate-housing-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Properties
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateHousingService — Properties', () => {
  beforeEach(() => resetMock());

  it('creates a property with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CorporateHousingService.createProperty('org-1', 'ws-1', {
      name: 'Suburban House', type: 'house',
    }, 'user-1');
    assert.equal(p.name, 'Suburban House');
    assert.equal(p.status, 'available');
    assert.equal(p.bedrooms, 0);
    assert.equal(p.furnished, false);
  });

  it('creates a property with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CorporateHousingService.createProperty('org-1', 'ws-1', {
      name: 'Luxury Condo', type: 'condo', description: 'High-end condo',
      status: 'occupied', address: '456 Oak Ave', city: 'New York',
      country: 'USA', bedrooms: 3, bathrooms: 3, size: 2000,
      furnished: true, amenities: ['pool', 'concierge', 'doorman'],
      monthlyRate: 8000, notes: 'Premium property',
    }, 'user-1');
    assert.equal(p.name, 'Luxury Condo');
    assert.equal(p.type, 'condo');
    assert.equal(p.bedrooms, 3);
    assert.equal(p.monthlyRate, 8000);
    assert.equal(p.amenities.length, 3);
  });

  it('gets a property by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await CorporateHousingService.getProperty('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Downtown Loft');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'housing_booking' });
    const p = await CorporateHousingService.getProperty('mem-1');
    assert.equal(p, null);
  });

  it('returns null when property not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await CorporateHousingService.getProperty('nope');
    assert.equal(p, null);
  });

  it('lists properties by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_property') return [makeRow()];
      return [];
    };
    const list = await CorporateHousingService.listProperties('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Downtown Loft');
  });

  it('updates a property', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.updateProperty('mem-1', { status: 'occupied' });
    assert.ok(p);
    assert.equal(p!.status, 'occupied');
  });

  it('deletes a property', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CorporateHousingService.deleteProperty('mem-1');
    assert.equal(ok, true);
  });

  it('occupyProperty sets status to occupied', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.occupyProperty('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'occupied');
  });

  it('reserveProperty sets status to reserved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.reserveProperty('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'reserved');
  });

  it('startMaintenanceProperty sets status to under_maintenance', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.startMaintenanceProperty('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'under_maintenance');
  });

  it('startCleaningProperty sets status to cleaning', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.startCleaningProperty('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'cleaning');
  });

  it('offMarketProperty sets status to off_market', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CorporateHousingService.offMarketProperty('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'off_market');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Bookings
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateHousingService — Bookings', () => {
  beforeEach(() => resetMock());

  it('creates a booking with defaults', async () => {
    memCreateImpl = async (args) => makeBookingRow({ content: args.data.content as string });
    const b = await CorporateHousingService.createBooking('org-1', 'ws-1', {
      propertyId: 'mem-1', tenantName: 'Alice', type: 'short_term',
    }, 'user-1');
    assert.equal(b.propertyId, 'mem-1');
    assert.equal(b.tenantName, 'Alice');
    assert.equal(b.status, 'requested');
    assert.equal(b.rate, 0);
  });

  it('creates a booking with full input', async () => {
    memCreateImpl = async (args) => makeBookingRow({ content: args.data.content as string });
    const b = await CorporateHousingService.createBooking('org-1', 'ws-1', {
      propertyId: 'mem-1', tenantId: 'mem-t1', tenantName: 'Bob',
      type: 'long_term', description: 'Long-term relocation',
      status: 'approved', checkInDate: '2028-06-01', checkOutDate: '2028-12-01',
      rate: 6000, purpose: 'Relocation', notes: 'Furnished preferred',
    }, 'user-1');
    assert.equal(b.tenantName, 'Bob');
    assert.equal(b.type, 'long_term');
    assert.equal(b.rate, 6000);
    assert.equal(b.status, 'approved');
  });

  it('gets a booking by id', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    const b = await CorporateHousingService.getBooking('mem-b1');
    assert.ok(b);
    assert.equal(b!.tenantName, 'John Tenant');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeBookingRow({ type: 'housing_property' });
    const b = await CorporateHousingService.getBooking('mem-b1');
    assert.equal(b, null);
  });

  it('returns null when booking not found', async () => {
    memFindUniqueImpl = async () => null;
    const b = await CorporateHousingService.getBooking('nope');
    assert.equal(b, null);
  });

  it('lists bookings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_booking') return [makeBookingRow()];
      return [];
    };
    const list = await CorporateHousingService.listBookings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a booking', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.updateBooking('mem-b1', { status: 'approved' });
    assert.ok(b);
    assert.equal(b!.status, 'approved');
  });

  it('deletes a booking', async () => {
    memDeleteImpl = async () => ({ id: 'mem-b1' });
    const ok = await CorporateHousingService.deleteBooking('mem-b1');
    assert.equal(ok, true);
  });

  it('approveBooking sets status to approved', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.approveBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'approved');
  });

  it('activateBooking sets status to active', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.activateBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'active');
  });

  it('completeBooking sets status to completed', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.completeBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'completed');
  });

  it('cancelBooking sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.cancelBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'cancelled');
  });

  it('checkOutBooking sets status to checked_out', async () => {
    memFindUniqueImpl = async () => makeBookingRow();
    memUpdateImpl = async (args) => makeBookingRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await CorporateHousingService.checkOutBooking('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'checked_out');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Maintenance
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateHousingService — Maintenance', () => {
  beforeEach(() => resetMock());

  it('creates a maintenance request with defaults', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await CorporateHousingService.createMaintenance('org-1', 'ws-1', {
      propertyId: 'mem-1', type: 'routine',
    }, 'user-1');
    assert.equal(m.propertyId, 'mem-1');
    assert.equal(m.status, 'requested');
    assert.equal(m.priority, 'medium');
    assert.equal(m.cost, 0);
  });

  it('creates a maintenance request with full input', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await CorporateHousingService.createMaintenance('org-1', 'ws-1', {
      propertyId: 'mem-1', type: 'emergency', description: 'Burst pipe',
      status: 'in_progress', priority: 'high',
      requestedDate: '2028-05-01', scheduledDate: '2028-05-02',
      assignedTo: 'Plumber Co', cost: 1500, notes: 'Urgent repair',
    }, 'user-1');
    assert.equal(m.type, 'emergency');
    assert.equal(m.priority, 'high');
    assert.equal(m.cost, 1500);
    assert.equal(m.assignedTo, 'Plumber Co');
  });

  it('gets a maintenance request by id', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    const m = await CorporateHousingService.getMaintenance('mem-m1');
    assert.ok(m);
    assert.equal(m!.type, 'repair');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow({ type: 'housing_property' });
    const m = await CorporateHousingService.getMaintenance('mem-m1');
    assert.equal(m, null);
  });

  it('returns null when maintenance not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await CorporateHousingService.getMaintenance('nope');
    assert.equal(m, null);
  });

  it('lists maintenance requests by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_maintenance') return [makeMaintenanceRow()];
      return [];
    };
    const list = await CorporateHousingService.listMaintenance('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a maintenance request', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.updateMaintenance('mem-m1', { status: 'scheduled' });
    assert.ok(m);
    assert.equal(m!.status, 'scheduled');
  });

  it('deletes a maintenance request', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await CorporateHousingService.deleteMaintenance('mem-m1');
    assert.equal(ok, true);
  });

  it('scheduleMaintenance sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.scheduleMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'scheduled');
  });

  it('startMaintenance sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.startMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'in_progress');
  });

  it('completeMaintenance sets status to completed', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.completeMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'completed');
  });

  it('cancelMaintenance sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.cancelMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'cancelled');
  });

  it('overdueMaintenance sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CorporateHousingService.overdueMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'overdue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tenants
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateHousingService — Tenants', () => {
  beforeEach(() => resetMock());

  it('creates a tenant with defaults', async () => {
    memCreateImpl = async (args) => makeTenantRow({ content: args.data.content as string });
    const t = await CorporateHousingService.createTenant('org-1', 'ws-1', {
      name: 'Carol Tenant', type: 'executive',
    }, 'user-1');
    assert.equal(t.name, 'Carol Tenant');
    assert.equal(t.status, 'pending');
    assert.equal(t.email, '');
  });

  it('creates a tenant with full input', async () => {
    memCreateImpl = async (args) => makeTenantRow({ content: args.data.content as string });
    const t = await CorporateHousingService.createTenant('org-1', 'ws-1', {
      name: 'Dave Consultant', type: 'consultant', description: 'External consultant',
      status: 'active', email: 'dave@external.com', phone: '555-0500',
      employeeId: 'CON-001', department: 'Strategy',
      preferences: ['quiet', 'furnished'], notes: '6-month engagement',
    }, 'user-1');
    assert.equal(t.name, 'Dave Consultant');
    assert.equal(t.type, 'consultant');
    assert.equal(t.email, 'dave@external.com');
    assert.equal(t.preferences.length, 2);
  });

  it('gets a tenant by id', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    const t = await CorporateHousingService.getTenant('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'John Tenant');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTenantRow({ type: 'housing_property' });
    const t = await CorporateHousingService.getTenant('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when tenant not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await CorporateHousingService.getTenant('nope');
    assert.equal(t, null);
  });

  it('lists tenants by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_tenant') return [makeTenantRow()];
      return [];
    };
    const list = await CorporateHousingService.listTenants('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a tenant', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CorporateHousingService.updateTenant('mem-t1', { status: 'active' });
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('deletes a tenant', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await CorporateHousingService.deleteTenant('mem-t1');
    assert.equal(ok, true);
  });

  it('activateTenant sets status to active', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CorporateHousingService.activateTenant('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'active');
  });

  it('checkOutTenant sets status to checked_out', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CorporateHousingService.checkOutTenant('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'checked_out');
  });

  it('deactivateTenant sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeTenantRow();
    memUpdateImpl = async (args) => makeTenantRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await CorporateHousingService.deactivateTenant('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'inactive');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateHousingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCorporateHousingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_property') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'apartment', status: 'available', description: '', address: '', city: '', country: '', bedrooms: 0, bathrooms: 0, size: 0, furnished: false, amenities: [], monthlyRate: 0, notes: '' }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'apartment', status: 'occupied', description: '', address: '', city: '', country: '', bedrooms: 0, bathrooms: 0, size: 0, furnished: false, amenities: [], monthlyRate: 0, notes: '' }) }),
      ];
      if (t === 'housing_booking') return [
        makeBookingRow({ content: JSON.stringify({ propertyId: 'p1', tenantId: null, tenantName: 'B1', type: 'short_term', status: 'active', description: '', checkInDate: null, checkOutDate: null, rate: 0, purpose: '', notes: '' }) }),
      ];
      if (t === 'housing_maintenance') return [
        makeMaintenanceRow({ content: JSON.stringify({ propertyId: 'p1', type: 'repair', status: 'requested', description: '', priority: 'medium', requestedDate: null, scheduledDate: null, completedDate: null, assignedTo: '', cost: 0, notes: '' }) }),
      ];
      if (t === 'housing_tenant') return [
        makeTenantRow({ content: JSON.stringify({ name: 'T1', type: 'employee', status: 'active', description: '', email: '', phone: '', employeeId: '', department: '', preferences: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await CorporateHousingService.getCorporateHousingMetrics('org-1');
    assert.equal(m.availableProperties, 1);
    assert.equal(m.occupiedProperties, 1);
    assert.equal(m.activeBookings, 1);
    assert.equal(m.pendingMaintenance, 1);
    assert.equal(m.activeTenants, 1);
  });

  it('getCorporateHousingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'housing_property') return [makeRow()];
      if (t === 'housing_booking') return [makeBookingRow()];
      if (t === 'housing_maintenance') return [makeMaintenanceRow()];
      if (t === 'housing_tenant') return [makeTenantRow()];
      return [];
    };
    const s = await CorporateHousingService.getCorporateHousingStats('org-1');
    assert.equal(s.propertyCount, 1);
    assert.equal(s.bookingCount, 1);
    assert.equal(s.maintenanceCount, 1);
    assert.equal(s.tenantCount, 1);
    assert.equal(s.byPropertyType['apartment'], 1);
    assert.equal(s.byBookingStatus['requested'], 1);
    assert.equal(s.byMaintenanceType['repair'], 1);
    assert.equal(s.byTenantStatus['pending'], 1);
  });
});
