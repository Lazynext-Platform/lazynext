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
    type: 'emergency_plan',
    content: JSON.stringify({
      name: 'Fire Emergency Plan',
      type: 'fire',
      description: 'Standard fire emergency plan',
      status: 'draft',
      scenario: 'Building fire',
      severity: 'high',
      responseTime: '5 min',
      responsiblePerson: 'Safety Officer',
      location: 'Main Building',
      lastReviewed: null,
      nextReview: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['emergency_plan', 'fire', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeDrillRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'emergency_drill',
    content: JSON.stringify({
      name: 'Fire Evacuation Drill',
      type: 'fire_evacuation',
      description: 'Annual fire evacuation drill',
      status: 'scheduled',
      planId: 'mem-1',
      drillDate: '2028-01-01',
      duration: 30,
      participants: 100,
      observer: 'Safety Team',
      results: '',
      improvements: '',
      notes: '',
    }),
    tags: JSON.stringify(['emergency_drill', 'fire_evacuation', 'scheduled']),
    ...overrides,
  });
}

function makeRouteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'evacuation_route',
    content: JSON.stringify({
      name: 'Main Exit Route',
      type: 'primary',
      description: 'Primary evacuation route',
      status: 'active',
      location: 'Main Building',
      capacity: 500,
      distance: 100,
      assemblyPoint: 'Parking Lot A',
      routeMap: '',
      notes: '',
    }),
    tags: JSON.stringify(['evacuation_route', 'primary', 'active']),
    ...overrides,
  });
}

function makeContactRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'emergency_contact',
    content: JSON.stringify({
      name: 'Fire Department',
      type: 'fire',
      description: 'Local fire department',
      status: 'active',
      contactName: 'Fire Chief',
      role: 'First Responder',
      phone: '911',
      email: 'fire@city.gov',
      address: '100 Fire St',
      availability: '24/7',
      priority: 1,
      notes: '',
    }),
    tags: JSON.stringify(['emergency_contact', 'fire', 'active']),
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

