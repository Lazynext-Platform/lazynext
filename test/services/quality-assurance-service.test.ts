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
    type: 'qa_inspection',
    content: JSON.stringify({
      type: 'incoming',
      productId: null,
      productName: 'Widget A',
      batchId: null,
      inspector: 'Jane Doe',
      inspectionDate: '2028-01-01',
      location: 'Warehouse',
      sampleSize: 100,
      defectsFound: 0,
      status: 'scheduled',
      result: 'pending',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['qa_inspection', 'incoming', 'scheduled', 'pending']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeDefectRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'qa_defect',
    content: JSON.stringify({
      title: 'Scratch on surface',
      type: 'cosmetic',
      severity: 'minor',
      status: 'open',
      productId: null,
      productName: 'Widget A',
      batchId: null,
      inspectionId: null,
      description: 'Surface scratch detected',
      identifiedBy: 'Jane Doe',
      identifiedDate: '2028-02-01',
      resolvedBy: '',
      resolvedDate: null,
      rootCause: '',
      resolution: '',
      notes: '',
    }),
    tags: JSON.stringify(['qa_defect', 'cosmetic', 'minor', 'open']),
    ...overrides,
  });
}

function makeCapaRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'qa_capa',
    content: JSON.stringify({
      title: 'Fix surface scratch issue',
      type: 'corrective',
      priority: 'medium',
      status: 'open',
      defectId: null,
      description: 'Address surface scratches',
      assignedTo: 'Alice',
      rootCause: '',
      action: '',
      implementationDate: null,
      verificationDate: null,
      verifiedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['qa_capa', 'corrective', 'medium', 'open']),
    ...overrides,
  });
}

function makeAuditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'qa_audit',
    content: JSON.stringify({
      name: 'Q1 Process Audit',
      type: 'process',
      description: 'Quarterly process audit',
      status: 'planned',
      auditor: 'John Doe',
      auditedEntity: 'Production Line',
      scheduledDate: '2028-03-01',
      completedDate: null,
      scope: 'All production lines',
      findings: '',
      recommendations: '',
      notes: '',
    }),
    tags: JSON.stringify(['qa_audit', 'process', 'planned']),
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

