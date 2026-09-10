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

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'service_order',
    content: JSON.stringify({
      title: 'AC Repair Service',
      type: 'repair',
      description: 'Fix broken AC unit',
      customerId: null,
      customerName: 'John Smith',
      address: '123 Main St',
      contactPhone: '555-0100',
      contactEmail: 'john@example.com',
      priority: 'medium',
      status: 'new',
      scheduledDate: '2028-01-15',
      completedDate: null,
      estimatedDuration: 4,
      actualDuration: 0,
      cost: 250,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['service_order', 'repair', 'new', 'medium']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeTechnicianRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'technician',
    content: JSON.stringify({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '555-0200',
      skills: ['HVAC', 'Electrical'],
      certifications: ['EPA 608', 'OSHA 10'],
      status: 'available',
      zone: 'North',
      availability: 'Mon-Fri 9-5',
      rating: 4.5,
      completedJobs: 120,
      notes: '',
    }),
    tags: JSON.stringify(['technician', 'available', 'North']),
    ...overrides,
  });
}

function makeAssignmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'service_assignment',
    content: JSON.stringify({
      orderId: 'mem-1',
      technicianId: 'mem-t1',
      status: 'assigned',
      assignedDate: '2028-01-10',
      acceptedDate: null,
      startedDate: null,
      completedDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['service_assignment', 'assigned', 'mem-1', 'mem-t1']),
    ...overrides,
  });
}

function makeEquipmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'service_equipment',
    content: JSON.stringify({
      name: 'Diagnostic Toolkit',
      type: 'diagnostic',
      description: 'Multi-function diagnostic tool',
      status: 'available',
      serialNumber: 'DX-001',
      assignedTo: '',
      location: 'Warehouse A',
      purchaseDate: '2027-06-01',
      lastMaintenance: '2027-12-01',
      nextMaintenance: '2028-06-01',
      notes: '',
    }),
    tags: JSON.stringify(['service_equipment', 'diagnostic', 'available']),
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
}

