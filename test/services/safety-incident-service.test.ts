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
    type: 'safety_incident',
    content: JSON.stringify({
      name: 'Workplace Injury',
      type: 'injury',
      description: 'Hand injury on production line',
      status: 'reported',
      severity: 'moderate',
      location: 'Factory Floor',
      incidentDate: '2028-01-15',
      reportedBy: 'Supervisor A',
      affectedPerson: 'John Doe',
      department: 'Production',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['safety_incident', 'injury', 'reported']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeInvestigationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-inv1',
    type: 'incident_investigation',
    content: JSON.stringify({
      name: 'Injury Investigation',
      type: 'formal',
      description: 'Formal investigation of workplace injury',
      status: 'planned',
      incidentId: 'mem-1',
      investigator: 'Safety Officer',
      startDate: null,
      endDate: null,
      findings: '',
      recommendations: '',
      notes: '',
    }),
    tags: JSON.stringify(['incident_investigation', 'formal', 'planned']),
    ...overrides,
  });
}

function makeRCARow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-rca1',
    type: 'root_cause_analysis',
    content: JSON.stringify({
      name: 'Injury Root Cause Analysis',
      type: 'five_whys',
      description: '5-Why analysis of injury',
      status: 'draft',
      incidentId: 'mem-1',
      analyst: 'Safety Analyst',
      method: '5 Whys',
      contributingFactors: '',
      rootCause: '',
      conclusions: '',
      notes: '',
    }),
    tags: JSON.stringify(['root_cause_analysis', 'five_whys', 'draft']),
    ...overrides,
  });
}

function makeCorrectiveActionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-ca1',
    type: 'corrective_action',
    content: JSON.stringify({
      name: 'Machine Guard Installation',
      type: 'engineering',
      description: 'Install machine guards',
      status: 'planned',
      incidentId: 'mem-1',
      priority: 'high',
      assignedTo: 'Maintenance Team',
      dueDate: '2028-03-01',
      completedDate: null,
      verifiedBy: '',
      cost: 5000,
      notes: '',
    }),
    tags: JSON.stringify(['corrective_action', 'engineering', 'planned']),
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

