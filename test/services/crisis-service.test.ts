import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord { method: string; args?: unknown; }
const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
  },
};

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1', workspaceId: 'ws-1', organizationId: 'org-1', type: 'crisis_plan',
    content: JSON.stringify({
      name: 'Cyber Attack Response Plan', crisisType: 'cyber_attack', description: 'Response plan',
      severityThreshold: 'high', responseSteps: '1. Isolate 2. Assess', escalationMatrix: 'CTO -> CEO',
      communicationProtocol: 'Internal first', resourceList: 'IT, Legal, PR', recoverySteps: 'Restore from backup',
      status: 'draft', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '',
    }),
    source: 'user', sourceId: null, confidence: 1.0, owner: null, accessPolicy: null,
    lifecycle: 'permanent', expiresAt: null, tags: JSON.stringify(['crisis_plan', 'cyber_attack', 'draft']),
    relatedMemoryIds: null, verifiedBy: null, verifiedAt: null,
    createdBy: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { CrisisService } = await import('@/lib/services/crisis-service');

// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CrisisService.createPlan('org-1', 'ws-1', {
      name: 'Data Breach Plan', crisisType: 'data_breach',
    }, 'user-1');
    assert.equal(p.name, 'Data Breach Plan');
    assert.equal(p.status, 'draft');
    assert.equal(p.severityThreshold, 'medium');
    assert.equal(p.version, '1.0');
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CrisisService.createPlan('org-1', 'ws-1', {
      name: 'Full Plan', crisisType: 'natural_disaster', description: 'Comprehensive',
      severityThreshold: 'critical', responseSteps: 'Steps', escalationMatrix: 'Matrix',
      communicationProtocol: 'Protocol', resourceList: 'Resources', recoverySteps: 'Recovery',
      status: 'active', version: '2.0', lastReviewed: '2024-06-01',
    }, 'user-1');
    assert.equal(p.severityThreshold, 'critical');
    assert.equal(p.status, 'active');
    assert.equal(p.version, '2.0');
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await CrisisService.getPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.name, 'Cyber Attack Response Plan');
  });

  it('returns null for non-plan type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'other' });
    const p = await CrisisService.getPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await CrisisService.getPlan('nope');
    assert.equal(p, null);
  });

  it('lists plans', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'm2', content: JSON.stringify({ name: 'Second', crisisType: 'legal', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'approved', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '' }) })];
    const list = await CrisisService.listPlans('org-1');
    assert.equal(list.length, 2);
  });

  it('filters plans by crisisType', async () => {
    memFindManyImpl = async () => [
      makeRow({ content: JSON.stringify({ name: 'C', crisisType: 'cyber_attack', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'draft', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '' }) }),
      makeRow({ id: 'm2', content: JSON.stringify({ name: 'L', crisisType: 'legal', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'draft', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '' }) }),
    ];
    const list = await CrisisService.listPlans('org-1', { crisisType: 'legal' });
    assert.equal(list.length, 1);
    assert.equal(list[0].crisisType, 'legal');
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CrisisService.updatePlan('mem-1', { version: '2.0' });
    assert.ok(p);
    assert.equal(p!.version, '2.0');
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CrisisService.deletePlan('mem-1');
    assert.equal(ok, true);
  });

  it('approves a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ name: 'P', crisisType: 'cyber_attack', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'approved', approvedBy: 'user-1', approvedDate: '2024-06-01', version: '1.0', lastReviewed: '' }) });
    const p = await CrisisService.approvePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
    assert.equal(p!.approvedBy, 'user-1');
  });

  it('reviews a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ name: 'P', crisisType: 'cyber_attack', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'draft', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '2024-06-15' }) });
    const p = await CrisisService.reviewPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.ok(p!.lastReviewed);
  });
});

