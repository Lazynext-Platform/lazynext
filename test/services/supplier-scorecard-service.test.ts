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
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
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

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
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
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
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
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
  id: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'supplier_scorecard',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { SupplierScorecardService, calcOverallScore, calcGrade } =
  await import('@/lib/services/supplier-scorecard-service');

// ─────────────────────────────────────────────────────────────────────────────
// SupplierScorecardService
// ─────────────────────────────────────────────────────────────────────────────

describe('SupplierScorecardService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a scorecard with calculated overall score and grade', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'supplier_scorecard');
        const content = JSON.parse(args.data.content);
        // (9+8+7+8+9)/5 = 8.2 → grade B
        assert.equal(content.overallScore, 8.2);
        assert.equal(content.grade, 'B');
        assert.equal(content.vendorName, 'Acme Corp');
        assert.equal(content.notes, '');
        return makeRow('sc-1', content);
      };

      const scorecard = await SupplierScorecardService.create('org-1', {
        vendorId: 'v-1',
        vendorName: 'Acme Corp',
        period: '2025-Q1',
        qualityScore: 9,
        deliveryScore: 8,
        costScore: 7,
        serviceScore: 8,
        complianceScore: 9,
        createdBy: 'user-1',
      });

      assert.ok(scorecard);
      assert.equal(scorecard.id, 'sc-1');
      assert.equal(scorecard.vendorName, 'Acme Corp');
      assert.equal(scorecard.overallScore, 8.2);
      assert.equal(scorecard.grade, 'B');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('includes notes when provided', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.notes, 'Great vendor');
        return makeRow('sc-2', content);
      };

      const scorecard = await SupplierScorecardService.create('org-1', {
        vendorId: 'v-2',
        vendorName: 'Beta Inc',
        period: '2025-Q1',
        qualityScore: 10,
        deliveryScore: 10,
        costScore: 10,
        serviceScore: 10,
        complianceScore: 10,
        notes: 'Great vendor',
        createdBy: 'user-1',
      });

      assert.equal(scorecard.notes, 'Great vendor');
      assert.equal(scorecard.grade, 'A');
    });
  });

  describe('get', () => {
    it('returns a scorecard by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('sc-1', {
          vendorId: 'v-1', vendorName: 'Acme', period: '2025-Q1',
          qualityScore: 8, deliveryScore: 8, costScore: 8, serviceScore: 8, complianceScore: 8,
          overallScore: 8, grade: 'B', notes: '',
        });

      const scorecard = await SupplierScorecardService.get('sc-1');

      assert.ok(scorecard);
      assert.equal(scorecard.id, 'sc-1');
      assert.equal(scorecard.vendorName, 'Acme');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when scorecard not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const scorecard = await SupplierScorecardService.get('nope');
      assert.equal(scorecard, null);
    });
  });

  describe('list', () => {
    it('returns scorecards for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: '2025-Q1', qualityScore: 8, deliveryScore: 8, costScore: 8, serviceScore: 8, complianceScore: 8, overallScore: 8, grade: 'B', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: '2025-Q1', qualityScore: 5, deliveryScore: 5, costScore: 5, serviceScore: 5, complianceScore: 5, overallScore: 5, grade: 'C', notes: '' }),
      ];

      const scorecards = await SupplierScorecardService.list('org-1');

      assert.equal(scorecards.length, 2);
      assert.equal(scorecards[0].id, 'sc-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by vendorId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: '', qualityScore: 8, deliveryScore: 8, costScore: 8, serviceScore: 8, complianceScore: 8, overallScore: 8, grade: 'B', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: '', qualityScore: 5, deliveryScore: 5, costScore: 5, serviceScore: 5, complianceScore: 5, overallScore: 5, grade: 'C', notes: '' }),
      ];

      const scorecards = await SupplierScorecardService.list('org-1', { vendorId: 'v-1' });

      assert.equal(scorecards.length, 1);
      assert.equal(scorecards[0].vendorId, 'v-1');
    });

    it('filters by grade', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: '', qualityScore: 9, deliveryScore: 9, costScore: 9, serviceScore: 9, complianceScore: 9, overallScore: 9, grade: 'A', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: '', qualityScore: 3, deliveryScore: 3, costScore: 3, serviceScore: 3, complianceScore: 3, overallScore: 3, grade: 'F', notes: '' }),
      ];

      const scorecards = await SupplierScorecardService.list('org-1', { grade: 'A' });

      assert.equal(scorecards.length, 1);
      assert.equal(scorecards[0].grade, 'A');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'Acme', period: '2025-Q1', qualityScore: 8, deliveryScore: 8, costScore: 8, serviceScore: 8, complianceScore: 8, overallScore: 8, grade: 'B', notes: 'good' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'Beta', period: '2025-Q2', qualityScore: 5, deliveryScore: 5, costScore: 5, serviceScore: 5, complianceScore: 5, overallScore: 5, grade: 'C', notes: '' }),
      ];

      const scorecards = await SupplierScorecardService.list('org-1', { search: 'acme' });

      assert.equal(scorecards.length, 1);
      assert.equal(scorecards[0].vendorName, 'Acme');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const scorecards = await SupplierScorecardService.list('org-1');
      assert.deepEqual(scorecards, []);
    });
  });

  describe('update', () => {
    it('updates scorecard and recalculates overall/grade', async () => {
      // Existing: quality 5, delivery 8, cost 6, service 6, compliance 6 → overall 6.2, grade C
      // After updating quality to 9: (9+8+6+6+6)/5 = 7 → grade B
      memoryFindUniqueImpl = async () =>
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'Acme', period: '2025-Q1', qualityScore: 5, deliveryScore: 8, costScore: 6, serviceScore: 6, complianceScore: 6, overallScore: 6.2, grade: 'C', notes: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.qualityScore, 9);
        assert.equal(content.overallScore, 7);
        assert.equal(content.grade, 'B');
        return makeRow('sc-1', content);
      };

      const scorecard = await SupplierScorecardService.update('sc-1', {
        qualityScore: 9,
      });

      assert.ok(scorecard);
      assert.equal(scorecard.qualityScore, 9);
      assert.equal(scorecard.overallScore, 7);
      assert.equal(scorecard.grade, 'B');
    });

    it('returns null when scorecard not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const scorecard = await SupplierScorecardService.update('nope', { notes: 'x' });
      assert.equal(scorecard, null);
    });
  });

  describe('delete', () => {
    it('deletes a scorecard', async () => {
      memoryDeleteImpl = async () => ({ id: 'sc-1' });

      const result = await SupplierScorecardService.delete('sc-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await SupplierScorecardService.delete('sc-1');
      assert.equal(result, false);
    });
  });

  describe('getByVendor', () => {
    it('returns all scorecards for a vendor', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: 'Q1', qualityScore: 8, deliveryScore: 8, costScore: 8, serviceScore: 8, complianceScore: 8, overallScore: 8, grade: 'B', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: 'Q1', qualityScore: 5, deliveryScore: 5, costScore: 5, serviceScore: 5, complianceScore: 5, overallScore: 5, grade: 'C', notes: '' }),
        makeRow('sc-3', { vendorId: 'v-1', vendorName: 'A', period: 'Q2', qualityScore: 9, deliveryScore: 9, costScore: 9, serviceScore: 9, complianceScore: 9, overallScore: 9, grade: 'A', notes: '' }),
      ];

      const scorecards = await SupplierScorecardService.getByVendor('v-1');

      assert.equal(scorecards.length, 2);
      assert.equal(scorecards[0].vendorId, 'v-1');
    });
  });

  describe('getTopSuppliers', () => {
    it('returns top-rated suppliers (latest per vendor, sorted desc)', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: 'Q1', qualityScore: 9, deliveryScore: 9, costScore: 9, serviceScore: 9, complianceScore: 9, overallScore: 9, grade: 'A', notes: '' }, { createdAt: new Date('2025-02-01') }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: 'Q1', qualityScore: 5, deliveryScore: 5, costScore: 5, serviceScore: 5, complianceScore: 5, overallScore: 5, grade: 'C', notes: '' }, { createdAt: new Date('2025-01-01') }),
        makeRow('sc-3', { vendorId: 'v-1', vendorName: 'A', period: 'Q2', qualityScore: 7, deliveryScore: 7, costScore: 7, serviceScore: 7, complianceScore: 7, overallScore: 7, grade: 'B', notes: '' }, { createdAt: new Date('2025-03-01') }),
      ];

      const top = await SupplierScorecardService.getTopSuppliers('org-1');

      // list is desc by createdAt, so sc-3 wins for v-1 (overallScore 7)
      assert.equal(top.length, 2);
      assert.equal(top[0].overallScore, 7);
      assert.equal(top[1].overallScore, 5);
    });
  });

  describe('getGradeDistribution', () => {
    it('counts scorecards by grade', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: '', qualityScore: 9, deliveryScore: 9, costScore: 9, serviceScore: 9, complianceScore: 9, overallScore: 9, grade: 'A', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: '', qualityScore: 7, deliveryScore: 7, costScore: 7, serviceScore: 7, complianceScore: 7, overallScore: 7, grade: 'B', notes: '' }),
        makeRow('sc-3', { vendorId: 'v-3', vendorName: 'C', period: '', qualityScore: 3, deliveryScore: 3, costScore: 3, serviceScore: 3, complianceScore: 3, overallScore: 3, grade: 'F', notes: '' }),
      ];

      const dist = await SupplierScorecardService.getGradeDistribution('org-1');

      assert.equal(dist.A, 1);
      assert.equal(dist.B, 1);
      assert.equal(dist.F, 1);
      assert.equal(dist.C, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates scorecard stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('sc-1', { vendorId: 'v-1', vendorName: 'A', period: '', qualityScore: 9, deliveryScore: 9, costScore: 9, serviceScore: 9, complianceScore: 9, overallScore: 9, grade: 'A', notes: '' }),
        makeRow('sc-2', { vendorId: 'v-2', vendorName: 'B', period: '', qualityScore: 7, deliveryScore: 7, costScore: 7, serviceScore: 7, complianceScore: 7, overallScore: 7, grade: 'B', notes: '' }),
      ];

      const stats = await SupplierScorecardService.getStats('org-1');

      assert.equal(stats.totalScorecards, 2);
      assert.equal(stats.avgScore, 8);
      assert.equal(stats.gradeDistribution.A, 1);
      assert.equal(stats.gradeDistribution.B, 1);
    });

    it('returns zero stats when no scorecards', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await SupplierScorecardService.getStats('org-1');

      assert.equal(stats.totalScorecards, 0);
      assert.equal(stats.avgScore, 0);
    });
  });

  describe('helpers', () => {
    it('calcOverallScore averages five dimensions', () => {
      const score = calcOverallScore({ qualityScore: 10, deliveryScore: 8, costScore: 6, serviceScore: 7, complianceScore: 9 });
      assert.equal(score, 8);
    });

    it('calcGrade maps scores to grades', () => {
      assert.equal(calcGrade(9), 'A');
      assert.equal(calcGrade(7.5), 'B');
      assert.equal(calcGrade(6), 'C');
      assert.equal(calcGrade(4.5), 'D');
      assert.equal(calcGrade(2), 'F');
    });
  });
});
