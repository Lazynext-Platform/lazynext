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
    type: 'asset_item',
    content: JSON.stringify({
      name: 'MacBook Pro',
      category: 'it_equipment',
      assetTag: 'AST-001',
      serialNumber: 'SN-001',
      description: 'Laptop',
      status: 'available',
      condition: 'good',
      location: 'HQ',
      department: 'Engineering',
      purchaseDate: '2028-01-01',
      purchasePrice: 2000,
      currentValue: 1500,
      supplier: 'Apple',
      warrantyExpiry: '2029-01-01',
      insuranceValue: 2000,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['asset_item', 'it_equipment', 'available', 'good']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAssignmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'asset_assignment',
    content: JSON.stringify({
      assetId: 'mem-1',
      assignedTo: 'user-2',
      assignedToName: 'Jane Doe',
      status: 'active',
      assignedDate: '2028-02-01',
      returnDate: null,
      expectedReturnDate: '2028-08-01',
      conditionAtAssignment: 'good',
      notes: '',
    }),
    tags: JSON.stringify(['asset_assignment', 'active']),
    ...overrides,
  });
}

function makeDepreciationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'depreciation_record',
    content: JSON.stringify({
      assetId: 'mem-1',
      method: 'straight_line',
      status: 'active',
      purchasePrice: 2000,
      salvageValue: 200,
      usefulLife: 5,
      annualDepreciation: 360,
      accumulatedDepreciation: 360,
      currentValue: 1640,
      startDate: '2028-01-01',
      endDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['depreciation_record', 'straight_line', 'active']),
    ...overrides,
  });
}

function makeAuditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-u1',
    type: 'asset_audit',
    content: JSON.stringify({
      name: 'Annual Physical Audit',
      type: 'physical',
      description: 'Annual physical asset audit',
      status: 'planned',
      auditor: 'Jane Doe',
      scheduledDate: '2028-03-01',
      completedDate: null,
      scope: 'All assets',
      findings: '',
      discrepancies: '',
      notes: '',
    }),
    tags: JSON.stringify(['asset_audit', 'physical', 'planned']),
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

