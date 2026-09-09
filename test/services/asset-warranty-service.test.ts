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

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let warrantyFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let warrantyFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let warrantyCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let warrantyUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let warrantyDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let warrantyCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let warrantyGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  assetWarranty: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'assetWarranty.findMany', args }); return warrantyFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'assetWarranty.findUnique', args }); return warrantyFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'assetWarranty.create', args }); return warrantyCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'assetWarranty.update', args }); return warrantyUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'assetWarranty.delete', args }); return warrantyDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'assetWarranty.count', args }); return warrantyCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'assetWarranty.groupBy', args }); return warrantyGroupByImpl(args); },
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
  warrantyFindManyImpl = async () => [];
  warrantyFindUniqueImpl = async () => null;
  warrantyCreateImpl = async () => ({});
  warrantyUpdateImpl = async () => ({});
  warrantyDeleteImpl = async () => ({});
  warrantyCountImpl = async () => 0;
  warrantyGroupByImpl = async () => [];
}

const { AssetWarrantyService } = await import('@/lib/services/asset-warranty-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetWarrantyService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a warranty with defaults', async () => {
      warrantyCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'standard');
        assert.equal(args.data.status, 'active');
        return { id: 'w1', ...args.data };
      };
      const result = await AssetWarrantyService.create('org-1', {
        itAssetId: 'a1',
        provider: 'Dell',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-01-01'),
      });
      assert.ok(result);
    });

    it('truncates long provider names', async () => {
      warrantyCreateImpl = async (args: CreateArgs) => {
        assert.ok((args.data.provider as string).length <= 300);
        return { id: 'w1', ...args.data };
      };
      await AssetWarrantyService.create('org-1', {
        itAssetId: 'a1',
        provider: 'x'.repeat(400),
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-01-01'),
      });
    });
  });

  describe('get', () => {
    it('returns a warranty by id', async () => {
      warrantyFindUniqueImpl = async () => ({ id: 'w1', provider: 'Dell' });
      const result = await AssetWarrantyService.get('w1');
      assert.ok(result);
    });

    it('returns null when not found', async () => {
      warrantyFindUniqueImpl = async () => null;
      const result = await AssetWarrantyService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('lists warranties for an organization', async () => {
      warrantyFindManyImpl = async () => [{ id: 'w1' }];
      const result = await AssetWarrantyService.list('org-1');
      assert.equal(result.length, 1);
    });

    it('applies itAssetId, status, and provider filters', async () => {
      warrantyFindManyImpl = async () => [];
      await AssetWarrantyService.list('org-1', { itAssetId: 'a1', status: 'active', provider: 'Dell' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.itAssetId, 'a1');
      assert.equal(args.where.status, 'active');
      assert.ok(args.where.provider);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      warrantyUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'expired');
        assert.equal(args.data.provider, undefined);
        return { id: 'w1', ...args.data };
      };
      const result = await AssetWarrantyService.update('w1', { status: 'expired' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a warranty', async () => {
      warrantyDeleteImpl = async () => ({ id: 'w1' });
      const result = await AssetWarrantyService.delete('w1');
      assert.ok(result);
    });
  });

  describe('getExpiring', () => {
    it('returns warranties expiring within the date window', async () => {
      warrantyFindManyImpl = async () => [{ id: 'w1', status: 'active' }];
      const result = await AssetWarrantyService.getExpiring('org-1', 30);
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'active');
      assert.ok(args.where.endDate);
    });
  });

  describe('getExpired', () => {
    it('returns expired warranties', async () => {
      warrantyFindManyImpl = async () => [{ id: 'w1', status: 'expired' }];
      const result = await AssetWarrantyService.getExpired('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      const range = args.where.endDate as { lt: Date };
      assert.ok(range.lt);
    });
  });

  describe('getByAsset', () => {
    it('returns warranties for a specific asset', async () => {
      warrantyFindManyImpl = async () => [{ id: 'w1' }, { id: 'w2' }];
      const result = await AssetWarrantyService.getByAsset('a1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.itAssetId, 'a1');
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, activeCount, and expiringCount', async () => {
      warrantyCountImpl = async () => 5;
      warrantyGroupByImpl = async () => [{ status: 'active', _count: 3 }, { status: 'expired', _count: 2 }];

      const result = await AssetWarrantyService.getStats('org-1');
      assert.equal(result.total, 5);
      assert.equal(result.byStatus.active, 3);
      assert.equal(result.byStatus.expired, 2);
    });

    it('counts active and expiring warranties separately', async () => {
      let count = 0;
      warrantyCountImpl = async () => { count++; return count; };
      warrantyGroupByImpl = async () => [];

      const result = await AssetWarrantyService.getStats('org-1');
      // Promise.all order: total(1), activeCount(2), expiringCount(3)
      assert.equal(result.activeCount, 2);
      assert.equal(result.expiringCount, 3);
    });
  });
});
