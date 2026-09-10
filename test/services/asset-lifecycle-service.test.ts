import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };
type AggregateArgs = { where: Record<string, unknown>; _sum?: unknown; _avg?: unknown };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let maintFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let maintFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let maintCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let maintUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let maintDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let maintCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let maintGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let maintAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { cost: 0 } });

const prismaMock = {
  assetMaintenance: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'assetMaintenance.findMany', args }); return maintFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'assetMaintenance.findUnique', args }); return maintFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'assetMaintenance.create', args }); return maintCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'assetMaintenance.update', args }); return maintUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'assetMaintenance.delete', args }); return maintDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'assetMaintenance.count', args }); return maintCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'assetMaintenance.groupBy', args }); return maintGroupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'assetMaintenance.aggregate', args }); return maintAggregateImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  maintFindManyImpl = async () => [];
  maintFindUniqueImpl = async () => null;
  maintCreateImpl = async () => ({});
  maintUpdateImpl = async () => ({});
  maintDeleteImpl = async () => ({});
  maintCountImpl = async () => 0;
  maintGroupByImpl = async () => [];
  maintAggregateImpl = async () => ({ _sum: { cost: 0 } });
}

const { AssetLifecycleService } = await import('@/lib/services/asset-lifecycle-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetLifecycleService', () => {
  beforeEach(() => { resetMock(); });

  describe('createMaintenance', () => {
    it('creates a maintenance record with defaults', async () => {
      maintCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'preventive');
        assert.equal(args.data.status, 'scheduled');
        assert.equal(args.data.cost, 0);
        return { id: 'm1', ...args.data };
      };

      const result = await AssetLifecycleService.createMaintenance('org-1', {
        itAssetId: 'a1',
        title: 'Oil change',
        scheduledDate: new Date('2025-01-01'),
      });
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'm1');
    });

    it('truncates long titles and descriptions', async () => {
      maintCreateImpl = async (args: CreateArgs) => {
        assert.ok((args.data.title as string).length <= 300);
        assert.ok((args.data.description as string).length <= 5000);
        return { id: 'm1', ...args.data };
      };

      await AssetLifecycleService.createMaintenance('org-1', {
        itAssetId: 'a1',
        title: 'x'.repeat(400),
        description: 'y'.repeat(6000),
        scheduledDate: new Date('2025-01-01'),
      });
    });
  });

  describe('getMaintenance', () => {
    it('returns a maintenance record by id', async () => {
      maintFindUniqueImpl = async () => ({ id: 'm1', title: 'Test' });
      const result = await AssetLifecycleService.getMaintenance('m1');
      assert.ok(result);
      assert.equal((result as { id: string }).id, 'm1');
    });

    it('returns null when not found', async () => {
      maintFindUniqueImpl = async () => null;
      const result = await AssetLifecycleService.getMaintenance('nope');
      assert.equal(result, null);
    });
  });

  describe('listMaintenance', () => {
    it('lists maintenance for an organization', async () => {
      maintFindManyImpl = async () => [{ id: 'm1', title: 'A' }];
      const result = await AssetLifecycleService.listMaintenance('org-1');
      assert.equal(result.length, 1);
    });

    it('applies itAssetId, type, and status filters', async () => {
      maintFindManyImpl = async () => [];
      await AssetLifecycleService.listMaintenance('org-1', { itAssetId: 'a1', type: 'corrective', status: 'completed' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.itAssetId, 'a1');
      assert.equal(args.where.type, 'corrective');
      assert.equal(args.where.status, 'completed');
    });

    it('applies date range filter', async () => {
      maintFindManyImpl = async () => [];
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      await AssetLifecycleService.listMaintenance('org-1', { dateFrom: from, dateTo: to });
      const args = calls[0].args as FindManyArgs;
      const range = args.where.scheduledDate as { gte: Date; lte: Date };
      assert.equal(range.gte, from);
      assert.equal(range.lte, to);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      maintFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await AssetLifecycleService.listMaintenance('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateMaintenance', () => {
    it('updates only provided fields', async () => {
      maintUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'in_progress');
        assert.equal(args.data.title, undefined);
        return { id: 'm1', ...args.data };
      };
      const result = await AssetLifecycleService.updateMaintenance('m1', { status: 'in_progress' });
      assert.ok(result);
    });
  });

  describe('deleteMaintenance', () => {
    it('deletes a maintenance record', async () => {
      maintDeleteImpl = async () => ({ id: 'm1' });
      const result = await AssetLifecycleService.deleteMaintenance('m1');
      assert.ok(result);
      assert.equal(calls[0].method, 'assetMaintenance.delete');
    });
  });

  describe('completeMaintenance', () => {
    it('marks maintenance as completed with date and cost', async () => {
      maintUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'completed');
        assert.ok(args.data.completedDate);
        assert.equal(args.data.cost, 150);
        assert.equal(args.data.performedBy, 'tech1');
        return { id: 'm1', ...args.data };
      };
      const result = await AssetLifecycleService.completeMaintenance('m1', 'tech1', 150, 'done');
      assert.ok(result);
    });
  });

  describe('getUpcomingMaintenance', () => {
    it('returns scheduled maintenance within the date window', async () => {
      maintFindManyImpl = async () => [{ id: 'm1', status: 'scheduled' }];
      const result = await AssetLifecycleService.getUpcomingMaintenance('org-1', 30);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.scheduledDate);
    });
  });

  describe('getOverdueMaintenance', () => {
    it('returns overdue maintenance records', async () => {
      maintFindManyImpl = async () => [{ id: 'm1', status: 'scheduled' }];
      const result = await AssetLifecycleService.getOverdueMaintenance('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      const range = args.where.scheduledDate as { lt: Date };
      assert.ok(range.lt);
    });
  });

  describe('getMaintenanceHistory', () => {
    it('returns all maintenance for an asset', async () => {
      maintFindManyImpl = async () => [{ id: 'm1' }, { id: 'm2' }];
      const result = await AssetLifecycleService.getMaintenanceHistory('a1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.itAssetId, 'a1');
    });
  });

  describe('getMaintenanceStats', () => {
    it('returns total, byType, byStatus, overdue, and totalCost', async () => {
      maintCountImpl = async () => 10;
      maintGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'type') return [{ type: 'preventive', _count: 7 }, { type: 'corrective', _count: 3 }];
        return [{ status: 'completed', _count: 5 }, { status: 'scheduled', _count: 5 }];
      };
      maintAggregateImpl = async () => ({ _sum: { cost: 1250 } });

      const result = await AssetLifecycleService.getMaintenanceStats('org-1');
      assert.equal(result.total, 10);
      assert.equal(result.byType.preventive, 7);
      assert.equal(result.byStatus.completed, 5);
      assert.equal(result.totalCost, 1250);
    });

    it('counts overdue maintenance separately', async () => {
      let countCalls = 0;
      maintCountImpl = async () => { countCalls++; return countCalls === 1 ? 10 : 3; };
      maintGroupByImpl = async () => [];
      maintAggregateImpl = async () => ({ _sum: { cost: 0 } });

      const result = await AssetLifecycleService.getMaintenanceStats('org-1');
      assert.equal(result.overdue, 3);
    });
  });
});