const { EmergencyResponseService } = await import('@/lib/services/emergency-response-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emergency Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('EmergencyResponseService — Emergency Plans', () => {
  beforeEach(() => resetMock());

  it('creates an emergency plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await EmergencyResponseService.createEmergencyPlan('org-1', 'ws-1', {
      name: 'Earthquake Plan', type: 'earthquake',
    }, 'user-1');
    assert.equal(p.name, 'Earthquake Plan');
    assert.equal(p.status, 'draft');
    assert.equal(p.severity, '');
  });

  it('creates an emergency plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await EmergencyResponseService.createEmergencyPlan('org-1', 'ws-1', {
      name: 'Flood Response', type: 'flood', description: 'Flood emergency plan',
      status: 'active', scenario: 'River flood', severity: 'critical',
      responseTime: '10 min', responsiblePerson: 'Ops Manager',
      location: 'Riverside', lastReviewed: '2028-01-01', nextReview: '2028-06-01',
      notes: 'Review annually',
    }, 'user-1');
    assert.equal(p.name, 'Flood Response');
    assert.equal(p.type, 'flood');
    assert.equal(p.severity, 'critical');
    assert.equal(p.responseTime, '10 min');
  });

  it('gets an emergency plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await EmergencyResponseService.getEmergencyPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Fire Emergency Plan');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'emergency_drill' });
    const p = await EmergencyResponseService.getEmergencyPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when emergency plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await EmergencyResponseService.getEmergencyPlan('nope');
    assert.equal(p, null);
  });

  it('lists emergency plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emergency_plan') return [makeRow()];
      return [];
    };
    const list = await EmergencyResponseService.listEmergencyPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Fire Emergency Plan');
  });

  it('updates an emergency plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EmergencyResponseService.updateEmergencyPlan('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes an emergency plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EmergencyResponseService.deleteEmergencyPlan('mem-1');
    assert.equal(ok, true);
  });

  it('activateEmergencyPlan sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EmergencyResponseService.activateEmergencyPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('testEmergencyPlan sets status to tested', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EmergencyResponseService.testEmergencyPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'tested');
  });

  it('deprecateEmergencyPlan sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EmergencyResponseService.deprecateEmergencyPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'deprecated');
  });

  it('archiveEmergencyPlan sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EmergencyResponseService.archiveEmergencyPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emergency Drills
// ─────────────────────────────────────────────────────────────────────────────

describe('EmergencyResponseService — Emergency Drills', () => {
  beforeEach(() => resetMock());

  it('creates an emergency drill with defaults', async () => {
    memCreateImpl = async (args) => makeDrillRow({ content: args.data.content as string });
    const d = await EmergencyResponseService.createEmergencyDrill('org-1', 'ws-1', {
      name: 'Lockdown Drill', type: 'lockdown',
    }, 'user-1');
    assert.equal(d.name, 'Lockdown Drill');
    assert.equal(d.status, 'scheduled');
    assert.equal(d.duration, 0);
  });

  it('creates an emergency drill with full input', async () => {
    memCreateImpl = async (args) => makeDrillRow({ content: args.data.content as string });
    const d = await EmergencyResponseService.createEmergencyDrill('org-1', 'ws-1', {
      name: 'Chemical Spill Drill', type: 'chemical_spill', description: 'Chemical spill response',
      status: 'in_progress', planId: 'mem-1', drillDate: '2028-03-01',
      duration: 45, participants: 50, observer: 'HazMat Team',
      results: 'Successful', improvements: 'Faster response', notes: 'Annual drill',
    }, 'user-1');
    assert.equal(d.name, 'Chemical Spill Drill');
    assert.equal(d.type, 'chemical_spill');
    assert.equal(d.duration, 45);
    assert.equal(d.participants, 50);
  });

  it('gets an emergency drill by id', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    const d = await EmergencyResponseService.getEmergencyDrill('mem-d1');
    assert.ok(d);
    assert.equal(d!.name, 'Fire Evacuation Drill');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDrillRow({ type: 'emergency_plan' });
    const d = await EmergencyResponseService.getEmergencyDrill('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when emergency drill not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await EmergencyResponseService.getEmergencyDrill('nope');
    assert.equal(d, null);
  });

  it('lists emergency drills by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emergency_drill') return [makeDrillRow()];
      return [];
    };
    const list = await EmergencyResponseService.listEmergencyDrills('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an emergency drill', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.updateEmergencyDrill('mem-d1', { status: 'completed' });
    assert.ok(d);
    assert.equal(d!.status, 'completed');
  });

  it('deletes an emergency drill', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await EmergencyResponseService.deleteEmergencyDrill('mem-d1');
    assert.equal(ok, true);
  });

  it('scheduleEmergencyDrill sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.scheduleEmergencyDrill('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'scheduled');
  });

  it('startEmergencyDrill sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.startEmergencyDrill('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'in_progress');
  });

  it('completeEmergencyDrill sets status to completed', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.completeEmergencyDrill('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'completed');
  });

  it('cancelEmergencyDrill sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.cancelEmergencyDrill('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'cancelled');
  });

  it('failEmergencyDrill sets status to failed', async () => {
    memFindUniqueImpl = async () => makeDrillRow();
    memUpdateImpl = async (args) => makeDrillRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await EmergencyResponseService.failEmergencyDrill('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Evacuation Routes
// ─────────────────────────────────────────────────────────────────────────────

describe('EmergencyResponseService — Evacuation Routes', () => {
  beforeEach(() => resetMock());

  it('creates an evacuation route with defaults', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await EmergencyResponseService.createEvacuationRoute('org-1', 'ws-1', {
      name: 'Secondary Exit', type: 'secondary',
    }, 'user-1');
    assert.equal(r.name, 'Secondary Exit');
    assert.equal(r.status, 'active');
    assert.equal(r.capacity, 0);
  });

  it('creates an evacuation route with full input', async () => {
    memCreateImpl = async (args) => makeRouteRow({ content: args.data.content as string });
    const r = await EmergencyResponseService.createEvacuationRoute('org-1', 'ws-1', {
      name: 'Accessible Route', type: 'accessible', description: 'ADA accessible route',
      status: 'active', location: 'East Wing', capacity: 200, distance: 50,
      assemblyPoint: 'Garden Area', routeMap: 'map-v2', notes: 'For mobility impaired',
    }, 'user-1');
    assert.equal(r.name, 'Accessible Route');
    assert.equal(r.type, 'accessible');
    assert.equal(r.capacity, 200);
    assert.equal(r.distance, 50);
  });

  it('gets an evacuation route by id', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    const r = await EmergencyResponseService.getEvacuationRoute('mem-r1');
    assert.ok(r);
    assert.equal(r!.name, 'Main Exit Route');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRouteRow({ type: 'emergency_plan' });
    const r = await EmergencyResponseService.getEvacuationRoute('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when evacuation route not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await EmergencyResponseService.getEvacuationRoute('nope');
    assert.equal(r, null);
  });

  it('lists evacuation routes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'evacuation_route') return [makeRouteRow()];
      return [];
    };
    const list = await EmergencyResponseService.listEvacuationRoutes('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an evacuation route', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmergencyResponseService.updateEvacuationRoute('mem-r1', { status: 'blocked' });
    assert.ok(r);
    assert.equal(r!.status, 'blocked');
  });

  it('deletes an evacuation route', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await EmergencyResponseService.deleteEvacuationRoute('mem-r1');
    assert.equal(ok, true);
  });

  it('activateEvacuationRoute sets status to active', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmergencyResponseService.activateEvacuationRoute('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('blockEvacuationRoute sets status to blocked', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmergencyResponseService.blockEvacuationRoute('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'blocked');
  });

  it('maintainEvacuationRoute sets status to under_maintenance', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmergencyResponseService.maintainEvacuationRoute('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'under_maintenance');
  });

  it('deprecateEvacuationRoute sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRouteRow();
    memUpdateImpl = async (args) => makeRouteRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EmergencyResponseService.deprecateEvacuationRoute('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emergency Contacts
// ─────────────────────────────────────────────────────────────────────────────

describe('EmergencyResponseService — Emergency Contacts', () => {
  beforeEach(() => resetMock());

  it('creates an emergency contact with defaults', async () => {
    memCreateImpl = async (args) => makeContactRow({ content: args.data.content as string });
    const c = await EmergencyResponseService.createEmergencyContact('org-1', 'ws-1', {
      name: 'Police', type: 'police',
    }, 'user-1');
    assert.equal(c.name, 'Police');
    assert.equal(c.status, 'active');
    assert.equal(c.priority, 0);
  });

  it('creates an emergency contact with full input', async () => {
    memCreateImpl = async (args) => makeContactRow({ content: args.data.content as string });
    const c = await EmergencyResponseService.createEmergencyContact('org-1', 'ws-1', {
      name: 'Medical Team', type: 'medical', description: 'On-site medical team',
      status: 'active', contactName: 'Dr. Smith', role: 'Medical Officer',
      phone: '555-0100', email: 'smith@medical.com', address: '200 Medical Way',
      availability: 'Business hours', priority: 2, notes: 'Primary medical contact',
    }, 'user-1');
    assert.equal(c.name, 'Medical Team');
    assert.equal(c.type, 'medical');
    assert.equal(c.priority, 2);
    assert.equal(c.contactName, 'Dr. Smith');
  });

  it('gets an emergency contact by id', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    const c = await EmergencyResponseService.getEmergencyContact('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Fire Department');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeContactRow({ type: 'emergency_plan' });
    const c = await EmergencyResponseService.getEmergencyContact('mem-c1');
    assert.equal(c, null);
  });

  it('returns null when emergency contact not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await EmergencyResponseService.getEmergencyContact('nope');
    assert.equal(c, null);
  });

  it('lists emergency contacts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emergency_contact') return [makeContactRow()];
      return [];
    };
    const list = await EmergencyResponseService.listEmergencyContacts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an emergency contact', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    memUpdateImpl = async (args) => makeContactRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmergencyResponseService.updateEmergencyContact('mem-c1', { priority: 3 });
    assert.ok(c);
    assert.equal(c!.priority, 3);
  });

  it('deletes an emergency contact', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await EmergencyResponseService.deleteEmergencyContact('mem-c1');
    assert.equal(ok, true);
  });

  it('activateEmergencyContact sets status to active', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    memUpdateImpl = async (args) => makeContactRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmergencyResponseService.activateEmergencyContact('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'active');
  });

  it('deactivateEmergencyContact sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    memUpdateImpl = async (args) => makeContactRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmergencyResponseService.deactivateEmergencyContact('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'inactive');
  });

  it('markBackupEmergencyContact sets status to backup', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    memUpdateImpl = async (args) => makeContactRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmergencyResponseService.markBackupEmergencyContact('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'backup');
  });

  it('markUnreachableEmergencyContact sets status to unreachable', async () => {
    memFindUniqueImpl = async () => makeContactRow();
    memUpdateImpl = async (args) => makeContactRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await EmergencyResponseService.markUnreachableEmergencyContact('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'unreachable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EmergencyResponseService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getEmergencyResponseMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emergency_plan') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'fire', status: 'active', description: '', scenario: '', severity: '', responseTime: '', responsiblePerson: '', location: '', lastReviewed: null, nextReview: null, notes: '' }) }),
      ];
      if (t === 'emergency_drill') return [
        makeDrillRow({ content: JSON.stringify({ name: 'D1', type: 'fire_evacuation', status: 'scheduled', description: '', planId: null, drillDate: null, duration: 0, participants: 0, observer: '', results: '', improvements: '', notes: '' }) }),
        makeDrillRow({ id: 'd2', content: JSON.stringify({ name: 'D2', type: 'fire_evacuation', status: 'completed', description: '', planId: null, drillDate: null, duration: 0, participants: 0, observer: '', results: '', improvements: '', notes: '' }) }),
      ];
      if (t === 'evacuation_route') return [
        makeRouteRow({ content: JSON.stringify({ name: 'R1', type: 'primary', status: 'active', description: '', location: '', capacity: 0, distance: 0, assemblyPoint: '', routeMap: '', notes: '' }) }),
      ];
      if (t === 'emergency_contact') return [
        makeContactRow({ content: JSON.stringify({ name: 'C1', type: 'fire', status: 'active', description: '', contactName: '', role: '', phone: '', email: '', address: '', availability: '', priority: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await EmergencyResponseService.getEmergencyResponseMetrics('org-1');
    assert.equal(m.activePlans, 1);
    assert.equal(m.scheduledDrills, 1);
    assert.equal(m.activeRoutes, 1);
    assert.equal(m.activeContacts, 1);
    assert.equal(m.completedDrills, 1);
  });

  it('getEmergencyResponseStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emergency_plan') return [makeRow()];
      if (t === 'emergency_drill') return [makeDrillRow()];
      if (t === 'evacuation_route') return [makeRouteRow()];
      if (t === 'emergency_contact') return [makeContactRow()];
      return [];
    };
    const s = await EmergencyResponseService.getEmergencyResponseStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.drillCount, 1);
    assert.equal(s.routeCount, 1);
    assert.equal(s.contactCount, 1);
    assert.equal(s.byPlanType['fire'], 1);
    assert.equal(s.byDrillType['fire_evacuation'], 1);
    assert.equal(s.byRouteType['primary'], 1);
    assert.equal(s.byContactType['fire'], 1);
  });
});
