import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ReviewFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type ReviewFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type ReviewCreateArgs = {
  data: Record<string, unknown>;
};

type ReviewUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type ReviewDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let reviewFindManyImpl: (args: ReviewFindManyArgs) => Promise<unknown[]> =
  async () => [];
let reviewFindUniqueImpl: (args: ReviewFindUniqueArgs) => Promise<unknown> =
  async () => null;
let reviewCreateImpl: (args: ReviewCreateArgs) => Promise<unknown> =
  async () => ({});
let reviewUpdateImpl: (args: ReviewUpdateArgs) => Promise<unknown> =
  async () => ({});
let reviewDeleteImpl: (args: ReviewDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  performanceReview: {
    findMany: (args: ReviewFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'performanceReview.findMany', args });
      return reviewFindManyImpl(args);
    },
    findUnique: (args: ReviewFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'performanceReview.findUnique', args });
      return reviewFindUniqueImpl(args);
    },
    create: (args: ReviewCreateArgs): Promise<unknown> => {
      calls.push({ method: 'performanceReview.create', args });
      return reviewCreateImpl(args);
    },
    update: (args: ReviewUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'performanceReview.update', args });
      return reviewUpdateImpl(args);
    },
    delete: (args: ReviewDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'performanceReview.delete', args });
      return reviewDeleteImpl(args);
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
  reviewFindManyImpl = async () => [];
  reviewFindUniqueImpl = async () => null;
  reviewCreateImpl = async () => ({});
  reviewUpdateImpl = async () => ({});
  reviewDeleteImpl = async () => ({});
}

const { PerformanceReviewService } = await import('@/lib/services/performance-review-service');

