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
let memDeleteShouldThrow = false;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      if (memDeleteShouldThrow) return Promise.reject(new Error('not found'));
      return memDeleteImpl(args);
    },
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
    type: 'vendor_compliance',
    content: JSON.stringify({
      vendorId: 'mem-v1',
      type: 'insurance',
      name: 'General Liability Insurance',
      status: 'compliant',
      expiryDate: '2028-01-01',
      documentUrl: 'https://example.com/doc.pdf',
      notes: 'Renewed annually',
    }),
    source: 'user',
    sourceId: 'mem-v1',
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['vendor_compliance', 'insurance', 'compliant']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeExpiredRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-2',
    content: JSON.stringify({
      vendorId: 'mem-v2',
      type: 'certification',
      name: 'ISO 9001',
      status: 'expired',
      expiryDate: '2020-01-01',
      documentUrl: '',
      notes: '',
    }),
    sourceId: 'mem-v2',
    tags: JSON.stringify(['vendor_compliance', 'certification', 'expired']),
    ...overrides,
  });
}

function makeNonCompliantRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-3',
    content: JSON.stringify({
      vendorId: 'mem-v3',
      type: 'security',
      name: 'SOC 2 Audit',
      status: 'non_compliant',
      expiryDate: '2028-01-01',
      documentUrl: '',
      notes: '',
    }),
    sourceId: 'mem-v3',
    tags: JSON.stringify(['vendor_compliance', 'security', 'non_compliant']),
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
  memDeleteShouldThrow = false;
}

const { VendorComplianceService } = await import('@/lib/services/vendor-compliance-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — VendorComplianceService CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorComplianceService — CRUD', () => {
  beforeEach(() => resetMock());

  it('creates a compliance record with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await VendorComplianceService.create('org-1', {
      vendorId: 'mem-v1', type: 'insurance', name: 'GL Insurance', status: 'pending', createdBy: 'user-1',
    });
    assert.equal(c.vendorId, 'mem-v1');
    assert.equal(c.type, 'insurance');
    assert.equal(c.status, 'pending');
    assert.equal(c.documentUrl, '');
    assert.equal(c.notes, '');
  });

  it('creates a compliance record with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const c = await VendorComplianceService.create('org-1', {
      vendorId: 'mem-v1', type: 'certification', name: 'ISO 14001', status: 'compliant',
      expiryDate: '2028-12-31', documentUrl: 'https://example.com/iso.pdf',
      notes: 'Valid for 3 years', workspaceId: 'ws-1', createdBy: 'user-1',
    });
    assert.equal(c.name, 'ISO 14001');
    assert.equal(c.type, 'certification');
    assert.equal(c.status, 'compliant');
    assert.equal(c.documentUrl, 'https://example.com/iso.pdf');
    assert.ok(c.expiryDate);
  });

  it('gets a compliance record by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const c = await VendorComplianceService.get('mem-1');
    assert.ok(c);
    assert.equal(c!.id, 'mem-1');
    assert.equal(c!.name, 'General Liability Insurance');
  });

  it('returns null when compliance record not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await VendorComplianceService.get('nope');
    assert.equal(c, null);
  });

  it('lists compliance records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_compliance') return [makeRow()];
      return [];
    };
    const list = await VendorComplianceService.list('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'General Liability Insurance');
  });

  it('lists compliance records filtered by vendorId', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.sourceId === 'mem-v1') return [makeRow()];
      return [];
    };
    const list = await VendorComplianceService.list('org-1', { vendorId: 'mem-v1' });
    assert.equal(list.length, 1);
  });

  it('lists compliance records filtered by type', async () => {
    memFindManyImpl = async () => [makeRow(), makeExpiredRow()];
    const list = await VendorComplianceService.list('org-1', { type: 'insurance' });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'insurance');
  });

  it('lists compliance records filtered by status', async () => {
    memFindManyImpl = async () => [makeRow(), makeNonCompliantRow()];
    const list = await VendorComplianceService.list('org-1', { status: 'non_compliant' });
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'non_compliant');
  });

  it('updates a compliance record', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const c = await VendorComplianceService.update('mem-1', { status: 'non_compliant', notes: 'Lapsed' });
    assert.ok(c);
    assert.equal(c!.status, 'non_compliant');
    assert.equal(c!.notes, 'Lapsed');
  });

  it('update returns null when record not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await VendorComplianceService.update('nope', { status: 'compliant' });
    assert.equal(c, null);
  });

  it('deletes a compliance record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await VendorComplianceService.delete('mem-1');
    assert.equal(ok, true);
  });

  it('delete returns false when record does not exist', async () => {
    memDeleteShouldThrow = true;
    const ok = await VendorComplianceService.delete('nope');
    assert.equal(ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — VendorComplianceService vendor & lifecycle helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorComplianceService — vendor & lifecycle helpers', () => {
  beforeEach(() => resetMock());

  it('getByVendor returns all compliance records for a vendor', async () => {
    memFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.sourceId === 'mem-v1') return [makeRow()];
      return [];
    };
    const list = await VendorComplianceService.getByVendor('mem-v1');
    assert.equal(list.length, 1);
    assert.equal(list[0].vendorId, 'mem-v1');
  });

  it('getNonCompliant returns non_compliant and expired records', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_compliance') return [makeRow(), makeExpiredRow(), makeNonCompliantRow()];
      return [];
    };
    const list = await VendorComplianceService.getNonCompliant('org-1');
    assert.equal(list.length, 2);
  });

  it('getExpiring returns records expiring within the threshold', async () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_compliance') return [
        makeRow({ content: JSON.stringify({ vendorId: 'mem-v1', type: 'insurance', name: 'Soon', status: 'compliant', expiryDate: soon, documentUrl: '', notes: '' }) }),
        makeExpiredRow(),
      ];
      return [];
    };
    const list = await VendorComplianceService.getExpiring('org-1', 30);
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Soon');
  });

  it('getExpiring uses default 30 days', async () => {
    const soon = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_compliance') return [
        makeRow({ content: JSON.stringify({ vendorId: 'mem-v1', type: 'insurance', name: 'Soon', status: 'compliant', expiryDate: soon, documentUrl: '', notes: '' }) }),
      ];
      return [];
    };
    const list = await VendorComplianceService.getExpiring('org-1');
    assert.equal(list.length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — VendorComplianceService stats
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorComplianceService — stats', () => {
  beforeEach(() => resetMock());

  it('getStats returns correct counts and breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'vendor_compliance') return [makeRow(), makeExpiredRow(), makeNonCompliantRow()];
      return [];
    };
    const s = await VendorComplianceService.getStats('org-1');
    assert.equal(s.totalRecords, 3);
    assert.equal(s.byType.insurance, 1);
    assert.equal(s.byType.certification, 1);
    assert.equal(s.byType.security, 1);
    assert.equal(s.byStatus.compliant, 1);
    assert.equal(s.byStatus.expired, 1);
    assert.equal(s.byStatus.non_compliant, 1);
    assert.equal(s.nonCompliantCount, 2);
  });

  it('getStats returns empty breakdowns when no records', async () => {
    memFindManyImpl = async () => [];
    const s = await VendorComplianceService.getStats('org-1');
    assert.equal(s.totalRecords, 0);
    assert.equal(s.nonCompliantCount, 0);
    assert.equal(s.byType.insurance, 0);
    assert.equal(s.byStatus.compliant, 0);
  });
});