const { QualityAssuranceService } = await import('@/lib/services/quality-assurance-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Inspections
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityAssuranceService — Inspections', () => {
  beforeEach(() => resetMock());

  it('creates an inspection with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await QualityAssuranceService.createInspection('org-1', 'ws-1', {
      type: 'incoming',
    }, 'user-1');
    assert.equal(i.type, 'incoming');
    assert.equal(i.status, 'scheduled');
    assert.equal(i.result, 'pending');
    assert.equal(i.sampleSize, 0);
    assert.equal(i.defectsFound, 0);
  });

  it('creates an inspection with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const i = await QualityAssuranceService.createInspection('org-1', 'ws-1', {
      type: 'final', productId: 'p-1', productName: 'Widget B', batchId: 'b-1',
      inspector: 'John', inspectionDate: '2028-01-01', location: 'Factory',
      sampleSize: 50, defectsFound: 2, status: 'in_progress', result: 'conditional_pass',
      notes: 'Watch closely',
    }, 'user-1');
    assert.equal(i.type, 'final');
    assert.equal(i.productName, 'Widget B');
    assert.equal(i.inspector, 'John');
    assert.equal(i.sampleSize, 50);
    assert.equal(i.defectsFound, 2);
    assert.equal(i.status, 'in_progress');
  });

  it('gets an inspection by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const i = await QualityAssuranceService.getInspection('mem-1');
    assert.ok(i);
    assert.equal(i!.id, 'mem-1');
    assert.equal(i!.productName, 'Widget A');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'qa_defect' });
    const i = await QualityAssuranceService.getInspection('mem-1');
    assert.equal(i, null);
  });

  it('returns null when inspection not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await QualityAssuranceService.getInspection('nope');
    assert.equal(i, null);
  });

  it('lists inspections by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_inspection') return [makeRow()];
      return [];
    };
    const list = await QualityAssuranceService.listInspections('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].productName, 'Widget A');
  });

  it('updates an inspection', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await QualityAssuranceService.updateInspection('mem-1', { status: 'in_progress' });
    assert.ok(i);
    assert.equal(i!.status, 'in_progress');
  });

  it('deletes an inspection', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await QualityAssuranceService.deleteInspection('mem-1');
    assert.equal(ok, true);
  });

  it('startInspection sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await QualityAssuranceService.startInspection('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'in_progress');
  });

  it('passInspection sets status to passed and result to pass', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await QualityAssuranceService.passInspection('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'passed');
    assert.equal(i!.result, 'pass');
  });

  it('failInspection sets status to failed and result to fail', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const i = await QualityAssuranceService.failInspection('mem-1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'failed');
    assert.equal(i!.result, 'fail');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Defects
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityAssuranceService — Defects', () => {
  beforeEach(() => resetMock());

  it('creates a defect with defaults', async () => {
    memCreateImpl = async (args) => makeDefectRow({ content: args.data.content as string });
    const d = await QualityAssuranceService.createDefect('org-1', 'ws-1', {
      title: 'Crack', type: 'functional', severity: 'major',
    }, 'user-1');
    assert.equal(d.title, 'Crack');
    assert.equal(d.status, 'open');
    assert.equal(d.severity, 'major');
  });

  it('creates a defect with full input', async () => {
    memCreateImpl = async (args) => makeDefectRow({ content: args.data.content as string });
    const d = await QualityAssuranceService.createDefect('org-1', 'ws-1', {
      title: 'Broken hinge', type: 'functional', severity: 'critical',
      productId: 'p-1', productName: 'Widget C', batchId: 'b-1',
      inspectionId: 'mem-1', description: 'Hinge fails under load',
      status: 'investigating', identifiedBy: 'Jane', identifiedDate: '2028-02-01',
      rootCause: 'Material defect', resolution: 'Replace batch',
      notes: 'High priority',
    }, 'user-1');
    assert.equal(d.title, 'Broken hinge');
    assert.equal(d.severity, 'critical');
    assert.equal(d.inspectionId, 'mem-1');
    assert.equal(d.rootCause, 'Material defect');
  });

  it('gets a defect by id', async () => {
    memFindUniqueImpl = async () => makeDefectRow();
    const d = await QualityAssuranceService.getDefect('mem-d1');
    assert.ok(d);
    assert.equal(d!.title, 'Scratch on surface');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDefectRow({ type: 'qa_inspection' });
    const d = await QualityAssuranceService.getDefect('mem-d1');
    assert.equal(d, null);
  });

  it('lists defects by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_defect') return [makeDefectRow()];
      return [];
    };
    const list = await QualityAssuranceService.listDefects('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a defect', async () => {
    memFindUniqueImpl = async () => makeDefectRow();
    memUpdateImpl = async (args) => makeDefectRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await QualityAssuranceService.updateDefect('mem-d1', { status: 'investigating' });
    assert.ok(d);
    assert.equal(d!.status, 'investigating');
  });

  it('deletes a defect', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await QualityAssuranceService.deleteDefect('mem-d1');
    assert.equal(ok, true);
  });

  it('investigateDefect sets status to investigating', async () => {
    memFindUniqueImpl = async () => makeDefectRow();
    memUpdateImpl = async (args) => makeDefectRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await QualityAssuranceService.investigateDefect('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'investigating');
  });

  it('resolveDefect sets status to resolved', async () => {
    memFindUniqueImpl = async () => makeDefectRow();
    memUpdateImpl = async (args) => makeDefectRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await QualityAssuranceService.resolveDefect('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'resolved');
  });

  it('closeDefect sets status to closed', async () => {
    memFindUniqueImpl = async () => makeDefectRow();
    memUpdateImpl = async (args) => makeDefectRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await QualityAssuranceService.closeDefect('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — CAPAs
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityAssuranceService — CAPAs', () => {
  beforeEach(() => resetMock());

  it('creates a CAPA with defaults', async () => {
    memCreateImpl = async (args) => makeCapaRow({ content: args.data.content as string });
    const c = await QualityAssuranceService.createCapa('org-1', 'ws-1', {
      title: 'New CAPA', type: 'corrective', priority: 'low',
    }, 'user-1');
    assert.equal(c.title, 'New CAPA');
    assert.equal(c.status, 'open');
    assert.equal(c.priority, 'low');
  });

  it('creates a CAPA with full input', async () => {
    memCreateImpl = async (args) => makeCapaRow({ content: args.data.content as string });
    const c = await QualityAssuranceService.createCapa('org-1', 'ws-1', {
      title: 'Prevent scratches', type: 'preventive', priority: 'high',
      defectId: 'mem-d1', description: 'Add protective film',
      status: 'in_progress', assignedTo: 'Bob', rootCause: 'No film',
      action: 'Apply film', implementationDate: '2028-04-01',
      verificationDate: '2028-05-01', verifiedBy: 'Jane',
      notes: 'Priority fix',
    }, 'user-1');
    assert.equal(c.title, 'Prevent scratches');
    assert.equal(c.type, 'preventive');
    assert.equal(c.assignedTo, 'Bob');
    assert.equal(c.defectId, 'mem-d1');
  });

  it('gets a CAPA by id', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    const c = await QualityAssuranceService.getCapa('mem-c1');
    assert.ok(c);
    assert.equal(c!.title, 'Fix surface scratch issue');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCapaRow({ type: 'qa_defect' });
    const c = await QualityAssuranceService.getCapa('mem-c1');
    assert.equal(c, null);
  });

  it('lists CAPAs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_capa') return [makeCapaRow()];
      return [];
    };
    const list = await QualityAssuranceService.listCapas('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a CAPA', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    memUpdateImpl = async (args) => makeCapaRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await QualityAssuranceService.updateCapa('mem-c1', { status: 'in_progress' });
    assert.ok(c);
    assert.equal(c!.status, 'in_progress');
  });

  it('deletes a CAPA', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await QualityAssuranceService.deleteCapa('mem-c1');
    assert.equal(ok, true);
  });

  it('startCapa sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    memUpdateImpl = async (args) => makeCapaRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await QualityAssuranceService.startCapa('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'in_progress');
  });

  it('implementCapa sets status to implemented', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    memUpdateImpl = async (args) => makeCapaRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await QualityAssuranceService.implementCapa('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'implemented');
  });

  it('verifyCapa sets status to verified', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    memUpdateImpl = async (args) => makeCapaRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await QualityAssuranceService.verifyCapa('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'verified');
  });

  it('closeCapa sets status to closed', async () => {
    memFindUniqueImpl = async () => makeCapaRow();
    memUpdateImpl = async (args) => makeCapaRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await QualityAssuranceService.closeCapa('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'closed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Audits
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityAssuranceService — Audits', () => {
  beforeEach(() => resetMock());

  it('creates an audit with defaults', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await QualityAssuranceService.createAudit('org-1', 'ws-1', {
      name: 'New Audit', type: 'system',
    }, 'user-1');
    assert.equal(a.name, 'New Audit');
    assert.equal(a.status, 'planned');
    assert.equal(a.type, 'system');
  });

  it('creates an audit with full input', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await QualityAssuranceService.createAudit('org-1', 'ws-1', {
      name: 'Supplier Audit', type: 'supplier', description: 'Supplier review',
      status: 'scheduled', auditor: 'Alice', auditedEntity: 'Acme Corp',
      scheduledDate: '2028-06-01', scope: 'Quality systems',
      findings: 'Minor issues', recommendations: 'Improve docs',
      notes: 'Follow up',
    }, 'user-1');
    assert.equal(a.name, 'Supplier Audit');
    assert.equal(a.type, 'supplier');
    assert.equal(a.auditor, 'Alice');
    assert.equal(a.auditedEntity, 'Acme Corp');
  });

  it('gets an audit by id', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    const a = await QualityAssuranceService.getAudit('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Q1 Process Audit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAuditRow({ type: 'qa_inspection' });
    const a = await QualityAssuranceService.getAudit('mem-a1');
    assert.equal(a, null);
  });

  it('lists audits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_audit') return [makeAuditRow()];
      return [];
    };
    const list = await QualityAssuranceService.listAudits('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an audit', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await QualityAssuranceService.updateAudit('mem-a1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an audit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await QualityAssuranceService.deleteAudit('mem-a1');
    assert.equal(ok, true);
  });

  it('scheduleAudit sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await QualityAssuranceService.scheduleAudit('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'scheduled');
  });

  it('startAudit sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await QualityAssuranceService.startAudit('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeAudit sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await QualityAssuranceService.completeAudit('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityAssuranceService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getQualityAssuranceMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_defect') return [
        makeDefectRow({ content: JSON.stringify({ title: 'D1', type: 'cosmetic', severity: 'critical', status: 'open', identifiedBy: '', description: '', resolvedBy: '', rootCause: '', resolution: '', notes: '' }) }),
        makeDefectRow({ id: 'd2', content: JSON.stringify({ title: 'D2', type: 'functional', severity: 'major', status: 'investigating', identifiedBy: '', description: '', resolvedBy: '', rootCause: '', resolution: '', notes: '' }) }),
        makeDefectRow({ id: 'd3', content: JSON.stringify({ title: 'D3', type: 'cosmetic', severity: 'minor', status: 'closed', identifiedBy: '', description: '', resolvedBy: '', rootCause: '', resolution: '', notes: '' }) }),
      ];
      if (t === 'qa_capa') return [
        makeCapaRow({ content: JSON.stringify({ title: 'C1', type: 'corrective', priority: 'medium', status: 'open', assignedTo: '', description: '', rootCause: '', action: '', verifiedBy: '', notes: '' }) }),
        makeCapaRow({ id: 'c2', content: JSON.stringify({ title: 'C2', type: 'preventive', priority: 'high', status: 'verified', assignedTo: '', description: '', rootCause: '', action: '', verifiedBy: '', notes: '' }) }),
        makeCapaRow({ id: 'c3', content: JSON.stringify({ title: 'C3', type: 'corrective', priority: 'low', status: 'closed', assignedTo: '', description: '', rootCause: '', action: '', verifiedBy: '', notes: '' }) }),
      ];
      if (t === 'qa_inspection') return [
        makeRow({ content: JSON.stringify({ type: 'incoming', status: 'passed', result: 'pass', productName: '', inspector: '', location: '', sampleSize: 0, defectsFound: 0, notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ type: 'final', status: 'failed', result: 'fail', productName: '', inspector: '', location: '', sampleSize: 0, defectsFound: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await QualityAssuranceService.getQualityAssuranceMetrics('org-1');
    assert.equal(m.openDefects, 2);
    assert.equal(m.criticalDefects, 1);
    assert.equal(m.openCapas, 1);
    assert.equal(m.capaCompletionRate, 67);
    assert.equal(m.inspectionPassRate, 50);
  });

  it('getQualityAssuranceStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'qa_inspection') return [makeRow()];
      if (t === 'qa_defect') return [makeDefectRow()];
      if (t === 'qa_capa') return [makeCapaRow()];
      if (t === 'qa_audit') return [makeAuditRow()];
      return [];
    };
    const s = await QualityAssuranceService.getQualityAssuranceStats('org-1');
    assert.equal(s.inspectionCount, 1);
    assert.equal(s.defectCount, 1);
    assert.equal(s.capaCount, 1);
    assert.equal(s.auditCount, 1);
    assert.equal(s.byInspectionType['incoming'], 1);
    assert.equal(s.byDefectSeverity['minor'], 1);
    assert.equal(s.byCapaStatus['open'], 1);
    assert.equal(s.byAuditType['process'], 1);
  });
});