describe('CrisisService — Incidents', () => {
  beforeEach(() => resetMock());

  it('creates an incident with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_incident', content: args.data.content as string });
    const i = await CrisisService.createIncident('org-1', 'ws-1', {
      title: 'Server Outage', crisisType: 'operational', severity: 'high', reportedBy: 'IT Admin',
    }, 'user-1');
    assert.equal(i.title, 'Server Outage');
    assert.equal(i.status, 'reported');
    assert.equal(i.severity, 'high');
  });

  it('creates an incident with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_incident', content: args.data.content as string });
    const i = await CrisisService.createIncident('org-1', 'ws-1', {
      title: 'Breach', crisisType: 'data_breach', severity: 'critical', reportedBy: 'Sec Team',
      description: 'Customer data exposed', reportedDate: '2024-06-01',
      affectedSystems: 'DB, API', affectedDepartments: 'IT, Legal',
      impactAssessment: 'High', status: 'assessed', planId: 'plan-1',
      estimatedCost: 500000, estimatedDowntime: '48h',
    }, 'user-1');
    assert.equal(i.estimatedCost, 500000);
    assert.equal(i.status, 'assessed');
    assert.equal(i.planId, 'plan-1');
  });

  it('gets an incident by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'reported', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) });
    const i = await CrisisService.getIncident('mem-1');
    assert.ok(i);
  });

  it('lists incidents', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'reported', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) })];
    const list = await CrisisService.listIncidents('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an incident', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'reported', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'crisis_incident', content: args.data.content as string });
    const i = await CrisisService.updateIncident('mem-1', { severity: 'critical' });
    assert.ok(i);
    assert.equal(i!.severity, 'critical');
  });

  it('contains an incident', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'in_progress', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'contained', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) });
    const i = await CrisisService.containIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'contained');
  });

  it('resolves an incident with resolution', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'contained', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'resolved', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: 'Fixed', resolvedBy: 'user-1', resolvedAt: '2024-06-02',
    }) });
    const i = await CrisisService.resolveIncident('mem-1', 'Fixed', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'resolved');
    assert.equal(i!.resolution, 'Fixed');
  });

  it('closes an incident', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'resolved', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: 'Fixed', resolvedBy: 'user-1', resolvedAt: '2024-06-02',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'crisis_incident', content: JSON.stringify({
      title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01',
      affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'closed', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: 'Fixed', resolvedBy: 'user-1', resolvedAt: '2024-06-02',
    }) });
    const i = await CrisisService.closeIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'closed');
  });
});

describe('CrisisService — Contacts', () => {
  beforeEach(() => resetMock());

  it('creates a contact with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_contact', content: args.data.content as string });
    const c = await CrisisService.createContact('org-1', 'ws-1', {
      name: 'John Doe', role: 'crisis_manager',
    }, 'user-1');
    assert.equal(c.name, 'John Doe');
    assert.equal(c.role, 'crisis_manager');
    assert.equal(c.status, 'available');
  });

  it('creates a contact with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_contact', content: args.data.content as string });
    const c = await CrisisService.createContact('org-1', 'ws-1', {
      name: 'Jane', role: 'legal_counsel', department: 'Legal', phone: '555-0100',
      email: 'jane@legal.com', alternatePhone: '555-0200', status: 'standby', notes: 'After hours',
    }, 'user-1');
    assert.equal(c.department, 'Legal');
    assert.equal(c.status, 'standby');
  });

  it('gets a contact by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_contact', content: JSON.stringify({
      name: 'C', role: 'spokesperson', department: '', phone: '', email: '', alternatePhone: '', status: 'available', notes: '',
    }) });
    const c = await CrisisService.getContact('mem-1');
    assert.ok(c);
  });

  it('lists contacts', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'crisis_contact', content: JSON.stringify({
      name: 'C', role: 'spokesperson', department: '', phone: '', email: '', alternatePhone: '', status: 'available', notes: '',
    }) })];
    const list = await CrisisService.listContacts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a contact', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_contact', content: JSON.stringify({
      name: 'C', role: 'spokesperson', department: '', phone: '', email: '', alternatePhone: '', status: 'available', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'crisis_contact', content: args.data.content as string });
    const c = await CrisisService.updateContact('mem-1', { status: 'unavailable' });
    assert.ok(c);
    assert.equal(c!.status, 'unavailable');
  });

  it('deletes a contact', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CrisisService.deleteContact('mem-1');
    assert.equal(ok, true);
  });
});

