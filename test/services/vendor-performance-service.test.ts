import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

const calls: { method: string; args?: unknown }[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
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

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
}

function makeRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'vendor_performance',
    content: JSON.stringify(content),
    sourceId: content.vendorId ?? null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { VendorPerformanceService } = await import('@/lib/services/vendor-performance-service');

// ─────────────────────────────────────────────────────────────────────────────
// VendorPerformanceService
// ─────────────────────────────────────────────────────────────────────────────

describe('VendorPerformanceService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a performance review with overall score from sub-scores', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'vendor_performance');
        assert.equal(args.data.sourceId, 'v-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.rating, 4);
        assert.equal(content.qualityScore, 90);
        assert.equal(content.deliveryScore, 80);
        assert.equal(content.costScore, 70);
        assert.equal(content.serviceScore, 85);
        // overall = (90+80+70+85)/4 = 81.25
        assert.ok(Math.abs(content.overallScore - 81.25) < 0.01);
        return makeRow('p-1', content);
      };

      const review = await VendorPerformanceService.create('org-1', {
        vendorId: 'v-1',
        rating: 4,
        qualityScore: 90,
        deliveryScore: 80,
        costScore: 70,
        serviceScore: 85,
        createdBy: 'user-1',
      });

      assert.ok(review);
      assert.equal(review.id, 'p-1');
      assert.equal(review.rating, 4);
      assert.ok(Math.abs(review.overallScore - 81.25) < 0.01);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('uses rating as overall score when no sub-scores provided', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.overallScore, 5);
        return makeRow('p-2', content);
      };

      const review = await VendorPerformanceService.create('org-1', {
        vendorId: 'v-1',
        rating: 5,
        createdBy: 'user-1',
      });

      assert.equal(review.overallScore, 5);
    });
  });

  describe('get', () => {
    it('returns a review by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('p-1', { vendorId: 'v-1', rating: 4, qualityScore: 90, deliveryScore: 80, costScore: 70, serviceScore: 85, overallScore: 81.25, comments: 'good', reviewDate: '2025-01-01', reviewerId: 'u1' });

      const review = await VendorPerformanceService.get('p-1');

      assert.ok(review);
      assert.equal(review.id, 'p-1');
      assert.equal(review.rating, 4);
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when review not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const review = await VendorPerformanceService.get('nope');
      assert.equal(review, null);
    });
  });

  describe('list', () => {
    it('returns reviews for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 4, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 4, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-2', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 5, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
      ];

      const reviews = await VendorPerformanceService.list('org-1');

      assert.equal(reviews.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by minRating', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 3, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 3, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-2', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 5, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
      ];

      const reviews = await VendorPerformanceService.list('org-1', { minRating: 4 });

      assert.equal(reviews.length, 1);
      assert.equal(reviews[0].rating, 5);
    });
  });

  describe('getByVendor', () => {
    it('returns all reviews for a vendor', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where?.sourceId, 'v-1');
        return [
          makeRow('p-1', { vendorId: 'v-1', rating: 4, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 4, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
          makeRow('p-2', { vendorId: 'v-1', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 5, comments: '', reviewDate: '2025-02-01', reviewerId: '' }),
        ];
      };

      const reviews = await VendorPerformanceService.getByVendor('v-1');

      assert.equal(reviews.length, 2);
    });
  });

  describe('getAverageScore', () => {
    it('returns the average overall score for a vendor', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 4, qualityScore: 80, deliveryScore: 80, costScore: 80, serviceScore: 80, overallScore: 80, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-1', rating: 5, qualityScore: 90, deliveryScore: 90, costScore: 90, serviceScore: 90, overallScore: 90, comments: '', reviewDate: '2025-02-01', reviewerId: '' }),
      ];

      const avg = await VendorPerformanceService.getAverageScore('v-1');

      assert.equal(avg, 85);
    });

    it('returns 0 when no reviews', async () => {
      memoryFindManyImpl = async () => [];

      const avg = await VendorPerformanceService.getAverageScore('v-1');
      assert.equal(avg, 0);
    });
  });

  describe('getTopPerformers', () => {
    it('returns top performers sorted by avg score', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 3, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 60, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-2', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 95, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-3', { vendorId: 'v-3', rating: 4, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 80, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
      ];

      const top = await VendorPerformanceService.getTopPerformers('org-1', 2);

      assert.equal(top.length, 2);
      assert.equal(top[0].vendorId, 'v-2');
      assert.equal(top[0].avgScore, 95);
      assert.equal(top[1].vendorId, 'v-3');
    });
  });

  describe('getBottomPerformers', () => {
    it('returns bottom performers sorted by avg score ascending', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 3, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 60, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-2', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 95, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-3', { vendorId: 'v-3', rating: 4, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 80, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
      ];

      const bottom = await VendorPerformanceService.getBottomPerformers('org-1', 2);

      assert.equal(bottom.length, 2);
      assert.equal(bottom[0].vendorId, 'v-1');
      assert.equal(bottom[0].avgScore, 60);
    });
  });

  describe('getStats', () => {
    it('aggregates performance stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('p-1', { vendorId: 'v-1', rating: 4, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 80, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
        makeRow('p-2', { vendorId: 'v-2', rating: 5, qualityScore: 0, deliveryScore: 0, costScore: 0, serviceScore: 0, overallScore: 90, comments: '', reviewDate: '2025-01-01', reviewerId: '' }),
      ];

      const stats = await VendorPerformanceService.getStats('org-1');

      assert.equal(stats.totalReviews, 2);
      assert.equal(stats.avgRating, 4.5);
      assert.equal(stats.avgOverallScore, 85);
      assert.equal(stats.distribution[4], 1);
      assert.equal(stats.distribution[5], 1);
    });

    it('returns zero stats when no reviews', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await VendorPerformanceService.getStats('org-1');

      assert.equal(stats.totalReviews, 0);
      assert.equal(stats.avgRating, 0);
    });
  });
});
