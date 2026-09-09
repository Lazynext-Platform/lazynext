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
    type: 'patent_application',
    content: JSON.stringify({
      title: 'Neural Network Processor',
      type: 'utility',
      description: 'A novel processor architecture',
      status: 'draft',
      applicationNumber: 'US-12345',
      filingDate: '2028-01-01',
      priorityDate: '2028-01-01',
      inventor: 'Jane Doe',
      assignee: 'Tech Corp',
      jurisdiction: 'US',
      classification: 'G06N',
      abstract: 'A processor for neural networks',
      claims: '1. A processor comprising...',
      statusDate: '2028-01-01',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['patent_application', 'utility', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeDocumentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'patent_document',
    content: JSON.stringify({
      applicationId: 'mem-1',
      type: 'specification',
      title: 'Patent Specification',
      description: 'Full specification document',
      status: 'filed',
      fileName: 'spec.pdf',
      fileUrl: '/docs/spec.pdf',
      filedDate: '2028-01-01',
      pageCount: 42,
      notes: '',
    }),
    tags: JSON.stringify(['patent_document', 'specification']),
    ...overrides,
  });
}

function makeLicenseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'patent_license',
    content: JSON.stringify({
      applicationId: 'mem-1',
      licensee: 'Acme Corp',
      type: 'exclusive',
      description: 'Exclusive license for US market',
      status: 'draft',
      startDate: '2028-01-01',
      endDate: '2028-12-31',
      royaltyRate: 5,
      upfrontFee: 50000,
      territory: 'US',
      fieldOfUse: 'All fields',
      terms: 'Standard terms',
      notes: '',
    }),
    tags: JSON.stringify(['patent_license', 'exclusive', 'draft']),
    ...overrides,
  });
}

function makeMaintenanceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'patent_maintenance',
    content: JSON.stringify({
      applicationId: 'mem-1',
      type: 'renewal',
      amount: 1600,
      currency: 'USD',
      status: 'pending',
      dueDate: '2028-06-01',
      paidDate: null,
      jurisdiction: 'US',
      description: '3.5 year renewal',
      notes: '',
    }),
    tags: JSON.stringify(['patent_maintenance', 'renewal', 'pending']),
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

