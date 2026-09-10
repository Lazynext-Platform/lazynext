import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown> };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };

interface CallRecord { method: string; args?: unknown }
const calls: CallRecord[] = [];

let findManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let findUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let createImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let updateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let deleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let countImpl: (args: CountArgs) => Promise<number> = async () => 0;
let groupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  iTAsset: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'iTAsset.findMany', args }); return findManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.findUnique', args }); return findUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.create', args }); return createImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.update', args }); return updateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.delete', args }); return deleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'iTAsset.count', args }); return countImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'iTAsset.groupBy', args }); return groupByImpl(args); },
  },
};

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  findManyImpl = async () => [];
  findUniqueImpl = async () => null;
  createImpl = async () => ({});
  updateImpl = async () => ({});
  deleteImpl = async () => ({});
  countImpl = async () => 0;
  groupByImpl = async () => [];
}

const { ITAssetService } = await import('@/lib/services/it-asset-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ITAssetService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns assets for an organization', async () => {
      findManyImpl = async () => [{ id: 'a1', name: 'MacBook Pro' }];
      const result = await ITAssetService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a1');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies type, status, and category filters', async () => {
      findManyImpl = async () => [];
      await ITAssetService.list('org-1', { type: 'hardware', status: 'active', category: 'laptop' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.type, 'hardware');
      assert.equal(args.where.status, 'active');
      assert.equal(args.where.category, 'laptop');
    });

    it('applies assignedToId filter', async () => {
      findManyImpl = async () => [];
      await ITAssetService.list('org-1', { assignedToId: 'u1' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.assignedToId, 'u1');
    });

    it('applies search filter with OR clause', async () => {
      findManyImpl = async () => [];
      await ITAssetService.list('org-1', { search: 'MacBook' });
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });

    it('returns empty array on error', async () => {
      findManyImpl = async () => { throw new Error('DB down'); };
      const result = await ITAssetService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns an asset by id', async () => {
      findUniqueImpl = async () => ({ id: 'a1', name: 'MacBook' });
      const result = await ITAssetService.get('a1');
      assert.ok(result);
      assert.equal(result.id, 'a1');
    });

    it('returns null when not found', async () => {
      findUniqueImpl = async () => null;
      const result = await ITAssetService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an asset with defaults', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'hardware');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.assignedToType, 'employee');
        return { id: 'a1', ...args.data };
      };
      const result = await ITAssetService.create({ organizationId: 'org-1', name: 'MacBook' });
      assert.ok(result);
    });

    it('serializes metadata as JSON string', async () => {
      createImpl = async (args: CreateArgs) => {
        assert.equal(args.data.metadata, JSON.stringify({ ram: '16GB' }));
        return { id: 'a1', ...args.data };
      };
      await ITAssetService.create({ organizationId: 'org-1', name: 'MacBook', metadata: { ram: '16GB' } });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.name, 'Updated');
        assert.equal(args.data.type, undefined);
        return { id: 'a1', ...args.data };
      };
      const result = await ITAssetService.update('a1', { name: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes an asset', async () => {
      deleteImpl = async () => ({ id: 'a1' });
      const result = await ITAssetService.delete('a1');
      assert.ok(result);
    });
  });

  describe('assign', () => {
    it('assigns an asset and sets status to assigned', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.assignedToId, 'u1');
        assert.equal(args.data.assignedToType, 'employee');
        assert.equal(args.data.status, 'assigned');
        return { id: 'a1', ...args.data };
      };
      const result = await ITAssetService.assign('a1', 'u1');
      assert.ok(result);
    });

    it('uses custom assignedToType', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.assignedToType, 'workspace');
        return { id: 'a1', ...args.data };
      };
      await ITAssetService.assign('a1', 'ws1', 'workspace');
    });
  });

  describe('unassign', () => {
    it('unassigns an asset and sets status to in_storage', async () => {
      updateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.assignedToId, null);
        assert.equal(args.data.status, 'in_storage');
        return { id: 'a1', ...args.data };
      };
      const result = await ITAssetService.unassign('a1');
      assert.ok(result);
    });
  });

  describe('getAssignedAssets', () => {
    it('returns assets assigned to a user', async () => {
      findManyImpl = async () => [{ id: 'a1', assignedToId: 'u1' }];
      const result = await ITAssetService.getAssignedAssets('u1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.assignedToId, 'u1');
    });
  });

  describe('getExpiringLicenses', () => {
    it('returns assets with expiring licenses', async () => {
      findManyImpl = async () => [{ id: 'a1', licenseExpiry: new Date() }];
      const result = await ITAssetService.getExpiringLicenses('org-1', 30);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.licenseExpiry);
    });
  });

  describe('getStats', () => {
    it('returns total, byType, and byStatus counts', async () => {
      countImpl = async () => 10;
      groupByImpl = async () => [{ type: 'hardware', _count: 7 }, { type: 'software', _count: 3 }];
      // Second groupBy call for status
      const origGroupBy = groupByImpl;
      let callCount = 0;
      groupByImpl = async (args: GroupByArgs) => {
        callCount++;
        if (callCount === 1) return origGroupBy(args);
        return [{ status: 'active', _count: 8 }, { status: 'retired', _count: 2 }];
      };

      const result = await ITAssetService.getStats('org-1');
      assert.equal(result.total, 10);
      assert.equal(result.byType.hardware, 7);
      assert.equal(result.byStatus.active, 8);
    });
  });

  describe('getDepreciationReport', () => {
    it('calculates depreciation for assets with purchase cost', async () => {
      findManyImpl = async () => [
        { id: 'a1', name: 'Laptop', purchaseCost: 2000, currentValue: 1000, currency: 'USD', purchaseDate: null },
        { id: 'a2', name: 'Server', purchaseCost: 5000, currentValue: 4000, currency: 'USD', purchaseDate: null },
      ];

      const result = await ITAssetService.getDepreciationReport('org-1');
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].depreciation, 1000);
      assert.equal(result.items[0].depreciationPct, 50);
      assert.equal(result.totalPurchaseCost, 7000);
      assert.equal(result.totalCurrentValue, 5000);
      assert.equal(result.totalDepreciation, 2000);
    });

    it('returns empty report when no assets', async () => {
      findManyImpl = async () => { throw new Error('fail'); };
      const result = await ITAssetService.getDepreciationReport('org-1');
      assert.equal(result.items.length, 0);
      assert.equal(result.totalPurchaseCost, 0);
    });
  });
});
