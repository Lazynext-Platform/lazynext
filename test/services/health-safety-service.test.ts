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
    type: 'hs_incident',
    content: JSON.stringify({ title: 'Test', description: '', type: 'injury', severity: 'minor', location: '', occurredAt: '2024-01-01', reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'reported', resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['hs_incident', 'injury', 'minor', 'reported']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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

const { HealthSafetyService } = await import('@/lib/services/health-safety-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('HealthSafetyService', () => {
  beforeEach(() => { resetMock(); });

  // ── Incidents ──

  describe('createIncident', () => {
    it('creates an incident with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_incident', content: args.data.content as string });
      const inc = await HealthSafetyService.createIncident('org-1', 'ws-1', { title: 'Slip', type: 'injury', severity: 'minor', occurredAt: '2024-05-01' }, 'user-1');
      assert.equal(inc.title, 'Slip');
      assert.equal(inc.type, 'injury');
      assert.equal(inc.severity, 'minor');
      assert.equal(inc.status, 'reported');
      assert.equal(inc.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_incident', content: args.data.content as string });
      const inc = await HealthSafetyService.createIncident('org-1', 'ws-1', {
        title: 'Fall', description: 'd', type: 'injury', severity: 'serious', location: 'Warehouse', occurredAt: '2024-05-01',
        reportedBy: 'alice', involvedPersons: ['bob'], rootCause: 'wet floor', correctiveActions: ['add sign'], status: 'investigating',
      }, 'user-1');
      assert.equal(inc.severity, 'serious');
      assert.equal(inc.location, 'Warehouse');
      assert.equal(inc.reportedBy, 'alice');
      assert.equal(inc.involvedPersons.length, 1);
      assert.equal(inc.status, 'investigating');
    });
  });

  describe('getIncident', () => {
    it('returns an incident when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      const inc = await HealthSafetyService.getIncident('mem-1');
      assert.ok(inc);
      assert.equal(inc!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const inc = await HealthSafetyService.getIncident('nope');
      assert.equal(inc, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_inspection' });
      const inc = await HealthSafetyService.getIncident('mem-1');
      assert.equal(inc, null);
    });
  });

  describe('listIncidents', () => {
    it('lists incidents', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'i1' }), makeRow({ id: 'i2' })];
      const list = await HealthSafetyService.listIncidents('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type, severity, status, location', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'i1', content: JSON.stringify({ title: 'A', description: '', type: 'injury', severity: 'minor', location: 'Warehouse', occurredAt: '2024-01-01', reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'reported', resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ title: 'B', description: '', type: 'near_miss', severity: 'serious', location: 'Office', occurredAt: '2024-01-02', reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'closed', resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null }) }),
      ];
      const list = await HealthSafetyService.listIncidents('org-1', { type: 'injury', severity: 'minor', status: 'reported', location: 'Warehouse' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateIncident', () => {
    it('updates incident fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_incident', content: args.data.content as string });
      const inc = await HealthSafetyService.updateIncident('mem-1', { title: 'Updated', status: 'closed' });
      assert.ok(inc);
      assert.equal(inc!.title, 'Updated');
      assert.equal(inc!.status, 'closed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const inc = await HealthSafetyService.updateIncident('nope', { title: 'X' });
      assert.equal(inc, null);
    });
  });

  describe('investigateIncident', () => {
    it('investigates an incident', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_incident', content: args.data.content as string });
      const inc = await HealthSafetyService.investigateIncident('mem-1', 'wet floor', ['add sign'], 'alice');
      assert.ok(inc);
      assert.equal(inc!.status, 'investigating');
      assert.equal(inc!.rootCause, 'wet floor');
      assert.equal(inc!.investigatedBy, 'alice');
      assert.ok(inc!.investigatedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const inc = await HealthSafetyService.investigateIncident('nope', 'r', [], 'u');
      assert.equal(inc, null);
    });
  });

  describe('closeIncident', () => {
    it('closes an incident', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_incident', content: args.data.content as string });
      const inc = await HealthSafetyService.closeIncident('mem-1', 'resolved', 'bob');
      assert.ok(inc);
      assert.equal(inc!.status, 'closed');
      assert.equal(inc!.resolution, 'resolved');
      assert.equal(inc!.closedBy, 'bob');
      assert.ok(inc!.closedAt);
    });
  });

  // ── Inspections ──

  describe('createInspection', () => {
    it('creates an inspection with computed stats', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_inspection', content: args.data.content as string });
      const insp = await HealthSafetyService.createInspection('org-1', 'ws-1', {
        title: 'Fire', area: 'Building A', inspector: 'alice', date: '2024-05-01',
        items: [{ name: 'Extinguisher', status: 'pass' }, { name: 'Alarm', status: 'fail' }, { name: 'Sign', status: 'na' }],
      }, 'user-1');
      assert.equal(insp.title, 'Fire');
      assert.equal(insp.area, 'Building A');
      assert.equal(insp.status, 'scheduled');
      assert.equal(insp.passedCount, 1);
      assert.equal(insp.failedCount, 1);
      assert.equal(insp.naCount, 1);
      assert.equal(insp.totalCount, 3);
      assert.equal(insp.passRate, 50);
    });
  });

  describe('getInspection', () => {
    it('returns an inspection when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_inspection', content: JSON.stringify({ title: 'T', area: '', inspector: '', date: '', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '' }) });
      const insp = await HealthSafetyService.getInspection('mem-1');
      assert.ok(insp);
      assert.equal(insp!.title, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      const insp = await HealthSafetyService.getInspection('mem-1');
      assert.equal(insp, null);
    });
  });

  describe('listInspections', () => {
    it('lists inspections and filters by area, status, inspector', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'hs_inspection', content: JSON.stringify({ title: 'A', area: 'Building A', inspector: 'alice', date: '2024-05-01', items: [], status: 'completed', passRate: 100, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '' }) }),
        makeRow({ id: 's2', type: 'hs_inspection', content: JSON.stringify({ title: 'B', area: 'Building B', inspector: 'bob', date: '2024-05-02', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '' }) }),
      ];
      const list = await HealthSafetyService.listInspections('org-1', { area: 'Building A', status: 'completed', inspector: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateInspection', () => {
    it('updates inspection fields and recomputes stats', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_inspection', content: JSON.stringify({ title: 'Old', area: 'A', inspector: 'a', date: '2024-05-01', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_inspection', content: args.data.content as string });
      const insp = await HealthSafetyService.updateInspection('mem-1', { title: 'New', items: [{ name: 'X', status: 'pass' }, { name: 'Y', status: 'fail' }] });
      assert.ok(insp);
      assert.equal(insp!.title, 'New');
      assert.equal(insp!.passedCount, 1);
      assert.equal(insp!.failedCount, 1);
      assert.equal(insp!.passRate, 50);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const insp = await HealthSafetyService.updateInspection('nope', { title: 'X' });
      assert.equal(insp, null);
    });
  });

  describe('completeInspection', () => {
    it('completes an inspection with no failures', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_inspection', content: JSON.stringify({ title: 'T', area: '', inspector: '', date: '', items: [], status: 'in_progress', passRate: 100, passedCount: 2, failedCount: 0, naCount: 0, totalCount: 2, results: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_inspection', content: args.data.content as string });
      const insp = await HealthSafetyService.completeInspection('mem-1', 'All good');
      assert.ok(insp);
      assert.equal(insp!.status, 'completed');
      assert.equal(insp!.results, 'All good');
    });

    it('fails an inspection with failures', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_inspection', content: JSON.stringify({ title: 'T', area: '', inspector: '', date: '', items: [], status: 'in_progress', passRate: 50, passedCount: 1, failedCount: 1, naCount: 0, totalCount: 2, results: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_inspection', content: args.data.content as string });
      const insp = await HealthSafetyService.completeInspection('mem-1', 'Issues found');
      assert.ok(insp);
      assert.equal(insp!.status, 'failed');
    });
  });

  // ── Training ──

  describe('createTraining', () => {
    it('creates a training with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_training', content: args.data.content as string });
      const t = await HealthSafetyService.createTraining('org-1', 'ws-1', { name: 'Fire Safety' }, 'user-1');
      assert.equal(t.name, 'Fire Safety');
      assert.equal(t.status, 'active');
      assert.equal(t.requiredFor.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_training', content: args.data.content as string });
      const t = await HealthSafetyService.createTraining('org-1', 'ws-1', {
        name: 'First Aid', description: 'd', category: 'safety', requiredFor: ['all'], durationHours: 4, frequencyMonths: 12, provider: 'Red Cross', certification: 'CPR', status: 'inactive',
      }, 'user-1');
      assert.equal(t.category, 'safety');
      assert.equal(t.durationHours, 4);
      assert.equal(t.frequencyMonths, 12);
      assert.equal(t.status, 'inactive');
    });
  });

  describe('getTraining', () => {
    it('returns a training when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_training', content: JSON.stringify({ name: 'T', description: '', category: '', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'active' }) });
      const t = await HealthSafetyService.getTraining('mem-1');
      assert.ok(t);
      assert.equal(t!.name, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      const t = await HealthSafetyService.getTraining('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listTrainings', () => {
    it('lists trainings and filters by category, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'hs_training', content: JSON.stringify({ name: 'A', description: '', category: 'safety', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'active' }) }),
        makeRow({ id: 't2', type: 'hs_training', content: JSON.stringify({ name: 'B', description: '', category: 'ops', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'archived' }) }),
      ];
      const list = await HealthSafetyService.listTrainings('org-1', { category: 'safety', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateTraining', () => {
    it('updates training fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_training', content: JSON.stringify({ name: 'Old', description: '', category: '', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_training', content: args.data.content as string });
      const t = await HealthSafetyService.updateTraining('mem-1', { name: 'New', status: 'archived' });
      assert.ok(t);
      assert.equal(t!.name, 'New');
      assert.equal(t!.status, 'archived');
    });
  });

  describe('deleteTraining', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await HealthSafetyService.deleteTraining('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await HealthSafetyService.deleteTraining('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Hazards ──

  describe('createHazard', () => {
    it('creates a hazard with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_hazard', content: args.data.content as string });
      const h = await HealthSafetyService.createHazard('org-1', 'ws-1', { title: 'Slippery floor', category: 'safety', riskLevel: 'medium' }, 'user-1');
      assert.equal(h.title, 'Slippery floor');
      assert.equal(h.status, 'open');
      assert.equal(h.riskLevel, 'medium');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_hazard', content: args.data.content as string });
      const h = await HealthSafetyService.createHazard('org-1', 'ws-1', {
        title: 'Chemical', description: 'd', category: 'chemical', location: 'Lab', riskLevel: 'high', identifiedBy: 'alice', mitigation: 'PPE', status: 'mitigating',
      }, 'user-1');
      assert.equal(h.category, 'chemical');
      assert.equal(h.location, 'Lab');
      assert.equal(h.identifiedBy, 'alice');
      assert.equal(h.status, 'mitigating');
    });
  });

  describe('getHazard', () => {
    it('returns a hazard when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_hazard', content: JSON.stringify({ title: 'H', description: '', category: 'safety', location: '', riskLevel: 'low', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) });
      const h = await HealthSafetyService.getHazard('mem-1');
      assert.ok(h);
      assert.equal(h!.title, 'H');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      const h = await HealthSafetyService.getHazard('mem-1');
      assert.equal(h, null);
    });
  });

  describe('listHazards', () => {
    it('lists hazards and filters by category, riskLevel, status, location', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'h1', type: 'hs_hazard', content: JSON.stringify({ title: 'A', description: '', category: 'chemical', location: 'Lab', riskLevel: 'high', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) }),
        makeRow({ id: 'h2', type: 'hs_hazard', content: JSON.stringify({ title: 'B', description: '', category: 'safety', location: 'Office', riskLevel: 'low', identifiedBy: '', identifiedDate: '2024-05-02', mitigation: '', status: 'closed', mitigatedBy: '', mitigatedAt: null }) }),
      ];
      const list = await HealthSafetyService.listHazards('org-1', { category: 'chemical', riskLevel: 'high', status: 'open', location: 'Lab' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateHazard', () => {
    it('updates hazard fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_hazard', content: JSON.stringify({ title: 'Old', description: '', category: 'safety', location: '', riskLevel: 'low', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_hazard', content: args.data.content as string });
      const h = await HealthSafetyService.updateHazard('mem-1', { title: 'New', status: 'closed' });
      assert.ok(h);
      assert.equal(h!.title, 'New');
      assert.equal(h!.status, 'closed');
    });
  });

  describe('mitigateHazard', () => {
    it('mitigates a hazard', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_hazard', content: JSON.stringify({ title: 'H', description: '', category: 'safety', location: '', riskLevel: 'low', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_hazard', content: args.data.content as string });
      const h = await HealthSafetyService.mitigateHazard('mem-1', 'fixed', 'alice');
      assert.ok(h);
      assert.equal(h!.status, 'mitigated');
      assert.equal(h!.mitigation, 'fixed');
      assert.equal(h!.mitigatedBy, 'alice');
      assert.ok(h!.mitigatedAt);
    });
  });

  // ── Observations ──

  describe('createObservation', () => {
    it('creates an observation with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'hs_safety_observation', content: args.data.content as string });
      const o = await HealthSafetyService.createObservation('org-1', 'ws-1', { observer: 'alice', date: '2024-05-01', location: 'Floor', behavior: 'safe' }, 'user-1');
      assert.equal(o.observer, 'alice');
      assert.equal(o.behavior, 'safe');
      assert.equal(o.status, 'open');
    });
  });

  describe('getObservation', () => {
    it('returns an observation when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_safety_observation', content: JSON.stringify({ observer: 'a', date: '2024-05-01', location: '', behavior: 'safe', description: '', category: '', feedback: '', status: 'open' }) });
      const o = await HealthSafetyService.getObservation('mem-1');
      assert.ok(o);
      assert.equal(o!.observer, 'a');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_incident' });
      const o = await HealthSafetyService.getObservation('mem-1');
      assert.equal(o, null);
    });
  });

  describe('listObservations', () => {
    it('lists observations and filters by behavior, location', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'o1', type: 'hs_safety_observation', content: JSON.stringify({ observer: 'a', date: '2024-05-01', location: 'Floor', behavior: 'safe', description: '', category: '', feedback: '', status: 'open' }) }),
        makeRow({ id: 'o2', type: 'hs_safety_observation', content: JSON.stringify({ observer: 'b', date: '2024-05-02', location: 'Lab', behavior: 'unsafe', description: '', category: '', feedback: '', status: 'open' }) }),
      ];
      const list = await HealthSafetyService.listObservations('org-1', { behavior: 'safe', location: 'Floor' });
      assert.equal(list.length, 1);
      assert.equal(list[0].observer, 'a');
    });
  });

  describe('updateObservation', () => {
    it('updates observation fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'hs_safety_observation', content: JSON.stringify({ observer: 'a', date: '2024-05-01', location: '', behavior: 'safe', description: '', category: '', feedback: '', status: 'open' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'hs_safety_observation', content: args.data.content as string });
      const o = await HealthSafetyService.updateObservation('mem-1', { status: 'actioned', behavior: 'unsafe' });
      assert.ok(o);
      assert.equal(o!.status, 'actioned');
      assert.equal(o!.behavior, 'unsafe');
    });
  });

  // ── Metrics & Stats ──

  describe('getSafetyMetrics', () => {
    it('computes metrics across all entities', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'hs_incident') return [
          makeRow({ id: 'i1', type: 'hs_incident', content: JSON.stringify({ title: 'A', description: '', type: 'injury', severity: 'serious', location: '', occurredAt: '2024-01-01', reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'reported', resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null }) }),
        ];
        if (where.type === 'hs_inspection') return [
          makeRow({ id: 's1', type: 'hs_inspection', content: JSON.stringify({ title: 'S', area: '', inspector: '', date: '', items: [], status: 'completed', passRate: 80, passedCount: 4, failedCount: 1, naCount: 0, totalCount: 5, results: '' }) }),
        ];
        if (where.type === 'hs_training') return [
          makeRow({ id: 't1', type: 'hs_training', content: JSON.stringify({ name: 'T', description: '', category: '', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'active' }) }),
        ];
        if (where.type === 'hs_hazard') return [
          makeRow({ id: 'h1', type: 'hs_hazard', content: JSON.stringify({ title: 'H', description: '', category: 'safety', location: '', riskLevel: 'high', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) }),
        ];
        if (where.type === 'hs_safety_observation') return [
          makeRow({ id: 'o1', type: 'hs_safety_observation', content: JSON.stringify({ observer: 'a', date: '2024-05-01', location: '', behavior: 'safe', description: '', category: '', feedback: '', status: 'open' }) }),
          makeRow({ id: 'o2', type: 'hs_safety_observation', content: JSON.stringify({ observer: 'b', date: '2024-05-02', location: '', behavior: 'unsafe', description: '', category: '', feedback: '', status: 'open' }) }),
        ];
        return [];
      };
      const m = await HealthSafetyService.getSafetyMetrics('org-1');
      assert.equal(m.totalIncidents, 1);
      assert.equal(m.recordableIncidents, 1);
      assert.equal(m.trir, 100);
      assert.equal(m.inspectionPassRate, 80);
      assert.equal(m.trainingCompliance, 100);
      assert.equal(m.observationsSafe, 1);
      assert.equal(m.observationsUnsafe, 1);
      assert.equal(m.openHazardsByRiskLevel['high'], 1);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const m = await HealthSafetyService.getSafetyMetrics('org-1');
      assert.equal(m.totalIncidents, 0);
      assert.equal(m.trir, 0);
      assert.equal(m.trainingCompliance, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'hs_incident') return [
          makeRow({ id: 'i1', type: 'hs_incident', content: JSON.stringify({ title: 'A', description: '', type: 'injury', severity: 'minor', location: '', occurredAt: '2024-01-01', reportedBy: '', involvedPersons: [], rootCause: '', correctiveActions: [], status: 'reported', resolution: '', investigatedBy: '', investigatedAt: null, closedBy: '', closedAt: null }) }),
        ];
        if (where.type === 'hs_inspection') return [
          makeRow({ id: 's1', type: 'hs_inspection', content: JSON.stringify({ title: 'S', area: '', inspector: '', date: '', items: [], status: 'completed', passRate: 100, passedCount: 0, failedCount: 0, naCount: 0, totalCount: 0, results: '' }) }),
        ];
        if (where.type === 'hs_training') return [
          makeRow({ id: 't1', type: 'hs_training', content: JSON.stringify({ name: 'T', description: '', category: '', requiredFor: [], durationHours: null, frequencyMonths: null, provider: '', certification: '', status: 'active' }) }),
        ];
        if (where.type === 'hs_hazard') return [
          makeRow({ id: 'h1', type: 'hs_hazard', content: JSON.stringify({ title: 'H', description: '', category: 'safety', location: '', riskLevel: 'high', identifiedBy: '', identifiedDate: '2024-05-01', mitigation: '', status: 'open', mitigatedBy: '', mitigatedAt: null }) }),
        ];
        if (where.type === 'hs_safety_observation') return [
          makeRow({ id: 'o1', type: 'hs_safety_observation', content: JSON.stringify({ observer: 'a', date: '2024-05-01', location: '', behavior: 'safe', description: '', category: '', feedback: '', status: 'open' }) }),
        ];
        return [];
      };
      const stats = await HealthSafetyService.getStats('org-1');
      assert.equal(stats.incidentCount, 1);
      assert.equal(stats.openIncidentCount, 1);
      assert.equal(stats.inspectionCount, 1);
      assert.equal(stats.completedInspectionCount, 1);
      assert.equal(stats.trainingCount, 1);
      assert.equal(stats.activeTrainingCount, 1);
      assert.equal(stats.hazardCount, 1);
      assert.equal(stats.openHazardCount, 1);
      assert.equal(stats.observationCount, 1);
      assert.equal(stats.byIncidentType['injury'], 1);
      assert.equal(stats.byHazardRiskLevel['high'], 1);
    });
  });
});