describe('CrisisService — Drills', () => {
  beforeEach(() => resetMock());

  it('creates a drill with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_drill', content: args.data.content as string });
    const d = await CrisisService.createDrill('org-1', 'ws-1', {
      name: 'Annual Drill', type: 'full_scale', scheduledDate: '2024-09-01',
    }, 'user-1');
    assert.equal(d.name, 'Annual Drill');
    assert.equal(d.type, 'full_scale');
    assert.equal(d.status, 'scheduled');
  });

  it('creates a drill with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'crisis_drill', content: args.data.content as string });
    const d = await CrisisService.createDrill('org-1', 'ws-1', {
      name: 'Tabletop', type: 'tabletop', scheduledDate: '2024-08-01', planId: 'plan-1',
      duration: 120, participants: 'IT, HR, Legal', objectives: 'Test response', notes: 'Quarterly',
    }, 'user-1');
    assert.equal(d.planId, 'plan-1');
    assert.equal(d.duration, 120);
  });

  it('gets a drill by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'scheduled', results: '', notes: '',
    }) });
    const d = await CrisisService.getDrill('mem-1');
    assert.ok(d);
  });

  it('lists drills', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'scheduled', results: '', notes: '',
    }) })];
    const list = await CrisisService.listDrills('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a drill', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'scheduled', results: '', notes: '',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'crisis_drill', content: args.data.content as string });
    const d = await CrisisService.updateDrill('mem-1', { status: 'in_progress' });
    assert.ok(d);
    assert.equal(d!.status, 'in_progress');
  });

  it('completes a drill with results', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'in_progress', results: '', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'completed', results: 'Success', notes: '',
    }) });
    const d = await CrisisService.completeDrill('mem-1', 'Success', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'completed');
    assert.equal(d!.results, 'Success');
  });

  it('cancels a drill with reason', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'scheduled', results: '', notes: '',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'crisis_drill', content: JSON.stringify({
      planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'cancelled', results: '', notes: '[Cancelled by user-1: Scheduling conflict]',
    }) });
    const d = await CrisisService.cancelDrill('mem-1', 'Scheduling conflict', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'cancelled');
    assert.ok(d!.notes.includes('Cancelled'));
  });
});

describe('CrisisService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    const allRows = [
      makeRow({ type: 'crisis_incident', content: JSON.stringify({ title: 'I', crisisType: 'operational', severity: 'high', description: '', reportedBy: 'A', reportedDate: '2024-01-01', affectedSystems: '', affectedDepartments: '', impactAssessment: '', status: 'in_progress', planId: '', estimatedCost: 0, estimatedDowntime: '', resolution: '', resolvedBy: '', resolvedAt: '' }) }),
      makeRow({ id: 'm2', type: 'crisis_plan', content: JSON.stringify({ name: 'P', crisisType: 'operational', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'approved', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '' }) }),
      makeRow({ id: 'm3', type: 'crisis_drill', content: JSON.stringify({ planId: '', name: 'D', type: 'tabletop', scheduledDate: '2024-01-01', duration: 0, participants: '', objectives: '', status: 'completed', results: '', notes: '' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const m = await CrisisService.getCrisisMetrics('org-1');
    assert.equal(m.activeIncidents, 1);
    assert.equal(m.plansCoverage, 100);
    assert.equal(m.drillReadiness, 100);
  });

  it('returns stats with counts', async () => {
    const allRows = [
      makeRow({ type: 'crisis_plan', content: JSON.stringify({ name: 'P', crisisType: 'operational', description: '', severityThreshold: 'medium', responseSteps: '', escalationMatrix: '', communicationProtocol: '', resourceList: '', recoverySteps: '', status: 'approved', approvedBy: '', approvedDate: '', version: '1.0', lastReviewed: '' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const s = await CrisisService.getCrisisStats('org-1');
    assert.ok(s.planCount >= 0);
    assert.ok(typeof s.byCrisisType === 'object');
  });
});
