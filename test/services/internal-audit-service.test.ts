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
    type: 'audit_plan',
    content: JSON.stringify({
      title: 'Annual Financial Audit',
      auditType: 'financial',
      description: 'Annual audit',
      scope: 'All departments',
      objectives: 'Verify financial statements',
      leadAuditor: 'Jane Doe',
      teamMembers: ['Alice', 'Bob'],
      plannedStartDate: '2028-01-01',
      plannedEndDate: '2028-03-31',
      status: 'planned',
      riskRating: 'high',
      budget: 50000,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['audit_plan', 'financial', 'planned']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeFindingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-f1',
    type: 'audit_finding',
    content: JSON.stringify({
      planId: null,
      title: 'Revenue recognition issue',
      auditType: 'financial',
      severity: 'high',
      description: 'Improper revenue recognition',
      criteria: 'GAAP standards',
      condition: 'Revenue recorded before delivery',
      cause: 'Lack of controls',
      effect: 'Overstated revenue',
      recommendation: 'Implement review controls',
      status: 'open',
      identifiedDate: '2028-02-01',
      identifiedBy: 'Jane Doe',
    }),
    tags: JSON.stringify(['audit_finding', 'financial', 'high', 'open']),
    ...overrides,
  });
}

function makeScheduleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'audit_schedule',
    content: JSON.stringify({
      planId: 'mem-1',
      title: 'Q1 Fieldwork',
      scheduledDate: '2028-02-15',
      duration: 8,
      location: 'HQ',
      participants: ['Jane', 'Bob'],
      status: 'scheduled',
      notes: '',
    }),
    tags: JSON.stringify(['audit_schedule', 'scheduled']),
    ...overrides,
  });
}

function makeRemediationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'audit_remediation',
    content: JSON.stringify({
      findingId: 'mem-f1',
      action: 'Implement new control procedure',
      description: 'Add monthly review',
      owner: 'Alice',
      dueDate: '2028-06-01',
      status: 'not_started',
      progress: 0,
      completedDate: null,
      verifiedBy: '',
      verifiedAt: null,
      notes: '',
    }),
    tags: JSON.stringify(['audit_remediation', 'not_started']),
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