const { FieldServiceService } = await import('@/lib/services/field-service-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Orders
// ─────────────────────────────────────────────────────────────────────────────

describe('FieldServiceService — Orders', () => {
  beforeEach(() => resetMock());

  it('creates an order with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const o = await FieldServiceService.createOrder('org-1', 'ws-1', {
      title: 'Install AC', type: 'installation',
    }, 'user-1');
    assert.equal(o.title, 'Install AC');
    assert.equal(o.status, 'new');
    assert.equal(o.priority, 'medium');
    assert.equal(o.cost, 0);
    assert.equal(o.estimatedDuration, 0);
  });

  it('creates an order with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const o = await FieldServiceService.createOrder('org-1', 'ws-1', {
      title: 'Emergency Repair', type: 'emergency', description: 'Urgent fix needed',
      customerId: 'cust-1', customerName: 'Jane Doe', address: '456 Oak Ave',
      contactPhone: '555-0300', contactEmail: 'jane@example.com',
      priority: 'urgent', status: 'assigned',
      scheduledDate: '2028-02-01',
      estimatedDuration: 8, actualDuration: 0, cost: 500, notes: 'High priority',
    }, 'user-1');
    assert.equal(o.title, 'Emergency Repair');
    assert.equal(o.type, 'emergency');
    assert.equal(o.customerName, 'Jane Doe');
    assert.equal(o.priority, 'urgent');
    assert.equal(o.status, 'assigned');
    assert.equal(o.cost, 500);
  });

  it('gets an order by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const o = await FieldServiceService.getOrder('mem-1');
    assert.ok(o);
    assert.equal(o!.id, 'mem-1');
    assert.equal(o!.title, 'AC Repair Service');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'technician' });
    const o = await FieldServiceService.getOrder('mem-1');
    assert.equal(o, null);
  });

  it('returns null when order not found', async () => {
    memFindUniqueImpl = async () => null;
    const o = await FieldServiceService.getOrder('nope');
    assert.equal(o, null);
  });

  it('lists orders by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'service_order') return [makeRow()];
      return [];
    };
    const list = await FieldServiceService.listOrders('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'AC Repair Service');
  });

  it('updates an order', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await FieldServiceService.updateOrder('mem-1', { status: 'completed' });
    assert.ok(o);
    assert.equal(o!.status, 'completed');
  });

  it('deletes an order', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await FieldServiceService.deleteOrder('mem-1');
    assert.equal(ok, true);
  });

  it('assignOrder sets status to assigned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await FieldServiceService.assignOrder('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'assigned');
  });

  it('scheduleOrder sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await FieldServiceService.scheduleOrder('mem-1', '2028-03-01', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'scheduled');
  });

  it('startOrder sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await FieldServiceService.startOrder('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'in_progress');
  });

  it('completeOrder sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const o = await FieldServiceService.completeOrder('mem-1', 'user-1');
    assert.ok(o);
    assert.equal(o!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Technicians
// ─────────────────────────────────────────────────────────────────────────────

describe('FieldServiceService — Technicians', () => {
  beforeEach(() => resetMock());

  it('creates a technician with defaults', async () => {
    memCreateImpl = async (args) => makeTechnicianRow({ content: args.data.content as string });
    const t = await FieldServiceService.createTechnician('org-1', 'ws-1', {
      name: 'Bob Smith',
    }, 'user-1');
    assert.equal(t.name, 'Bob Smith');
    assert.equal(t.status, 'available');
    assert.equal(t.rating, 0);
    assert.equal(t.completedJobs, 0);
    assert.equal(t.skills.length, 0);
  });

  it('creates a technician with full input', async () => {
    memCreateImpl = async (args) => makeTechnicianRow({ content: args.data.content as string });
    const t = await FieldServiceService.createTechnician('org-1', 'ws-1', {
      name: 'Carol Lee', email: 'carol@example.com', phone: '555-0400',
      skills: ['Plumbing', 'Electrical'], certifications: ['Master Plumber'],
      status: 'busy', zone: 'South', availability: 'Mon-Sat 8-6',
      rating: 4.8, completedJobs: 200, notes: 'Top performer',
    }, 'user-1');
    assert.equal(t.name, 'Carol Lee');
    assert.equal(t.email, 'carol@example.com');
    assert.equal(t.status, 'busy');
    assert.equal(t.zone, 'South');
    assert.equal(t.rating, 4.8);
    assert.equal(t.completedJobs, 200);
  });

  it('gets a technician by id', async () => {
    memFindUniqueImpl = async () => makeTechnicianRow();
    const t = await FieldServiceService.getTechnician('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'Alice Johnson');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTechnicianRow({ type: 'service_order' });
    const t = await FieldServiceService.getTechnician('mem-t1');
    assert.equal(t, null);
  });

  it('lists technicians by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'technician') return [makeTechnicianRow()];
      return [];
    };
    const list = await FieldServiceService.listTechnicians('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Alice Johnson');
  });

  it('updates a technician', async () => {
    memFindUniqueImpl = async () => makeTechnicianRow();
    memUpdateImpl = async (args) => makeTechnicianRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await FieldServiceService.updateTechnician('mem-t1', { status: 'off_duty' });
    assert.ok(t);
    assert.equal(t!.status, 'off_duty');
  });

  it('deletes a technician', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await FieldServiceService.deleteTechnician('mem-t1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assignments
// ─────────────────────────────────────────────────────────────────────────────

describe('FieldServiceService — Assignments', () => {
  beforeEach(() => resetMock());

  it('creates an assignment with defaults', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await FieldServiceService.createAssignment('org-1', 'ws-1', {
      orderId: 'mem-1', technicianId: 'mem-t1',
    }, 'user-1');
    assert.equal(a.orderId, 'mem-1');
    assert.equal(a.technicianId, 'mem-t1');
    assert.equal(a.status, 'assigned');
  });

  it('creates an assignment with full input', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await FieldServiceService.createAssignment('org-1', 'ws-1', {
      orderId: 'mem-1', technicianId: 'mem-t1', status: 'accepted',
      assignedDate: '2028-01-05', acceptedDate: '2028-01-06',
      notes: 'Confirmed by tech',
    }, 'user-1');
    assert.equal(a.status, 'accepted');
    assert.equal(a.notes, 'Confirmed by tech');
  });

  it('gets an assignment by id', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    const a = await FieldServiceService.getAssignment('mem-a1');
    assert.ok(a);
    assert.equal(a!.orderId, 'mem-1');
    assert.equal(a!.technicianId, 'mem-t1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow({ type: 'service_order' });
    const a = await FieldServiceService.getAssignment('mem-a1');
    assert.equal(a, null);
  });

  it('lists assignments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'service_assignment') return [makeAssignmentRow()];
      return [];
    };
    const list = await FieldServiceService.listAssignments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an assignment', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FieldServiceService.updateAssignment('mem-a1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an assignment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await FieldServiceService.deleteAssignment('mem-a1');
    assert.equal(ok, true);
  });

  it('acceptAssignment sets status to accepted', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FieldServiceService.acceptAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'accepted');
  });

  it('declineAssignment sets status to declined', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FieldServiceService.declineAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'declined');
  });

  it('startAssignment sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FieldServiceService.startAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeAssignment sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await FieldServiceService.completeAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Equipment
// ─────────────────────────────────────────────────────────────────────────────

describe('FieldServiceService — Equipment', () => {
  beforeEach(() => resetMock());

  it('creates equipment with defaults', async () => {
    memCreateImpl = async (args) => makeEquipmentRow({ content: args.data.content as string });
    const e = await FieldServiceService.createEquipment('org-1', 'ws-1', {
      name: 'Drill', type: 'tool',
    }, 'user-1');
    assert.equal(e.name, 'Drill');
    assert.equal(e.type, 'tool');
    assert.equal(e.status, 'available');
  });

  it('creates equipment with full input', async () => {
    memCreateImpl = async (args) => makeEquipmentRow({ content: args.data.content as string });
    const e = await FieldServiceService.createEquipment('org-1', 'ws-1', {
      name: 'Service Van', type: 'vehicle', description: 'Ford Transit',
      status: 'in_use', serialNumber: 'VN-100', assignedTo: 'mem-t1',
      location: 'Depot B', purchaseDate: '2027-01-15',
      lastMaintenance: '2027-10-01', nextMaintenance: '2028-04-01',
      notes: 'Needs oil change soon',
    }, 'user-1');
    assert.equal(e.name, 'Service Van');
    assert.equal(e.type, 'vehicle');
    assert.equal(e.status, 'in_use');
    assert.equal(e.serialNumber, 'VN-100');
    assert.equal(e.assignedTo, 'mem-t1');
  });

  it('gets equipment by id', async () => {
    memFindUniqueImpl = async () => makeEquipmentRow();
    const e = await FieldServiceService.getEquipment('mem-e1');
    assert.ok(e);
    assert.equal(e!.name, 'Diagnostic Toolkit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeEquipmentRow({ type: 'service_order' });
    const e = await FieldServiceService.getEquipment('mem-e1');
    assert.equal(e, null);
  });

  it('lists equipment by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'service_equipment') return [makeEquipmentRow()];
      return [];
    };
    const list = await FieldServiceService.listEquipment('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Diagnostic Toolkit');
  });

  it('updates equipment', async () => {
    memFindUniqueImpl = async () => makeEquipmentRow();
    memUpdateImpl = async (args) => makeEquipmentRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await FieldServiceService.updateEquipment('mem-e1', { status: 'in_use' });
    assert.ok(e);
    assert.equal(e!.status, 'in_use');
  });

  it('deletes equipment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await FieldServiceService.deleteEquipment('mem-e1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('FieldServiceService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getFieldServiceMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'service_order') return [
        makeRow({ content: JSON.stringify({ title: 'O1', type: 'repair', status: 'new', priority: 'medium', description: '', customerId: null, customerName: '', address: '', contactPhone: '', contactEmail: '', scheduledDate: null, completedDate: null, estimatedDuration: 0, actualDuration: 0, cost: 0, notes: '' }) }),
        makeRow({ id: 'o2', content: JSON.stringify({ title: 'O2', type: 'repair', status: 'completed', priority: 'low', description: '', customerId: null, customerName: '', address: '', contactPhone: '', contactEmail: '', scheduledDate: null, completedDate: '2028-01-20', estimatedDuration: 0, actualDuration: 0, cost: 0, notes: '' }) }),
        makeRow({ id: 'o3', content: JSON.stringify({ title: 'O3', type: 'repair', status: 'in_progress', priority: 'high', description: '', customerId: null, customerName: '', address: '', contactPhone: '', contactEmail: '', scheduledDate: null, completedDate: null, estimatedDuration: 0, actualDuration: 0, cost: 0, notes: '' }) }),
      ];
      if (t === 'technician') return [
        makeTechnicianRow({ content: JSON.stringify({ name: 'T1', email: '', phone: '', skills: [], certifications: [], status: 'available', zone: '', availability: '', rating: 0, completedJobs: 0, notes: '' }) }),
        makeTechnicianRow({ id: 't2', content: JSON.stringify({ name: 'T2', email: '', phone: '', skills: [], certifications: [], status: 'busy', zone: '', availability: '', rating: 0, completedJobs: 0, notes: '' }) }),
      ];
      if (t === 'service_assignment') return [
        makeAssignmentRow({ content: JSON.stringify({ orderId: 'mem-1', technicianId: 'mem-t1', status: 'assigned', assignedDate: null, acceptedDate: null, startedDate: null, completedDate: null, notes: '' }) }),
        makeAssignmentRow({ id: 'a2', content: JSON.stringify({ orderId: 'mem-1', technicianId: 'mem-t1', status: 'completed', assignedDate: null, acceptedDate: null, startedDate: null, completedDate: '2028-01-20', notes: '' }) }),
      ];
      if (t === 'service_equipment') return [
        makeEquipmentRow({ content: JSON.stringify({ name: 'E1', type: 'tool', status: 'in_use', description: '', serialNumber: '', assignedTo: '', location: '', purchaseDate: null, lastMaintenance: null, nextMaintenance: null, notes: '' }) }),
        makeEquipmentRow({ id: 'e2', content: JSON.stringify({ name: 'E2', type: 'tool', status: 'available', description: '', serialNumber: '', assignedTo: '', location: '', purchaseDate: null, lastMaintenance: null, nextMaintenance: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await FieldServiceService.getFieldServiceMetrics('org-1');
    assert.equal(m.openOrders, 2);
    assert.equal(m.completedOrders, 1);
    assert.equal(m.availableTechnicians, 1);
    assert.equal(m.activeAssignments, 1);
    assert.equal(m.equipmentUtilization, 50);
  });

  it('getFieldServiceStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'service_order') return [makeRow()];
      if (t === 'technician') return [makeTechnicianRow()];
      if (t === 'service_assignment') return [makeAssignmentRow()];
      if (t === 'service_equipment') return [makeEquipmentRow()];
      return [];
    };
    const s = await FieldServiceService.getFieldServiceStats('org-1');
    assert.equal(s.orderCount, 1);
    assert.equal(s.technicianCount, 1);
    assert.equal(s.assignmentCount, 1);
    assert.equal(s.equipmentCount, 1);
    assert.equal(s.byOrderType['repair'], 1);
    assert.equal(s.byOrderStatus['new'], 1);
    assert.equal(s.byOrderPriority['medium'], 1);
    assert.equal(s.byTechnicianStatus['available'], 1);
    assert.equal(s.byAssignmentStatus['assigned'], 1);
    assert.equal(s.byEquipmentType['diagnostic'], 1);
    assert.equal(s.byEquipmentStatus['available'], 1);
  });
});
