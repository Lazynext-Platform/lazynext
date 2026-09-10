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
    type: 'records_schedule',
    content: JSON.stringify({
      name: 'Financial Records Retention',
      type: 'financial',
      description: 'Annual financial records',
      status: 'draft',
      retentionYears: 7,
      retentionDays: 0,
      triggerEvent: 'fiscal_year_end',
      disposition: 'destroy',
      department: 'Finance',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['records_schedule', 'financial', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeItemRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-i1',
    type: 'records_item',
    content: JSON.stringify({
      title: 'Invoice 2028',
      type: 'paper',
      description: 'Annual invoice',
      status: 'active',
      scheduleId: 'mem-1',
      department: 'Finance',
      location: 'Archive A',
      boxNumber: 'BOX-001',
      dateCreated: '2028-01-01',
      dateInactive: null,
      retentionEndDate: '2035-01-01',
      restricted: false,
      notes: '',
    }),
    tags: JSON.stringify(['records_item', 'paper', 'active']),
    ...overrides,
  });
}

function makeDisposalRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'records_disposal',
    content: JSON.stringify({
      itemId: 'mem-i1',
      type: 'destruction',
      description: 'Shred old invoices',
      status: 'scheduled',
      scheduledDate: '2028-06-01',
      executedDate: null,
      approvedBy: '',
      method: 'shredding',
      witness: '',
      certificate: '',
      notes: '',
    }),
    tags: JSON.stringify(['records_disposal', 'destruction', 'scheduled']),
    ...overrides,
  });
}

function makeHoldRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-h1',
    type: 'records_legal_hold',
    content: JSON.stringify({
      title: 'Litigation Hold Q1',
      type: 'litigation',
      description: 'Hold for pending litigation',
      status: 'active',
      issuedBy: 'Legal Dept',
      issuedDate: '2028-02-01',
      releasedDate: null,
      matterNumber: 'M-2028-001',
      scope: 'All financial records 2025-2028',
      affectedItems: ['mem-i1'],
      notes: '',
    }),
    tags: JSON.stringify(['records_legal_hold', 'litigation', 'active']),
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

