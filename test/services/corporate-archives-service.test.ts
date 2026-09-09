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
    type: 'archive_record',
    content: JSON.stringify({
      title: 'Annual Report 2027',
      type: 'corporate',
      description: 'Annual corporate report',
      status: 'active',
      collectionId: null,
      dateCreated: '2028-01-01',
      dateArchived: null,
      retentionPeriod: '10 years',
      location: 'Vault A',
      boxNumber: 'B-001',
      folderNumber: 'F-001',
      format: 'paper',
      restricted: false,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['archive_record', 'corporate', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCollectionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'archive_collection',
    content: JSON.stringify({
      name: 'Founder Papers',
      type: 'executive_papers',
      description: 'Papers of the founder',
      status: 'open',
      curator: 'Jane Doe',
      dateRange: '1980-2020',
      extent: '50 boxes',
      accessPolicy: 'Restricted',
      notes: '',
    }),
    tags: JSON.stringify(['archive_collection', 'executive_papers', 'open']),
    ...overrides,
  });
}

function makeAccessRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-ac1',
    type: 'archive_access',
    content: JSON.stringify({
      recordId: 'mem-1',
      collectionId: null,
      requester: 'Researcher A',
      type: 'research',
      description: 'Academic research',
      status: 'requested',
      requestDate: '2028-02-01',
      approvalDate: null,
      fulfillmentDate: null,
      purpose: 'Book research',
      restrictions: 'No reproduction',
      notes: '',
    }),
    tags: JSON.stringify(['archive_access', 'research', 'requested']),
    ...overrides,
  });
}

function makeDigitizationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'archive_digitization',
    content: JSON.stringify({
      recordId: 'mem-1',
      type: 'document',
      description: 'Scan annual report',
      status: 'planned',
      priority: 'medium',
      assignedTo: 'Scanner Team',
      startDate: null,
      completedDate: null,
      fileFormat: 'PDF',
      fileSize: 0,
      resolution: '300dpi',
      qualityScore: 0,
      notes: '',
    }),
    tags: JSON.stringify(['archive_digitization', 'document', 'planned']),
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