const { AssetTrackingService } = await import('@/lib/services/asset-tracking-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assets
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetTrackingService — Assets', () => {
  beforeEach(() => resetMock());

  it('creates an asset with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAsset('org-1', 'ws-1', {
      name: 'Monitor', category: 'it_equipment',
    }, 'user-1');
    assert.equal(a.name, 'Monitor');
    assert.equal(a.status, 'available');
    assert.equal(a.condition, 'good');
    assert.equal(a.purchasePrice, 0);
  });

  it('creates an asset with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAsset('org-1', 'ws-1', {
      name: 'Server Rack', category: 'machinery', assetTag: 'SR-001', serialNumber: 'SN-002',
      description: 'Server rack', status: 'in_repair', condition: 'fair', location: 'Data Center',
      department: 'IT', purchaseDate: '2028-01-01', purchasePrice: 5000, currentValue: 4000,
      supplier: 'Dell', warrantyExpiry: '2029-01-01', insuranceValue: 5000, notes: 'High value',
    }, 'user-1');
    assert.equal(a.name, 'Server Rack');
    assert.equal(a.category, 'machinery');
    assert.equal(a.status, 'in_repair');
    assert.equal(a.purchasePrice, 5000);
    assert.equal(a.supplier, 'Dell');
  });

  it('gets an asset by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const a = await AssetTrackingService.getAsset('mem-1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-1');
    assert.equal(a!.name, 'MacBook Pro');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'asset_assignment' });
    const a = await AssetTrackingService.getAsset('mem-1');
    assert.equal(a, null);
  });

  it('returns null when asset not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await AssetTrackingService.getAsset('nope');
    assert.equal(a, null);
  });

  it('lists assets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_item') return [makeRow()];
      return [];
    };
    const list = await AssetTrackingService.listAssets('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'MacBook Pro');
  });

  it('updates an asset', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const a = await AssetTrackingService.updateAsset('mem-1', { status: 'retired' });
    assert.ok(a);
    assert.equal(a!.status, 'retired');
  });

  it('deletes an asset', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await AssetTrackingService.deleteAsset('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assignments
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetTrackingService — Assignments', () => {
  beforeEach(() => resetMock());

  it('creates an assignment with defaults', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAssignment('org-1', 'ws-1', {
      assetId: 'mem-1', assignedTo: 'user-2', assignedToName: 'Jane Doe',
    }, 'user-1');
    assert.equal(a.assignedToName, 'Jane Doe');
    assert.equal(a.status, 'active');
    assert.equal(a.conditionAtAssignment, '');
  });

  it('creates an assignment with full input', async () => {
    memCreateImpl = async (args) => makeAssignmentRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAssignment('org-1', 'ws-1', {
      assetId: 'mem-1', assignedTo: 'user-3', assignedToName: 'Bob Smith',
      status: 'active', assignedDate: '2028-02-01', expectedReturnDate: '2028-08-01',
      conditionAtAssignment: 'excellent', notes: 'Temporary',
    }, 'user-1');
    assert.equal(a.assignedToName, 'Bob Smith');
    assert.equal(a.conditionAtAssignment, 'excellent');
  });

  it('gets an assignment by id', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    const a = await AssetTrackingService.getAssignment('mem-a1');
    assert.ok(a);
    assert.equal(a!.assignedToName, 'Jane Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow({ type: 'asset_item' });
    const a = await AssetTrackingService.getAssignment('mem-a1');
    assert.equal(a, null);
  });

  it('lists assignments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_assignment') return [makeAssignmentRow()];
      return [];
    };
    const list = await AssetTrackingService.listAssignments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an assignment', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AssetTrackingService.updateAssignment('mem-a1', { status: 'returned' });
    assert.ok(a);
    assert.equal(a!.status, 'returned');
  });

  it('deletes an assignment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await AssetTrackingService.deleteAssignment('mem-a1');
    assert.equal(ok, true);
  });

  it('returnAssignment sets status to returned', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AssetTrackingService.returnAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'returned');
  });

  it('transferAssignment sets status to transferred', async () => {
    memFindUniqueImpl = async () => makeAssignmentRow();
    memUpdateImpl = async (args) => makeAssignmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await AssetTrackingService.transferAssignment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'transferred');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Depreciations
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetTrackingService — Depreciations', () => {
  beforeEach(() => resetMock());

  it('creates a depreciation with defaults', async () => {
    memCreateImpl = async (args) => makeDepreciationRow({ content: args.data.content as string });
    const d = await AssetTrackingService.createDepreciation('org-1', 'ws-1', {
      assetId: 'mem-1', method: 'straight_line',
    }, 'user-1');
    assert.equal(d.method, 'straight_line');
    assert.equal(d.status, 'active');
    assert.equal(d.purchasePrice, 0);
  });

  it('creates a depreciation with full input', async () => {
    memCreateImpl = async (args) => makeDepreciationRow({ content: args.data.content as string });
    const d = await AssetTrackingService.createDepreciation('org-1', 'ws-1', {
      assetId: 'mem-1', method: 'declining_balance', status: 'active',
      purchasePrice: 10000, salvageValue: 1000, usefulLife: 10,
      annualDepreciation: 1800, accumulatedDepreciation: 1800, currentValue: 8200,
      startDate: '2028-01-01', endDate: '2038-01-01', notes: 'Accelerated',
    }, 'user-1');
    assert.equal(d.method, 'declining_balance');
    assert.equal(d.purchasePrice, 10000);
    assert.equal(d.usefulLife, 10);
  });

  it('gets a depreciation by id', async () => {
    memFindUniqueImpl = async () => makeDepreciationRow();
    const d = await AssetTrackingService.getDepreciation('mem-d1');
    assert.ok(d);
    assert.equal(d!.method, 'straight_line');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDepreciationRow({ type: 'asset_item' });
    const d = await AssetTrackingService.getDepreciation('mem-d1');
    assert.equal(d, null);
  });

  it('lists depreciations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'depreciation_record') return [makeDepreciationRow()];
      return [];
    };
    const list = await AssetTrackingService.listDepreciations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a depreciation', async () => {
    memFindUniqueImpl = async () => makeDepreciationRow();
    memUpdateImpl = async (args) => makeDepreciationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await AssetTrackingService.updateDepreciation('mem-d1', { accumulatedDepreciation: 720 });
    assert.ok(d);
    assert.equal(d!.accumulatedDepreciation, 720);
  });

  it('deletes a depreciation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await AssetTrackingService.deleteDepreciation('mem-d1');
    assert.equal(ok, true);
  });

  it('completeDepreciation sets status to completed', async () => {
    memFindUniqueImpl = async () => makeDepreciationRow();
    memUpdateImpl = async (args) => makeDepreciationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await AssetTrackingService.completeDepreciation('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'completed');
  });

  it('suspendDepreciation sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeDepreciationRow();
    memUpdateImpl = async (args) => makeDepreciationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await AssetTrackingService.suspendDepreciation('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'suspended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Audits
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetTrackingService — Audits', () => {
  beforeEach(() => resetMock());

  it('creates an audit with defaults', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAudit('org-1', 'ws-1', {
      name: 'Spot Check', type: 'spot_check',
    }, 'user-1');
    assert.equal(a.name, 'Spot Check');
    assert.equal(a.status, 'planned');
    assert.equal(a.auditor, '');
  });

  it('creates an audit with full input', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await AssetTrackingService.createAudit('org-1', 'ws-1', {
      name: 'Compliance Audit', type: 'compliance', description: 'Annual compliance',
      status: 'in_progress', auditor: 'John', scheduledDate: '2028-04-01',
      scope: 'All departments', findings: 'Minor issues', discrepancies: 'None',
      notes: 'Priority',
    }, 'user-1');
    assert.equal(a.name, 'Compliance Audit');
    assert.equal(a.type, 'compliance');
    assert.equal(a.auditor, 'John');
    assert.equal(a.status, 'in_progress');
  });

  it('gets an audit by id', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    const a = await AssetTrackingService.getAudit('mem-u1');
    assert.ok(a);
    assert.equal(a!.name, 'Annual Physical Audit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAuditRow({ type: 'asset_item' });
    const a = await AssetTrackingService.getAudit('mem-u1');
    assert.equal(a, null);
  });

  it('lists audits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_audit') return [makeAuditRow()];
      return [];
    };
    const list = await AssetTrackingService.listAudits('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an audit', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-u1', content: args.data.content as string });
    const a = await AssetTrackingService.updateAudit('mem-u1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an audit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-u1' });
    const ok = await AssetTrackingService.deleteAudit('mem-u1');
    assert.equal(ok, true);
  });

  it('startAudit sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-u1', content: args.data.content as string });
    const a = await AssetTrackingService.startAudit('mem-u1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeAudit sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-u1', content: args.data.content as string });
    const a = await AssetTrackingService.completeAudit('mem-u1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetTrackingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getAssetTrackingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_item') return [
        makeRow({ id: 'a1', content: JSON.stringify({ name: 'A1', category: 'it_equipment', status: 'available', condition: 'good', currentValue: 1000 }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ name: 'A2', category: 'it_equipment', status: 'assigned', condition: 'good', currentValue: 2000 }) }),
        makeRow({ id: 'a3', content: JSON.stringify({ name: 'A3', category: 'it_equipment', status: 'in_repair', condition: 'fair', currentValue: 500 }) }),
        makeRow({ id: 'a4', content: JSON.stringify({ name: 'A4', category: 'it_equipment', status: 'retired', condition: 'poor', currentValue: 0 }) }),
      ];
      if (t === 'depreciation_record') return [
        makeDepreciationRow({ content: JSON.stringify({ assetId: 'a1', method: 'straight_line', status: 'active', purchasePrice: 0, salvageValue: 0, usefulLife: 0, annualDepreciation: 0, accumulatedDepreciation: 0, currentValue: 0 }) }),
      ];
      if (t === 'asset_audit') return [
        makeAuditRow({ content: JSON.stringify({ name: 'U1', type: 'physical', status: 'completed', auditor: '', description: '', scope: '', findings: '', discrepancies: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await AssetTrackingService.getAssetTrackingMetrics('org-1');
    assert.equal(m.totalAssets, 4);
    assert.equal(m.availableAssets, 1);
    assert.equal(m.assignedAssets, 1);
    assert.equal(m.inRepairAssets, 1);
    assert.equal(m.retiredAssets, 1);
    assert.equal(m.totalValue, 3500);
    assert.equal(m.activeDepreciations, 1);
    assert.equal(m.completedAudits, 1);
  });

  it('getAssetTrackingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'asset_item') return [
        makeRow({ id: 'a1', content: JSON.stringify({ name: 'A1', category: 'it_equipment', status: 'available', condition: 'good', currentValue: 0 }) }),
      ];
      if (t === 'asset_assignment') return [
        makeAssignmentRow({ content: JSON.stringify({ assetId: 'a1', assignedTo: 'u1', assignedToName: 'Jane', status: 'active', conditionAtAssignment: '', notes: '' }) }),
      ];
      if (t === 'depreciation_record') return [
        makeDepreciationRow({ content: JSON.stringify({ assetId: 'a1', method: 'straight_line', status: 'active', purchasePrice: 0, salvageValue: 0, usefulLife: 0, annualDepreciation: 0, accumulatedDepreciation: 0, currentValue: 0 }) }),
      ];
      if (t === 'asset_audit') return [
        makeAuditRow({ content: JSON.stringify({ name: 'U1', type: 'physical', status: 'planned', auditor: '', description: '', scope: '', findings: '', discrepancies: '', notes: '' }) }),
      ];
      return [];
    };
    const s = await AssetTrackingService.getAssetTrackingStats('org-1');
    assert.equal(s.assetCount, 1);
    assert.equal(s.assignmentCount, 1);
    assert.equal(s.activeAssignmentCount, 1);
    assert.equal(s.depreciationCount, 1);
    assert.equal(s.activeDepreciationCount, 1);
    assert.equal(s.auditCount, 1);
    assert.equal(s.completedAuditCount, 0);
    assert.equal(s.byAssetCategory['it_equipment'], 1);
    assert.equal(s.byAssetStatus['available'], 1);
    assert.equal(s.byAssetCondition['good'], 1);
    assert.equal(s.byAssignmentStatus['active'], 1);
    assert.equal(s.byDepreciationStatus['active'], 1);
    assert.equal(s.byAuditType['physical'], 1);
    assert.equal(s.byAuditStatus['planned'], 1);
  });
});
