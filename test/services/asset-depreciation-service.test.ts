import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let itAssetFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let itAssetFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let itAssetUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memoryFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindFirstImpl: (args: FindManyArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  iTAsset: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'iTAsset.findMany', args }); return itAssetFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.findUnique', args }); return itAssetFindUniqueImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'iTAsset.update', args }); return itAssetUpdateImpl(args); },
  },
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memoryFindManyImpl(args); },
    findFirst: (args: FindManyArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memoryFindFirstImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memoryCreateImpl(args); },
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
  itAssetFindManyImpl = async () => [];
  itAssetFindUniqueImpl = async () => null;
  itAssetUpdateImpl = async () => ({});
  memoryFindManyImpl = async () => [];
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
}

const { AssetDepreciationService } = await import('@/lib/services/asset-depreciation-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AssetDepreciationService', () => {
  beforeEach(() => { resetMock(); });

  describe('calculateDepreciation', () => {
    it('calculates straight-line depreciation for an asset', async () => {
      itAssetFindUniqueImpl = async () => ({
        id: 'a1',
        name: 'Laptop',
        assetTag: 'LT-001',
        serialNumber: 'SN123',
        purchaseCost: 1000,
        purchaseDate: new Date('2022-01-01'),
        metadata: JSON.stringify({ salvageValue: 100, usefulLifeYears: 5 }),
        status: 'active',
      });

      const result = await AssetDepreciationService.calculateDepreciation('a1');
      assert.ok(result);
      assert.equal(result!.purchaseCost, 1000);
      assert.equal(result!.salvageValue, 100);
      assert.equal(result!.usefulLifeYears, 5);
      // annual = (1000 - 100) / 5 = 180
      assert.equal(result!.annualDepreciation, 180);
      // accumulated should be <= 900 (cost - salvage)
      assert.ok(result!.accumulatedDepreciation <= 900);
      // book value should be >= 100 (salvage)
      assert.ok(result!.bookValue >= 100);
    });

    it('returns null when asset not found', async () => {
      itAssetFindUniqueImpl = async () => null;
      const result = await AssetDepreciationService.calculateDepreciation('nope');
      assert.equal(result, null);
    });

    it('handles zero-cost assets gracefully', async () => {
      itAssetFindUniqueImpl = async () => ({
        id: 'a2',
        name: 'Free',
        assetTag: '',
        serialNumber: '',
        purchaseCost: 0,
        purchaseDate: null,
        metadata: '{}',
        status: 'active',
      });
      const result = await AssetDepreciationService.calculateDepreciation('a2');
      assert.ok(result);
      assert.equal(result!.purchaseCost, 0);
      assert.equal(result!.annualDepreciation, 0);
      assert.equal(result!.bookValue, 0);
    });

    it('uses default usefulLifeYears of 5 when not in metadata', async () => {
      itAssetFindUniqueImpl = async () => ({
        id: 'a3',
        name: 'Server',
        assetTag: '',
        serialNumber: '',
        purchaseCost: 5000,
        purchaseDate: new Date('2023-01-01'),
        metadata: '{}',
        status: 'active',
      });
      const result = await AssetDepreciationService.calculateDepreciation('a3');
      assert.ok(result);
      assert.equal(result!.usefulLifeYears, 5);
      assert.equal(result!.annualDepreciation, 1000);
    });
  });

  describe('getDepreciationReport', () => {
    it('returns depreciation for all non-retired assets', async () => {
      itAssetFindManyImpl = async () => [
        { id: 'a1', name: 'Laptop', assetTag: '', serialNumber: '', purchaseCost: 1000, purchaseDate: new Date('2022-01-01'), metadata: '{"salvageValue":0,"usefulLifeYears":5}', status: 'active' },
        { id: 'a2', name: 'Server', assetTag: '', serialNumber: '', purchaseCost: 5000, purchaseDate: new Date('2023-01-01'), metadata: '{}', status: 'active' },
      ];
      const result = await AssetDepreciationService.getDepreciationReport('org-1');
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error', async () => {
      itAssetFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await AssetDepreciationService.getDepreciationReport('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getDepreciationSummary', () => {
    it('sums up total cost, accumulated depreciation, and book value', async () => {
      itAssetFindManyImpl = async () => [
        { id: 'a1', name: 'A', assetTag: '', serialNumber: '', purchaseCost: 1000, purchaseDate: new Date('2020-01-01'), metadata: '{"salvageValue":0,"usefulLifeYears":10}', status: 'active' },
        { id: 'a2', name: 'B', assetTag: '', serialNumber: '', purchaseCost: 2000, purchaseDate: new Date('2020-01-01'), metadata: '{"salvageValue":0,"usefulLifeYears":10}', status: 'active' },
      ];
      const result = await AssetDepreciationService.getDepreciationSummary('org-1');
      assert.equal(result.totalAssets, 2);
      assert.equal(result.totalCost, 3000);
      assert.ok(result.totalBookValue <= 3000);
    });
  });

  describe('getAssetDisposals', () => {
    it('returns disposal records from memory', async () => {
      memoryFindManyImpl = async () => [
        { id: 'mem1', content: JSON.stringify({ itAssetId: 'a1', disposalMethod: 'sold', disposalValue: 500 }), createdAt: new Date(), sourceId: null },
      ];
      const result = await AssetDepreciationService.getAssetDisposals('org-1');
      assert.equal(result.length, 1);
      assert.equal((result[0] as unknown as { disposalMethod: string }).disposalMethod, 'sold');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.type, 'asset_disposal');
    });
  });

  describe('recordDisposal', () => {
    it('creates a memory record and marks asset as retired', async () => {
      itAssetFindUniqueImpl = async () => ({ id: 'a1', name: 'Old Laptop' });
      memoryCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'asset_disposal');
        assert.equal(args.data.organizationId, 'org-1');
        return { id: 'mem1', ...args.data };
      };
      itAssetUpdateImpl = async () => ({ id: 'a1', status: 'retired' });

      const result = await AssetDepreciationService.recordDisposal('org-1', 'ws-1', {
        itAssetId: 'a1',
        disposalDate: new Date('2025-01-01'),
        disposalMethod: 'sold',
        disposalValue: 500,
        reason: 'Upgraded',
      }, 'user1');
      assert.ok(result);
    });
  });

  describe('generateAssetTag', () => {
    it('generates a tag string with the asset id', () => {
      const tag = AssetDepreciationService.generateAssetTag('a1');
      assert.equal(tag, 'ASSET:a1');
    });
  });

  describe('getAssetTags', () => {
    it('returns tags for all assets in the organization', async () => {
      itAssetFindManyImpl = async () => [
        { id: 'a1', name: 'Laptop', assetTag: 'LT-001', serialNumber: 'SN1' },
        { id: 'a2', name: 'Server', assetTag: 'SRV-001', serialNumber: 'SN2' },
      ];
      const result = await AssetDepreciationService.getAssetTags('org-1');
      assert.equal(result.length, 2);
      assert.equal(result[0].tag, 'ASSET:a1:Laptop');
      assert.equal(result[0].assetTag, 'LT-001');
    });

    it('returns empty array on error', async () => {
      itAssetFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await AssetDepreciationService.getAssetTags('org-1');
      assert.deepEqual(result, []);
    });
  });
});