const { SafetyIncidentService } = await import('@/lib/services/safety-incident-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Safety Incidents
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyIncidentService — Safety Incidents', () => {
  beforeEach(() => resetMock());

  it('creates a safety incident with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await SafetyIncidentService.createSafetyIncident('org-1', 'ws-1', {
      name: 'Near Miss', type: 'near_miss',
    }, 'user-1');
    assert.equal(i.name, 'Near Miss');
    assert.equal(i.status, 'reported');
    assert.equal(i.severity, '');
  });

  it('creates a safety incident with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await SafetyIncidentService.createSafetyIncident('org-1', 'ws-1', {
      name: 'Fire Incident', type: 'fire', description: 'Small fire in warehouse',
      status: 'investigating', severity: 'high', location: 'Warehouse B',
      incidentDate: '2028-02-01', reportedBy: 'Guard A', affectedPerson: 'None',
      department: 'Logistics', notes: 'Quick response',
    }, 'user-1');
    assert.equal(i.name, 'Fire Incident');
    assert.equal(i.type, 'fire');
    assert.equal(i.severity, 'high');
    assert.equal(i.location, 'Warehouse B');
  });

  it('gets a safety incident by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const i = await SafetyIncidentService.getSafetyIncident('mem-1');
    assert.ok(i);
    assert.equal(i!.id, 'mem-1');
    assert.equal(i!.name, 'Workplace Injury');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'incident_investigation' });
    const i = await SafetyIncidentService.getSafetyIncident('mem-1');
    assert.equal(i, null);
  });

  it('returns null when safety incident not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await SafetyIncidentService.getSafetyIncident('nope');
    assert.equal(i, null);
  });

  it('lists safety incidents by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'safety_incident') return [makeRow()];
      return [];
    };
    const list = await SafetyIncidentService.listSafetyIncidents('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Workplace Injury');
  });

  it('updates a safety incident', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await SafetyIncidentService.updateSafetyIncident('mem-1', { status: 'resolved' });
    assert.ok(i);
    assert.equal(i!.status, 'resolved');
  });

  it('deletes a safety incident', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await SafetyIncidentService.deleteSafetyIncident('mem-1');
    assert.equal(ok, true);
  });

  it('investigateSafetyIncident sets status to investigating', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await SafetyIncidentService.investigateSafetyIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'investigating');
  });

  it('resolveSafetyIncident sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await SafetyIncidentService.resolveSafetyIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'resolved');
  });

  it('closeSafetyIncident sets status to closed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await SafetyIncidentService.closeSafetyIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'closed');
  });

  it('reopenSafetyIncident sets status to reopened', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await SafetyIncidentService.reopenSafetyIncident('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'reopened');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Incident Investigations
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyIncidentService — Incident Investigations', () => {
  beforeEach(() => resetMock());

  it('creates an incident investigation with defaults', async () => {
    memCreateImpl = async (args) => makeInvestigationRow({ content: args.data.content as string });
    const i = await SafetyIncidentService.createIncidentInvestigation('org-1', 'ws-1', {
      name: 'Informal Review', type: 'informal',
    }, 'user-1');
    assert.equal(i.name, 'Informal Review');
    assert.equal(i.status, 'planned');
    assert.equal(i.investigator, '');
  });

  it('creates an incident investigation with full input', async () => {
    memCreateImpl = async (args) => makeInvestigationRow({ content: args.data.content as string });
    const i = await SafetyIncidentService.createIncidentInvestigation('org-1', 'ws-1', {
      name: 'Joint Investigation', type: 'joint', description: 'Joint labor-management investigation',
      status: 'in_progress', incidentId: 'mem-1', investigator: 'Team Lead',
      startDate: '2028-03-01', endDate: '2028-04-01', findings: 'Root cause identified',
      recommendations: 'Install guards', notes: 'Follow up in 30 days',
    }, 'user-1');
    assert.equal(i.name, 'Joint Investigation');
    assert.equal(i.type, 'joint');
    assert.equal(i.investigator, 'Team Lead');
    assert.equal(i.findings, 'Root cause identified');
  });

  it('gets an incident investigation by id', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow();
    const i = await SafetyIncidentService.getIncidentInvestigation('mem-inv1');
    assert.ok(i);
    assert.equal(i!.name, 'Injury Investigation');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow({ type: 'safety_incident' });
    const i = await SafetyIncidentService.getIncidentInvestigation('mem-inv1');
    assert.equal(i, null);
  });

  it('returns null when incident investigation not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await SafetyIncidentService.getIncidentInvestigation('nope');
    assert.equal(i, null);
  });

  it('lists incident investigations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'incident_investigation') return [makeInvestigationRow()];
      return [];
    };
    const list = await SafetyIncidentService.listIncidentInvestigations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an incident investigation', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow();
    memUpdateImpl = async (args) => makeInvestigationRow({ id: 'mem-inv1', content: args.data.content as string });
    const i = await SafetyIncidentService.updateIncidentInvestigation('mem-inv1', { status: 'completed' });
    assert.ok(i);
    assert.equal(i!.status, 'completed');
  });

  it('deletes an incident investigation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-inv1' });
    const ok = await SafetyIncidentService.deleteIncidentInvestigation('mem-inv1');
    assert.equal(ok, true);
  });

  it('startInvestigation sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow();
    memUpdateImpl = async (args) => makeInvestigationRow({ id: 'mem-inv1', content: args.data.content as string });
    const i = await SafetyIncidentService.startInvestigation('mem-inv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'in_progress');
  });

  it('completeInvestigation sets status to completed', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow();
    memUpdateImpl = async (args) => makeInvestigationRow({ id: 'mem-inv1', content: args.data.content as string });
    const i = await SafetyIncidentService.completeInvestigation('mem-inv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'completed');
  });

  it('cancelInvestigation sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeInvestigationRow();
    memUpdateImpl = async (args) => makeInvestigationRow({ id: 'mem-inv1', content: args.data.content as string });
    const i = await SafetyIncidentService.cancelInvestigation('mem-inv1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Root Cause Analyses
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyIncidentService — Root Cause Analyses', () => {
  beforeEach(() => resetMock());

  it('creates a root cause analysis with defaults', async () => {
    memCreateImpl = async (args) => makeRCARow({ content: args.data.content as string });
    const r = await SafetyIncidentService.createRootCauseAnalysis('org-1', 'ws-1', {
      name: 'Fishbone Analysis', type: 'fishbone',
    }, 'user-1');
    assert.equal(r.name, 'Fishbone Analysis');
    assert.equal(r.status, 'draft');
    assert.equal(r.analyst, '');
  });

  it('creates a root cause analysis with full input', async () => {
    memCreateImpl = async (args) => makeRCARow({ content: args.data.content as string });
    const r = await SafetyIncidentService.createRootCauseAnalysis('org-1', 'ws-1', {
      name: 'FMEA Analysis', type: 'fmea', description: 'Failure mode analysis',
      status: 'completed', incidentId: 'mem-1', analyst: 'Quality Engineer',
      method: 'FMEA', contributingFactors: 'Wear, lack of maintenance',
      rootCause: 'Missing maintenance schedule', conclusions: 'Implement PM',
      notes: 'Review quarterly',
    }, 'user-1');
    assert.equal(r.name, 'FMEA Analysis');
    assert.equal(r.type, 'fmea');
    assert.equal(r.analyst, 'Quality Engineer');
    assert.equal(r.rootCause, 'Missing maintenance schedule');
  });

  it('gets a root cause analysis by id', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    const r = await SafetyIncidentService.getRootCauseAnalysis('mem-rca1');
    assert.ok(r);
    assert.equal(r!.name, 'Injury Root Cause Analysis');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRCARow({ type: 'safety_incident' });
    const r = await SafetyIncidentService.getRootCauseAnalysis('mem-rca1');
    assert.equal(r, null);
  });

  it('returns null when root cause analysis not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await SafetyIncidentService.getRootCauseAnalysis('nope');
    assert.equal(r, null);
  });

  it('lists root cause analyses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'root_cause_analysis') return [makeRCARow()];
      return [];
    };
    const list = await SafetyIncidentService.listRootCauseAnalyses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a root cause analysis', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    memUpdateImpl = async (args) => makeRCARow({ id: 'mem-rca1', content: args.data.content as string });
    const r = await SafetyIncidentService.updateRootCauseAnalysis('mem-rca1', { status: 'completed' });
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('deletes a root cause analysis', async () => {
    memDeleteImpl = async () => ({ id: 'mem-rca1' });
    const ok = await SafetyIncidentService.deleteRootCauseAnalysis('mem-rca1');
    assert.equal(ok, true);
  });

  it('startRCA sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    memUpdateImpl = async (args) => makeRCARow({ id: 'mem-rca1', content: args.data.content as string });
    const r = await SafetyIncidentService.startRCA('mem-rca1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'in_progress');
  });

  it('completeRCA sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    memUpdateImpl = async (args) => makeRCARow({ id: 'mem-rca1', content: args.data.content as string });
    const r = await SafetyIncidentService.completeRCA('mem-rca1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
  });

  it('reviewRCA sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    memUpdateImpl = async (args) => makeRCARow({ id: 'mem-rca1', content: args.data.content as string });
    const r = await SafetyIncidentService.reviewRCA('mem-rca1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'reviewed');
  });

  it('archiveRCA sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRCARow();
    memUpdateImpl = async (args) => makeRCARow({ id: 'mem-rca1', content: args.data.content as string });
    const r = await SafetyIncidentService.archiveRCA('mem-rca1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Corrective Actions
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyIncidentService — Corrective Actions', () => {
  beforeEach(() => resetMock());

  it('creates a corrective action with defaults', async () => {
    memCreateImpl = async (args) => makeCorrectiveActionRow({ content: args.data.content as string });
    const a = await SafetyIncidentService.createCorrectiveAction('org-1', 'ws-1', {
      name: 'Immediate Fix', type: 'immediate',
    }, 'user-1');
    assert.equal(a.name, 'Immediate Fix');
    assert.equal(a.status, 'planned');
    assert.equal(a.cost, 0);
  });

  it('creates a corrective action with full input', async () => {
    memCreateImpl = async (args) => makeCorrectiveActionRow({ content: args.data.content as string });
    const a = await SafetyIncidentService.createCorrectiveAction('org-1', 'ws-1', {
      name: 'Safety Training Program', type: 'preventive', description: 'Mandatory safety training',
      status: 'in_progress', incidentId: 'mem-1', priority: 'critical',
      assignedTo: 'HR Department', dueDate: '2028-06-01',
      verifiedBy: 'Safety Manager', cost: 10000, notes: 'All staff',
    }, 'user-1');
    assert.equal(a.name, 'Safety Training Program');
    assert.equal(a.type, 'preventive');
    assert.equal(a.priority, 'critical');
    assert.equal(a.cost, 10000);
  });

  it('gets a corrective action by id', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    const a = await SafetyIncidentService.getCorrectiveAction('mem-ca1');
    assert.ok(a);
    assert.equal(a!.name, 'Machine Guard Installation');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow({ type: 'safety_incident' });
    const a = await SafetyIncidentService.getCorrectiveAction('mem-ca1');
    assert.equal(a, null);
  });

  it('returns null when corrective action not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await SafetyIncidentService.getCorrectiveAction('nope');
    assert.equal(a, null);
  });

  it('lists corrective actions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'corrective_action') return [makeCorrectiveActionRow()];
      return [];
    };
    const list = await SafetyIncidentService.listCorrectiveActions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a corrective action', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.updateCorrectiveAction('mem-ca1', { status: 'completed' });
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('deletes a corrective action', async () => {
    memDeleteImpl = async () => ({ id: 'mem-ca1' });
    const ok = await SafetyIncidentService.deleteCorrectiveAction('mem-ca1');
    assert.equal(ok, true);
  });

  it('startCorrectiveAction sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.startCorrectiveAction('mem-ca1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeCorrectiveAction sets status to completed', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.completeCorrectiveAction('mem-ca1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('verifyCorrectiveAction sets status to verified', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.verifyCorrectiveAction('mem-ca1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'verified');
  });

  it('overdueCorrectiveAction sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.overdueCorrectiveAction('mem-ca1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'overdue');
  });

  it('cancelCorrectiveAction sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeCorrectiveActionRow();
    memUpdateImpl = async (args) => makeCorrectiveActionRow({ id: 'mem-ca1', content: args.data.content as string });
    const a = await SafetyIncidentService.cancelCorrectiveAction('mem-ca1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('SafetyIncidentService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getSafetyIncidentMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'safety_incident') return [
        makeRow({ content: JSON.stringify({ name: 'I1', type: 'injury', status: 'reported', description: '', severity: '', location: '', incidentDate: null, reportedBy: '', affectedPerson: '', department: '', notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ name: 'I2', type: 'injury', status: 'investigating', description: '', severity: '', location: '', incidentDate: null, reportedBy: '', affectedPerson: '', department: '', notes: '' }) }),
      ];
      if (t === 'incident_investigation') return [
        makeInvestigationRow({ content: JSON.stringify({ name: 'Inv1', type: 'formal', status: 'in_progress', description: '', incidentId: null, investigator: '', startDate: null, endDate: null, findings: '', recommendations: '', notes: '' }) }),
      ];
      if (t === 'root_cause_analysis') return [
        makeRCARow({ content: JSON.stringify({ name: 'RCA1', type: 'five_whys', status: 'completed', description: '', incidentId: null, analyst: '', method: '', contributingFactors: '', rootCause: '', conclusions: '', notes: '' }) }),
      ];
      if (t === 'corrective_action') return [
        makeCorrectiveActionRow({ content: JSON.stringify({ name: 'CA1', type: 'immediate', status: 'in_progress', description: '', incidentId: null, priority: '', assignedTo: '', dueDate: null, completedDate: null, verifiedBy: '', cost: 0, notes: '' }) }),
        makeCorrectiveActionRow({ id: 'ca2', content: JSON.stringify({ name: 'CA2', type: 'immediate', status: 'overdue', description: '', incidentId: null, priority: '', assignedTo: '', dueDate: null, completedDate: null, verifiedBy: '', cost: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await SafetyIncidentService.getSafetyIncidentMetrics('org-1');
    assert.equal(m.reportedIncidents, 2);
    assert.equal(m.activeInvestigations, 1);
    assert.equal(m.completedRCAs, 1);
    assert.equal(m.activeCorrectiveActions, 1);
    assert.equal(m.overdueActions, 1);
  });

  it('getSafetyIncidentStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'safety_incident') return [makeRow()];
      if (t === 'incident_investigation') return [makeInvestigationRow()];
      if (t === 'root_cause_analysis') return [makeRCARow()];
      if (t === 'corrective_action') return [makeCorrectiveActionRow()];
      return [];
    };
    const s = await SafetyIncidentService.getSafetyIncidentStats('org-1');
    assert.equal(s.incidentCount, 1);
    assert.equal(s.investigationCount, 1);
    assert.equal(s.rcaCount, 1);
    assert.equal(s.correctiveActionCount, 1);
    assert.equal(s.byIncidentType['injury'], 1);
    assert.equal(s.byInvestigationType['formal'], 1);
    assert.equal(s.byRCAType['five_whys'], 1);
    assert.equal(s.byCorrectiveActionType['engineering'], 1);
  });
});
