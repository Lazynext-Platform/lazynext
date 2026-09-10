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
    type: 'env_permit',
    content: JSON.stringify({
      name: 'Air Quality Permit',
      type: 'air',
      description: 'Facility air quality permit',
      status: 'pending',
      permitNumber: 'PER-001',
      issuingAuthority: 'EPA',
      facility: 'Plant A',
      validFrom: '2028-01-01',
      validTo: '2028-12-31',
      conditions: 'Quarterly reporting',
      inspectionDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['env_permit', 'air', 'pending']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeEmissionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-e1',
    type: 'emission_record',
    content: JSON.stringify({
      type: 'co2',
      scope: 'scope1',
      description: 'CO2 emissions from boiler',
      status: 'measured',
      facility: 'Plant A',
      source: 'Boiler',
      amount: 500,
      unit: 'tCO2e',
      measurementDate: '2028-01-15',
      reportingPeriod: '2028-Q1',
      verifiedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['emission_record', 'co2', 'scope1', 'measured']),
    ...overrides,
  });
}

function makeWasteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-w1',
    type: 'waste_record',
    content: JSON.stringify({
      type: 'hazardous',
      description: 'Hazardous chemical waste',
      status: 'generated',
      facility: 'Plant A',
      source: 'Production',
      amount: 100,
      unit: 'kg',
      disposalMethod: 'incineration',
      contractor: 'HazMat Co',
      generatedDate: '2028-02-01',
      disposedDate: null,
      manifestNumber: 'MAN-100',
      notes: '',
    }),
    tags: JSON.stringify(['waste_record', 'hazardous', 'generated']),
    ...overrides,
  });
}

function makeReportRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'env_report',
    content: JSON.stringify({
      title: 'Annual Compliance Report',
      type: 'annual',
      description: 'Annual environmental compliance report',
      status: 'draft',
      period: '2028',
      author: 'Jane Doe',
      submittedDate: null,
      approvedDate: null,
      findings: 'All permits active',
      recommendations: 'Improve waste tracking',
      attachments: [],
      notes: '',
    }),
    tags: JSON.stringify(['env_report', 'annual', 'draft']),
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