const { PatentManagementService } = await import('@/lib/services/patent-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Applications
// ─────────────────────────────────────────────────────────────────────────────

describe('PatentManagementService — Applications', () => {
  beforeEach(() => resetMock());

  it('creates an application with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await PatentManagementService.createApplication('org-1', 'ws-1', {
      title: 'AI Chip', type: 'utility',
    }, 'user-1');
    assert.equal(a.title, 'AI Chip');
    assert.equal(a.status, 'draft');
    assert.equal(a.applicationNumber, '');
    assert.equal(a.inventor, '');
  });

  it('creates an application with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await PatentManagementService.createApplication('org-1', 'ws-1', {
      title: 'Quantum Chip', type: 'design', description: 'Quantum design',
      status: 'filed', applicationNumber: 'US-99999', filingDate: '2028-01-01', priorityDate: '2028-01-01',
      inventor: 'Alice', assignee: 'Quantum Inc', jurisdiction: 'US',
      classification: 'H01L', abstract: 'A quantum chip', claims: '1. A chip...',
      statusDate: '2028-01-01', notes: 'High priority',
    }, 'user-1');
    assert.equal(a.title, 'Quantum Chip');
    assert.equal(a.type, 'design');
    assert.equal(a.inventor, 'Alice');
    assert.equal(a.status, 'filed');
    assert.equal(a.applicationNumber, 'US-99999');
  });

  it('gets an application by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await PatentManagementService.getApplication('mem-1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-1');
    assert.equal(a!.title, 'Neural Network Processor');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'patent_document' });
    const a = await PatentManagementService.getApplication('mem-1');
    assert.equal(a, null);
  });

  it('returns null when application not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await PatentManagementService.getApplication('nope');
    assert.equal(a, null);
  });

  it('lists applications by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_application') return [makeRow()];
      return [];
    };
    const list = await PatentManagementService.listApplications('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Neural Network Processor');
  });

  it('updates an application', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.updateApplication('mem-1', { status: 'granted' });
    assert.ok(a);
    assert.equal(a!.status, 'granted');
  });

  it('deletes an application', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PatentManagementService.deleteApplication('mem-1');
    assert.equal(ok, true);
  });

  it('fileApplication sets status to filed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.fileApplication('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'filed');
  });

  it('examineApplication sets status to under_examination', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.examineApplication('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'under_examination');
  });

  it('officeAction sets status to office_action', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.officeAction('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'office_action');
  });

  it('grantApplication sets status to granted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.grantApplication('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'granted');
  });

  it('rejectApplication sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.rejectApplication('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'rejected');
  });

  it('abandonApplication sets status to abandoned', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await PatentManagementService.abandonApplication('mem-1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'abandoned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Documents
// ─────────────────────────────────────────────────────────────────────────────

describe('PatentManagementService — Documents', () => {
  beforeEach(() => resetMock());

  it('creates a document with defaults', async () => {
    memCreateImpl = async (args) => makeDocumentRow({ content: args.data.content as string });
    const d = await PatentManagementService.createDocument('org-1', 'ws-1', {
      applicationId: 'mem-1', type: 'claims', title: 'Patent Claims',
    }, 'user-1');
    assert.equal(d.title, 'Patent Claims');
    assert.equal(d.status, '');
    assert.equal(d.pageCount, 0);
  });

  it('creates a document with full input', async () => {
    memCreateImpl = async (args) => makeDocumentRow({ content: args.data.content as string });
    const d = await PatentManagementService.createDocument('org-1', 'ws-1', {
      applicationId: 'mem-1', type: 'drawings', title: 'Technical Drawings',
      description: 'Patent drawings', status: 'filed',
      fileName: 'drawings.pdf', fileUrl: '/docs/drawings.pdf',
      filedDate: '2028-01-01', pageCount: 15, notes: 'Updated',
    }, 'user-1');
    assert.equal(d.title, 'Technical Drawings');
    assert.equal(d.type, 'drawings');
    assert.equal(d.pageCount, 15);
    assert.equal(d.fileName, 'drawings.pdf');
  });

  it('gets a document by id', async () => {
    memFindUniqueImpl = async () => makeDocumentRow();
    const d = await PatentManagementService.getDocument('mem-d1');
    assert.ok(d);
    assert.equal(d!.title, 'Patent Specification');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDocumentRow({ type: 'patent_application' });
    const d = await PatentManagementService.getDocument('mem-d1');
    assert.equal(d, null);
  });

  it('lists documents by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_document') return [makeDocumentRow()];
      return [];
    };
    const list = await PatentManagementService.listDocuments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a document', async () => {
    memFindUniqueImpl = async () => makeDocumentRow();
    memUpdateImpl = async (args) => makeDocumentRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await PatentManagementService.updateDocument('mem-d1', { status: 'approved' });
    assert.ok(d);
    assert.equal(d!.status, 'approved');
  });

  it('deletes a document', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await PatentManagementService.deleteDocument('mem-d1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Licenses
// ─────────────────────────────────────────────────────────────────────────────

describe('PatentManagementService — Licenses', () => {
  beforeEach(() => resetMock());

  it('creates a license with defaults', async () => {
    memCreateImpl = async (args) => makeLicenseRow({ content: args.data.content as string });
    const l = await PatentManagementService.createLicense('org-1', 'ws-1', {
      applicationId: 'mem-1', licensee: 'Beta LLC', type: 'non_exclusive',
    }, 'user-1');
    assert.equal(l.licensee, 'Beta LLC');
    assert.equal(l.status, 'draft');
    assert.equal(l.royaltyRate, 0);
  });

  it('creates a license with full input', async () => {
    memCreateImpl = async (args) => makeLicenseRow({ content: args.data.content as string });
    const l = await PatentManagementService.createLicense('org-1', 'ws-1', {
      applicationId: 'mem-1', licensee: 'Gamma Inc', type: 'exclusive',
      description: 'Exclusive worldwide', status: 'active',
      startDate: '2028-01-01', endDate: '2028-12-31',
      royaltyRate: 10, upfrontFee: 100000,
      territory: 'Worldwide', fieldOfUse: 'Electronics',
      terms: '5 year term', notes: 'Negotiated',
    }, 'user-1');
    assert.equal(l.licensee, 'Gamma Inc');
    assert.equal(l.type, 'exclusive');
    assert.equal(l.royaltyRate, 10);
    assert.equal(l.upfrontFee, 100000);
    assert.equal(l.status, 'active');
  });

  it('gets a license by id', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    const l = await PatentManagementService.getLicense('mem-l1');
    assert.ok(l);
    assert.equal(l!.licensee, 'Acme Corp');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLicenseRow({ type: 'patent_application' });
    const l = await PatentManagementService.getLicense('mem-l1');
    assert.equal(l, null);
  });

  it('lists licenses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_license') return [makeLicenseRow()];
      return [];
    };
    const list = await PatentManagementService.listLicenses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a license', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PatentManagementService.updateLicense('mem-l1', { royaltyRate: 15 });
    assert.ok(l);
    assert.equal(l!.royaltyRate, 15);
  });

  it('deletes a license', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await PatentManagementService.deleteLicense('mem-l1');
    assert.equal(ok, true);
  });

  it('activateLicense sets status to active', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PatentManagementService.activateLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('expireLicense sets status to expired', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PatentManagementService.expireLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'expired');
  });

  it('terminateLicense sets status to terminated', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PatentManagementService.terminateLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'terminated');
  });

  it('revokeLicense sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await PatentManagementService.revokeLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'revoked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Maintenance
// ─────────────────────────────────────────────────────────────────────────────

describe('PatentManagementService — Maintenance', () => {
  beforeEach(() => resetMock());

  it('creates a maintenance record with defaults', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await PatentManagementService.createMaintenance('org-1', 'ws-1', {
      applicationId: 'mem-1', type: 'annuity', amount: 500,
    }, 'user-1');
    assert.equal(m.type, 'annuity');
    assert.equal(m.status, 'pending');
    assert.equal(m.currency, 'USD');
  });

  it('creates a maintenance record with full input', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await PatentManagementService.createMaintenance('org-1', 'ws-1', {
      applicationId: 'mem-1', type: 'issue_fee', amount: 1000,
      currency: 'EUR', status: 'paid',
      dueDate: '2028-03-01', paidDate: '2028-02-15',
      jurisdiction: 'EU', description: 'Issue fee payment', notes: 'Paid early',
    }, 'user-1');
    assert.equal(m.type, 'issue_fee');
    assert.equal(m.amount, 1000);
    assert.equal(m.currency, 'EUR');
    assert.equal(m.status, 'paid');
  });

  it('gets a maintenance record by id', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    const m = await PatentManagementService.getMaintenance('mem-m1');
    assert.ok(m);
    assert.equal(m!.type, 'renewal');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow({ type: 'patent_application' });
    const m = await PatentManagementService.getMaintenance('mem-m1');
    assert.equal(m, null);
  });

  it('lists maintenance records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_maintenance') return [makeMaintenanceRow()];
      return [];
    };
    const list = await PatentManagementService.listMaintenance('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a maintenance record', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PatentManagementService.updateMaintenance('mem-m1', { amount: 2000 });
    assert.ok(m);
    assert.equal(m!.amount, 2000);
  });

  it('deletes a maintenance record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await PatentManagementService.deleteMaintenance('mem-m1');
    assert.equal(ok, true);
  });

  it('payMaintenance sets status to paid', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PatentManagementService.payMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'paid');
  });

  it('overdueMaintenance sets status to overdue', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PatentManagementService.overdueMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'overdue');
  });

  it('lapseMaintenance sets status to lapsed', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PatentManagementService.lapseMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'lapsed');
  });

  it('waiveMaintenance sets status to waived', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PatentManagementService.waiveMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'waived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PatentManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPatentManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_application') return [
        makeRow({ content: JSON.stringify({ title: 'A1', type: 'utility', status: 'granted', inventor: '', assignee: '', description: '', applicationNumber: '', jurisdiction: '', classification: '', abstract: '', claims: '', notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ title: 'A2', type: 'design', status: 'under_examination', inventor: '', assignee: '', description: '', applicationNumber: '', jurisdiction: '', classification: '', abstract: '', claims: '', notes: '' }) }),
        makeRow({ id: 'a3', content: JSON.stringify({ title: 'A3', type: 'utility', status: 'office_action', inventor: '', assignee: '', description: '', applicationNumber: '', jurisdiction: '', classification: '', abstract: '', claims: '', notes: '' }) }),
      ];
      if (t === 'patent_license') return [
        makeLicenseRow({ content: JSON.stringify({ applicationId: 'mem-1', licensee: 'L1', type: 'exclusive', status: 'active', description: '', startDate: '2028-01-01', endDate: '2028-12-31', royaltyRate: 5, upfrontFee: 0, territory: '', fieldOfUse: '', terms: '', notes: '' }) }),
        makeLicenseRow({ id: 'l2', content: JSON.stringify({ applicationId: 'mem-1', licensee: 'L2', type: 'non_exclusive', status: 'expired', description: '', startDate: '2028-01-01', endDate: '2028-12-31', royaltyRate: 0, upfrontFee: 0, territory: '', fieldOfUse: '', terms: '', notes: '' }) }),
      ];
      if (t === 'patent_maintenance') return [
        makeMaintenanceRow({ content: JSON.stringify({ applicationId: 'mem-1', type: 'renewal', amount: 500, currency: 'USD', status: 'pending', dueDate: '2028-06-01', paidDate: null, jurisdiction: '', description: '', notes: '' }) }),
        makeMaintenanceRow({ id: 'm2', content: JSON.stringify({ applicationId: 'mem-1', type: 'annuity', amount: 300, currency: 'USD', status: 'paid', dueDate: '2028-06-01', paidDate: '2028-05-01', jurisdiction: '', description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await PatentManagementService.getPatentManagementMetrics('org-1');
    assert.equal(m.totalApplications, 3);
    assert.equal(m.grantedPatents, 1);
    assert.equal(m.pendingExamination, 2);
    assert.equal(m.activeLicenses, 1);
    assert.equal(m.pendingMaintenanceFees, 1);
  });

  it('getPatentManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'patent_application') return [makeRow()];
      if (t === 'patent_document') return [makeDocumentRow()];
      if (t === 'patent_license') return [makeLicenseRow()];
      if (t === 'patent_maintenance') return [makeMaintenanceRow()];
      return [];
    };
    const s = await PatentManagementService.getPatentManagementStats('org-1');
    assert.equal(s.applicationCount, 1);
    assert.equal(s.documentCount, 1);
    assert.equal(s.licenseCount, 1);
    assert.equal(s.maintenanceCount, 1);
    assert.equal(s.byApplicationType['utility'], 1);
    assert.equal(s.byApplicationStatus['draft'], 1);
    assert.equal(s.byLicenseType['exclusive'], 1);
    assert.equal(s.byLicenseStatus['draft'], 1);
    assert.equal(s.byMaintenanceType['renewal'], 1);
    assert.equal(s.byMaintenanceStatus['pending'], 1);
  });
});