const { InternalAuditService } = await import('@/lib/services/internal-audit-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('InternalAuditService — Plans', () => {
  beforeEach(() => resetMock());

  it('creates a plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await InternalAuditService.createPlan('org-1', 'ws-1', {
      title: 'SOX Audit', auditType: 'sox',
    }, 'user-1');
    assert.equal(p.title, 'SOX Audit');
    assert.equal(p.status, 'planned');
    assert.equal(p.budget, 0);
    assert.equal(p.teamMembers.length, 0);
  });

  it('creates a plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await InternalAuditService.createPlan('org-1', 'ws-1', {
      title: 'IT Audit', auditType: 'it', description: 'IT systems audit',
      scope: 'All IT systems', objectives: 'Verify security controls',
      leadAuditor: 'John', teamMembers: ['A', 'B'],
      plannedStartDate: '2028-01-01', plannedEndDate: '2028-06-30',
      status: 'in_progress', riskRating: 'critical', budget: 100000, notes: 'High priority',
    }, 'user-1');
    assert.equal(p.title, 'IT Audit');
    assert.equal(p.auditType, 'it');
    assert.equal(p.leadAuditor, 'John');
    assert.equal(p.budget, 100000);
    assert.equal(p.status, 'in_progress');
  });

  it('gets a plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await InternalAuditService.getPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.title, 'Annual Financial Audit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'audit_finding' });
    const p = await InternalAuditService.getPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await InternalAuditService.getPlan('nope');
    assert.equal(p, null);
  });

  it('lists plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_plan') return [makeRow()];
      return [];
    };
    const list = await InternalAuditService.listPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Annual Financial Audit');
  });

  it('updates a plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await InternalAuditService.updatePlan('mem-1', { status: 'completed' });
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });

  it('deletes a plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await InternalAuditService.deletePlan('mem-1');
    assert.equal(ok, true);
  });

  it('startPlan sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await InternalAuditService.startPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'in_progress');
  });

  it('completePlan sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await InternalAuditService.completePlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Findings
// ─────────────────────────────────────────────────────────────────────────────

describe('InternalAuditService — Findings', () => {
  beforeEach(() => resetMock());

  it('creates a finding with defaults', async () => {
    memCreateImpl = async (args) => makeFindingRow({ content: args.data.content as string });
    const f = await InternalAuditService.createFinding('org-1', 'ws-1', {
      title: 'Control gap', auditType: 'operational', severity: 'medium',
    }, 'user-1');
    assert.equal(f.title, 'Control gap');
    assert.equal(f.status, 'open');
    assert.equal(f.severity, 'medium');
  });

  it('creates a finding with full input', async () => {
    memCreateImpl = async (args) => makeFindingRow({ content: args.data.content as string });
    const f = await InternalAuditService.createFinding('org-1', 'ws-1', {
      title: 'Segregation of duties', auditType: 'sox', severity: 'critical',
      planId: 'mem-1', description: 'SoD violation', criteria: 'SOX 404',
      condition: 'Same person initiates and approves', cause: 'Staff shortage',
      effect: 'Fraud risk', recommendation: 'Split duties',
      status: 'in_progress', identifiedDate: '2028-03-01', identifiedBy: 'Jane',
    }, 'user-1');
    assert.equal(f.title, 'Segregation of duties');
    assert.equal(f.severity, 'critical');
    assert.equal(f.planId, 'mem-1');
  });

  it('gets a finding by id', async () => {
    memFindUniqueImpl = async () => makeFindingRow();
    const f = await InternalAuditService.getFinding('mem-f1');
    assert.ok(f);
    assert.equal(f!.title, 'Revenue recognition issue');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFindingRow({ type: 'audit_plan' });
    const f = await InternalAuditService.getFinding('mem-f1');
    assert.equal(f, null);
  });

  it('lists findings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_finding') return [makeFindingRow()];
      return [];
    };
    const list = await InternalAuditService.listFindings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a finding', async () => {
    memFindUniqueImpl = async () => makeFindingRow();
    memUpdateImpl = async (args) => makeFindingRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await InternalAuditService.updateFinding('mem-f1', { status: 'in_progress' });
    assert.ok(f);
    assert.equal(f!.status, 'in_progress');
  });

  it('remediateFinding sets status to remediated', async () => {
    memFindUniqueImpl = async () => makeFindingRow();
    memUpdateImpl = async (args) => makeFindingRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await InternalAuditService.remediateFinding('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'remediated');
  });

  it('verifyFinding sets status to verified', async () => {
    memFindUniqueImpl = async () => makeFindingRow();
    memUpdateImpl = async (args) => makeFindingRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await InternalAuditService.verifyFinding('mem-f1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'verified');
  });

  it('acceptRiskFinding sets status to accepted_risk', async () => {
    memFindUniqueImpl = async () => makeFindingRow();
    memUpdateImpl = async (args) => makeFindingRow({ id: 'mem-f1', content: args.data.content as string });
    const f = await InternalAuditService.acceptRiskFinding('mem-f1', 'Low risk', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'accepted_risk');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Schedules
// ─────────────────────────────────────────────────────────────────────────────

describe('InternalAuditService — Schedules', () => {
  beforeEach(() => resetMock());

  it('creates a schedule with defaults', async () => {
    memCreateImpl = async (args) => makeScheduleRow({ content: args.data.content as string });
    const s = await InternalAuditService.createSchedule('org-1', 'ws-1', {
      planId: 'mem-1', title: 'Kickoff', scheduledDate: '2028-02-01',
    }, 'user-1');
    assert.equal(s.title, 'Kickoff');
    assert.equal(s.status, 'scheduled');
    assert.equal(s.duration, 0);
  });

  it('creates a schedule with full input', async () => {
    memCreateImpl = async (args) => makeScheduleRow({ content: args.data.content as string });
    const s = await InternalAuditService.createSchedule('org-1', 'ws-1', {
      planId: 'mem-1', title: 'Fieldwork', scheduledDate: '2028-03-01',
      duration: 16, location: 'Remote', participants: ['A', 'B'],
      status: 'in_progress', notes: 'Bring laptops',
    }, 'user-1');
    assert.equal(s.title, 'Fieldwork');
    assert.equal(s.duration, 16);
    assert.equal(s.location, 'Remote');
  });

  it('gets a schedule by id', async () => {
    memFindUniqueImpl = async () => makeScheduleRow();
    const s = await InternalAuditService.getSchedule('mem-s1');
    assert.ok(s);
    assert.equal(s!.title, 'Q1 Fieldwork');
  });

  it('lists schedules by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_schedule') return [makeScheduleRow()];
      return [];
    };
    const list = await InternalAuditService.listSchedules('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a schedule', async () => {
    memFindUniqueImpl = async () => makeScheduleRow();
    memUpdateImpl = async (args) => makeScheduleRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await InternalAuditService.updateSchedule('mem-s1', { status: 'in_progress' });
    assert.ok(s);
    assert.equal(s!.status, 'in_progress');
  });

  it('completeSchedule sets status to completed', async () => {
    memFindUniqueImpl = async () => makeScheduleRow();
    memUpdateImpl = async (args) => makeScheduleRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await InternalAuditService.completeSchedule('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'completed');
  });

  it('postponeSchedule sets status to postponed', async () => {
    memFindUniqueImpl = async () => makeScheduleRow();
    memUpdateImpl = async (args) => makeScheduleRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await InternalAuditService.postponeSchedule('mem-s1', '2028-04-01', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'postponed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Remediations
// ─────────────────────────────────────────────────────────────────────────────

describe('InternalAuditService — Remediations', () => {
  beforeEach(() => resetMock());

  it('creates a remediation with defaults', async () => {
    memCreateImpl = async (args) => makeRemediationRow({ content: args.data.content as string });
    const r = await InternalAuditService.createRemediation('org-1', 'ws-1', {
      findingId: 'mem-f1', action: 'Fix control',
    }, 'user-1');
    assert.equal(r.action, 'Fix control');
    assert.equal(r.status, 'not_started');
    assert.equal(r.progress, 0);
  });

  it('creates a remediation with full input', async () => {
    memCreateImpl = async (args) => makeRemediationRow({ content: args.data.content as string });
    const r = await InternalAuditService.createRemediation('org-1', 'ws-1', {
      findingId: 'mem-f1', action: 'Implement SOX controls',
      description: 'Add approval workflow', owner: 'Alice',
      dueDate: '2028-06-01', status: 'in_progress', progress: 50,
      verifiedBy: '', notes: 'Priority',
    }, 'user-1');
    assert.equal(r.action, 'Implement SOX controls');
    assert.equal(r.owner, 'Alice');
    assert.equal(r.progress, 50);
  });

  it('gets a remediation by id', async () => {
    memFindUniqueImpl = async () => makeRemediationRow();
    const r = await InternalAuditService.getRemediation('mem-r1');
    assert.ok(r);
    assert.equal(r!.action, 'Implement new control procedure');
  });

  it('lists remediations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_remediation') return [makeRemediationRow()];
      return [];
    };
    const list = await InternalAuditService.listRemediations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a remediation', async () => {
    memFindUniqueImpl = async () => makeRemediationRow();
    memUpdateImpl = async (args) => makeRemediationRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await InternalAuditService.updateRemediation('mem-r1', { progress: 75 });
    assert.ok(r);
    assert.equal(r!.progress, 75);
  });

  it('startRemediation sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRemediationRow();
    memUpdateImpl = async (args) => makeRemediationRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await InternalAuditService.startRemediation('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'in_progress');
  });

  it('completeRemediation sets status to completed and progress to 100', async () => {
    memFindUniqueImpl = async () => makeRemediationRow();
    memUpdateImpl = async (args) => makeRemediationRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await InternalAuditService.completeRemediation('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'completed');
    assert.equal(r!.progress, 100);
  });

  it('verifyRemediation sets status to verified', async () => {
    memFindUniqueImpl = async () => makeRemediationRow();
    memUpdateImpl = async (args) => makeRemediationRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await InternalAuditService.verifyRemediation('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('InternalAuditService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getInternalAuditMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_finding') return [
        makeFindingRow({ content: JSON.stringify({ title: 'F1', auditType: 'financial', severity: 'critical', status: 'open', identifiedBy: '' }) }),
        makeFindingRow({ id: 'f2', content: JSON.stringify({ title: 'F2', auditType: 'financial', severity: 'medium', status: 'in_progress', identifiedBy: '' }) }),
        makeFindingRow({ id: 'f3', content: JSON.stringify({ title: 'F3', auditType: 'financial', severity: 'low', status: 'verified', identifiedBy: '' }) }),
      ];
      if (t === 'audit_remediation') return [
        makeRemediationRow({ content: JSON.stringify({ findingId: 'f1', action: 'R1', owner: '', status: 'completed', progress: 100, dueDate: null, completedDate: '2028-03-01', verifiedBy: '', verifiedAt: null, notes: '', description: '' }) }),
        makeRemediationRow({ id: 'r2', content: JSON.stringify({ findingId: 'f2', action: 'R2', owner: '', status: 'not_started', progress: 0, dueDate: '2020-01-01', completedDate: null, verifiedBy: '', verifiedAt: null, notes: '', description: '' }) }),
      ];
      return [];
    };
    const m = await InternalAuditService.getInternalAuditMetrics('org-1');
    assert.equal(m.openFindings, 2);
    assert.equal(m.criticalFindings, 1);
    assert.equal(m.remediationRate, 50);
    assert.equal(m.overdueRemediations, 1);
  });

  it('getInternalAuditStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'audit_plan') return [makeRow()];
      if (t === 'audit_finding') return [makeFindingRow()];
      if (t === 'audit_schedule') return [makeScheduleRow()];
      if (t === 'audit_remediation') return [makeRemediationRow()];
      return [];
    };
    const s = await InternalAuditService.getInternalAuditStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.findingCount, 1);
    assert.equal(s.scheduleCount, 1);
    assert.equal(s.remediationCount, 1);
    assert.equal(s.byAuditType['financial'], 1);
    assert.equal(s.byFindingSeverity['high'], 1);
    assert.equal(s.byRemediationStatus['not_started'], 1);
  });
});