const { EnvironmentalComplianceService } = await import('@/lib/services/environmental-compliance-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Permits
// ─────────────────────────────────────────────────────────────────────────────

describe('EnvironmentalComplianceService — Permits', () => {
  beforeEach(() => resetMock());

  it('creates a permit with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await EnvironmentalComplianceService.createPermit('org-1', 'ws-1', {
      name: 'Water Discharge Permit', type: 'water',
    }, 'user-1');
    assert.equal(p.name, 'Water Discharge Permit');
    assert.equal(p.status, 'pending');
    assert.equal(p.permitNumber, '');
  });

  it('creates a permit with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await EnvironmentalComplianceService.createPermit('org-1', 'ws-1', {
      name: 'Stormwater Permit', type: 'stormwater', description: 'Stormwater discharge',
      status: 'active', permitNumber: 'SW-200', issuingAuthority: 'DEQ',
      facility: 'Plant B', validFrom: '2028-01-01', validTo: '2029-12-31',
      conditions: 'Monthly monitoring', inspectionDate: '2028-06-01', notes: 'Annual renewal',
    }, 'user-1');
    assert.equal(p.name, 'Stormwater Permit');
    assert.equal(p.type, 'stormwater');
    assert.equal(p.permitNumber, 'SW-200');
    assert.equal(p.issuingAuthority, 'DEQ');
  });

  it('gets a permit by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await EnvironmentalComplianceService.getPermit('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Air Quality Permit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'emission_record' });
    const p = await EnvironmentalComplianceService.getPermit('mem-1');
    assert.equal(p, null);
  });

  it('returns null when permit not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await EnvironmentalComplianceService.getPermit('nope');
    assert.equal(p, null);
  });

  it('lists permits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'env_permit') return [makeRow()];
      return [];
    };
    const list = await EnvironmentalComplianceService.listPermits('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Air Quality Permit');
  });

  it('updates a permit', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EnvironmentalComplianceService.updatePermit('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a permit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EnvironmentalComplianceService.deletePermit('mem-1');
    assert.equal(ok, true);
  });

  it('activatePermit sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EnvironmentalComplianceService.activatePermit('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('suspendPermit sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EnvironmentalComplianceService.suspendPermit('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'suspended');
  });

  it('revokePermit sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await EnvironmentalComplianceService.revokePermit('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'revoked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Emissions
// ─────────────────────────────────────────────────────────────────────────────

describe('EnvironmentalComplianceService — Emissions', () => {
  beforeEach(() => resetMock());

  it('creates an emission with defaults', async () => {
    memCreateImpl = async (args) => makeEmissionRow({ content: args.data.content as string });
    const e = await EnvironmentalComplianceService.createEmission('org-1', 'ws-1', {
      type: 'nox', scope: 'scope1',
    }, 'user-1');
    assert.equal(e.type, 'nox');
    assert.equal(e.status, 'measured');
    assert.equal(e.amount, 0);
  });

  it('creates an emission with full input', async () => {
    memCreateImpl = async (args) => makeEmissionRow({ content: args.data.content as string });
    const e = await EnvironmentalComplianceService.createEmission('org-1', 'ws-1', {
      type: 'sox', scope: 'scope1', description: 'SOx from furnace',
      status: 'estimated', facility: 'Plant C', source: 'Furnace',
      amount: 200, unit: 'kg', measurementDate: '2028-03-01',
      reportingPeriod: '2028-Q1', verifiedBy: 'Bob', notes: 'Estimated value',
    }, 'user-1');
    assert.equal(e.type, 'sox');
    assert.equal(e.scope, 'scope1');
    assert.equal(e.amount, 200);
    assert.equal(e.verifiedBy, 'Bob');
  });

  it('gets an emission by id', async () => {
    memFindUniqueImpl = async () => makeEmissionRow();
    const e = await EnvironmentalComplianceService.getEmission('mem-e1');
    assert.ok(e);
    assert.equal(e!.type, 'co2');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeEmissionRow({ type: 'env_permit' });
    const e = await EnvironmentalComplianceService.getEmission('mem-e1');
    assert.equal(e, null);
  });

  it('returns null when emission not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await EnvironmentalComplianceService.getEmission('nope');
    assert.equal(e, null);
  });

  it('lists emissions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'emission_record') return [makeEmissionRow()];
      return [];
    };
    const list = await EnvironmentalComplianceService.listEmissions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an emission', async () => {
    memFindUniqueImpl = async () => makeEmissionRow();
    memUpdateImpl = async (args) => makeEmissionRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EnvironmentalComplianceService.updateEmission('mem-e1', { status: 'reported' });
    assert.ok(e);
    assert.equal(e!.status, 'reported');
  });

  it('deletes an emission', async () => {
    memDeleteImpl = async () => ({ id: 'mem-e1' });
    const ok = await EnvironmentalComplianceService.deleteEmission('mem-e1');
    assert.equal(ok, true);
  });

  it('reportEmission sets status to reported', async () => {
    memFindUniqueImpl = async () => makeEmissionRow();
    memUpdateImpl = async (args) => makeEmissionRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EnvironmentalComplianceService.reportEmission('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'reported');
  });

  it('verifyEmission sets status to verified', async () => {
    memFindUniqueImpl = async () => makeEmissionRow();
    memUpdateImpl = async (args) => makeEmissionRow({ id: 'mem-e1', content: args.data.content as string });
    const e = await EnvironmentalComplianceService.verifyEmission('mem-e1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Wastes
// ─────────────────────────────────────────────────────────────────────────────

describe('EnvironmentalComplianceService — Wastes', () => {
  beforeEach(() => resetMock());

  it('creates a waste with defaults', async () => {
    memCreateImpl = async (args) => makeWasteRow({ content: args.data.content as string });
    const w = await EnvironmentalComplianceService.createWaste('org-1', 'ws-1', {
      type: 'industrial',
    }, 'user-1');
    assert.equal(w.type, 'industrial');
    assert.equal(w.status, 'generated');
    assert.equal(w.amount, 0);
  });

  it('creates a waste with full input', async () => {
    memCreateImpl = async (args) => makeWasteRow({ content: args.data.content as string });
    const w = await EnvironmentalComplianceService.createWaste('org-1', 'ws-1', {
      type: 'recyclable', description: 'Recyclable cardboard',
      status: 'stored', facility: 'Plant A', source: 'Packaging',
      amount: 300, unit: 'kg', disposalMethod: 'recycling',
      contractor: 'GreenWaste', generatedDate: '2028-04-01',
      disposedDate: '2028-04-15', manifestNumber: 'MAN-200', notes: 'Recyclable material',
    }, 'user-1');
    assert.equal(w.type, 'recyclable');
    assert.equal(w.amount, 300);
    assert.equal(w.contractor, 'GreenWaste');
  });

  it('gets a waste by id', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    const w = await EnvironmentalComplianceService.getWaste('mem-w1');
    assert.ok(w);
    assert.equal(w!.type, 'hazardous');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeWasteRow({ type: 'env_permit' });
    const w = await EnvironmentalComplianceService.getWaste('mem-w1');
    assert.equal(w, null);
  });

  it('returns null when waste not found', async () => {
    memFindUniqueImpl = async () => null;
    const w = await EnvironmentalComplianceService.getWaste('nope');
    assert.equal(w, null);
  });

  it('lists wastes by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'waste_record') return [makeWasteRow()];
      return [];
    };
    const list = await EnvironmentalComplianceService.listWastes('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a waste', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    memUpdateImpl = async (args) => makeWasteRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EnvironmentalComplianceService.updateWaste('mem-w1', { status: 'transported' });
    assert.ok(w);
    assert.equal(w!.status, 'transported');
  });

  it('deletes a waste', async () => {
    memDeleteImpl = async () => ({ id: 'mem-w1' });
    const ok = await EnvironmentalComplianceService.deleteWaste('mem-w1');
    assert.equal(ok, true);
  });

  it('transportWaste sets status to transported', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    memUpdateImpl = async (args) => makeWasteRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EnvironmentalComplianceService.transportWaste('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'transported');
  });

  it('treatWaste sets status to treated', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    memUpdateImpl = async (args) => makeWasteRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EnvironmentalComplianceService.treatWaste('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'treated');
  });

  it('disposeWaste sets status to disposed', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    memUpdateImpl = async (args) => makeWasteRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EnvironmentalComplianceService.disposeWaste('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'disposed');
  });

  it('recycleWaste sets status to recycled', async () => {
    memFindUniqueImpl = async () => makeWasteRow();
    memUpdateImpl = async (args) => makeWasteRow({ id: 'mem-w1', content: args.data.content as string });
    const w = await EnvironmentalComplianceService.recycleWaste('mem-w1', 'user-1');
    assert.ok(w);
    assert.equal(w!.status, 'recycled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Reports
// ─────────────────────────────────────────────────────────────────────────────

describe('EnvironmentalComplianceService — Reports', () => {
  beforeEach(() => resetMock());

  it('creates a report with defaults', async () => {
    memCreateImpl = async (args) => makeReportRow({ content: args.data.content as string });
    const r = await EnvironmentalComplianceService.createReport('org-1', 'ws-1', {
      title: 'Quarterly Compliance Report', type: 'quarterly',
    }, 'user-1');
    assert.equal(r.title, 'Quarterly Compliance Report');
    assert.equal(r.status, 'draft');
    assert.equal(r.author, '');
  });

  it('creates a report with full input', async () => {
    memCreateImpl = async (args) => makeReportRow({ content: args.data.content as string });
    const r = await EnvironmentalComplianceService.createReport('org-1', 'ws-1', {
      title: 'Incident Report', type: 'incident', description: 'Chemical spill incident',
      status: 'submitted', period: '2028-Q1', author: 'Alice',
      submittedDate: '2028-03-15',
      findings: 'Spill contained', recommendations: 'Improve containment',
      attachments: ['report.pdf'], notes: 'Follow-up required',
    }, 'user-1');
    assert.equal(r.title, 'Incident Report');
    assert.equal(r.type, 'incident');
    assert.equal(r.author, 'Alice');
    assert.equal(r.attachments.length, 1);
  });

  it('gets a report by id', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    const r = await EnvironmentalComplianceService.getReport('mem-r1');
    assert.ok(r);
    assert.equal(r!.title, 'Annual Compliance Report');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeReportRow({ type: 'env_permit' });
    const r = await EnvironmentalComplianceService.getReport('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when report not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await EnvironmentalComplianceService.getReport('nope');
    assert.equal(r, null);
  });

  it('lists reports by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'env_report') return [makeReportRow()];
      return [];
    };
    const list = await EnvironmentalComplianceService.listReports('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a report', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnvironmentalComplianceService.updateReport('mem-r1', { status: 'submitted' });
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('deletes a report', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await EnvironmentalComplianceService.deleteReport('mem-r1');
    assert.equal(ok, true);
  });

  it('submitReport sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnvironmentalComplianceService.submitReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'submitted');
  });

  it('approveReport sets status to approved', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnvironmentalComplianceService.approveReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'approved');
  });

  it('rejectReport sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeReportRow();
    memUpdateImpl = async (args) => makeReportRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await EnvironmentalComplianceService.rejectReport('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'rejected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('EnvironmentalComplianceService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getEnvironmentalComplianceMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'env_permit') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'air', status: 'active', description: '', permitNumber: '', issuingAuthority: '', facility: '', validFrom: null, validTo: null, conditions: '', inspectionDate: null, notes: '' }) }),
      ];
      if (t === 'emission_record') return [
        makeEmissionRow({ content: JSON.stringify({ type: 'co2', scope: 'scope1', status: 'verified', description: '', facility: '', source: '', amount: 100, unit: '', measurementDate: null, reportingPeriod: '', verifiedBy: '', notes: '' }) }),
        makeEmissionRow({ id: 'e2', content: JSON.stringify({ type: 'nox', scope: 'scope1', status: 'measured', description: '', facility: '', source: '', amount: 50, unit: '', measurementDate: null, reportingPeriod: '', verifiedBy: '', notes: '' }) }),
      ];
      if (t === 'waste_record') return [
        makeWasteRow({ content: JSON.stringify({ type: 'recyclable', status: 'recycled', description: '', facility: '', source: '', amount: 200, unit: '', disposalMethod: '', contractor: '', generatedDate: null, disposedDate: null, manifestNumber: '', notes: '' }) }),
      ];
      if (t === 'env_report') return [
        makeReportRow({ content: JSON.stringify({ title: 'R1', type: 'annual', status: 'draft', description: '', period: '', author: '', submittedDate: null, approvedDate: null, findings: '', recommendations: '', attachments: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await EnvironmentalComplianceService.getEnvironmentalComplianceMetrics('org-1');
    assert.equal(m.activePermits, 1);
    assert.equal(m.totalEmissions, 150);
    assert.equal(m.verifiedEmissions, 100);
    assert.equal(m.recycledWaste, 200);
    assert.equal(m.pendingReports, 1);
  });

  it('getEnvironmentalComplianceStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'env_permit') return [makeRow()];
      if (t === 'emission_record') return [makeEmissionRow()];
      if (t === 'waste_record') return [makeWasteRow()];
      if (t === 'env_report') return [makeReportRow()];
      return [];
    };
    const s = await EnvironmentalComplianceService.getEnvironmentalComplianceStats('org-1');
    assert.equal(s.permitCount, 1);
    assert.equal(s.emissionCount, 1);
    assert.equal(s.wasteCount, 1);
    assert.equal(s.reportCount, 1);
    assert.equal(s.byPermitType['air'], 1);
    assert.equal(s.byEmissionType['co2'], 1);
    assert.equal(s.byWasteType['hazardous'], 1);
    assert.equal(s.byReportType['annual'], 1);
  });
});