// ─────────────────────────────────────────────────────────────────────────────
// PerformanceReviewService
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceReviewService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a review with defaults', async () => {
      reviewCreateImpl = async (args: ReviewCreateArgs) => {
        assert.equal(args.data.type, 'annual');
        assert.equal(args.data.status, 'draft');
        return { id: 'r1', ...args.data };
      };

      const result = await PerformanceReviewService.create({
        organizationId: 'org-1',
        employeeId: 'e1',
        reviewerId: 'r1',
      });

      assert.ok(result);
      assert.equal(result.id, 'r1');
    });

    it('serializes goals and competencies to JSON strings', async () => {
      reviewCreateImpl = async (args: ReviewCreateArgs) => {
        assert.equal(typeof args.data.goals, 'string');
        assert.equal(typeof args.data.competencies, 'string');
        const goals = JSON.parse(args.data.goals as string);
        assert.equal(goals.length, 1);
        return { id: 'r1' };
      };

      await PerformanceReviewService.create({
        organizationId: 'org-1',
        employeeId: 'e1',
        reviewerId: 'r1',
        goals: [{ title: 'Ship product', achievement: 'Done', score: 4 }],
        competencies: [{ name: 'Leadership', rating: 4, comment: 'Good' }],
      });
    });
  });

  describe('get', () => {
    it('returns a review by id', async () => {
      reviewFindUniqueImpl = async () => ({ id: 'r1', status: 'draft' });

      const result = await PerformanceReviewService.get('r1');
      assert.ok(result);
      assert.equal(result.id, 'r1');
    });

    it('returns null when not found', async () => {
      reviewFindUniqueImpl = async () => null;

      const result = await PerformanceReviewService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error', async () => {
      reviewFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await PerformanceReviewService.get('r1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns reviews for an organization', async () => {
      reviewFindManyImpl = async () => ([{ id: 'r1' }]);

      const result = await PerformanceReviewService.list('org-1');
      assert.equal(result.length, 1);
      const args = calls[0].args as ReviewFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies employeeId, reviewerId, status, and period filters', async () => {
      reviewFindManyImpl = async () => [];

      await PerformanceReviewService.list('org-1', {
        employeeId: 'e1', reviewerId: 'rv1', status: 'draft', period: '2024 Q1',
      });

      const args = calls[0].args as ReviewFindManyArgs;
      assert.equal(args.where.employeeId, 'e1');
      assert.equal(args.where.reviewerId, 'rv1');
      assert.equal(args.where.status, 'draft');
      assert.equal(args.where.reviewPeriod, '2024 Q1');
    });

    it('returns empty array on error', async () => {
      reviewFindManyImpl = async () => { throw new Error('fail'); };

      const result = await PerformanceReviewService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        assert.equal(args.data.strengths, 'Great work');
        assert.equal(args.data.improvements, undefined);
        return { id: 'r1', ...args.data };
      };

      const result = await PerformanceReviewService.update('r1', { strengths: 'Great work' });
      assert.ok(result);
    });

    it('serializes goals on update', async () => {
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        assert.equal(typeof args.data.goals, 'string');
        return { id: 'r1' };
      };

      await PerformanceReviewService.update('r1', { goals: [{ title: 'New goal' }] });
    });
  });

  describe('submit', () => {
    it('sets status to submitted with timestamp', async () => {
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        assert.equal(args.data.status, 'submitted');
        assert.ok(args.data.submittedAt instanceof Date);
        return { id: 'r1', status: 'submitted' };
      };

      await PerformanceReviewService.submit('r1');
    });
  });

  describe('complete', () => {
    it('sets status to completed with timestamp', async () => {
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        assert.equal(args.data.status, 'completed');
        assert.ok(args.data.completedAt instanceof Date);
        return { id: 'r1', status: 'completed' };
      };

      await PerformanceReviewService.complete('r1');
    });
  });

  describe('delete', () => {
    it('deletes a review', async () => {
      reviewDeleteImpl = async () => ({ id: 'r1' });

      await PerformanceReviewService.delete('r1');
      assert.equal(calls[0].method, 'performanceReview.delete');
    });
  });

  describe('getByEmployee', () => {
    it('returns reviews for an employee', async () => {
      reviewFindManyImpl = async () => ([{ id: 'r1' }, { id: 'r2' }]);

      const result = await PerformanceReviewService.getByEmployee('e1');
      assert.equal(result.length, 2);
    });

    it('returns empty array on error', async () => {
      reviewFindManyImpl = async () => { throw new Error('fail'); };

      const result = await PerformanceReviewService.getByEmployee('e1');
      assert.deepEqual(result, []);
    });
  });

  describe('getByReviewer', () => {
    it('returns reviews for a reviewer', async () => {
      reviewFindManyImpl = async () => ([{ id: 'r1' }]);

      const result = await PerformanceReviewService.getByReviewer('rv1');
      assert.equal(result.length, 1);
    });
  });

  describe('getGoals', () => {
    it('returns parsed goals array', async () => {
      reviewFindUniqueImpl = async () => ({ goals: '[{"title":"Goal1","score":4}]' });

      const goals = await PerformanceReviewService.getGoals('r1');
      assert.equal(goals.length, 1);
      assert.equal(goals[0].title, 'Goal1');
    });

    it('returns empty array when review not found', async () => {
      reviewFindUniqueImpl = async () => null;

      const goals = await PerformanceReviewService.getGoals('nope');
      assert.deepEqual(goals, []);
    });
  });

  describe('addGoal', () => {
    it('appends a goal to the goals array', async () => {
      reviewFindUniqueImpl = async () => ({ goals: '[]' });
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        const goals = JSON.parse(args.data.goals as string);
        assert.equal(goals.length, 1);
        assert.equal(goals[0].title, 'New Goal');
        return { id: 'r1' };
      };

      await PerformanceReviewService.addGoal('r1', { title: 'New Goal', score: 5 });
    });

    it('throws if review not found', async () => {
      reviewFindUniqueImpl = async () => null;

      await assert.rejects(() => PerformanceReviewService.addGoal('nope', { title: 'X' }));
    });
  });

  describe('getCompetencies', () => {
    it('returns parsed competencies array', async () => {
      reviewFindUniqueImpl = async () => ({ competencies: '[{"name":"Leadership","rating":4}]' });

      const comps = await PerformanceReviewService.getCompetencies('r1');
      assert.equal(comps.length, 1);
      assert.equal(comps[0].name, 'Leadership');
    });
  });

  describe('addCompetency', () => {
    it('appends a competency to the competencies array', async () => {
      reviewFindUniqueImpl = async () => ({ competencies: '[]' });
      reviewUpdateImpl = async (args: ReviewUpdateArgs) => {
        const comps = JSON.parse(args.data.competencies as string);
        assert.equal(comps.length, 1);
        assert.equal(comps[0].name, 'Communication');
        return { id: 'r1' };
      };

      await PerformanceReviewService.addCompetency('r1', { name: 'Communication', rating: 4 });
    });
  });

  describe('getStats', () => {
    it('aggregates review stats', async () => {
      reviewFindManyImpl = async () => ([
        { status: 'draft', type: 'annual', overallRating: null, reviewPeriod: '2024 Q1' },
        { status: 'completed', type: 'annual', overallRating: 4, reviewPeriod: '2024 Q1' },
        { status: 'completed', type: 'quarterly', overallRating: 3.5, reviewPeriod: '2024 Q2' },
      ]);

      const stats = await PerformanceReviewService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.draft, 1);
      assert.equal(stats.completed, 2);
      assert.equal(stats.averageRating, 3.75);
    });

    it('returns zero stats on error', async () => {
      reviewFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await PerformanceReviewService.getStats('org-1');
      assert.equal(stats.total, 0);
    });
  });

  describe('getTrends', () => {
    it('returns average ratings by period', async () => {
      reviewFindManyImpl = async () => ([
        { reviewPeriod: '2024 Q1', overallRating: 4, type: 'annual' },
        { reviewPeriod: '2024 Q1', overallRating: 3, type: 'annual' },
        { reviewPeriod: '2024 Q2', overallRating: 5, type: 'annual' },
      ]);

      const trends = await PerformanceReviewService.getTrends('org-1');
      assert.equal(trends.length, 2);
      assert.equal(trends[0].period, '2024 Q1');
      assert.equal(trends[0].averageRating, 3.5);
      assert.equal(trends[1].period, '2024 Q2');
      assert.equal(trends[1].averageRating, 5);
    });

    it('returns empty array on error', async () => {
      reviewFindManyImpl = async () => { throw new Error('fail'); };

      const trends = await PerformanceReviewService.getTrends('org-1');
      assert.deepEqual(trends, []);
    });
  });
});