const { CorporateArchivesService } = await import('@/lib/services/corporate-archives-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Records
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateArchivesService — Records', () => {
  beforeEach(() => resetMock());

  it('creates a record with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await CorporateArchivesService.createRecord('org-1', 'ws-1', {
      title: 'Board Minutes', type: 'board',
    }, 'user-1');
    assert.strictEqual(r.title, 'Board Minutes');
    assert.strictEqual(r.status, 'active');
    assert.strictEqual(r.restricted, false);
  });

  it('creates a record with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await CorporateArchivesService.createRecord('org-1', 'ws-1', {
      title: 'Legal Contract', type: 'legal', description: 'M&A agreement',
      status: 'restricted', collectionId: 'mem-c1', dateCreated: '2028-01-01',
      dateArchived: '2028-06-01', retentionPeriod: '7 years',
      location: 'Vault B', boxNumber: 'B-010', folderNumber: 'F-005',
      format: 'paper', restricted: true, notes: 'Confidential',
    }, 'user-1');
    assert.strictEqual(r.title, 'Legal Contract');
    assert.strictEqual(r.type, 'legal');
    assert.strictEqual(r.restricted, true);
    assert.strictEqual(r.collectionId, 'mem-c1');
  });

  it('gets a record by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const r = await CorporateArchivesService.getRecord('mem-1');
    assert.ok(r);
    assert.strictEqual(r!.id, 'mem-1');
    assert.strictEqual(r!.title, 'Annual Report 2027');
  });

  it('returns null when record not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await CorporateArchivesService.getRecord('nope');
    assert.strictEqual(r, null);
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'archive_collection' });
    const r = await CorporateArchivesService.getRecord('mem-1');
    assert.strictEqual(r, null);
  });

  it('lists records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_record') return [makeRow()];
      return [];
    };
    const list = await CorporateArchivesService.listRecords('org-1');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].title, 'Annual Report 2027');
  });

  it('updates a record', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await CorporateArchivesService.updateRecord('mem-1', { status: 'archived' });
    assert.ok(r);
    assert.strictEqual(r!.status, 'archived');
  });

  it('deletes a record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CorporateArchivesService.deleteRecord('mem-1');
    assert.strictEqual(ok, true);
  });

  it('archiveRecord sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await CorporateArchivesService.archiveRecord('mem-1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'archived');
    assert.ok(r!.dateArchived);
  });

  it('destroyRecord sets status to destroyed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await CorporateArchivesService.destroyRecord('mem-1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'destroyed');
  });

  it('transferRecord sets status to transferred', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await CorporateArchivesService.transferRecord('mem-1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'transferred');
  });

  it('restrictRecord sets status to restricted and restricted flag', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await CorporateArchivesService.restrictRecord('mem-1', 'user-1');
    assert.ok(r);
    assert.strictEqual(r!.status, 'restricted');
    assert.strictEqual(r!.restricted, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Collections
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateArchivesService — Collections', () => {
  beforeEach(() => resetMock());

  it('creates a collection with defaults', async () => {
    memCreateImpl = async (args) => makeCollectionRow({ content: args.data.content as string });
    const c = await CorporateArchivesService.createCollection('org-1', 'ws-1', {
      name: 'Photo Archive', type: 'photo_archive',
    }, 'user-1');
    assert.strictEqual(c.name, 'Photo Archive');
    assert.strictEqual(c.status, 'open');
    assert.strictEqual(c.curator, '');
  });

  it('creates a collection with full input', async () => {
    memCreateImpl = async (args) => makeCollectionRow({ content: args.data.content as string });
    const c = await CorporateArchivesService.createCollection('org-1', 'ws-1', {
      name: 'Marketing Archive', type: 'marketing_archive', description: 'Historical ads',
      status: 'processing', curator: 'Alice', dateRange: '1990-2025',
      extent: '100 boxes', accessPolicy: 'Public', notes: 'Digitized',
    }, 'user-1');
    assert.strictEqual(c.name, 'Marketing Archive');
    assert.strictEqual(c.type, 'marketing_archive');
    assert.strictEqual(c.curator, 'Alice');
    assert.strictEqual(c.extent, '100 boxes');
  });

  it('gets a collection by id', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    const c = await CorporateArchivesService.getCollection('mem-c1');
    assert.ok(c);
    assert.strictEqual(c!.name, 'Founder Papers');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCollectionRow({ type: 'archive_record' });
    const c = await CorporateArchivesService.getCollection('mem-c1');
    assert.strictEqual(c, null);
  });

  it('lists collections by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_collection') return [makeCollectionRow()];
      return [];
    };
    const list = await CorporateArchivesService.listCollections('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a collection', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CorporateArchivesService.updateCollection('mem-c1', { status: 'closed' });
    assert.ok(c);
    assert.strictEqual(c!.status, 'closed');
  });

  it('deletes a collection', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await CorporateArchivesService.deleteCollection('mem-c1');
    assert.strictEqual(ok, true);
  });

  it('closeCollection sets status to closed', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CorporateArchivesService.closeCollection('mem-c1', 'user-1');
    assert.ok(c);
    assert.strictEqual(c!.status, 'closed');
  });

  it('processCollection sets status to processing', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CorporateArchivesService.processCollection('mem-c1', 'user-1');
    assert.ok(c);
    assert.strictEqual(c!.status, 'processing');
  });

  it('restrictCollection sets status to restricted', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CorporateArchivesService.restrictCollection('mem-c1', 'user-1');
    assert.ok(c);
    assert.strictEqual(c!.status, 'restricted');
  });

  it('deprecateCollection sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeCollectionRow();
    memUpdateImpl = async (args) => makeCollectionRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CorporateArchivesService.deprecateCollection('mem-c1', 'user-1');
    assert.ok(c);
    assert.strictEqual(c!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Access
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateArchivesService — Access', () => {
  beforeEach(() => resetMock());

  it('creates an access request with defaults', async () => {
    memCreateImpl = async (args) => makeAccessRow({ content: args.data.content as string });
    const a = await CorporateArchivesService.createAccess('org-1', 'ws-1', {
      requester: 'Professor X', type: 'research',
    }, 'user-1');
    assert.strictEqual(a.requester, 'Professor X');
    assert.strictEqual(a.status, 'requested');
    assert.strictEqual(a.purpose, '');
  });

  it('creates an access request with full input', async () => {
    memCreateImpl = async (args) => makeAccessRow({ content: args.data.content as string });
    const a = await CorporateArchivesService.createAccess('org-1', 'ws-1', {
      recordId: 'mem-1', collectionId: 'mem-c1', requester: 'Lawyer Y',
      type: 'legal_hold', description: 'Litigation hold', status: 'approved',
      requestDate: '2028-01-15', approvalDate: '2028-01-20',
      fulfillmentDate: '2028-01-25', purpose: 'Litigation',
      restrictions: 'Confidential', notes: 'High priority',
    }, 'user-1');
    assert.strictEqual(a.requester, 'Lawyer Y');
    assert.strictEqual(a.type, 'legal_hold');
    assert.strictEqual(a.restrictions, 'Confidential');
  });

  it('gets an access request by id', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    const a = await CorporateArchivesService.getAccess('mem-ac1');
    assert.ok(a);
    assert.strictEqual(a!.requester, 'Researcher A');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAccessRow({ type: 'archive_record' });
    const a = await CorporateArchivesService.getAccess('mem-ac1');
    assert.strictEqual(a, null);
  });

  it('lists access requests by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_access') return [makeAccessRow()];
      return [];
    };
    const list = await CorporateArchivesService.listAccess('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates an access request', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.updateAccess('mem-ac1', { status: 'approved' });
    assert.ok(a);
    assert.strictEqual(a!.status, 'approved');
  });

  it('deletes an access request', async () => {
    memDeleteImpl = async () => ({ id: 'mem-ac1' });
    const ok = await CorporateArchivesService.deleteAccess('mem-ac1');
    assert.strictEqual(ok, true);
  });

  it('approveAccess sets status to approved', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.approveAccess('mem-ac1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'approved');
    assert.ok(a!.approvalDate);
  });

  it('denyAccess sets status to denied', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.denyAccess('mem-ac1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'denied');
  });

  it('fulfillAccess sets status to fulfilled', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.fulfillAccess('mem-ac1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'fulfilled');
    assert.ok(a!.fulfillmentDate);
  });

  it('expireAccess sets status to expired', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.expireAccess('mem-ac1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'expired');
  });

  it('revokeAccess sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeAccessRow();
    memUpdateImpl = async (args) => makeAccessRow({ id: 'mem-ac1', content: args.data.content as string });
    const a = await CorporateArchivesService.revokeAccess('mem-ac1', 'user-1');
    assert.ok(a);
    assert.strictEqual(a!.status, 'revoked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Digitization
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateArchivesService — Digitization', () => {
  beforeEach(() => resetMock());

  it('creates a digitization with defaults', async () => {
    memCreateImpl = async (args) => makeDigitizationRow({ content: args.data.content as string });
    const d = await CorporateArchivesService.createDigitization('org-1', 'ws-1', {
      recordId: 'mem-1', type: 'photo',
    }, 'user-1');
    assert.strictEqual(d.type, 'photo');
    assert.strictEqual(d.status, 'planned');
    assert.strictEqual(d.priority, 'medium');
  });

  it('creates a digitization with full input', async () => {
    memCreateImpl = async (args) => makeDigitizationRow({ content: args.data.content as string });
    const d = await CorporateArchivesService.createDigitization('org-1', 'ws-1', {
      recordId: 'mem-1', type: 'blueprint', description: 'Scan blueprints',
      status: 'in_progress', priority: 'high', assignedTo: 'Scan Team B',
      startDate: '2028-03-01', fileFormat: 'TIFF',
      fileSize: 50000000, resolution: '600dpi', qualityScore: 0, notes: 'Large format',
    }, 'user-1');
    assert.strictEqual(d.type, 'blueprint');
    assert.strictEqual(d.priority, 'high');
    assert.strictEqual(d.fileFormat, 'TIFF');
    assert.strictEqual(d.fileSize, 50000000);
  });

  it('gets a digitization by id', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    const d = await CorporateArchivesService.getDigitization('mem-d1');
    assert.ok(d);
    assert.strictEqual(d!.type, 'document');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow({ type: 'archive_record' });
    const d = await CorporateArchivesService.getDigitization('mem-d1');
    assert.strictEqual(d, null);
  });

  it('lists digitizations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_digitization') return [makeDigitizationRow()];
      return [];
    };
    const list = await CorporateArchivesService.listDigitization('org-1');
    assert.strictEqual(list.length, 1);
  });

  it('updates a digitization', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.updateDigitization('mem-d1', { status: 'in_progress' });
    assert.ok(d);
    assert.strictEqual(d!.status, 'in_progress');
  });

  it('deletes a digitization', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await CorporateArchivesService.deleteDigitization('mem-d1');
    assert.strictEqual(ok, true);
  });

  it('startDigitization sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.startDigitization('mem-d1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'in_progress');
    assert.ok(d!.startDate);
  });

  it('completeDigitization sets status to completed', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.completeDigitization('mem-d1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'completed');
    assert.ok(d!.completedDate);
  });

  it('failDigitization sets status to failed', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.failDigitization('mem-d1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'failed');
  });

  it('qualityCheckDigitization sets status to quality_check', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.qualityCheckDigitization('mem-d1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 'quality_check');
  });

  it('reDigitize sets status to re_digitized', async () => {
    memFindUniqueImpl = async () => makeDigitizationRow();
    memUpdateImpl = async (args) => makeDigitizationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await CorporateArchivesService.reDigitize('mem-d1', 'user-1');
    assert.ok(d);
    assert.strictEqual(d!.status, 're_digitized');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateArchivesService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCorporateArchivesMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_record') return [
        makeRow({ content: JSON.stringify({ title: 'R1', type: 'corporate', description: '', status: 'active', collectionId: null, dateCreated: null, dateArchived: null, retentionPeriod: '', location: '', boxNumber: '', folderNumber: '', format: '', restricted: false, notes: '' }) }),
        makeRow({ id: 'r2', content: JSON.stringify({ title: 'R2', type: 'corporate', description: '', status: 'archived', collectionId: null, dateCreated: null, dateArchived: null, retentionPeriod: '', location: '', boxNumber: '', folderNumber: '', format: '', restricted: false, notes: '' }) }),
      ];
      if (t === 'archive_collection') return [
        makeCollectionRow({ content: JSON.stringify({ name: 'C1', type: 'corporate_history', description: '', status: 'open', curator: '', dateRange: '', extent: '', accessPolicy: '', notes: '' }) }),
      ];
      if (t === 'archive_access') return [
        makeAccessRow({ content: JSON.stringify({ recordId: null, collectionId: null, requester: 'X', type: 'research', description: '', status: 'requested', requestDate: null, approvalDate: null, fulfillmentDate: null, purpose: '', restrictions: '', notes: '' }) }),
      ];
      if (t === 'archive_digitization') return [
        makeDigitizationRow({ content: JSON.stringify({ recordId: 'r1', type: 'document', description: '', status: 'in_progress', priority: 'medium', assignedTo: '', startDate: null, completedDate: null, fileFormat: '', fileSize: 0, resolution: '', qualityScore: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await CorporateArchivesService.getCorporateArchivesMetrics('org-1');
    assert.strictEqual(m.activeRecords, 1);
    assert.strictEqual(m.archivedRecords, 1);
    assert.strictEqual(m.openCollections, 1);
    assert.strictEqual(m.pendingAccessRequests, 1);
    assert.strictEqual(m.inProgressDigitization, 1);
  });

  it('getCorporateArchivesStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'archive_record') return [makeRow()];
      if (t === 'archive_collection') return [makeCollectionRow()];
      if (t === 'archive_access') return [makeAccessRow()];
      if (t === 'archive_digitization') return [makeDigitizationRow()];
      return [];
    };
    const s = await CorporateArchivesService.getCorporateArchivesStats('org-1');
    assert.strictEqual(s.recordCount, 1);
    assert.strictEqual(s.collectionCount, 1);
    assert.strictEqual(s.accessCount, 1);
    assert.strictEqual(s.digitizationCount, 1);
    assert.strictEqual(s.byRecordType['corporate'], 1);
    assert.strictEqual(s.byCollectionStatus['open'], 1);
    assert.strictEqual(s.byAccessStatus['requested'], 1);
    assert.strictEqual(s.byDigitizationStatus['planned'], 1);
  });
});