const { RecordsManagementService } = await import('@/lib/services/records-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Schedules
// ─────────────────────────────────────────────────────────────────────────────

describe('RecordsManagementService — Schedules', () => {
  beforeEach(() => resetMock());

  it('creates a schedule with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await RecordsManagementService.createSchedule('org-1', 'ws-1', {
      name: 'Tax Records', type: 'tax',
    }, 'user-1');
    assert.equal(s.name, 'Tax Records');
    assert.equal(s.status, 'draft');
    assert.equal(s.retentionYears, 0);
    assert.equal(s.retentionDays, 0);
  });

  it('creates a schedule with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await RecordsManagementService.createSchedule('org-1', 'ws-1', {
      name: 'HR Records', type: 'hr', description: 'HR retention schedule',
      status: 'active', retentionYears: 10, retentionDays: 30,
      triggerEvent: 'termination', disposition: 'transfer',
      department: 'HR', notes: 'Keep for 10 years',
    }, 'user-1');
    assert.equal(s.name, 'HR Records');
    assert.equal(s.type, 'hr');
    assert.equal(s.retentionYears, 10);
    assert.equal(s.retentionDays, 30);
    assert.equal(s.status, 'active');
  });

  it('gets a schedule by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await RecordsManagementService.getSchedule('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.name, 'Financial Records Retention');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'records_item' });
    const s = await RecordsManagementService.getSchedule('mem-1');
    assert.equal(s, null);
  });

  it('returns null when schedule not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await RecordsManagementService.getSchedule('nope');
    assert.equal(s, null);
  });

  it('lists schedules by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_schedule') return [makeRow()];
      return [];
    };
    const list = await RecordsManagementService.listSchedules('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Financial Records Retention');
  });

  it('updates a schedule', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await RecordsManagementService.updateSchedule('mem-1', { status: 'active' });
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('deletes a schedule', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await RecordsManagementService.deleteSchedule('mem-1');
    assert.equal(ok, true);
  });

  it('activateSchedule sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await RecordsManagementService.activateSchedule('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('supersedeSchedule sets status to superseded', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await RecordsManagementService.supersedeSchedule('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'superseded');
  });

  it('reviewSchedule sets status to under_review', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await RecordsManagementService.reviewSchedule('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'under_review');
  });

  it('archiveSchedule sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await RecordsManagementService.archiveSchedule('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Items
// ─────────────────────────────────────────────────────────────────────────────

describe('RecordsManagementService — Items', () => {
  beforeEach(() => resetMock());

  it('creates an item with defaults', async () => {
    memCreateImpl = async (args) => makeItemRow({ content: args.data.content as string });
    const i = await RecordsManagementService.createItem('org-1', 'ws-1', {
      title: 'Tax Form 2028', type: 'paper',
    }, 'user-1');
    assert.equal(i.title, 'Tax Form 2028');
    assert.equal(i.status, 'active');
    assert.equal(i.restricted, false);
  });

  it('creates an item with full input', async () => {
    memCreateImpl = async (args) => makeItemRow({ content: args.data.content as string });
    const i = await RecordsManagementService.createItem('org-1', 'ws-1', {
      title: 'Contract File', type: 'mixed', description: 'Vendor contracts',
      status: 'inactive', scheduleId: 'mem-1', department: 'Legal',
      location: 'Vault B', boxNumber: 'BOX-002',
      dateCreated: '2028-01-01', dateInactive: '2028-06-01',
      retentionEndDate: '2033-01-01', restricted: true, notes: 'Confidential',
    }, 'user-1');
    assert.equal(i.title, 'Contract File');
    assert.equal(i.type, 'mixed');
    assert.equal(i.restricted, true);
    assert.equal(i.department, 'Legal');
  });

  it('gets an item by id', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    const i = await RecordsManagementService.getItem('mem-i1');
    assert.ok(i);
    assert.equal(i!.title, 'Invoice 2028');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeItemRow({ type: 'records_schedule' });
    const i = await RecordsManagementService.getItem('mem-i1');
    assert.equal(i, null);
  });

  it('returns null when item not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await RecordsManagementService.getItem('nope');
    assert.equal(i, null);
  });

  it('lists items by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_item') return [makeItemRow()];
      return [];
    };
    const list = await RecordsManagementService.listItems('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an item', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.updateItem('mem-i1', { status: 'inactive' });
    assert.ok(i);
    assert.equal(i!.status, 'inactive');
  });

  it('deletes an item', async () => {
    memDeleteImpl = async () => ({ id: 'mem-i1' });
    const ok = await RecordsManagementService.deleteItem('mem-i1');
    assert.equal(ok, true);
  });

  it('archiveItem sets status to archived', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.archiveItem('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'archived');
  });

  it('disposeItem sets status to disposed', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.disposeItem('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'disposed');
  });

  it('holdItem sets status to on_hold', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.holdItem('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'on_hold');
  });

  it('transferItem sets status to transferred', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.transferItem('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'transferred');
  });

  it('reviewItem sets status to pending_review', async () => {
    memFindUniqueImpl = async () => makeItemRow();
    memUpdateImpl = async (args) => makeItemRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await RecordsManagementService.reviewItem('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'pending_review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Disposals
// ─────────────────────────────────────────────────────────────────────────────

describe('RecordsManagementService — Disposals', () => {
  beforeEach(() => resetMock());

  it('creates a disposal with defaults', async () => {
    memCreateImpl = async (args) => makeDisposalRow({ content: args.data.content as string });
    const d = await RecordsManagementService.createDisposal('org-1', 'ws-1', {
      itemId: 'mem-i1', type: 'destruction',
    }, 'user-1');
    assert.equal(d.itemId, 'mem-i1');
    assert.equal(d.status, 'scheduled');
    assert.equal(d.method, '');
  });

  it('creates a disposal with full input', async () => {
    memCreateImpl = async (args) => makeDisposalRow({ content: args.data.content as string });
    const d = await RecordsManagementService.createDisposal('org-1', 'ws-1', {
      itemId: 'mem-i1', type: 'shredding', description: 'Shred documents',
      status: 'approved', scheduledDate: '2028-08-01', executedDate: '2028-08-15',
      approvedBy: 'Jane', method: 'cross-cut shredding', witness: 'Bob',
      certificate: 'CERT-001', notes: 'Witnessed disposal',
    }, 'user-1');
    assert.equal(d.type, 'shredding');
    assert.equal(d.approvedBy, 'Jane');
    assert.equal(d.witness, 'Bob');
    assert.equal(d.certificate, 'CERT-001');
  });

  it('gets a disposal by id', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    const d = await RecordsManagementService.getDisposal('mem-d1');
    assert.ok(d);
    assert.equal(d!.itemId, 'mem-i1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDisposalRow({ type: 'records_item' });
    const d = await RecordsManagementService.getDisposal('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when disposal not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await RecordsManagementService.getDisposal('nope');
    assert.equal(d, null);
  });

  it('lists disposals by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_disposal') return [makeDisposalRow()];
      return [];
    };
    const list = await RecordsManagementService.listDisposals('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a disposal', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.updateDisposal('mem-d1', { status: 'approved' });
    assert.ok(d);
    assert.equal(d!.status, 'approved');
  });

  it('deletes a disposal', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await RecordsManagementService.deleteDisposal('mem-d1');
    assert.equal(ok, true);
  });

  it('approveDisposal sets status to approved', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.approveDisposal('mem-d1', 'Jane');
    assert.ok(d);
    assert.equal(d!.status, 'approved');
    assert.equal(d!.approvedBy, 'Jane');
  });

  it('executeDisposal sets status to executed', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.executeDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'executed');
  });

  it('cancelDisposal sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.cancelDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'cancelled');
  });

  it('postponeDisposal sets status to postponed', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.postponeDisposal('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'postponed');
  });

  it('verifyDisposal sets status to verified', async () => {
    memFindUniqueImpl = async () => makeDisposalRow();
    memUpdateImpl = async (args) => makeDisposalRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await RecordsManagementService.verifyDisposal('mem-d1', 'Bob');
    assert.ok(d);
    assert.equal(d!.status, 'verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Legal Holds
// ─────────────────────────────────────────────────────────────────────────────

describe('RecordsManagementService — Legal Holds', () => {
  beforeEach(() => resetMock());

  it('creates a legal hold with defaults', async () => {
    memCreateImpl = async (args) => makeHoldRow({ content: args.data.content as string });
    const h = await RecordsManagementService.createLegalHold('org-1', 'ws-1', {
      title: 'Audit Hold', type: 'audit',
    }, 'user-1');
    assert.equal(h.title, 'Audit Hold');
    assert.equal(h.status, 'active');
    assert.equal(h.affectedItems.length, 0);
  });

  it('creates a legal hold with full input', async () => {
    memCreateImpl = async (args) => makeHoldRow({ content: args.data.content as string });
    const h = await RecordsManagementService.createLegalHold('org-1', 'ws-1', {
      title: 'Regulatory Hold', type: 'regulatory', description: 'SEC investigation',
      status: 'active', issuedBy: 'Compliance', issuedDate: '2028-03-01',
      matterNumber: 'SEC-2028-01', scope: 'All emails 2026-2028',
      affectedItems: ['mem-i1', 'mem-i2'], notes: 'Do not destroy',
    }, 'user-1');
    assert.equal(h.title, 'Regulatory Hold');
    assert.equal(h.type, 'regulatory');
    assert.equal(h.issuedBy, 'Compliance');
    assert.equal(h.affectedItems.length, 2);
  });

  it('gets a legal hold by id', async () => {
    memFindUniqueImpl = async () => makeHoldRow();
    const h = await RecordsManagementService.getLegalHold('mem-h1');
    assert.ok(h);
    assert.equal(h!.title, 'Litigation Hold Q1');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeHoldRow({ type: 'records_schedule' });
    const h = await RecordsManagementService.getLegalHold('mem-h1');
    assert.equal(h, null);
  });

  it('returns null when legal hold not found', async () => {
    memFindUniqueImpl = async () => null;
    const h = await RecordsManagementService.getLegalHold('nope');
    assert.equal(h, null);
  });

  it('lists legal holds by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_legal_hold') return [makeHoldRow()];
      return [];
    };
    const list = await RecordsManagementService.listLegalHolds('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a legal hold', async () => {
    memFindUniqueImpl = async () => makeHoldRow();
    memUpdateImpl = async (args) => makeHoldRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await RecordsManagementService.updateLegalHold('mem-h1', { scope: 'Updated scope' });
    assert.ok(h);
    assert.equal(h!.scope, 'Updated scope');
  });

  it('deletes a legal hold', async () => {
    memDeleteImpl = async () => ({ id: 'mem-h1' });
    const ok = await RecordsManagementService.deleteLegalHold('mem-h1');
    assert.equal(ok, true);
  });

  it('releaseHold sets status to released', async () => {
    memFindUniqueImpl = async () => makeHoldRow();
    memUpdateImpl = async (args) => makeHoldRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await RecordsManagementService.releaseHold('mem-h1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'released');
  });

  it('expireHold sets status to expired', async () => {
    memFindUniqueImpl = async () => makeHoldRow();
    memUpdateImpl = async (args) => makeHoldRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await RecordsManagementService.expireHold('mem-h1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'expired');
  });

  it('cancelHold sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeHoldRow();
    memUpdateImpl = async (args) => makeHoldRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await RecordsManagementService.cancelHold('mem-h1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('RecordsManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getRecordsManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_schedule') return [
        makeRow({ content: JSON.stringify({ name: 'S1', type: 'financial', status: 'active', description: '', retentionYears: 0, retentionDays: 0, triggerEvent: '', disposition: '', department: '', notes: '' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ name: 'S2', type: 'tax', status: 'draft', description: '', retentionYears: 0, retentionDays: 0, triggerEvent: '', disposition: '', department: '', notes: '' }) }),
      ];
      if (t === 'records_item') return [
        makeItemRow({ content: JSON.stringify({ title: 'I1', type: 'paper', status: 'active', description: '', scheduleId: null, department: '', location: '', boxNumber: '', dateCreated: null, dateInactive: null, retentionEndDate: null, restricted: false, notes: '' }) }),
        makeItemRow({ id: 'i2', content: JSON.stringify({ title: 'I2', type: 'paper', status: 'archived', description: '', scheduleId: null, department: '', location: '', boxNumber: '', dateCreated: null, dateInactive: null, retentionEndDate: null, restricted: false, notes: '' }) }),
      ];
      if (t === 'records_disposal') return [
        makeDisposalRow({ content: JSON.stringify({ itemId: 'i1', type: 'destruction', status: 'scheduled', description: '', scheduledDate: null, executedDate: null, approvedBy: '', method: '', witness: '', certificate: '', notes: '' }) }),
        makeDisposalRow({ id: 'd2', content: JSON.stringify({ itemId: 'i2', type: 'destruction', status: 'approved', description: '', scheduledDate: null, executedDate: null, approvedBy: '', method: '', witness: '', certificate: '', notes: '' }) }),
      ];
      if (t === 'records_legal_hold') return [
        makeHoldRow({ content: JSON.stringify({ title: 'H1', type: 'litigation', status: 'active', description: '', issuedBy: '', issuedDate: null, releasedDate: null, matterNumber: '', scope: '', affectedItems: [], notes: '' }) }),
      ];
      return [];
    };
    const m = await RecordsManagementService.getRecordsManagementMetrics('org-1');
    assert.equal(m.activeSchedules, 1);
    assert.equal(m.activeItems, 1);
    assert.equal(m.archivedItems, 1);
    assert.equal(m.pendingDisposals, 2);
    assert.equal(m.activeHolds, 1);
  });

  it('getRecordsManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'records_schedule') return [makeRow()];
      if (t === 'records_item') return [makeItemRow()];
      if (t === 'records_disposal') return [makeDisposalRow()];
      if (t === 'records_legal_hold') return [makeHoldRow()];
      return [];
    };
    const s = await RecordsManagementService.getRecordsManagementStats('org-1');
    assert.equal(s.scheduleCount, 1);
    assert.equal(s.itemCount, 1);
    assert.equal(s.disposalCount, 1);
    assert.equal(s.legalHoldCount, 1);
    assert.equal(s.byScheduleType['financial'], 1);
    assert.equal(s.byItemType['paper'], 1);
    assert.equal(s.byDisposalStatus['scheduled'], 1);
    assert.equal(s.byHoldStatus['active'], 1);
  });
});
