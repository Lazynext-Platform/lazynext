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

let memoryFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryDeleteManyImpl: (args: unknown) => Promise<unknown> = async () => ({ count: 0 });

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
    deleteMany: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.deleteMany', args });
      return memoryDeleteManyImpl(args);
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
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryDeleteManyImpl = async () => ({ count: 0 });
}

function makeMemoryRecord(id: string, type: string, content: object, orgId: string = 'org-1'): {
  id: string; type: string; content: string; tags: string; createdAt: Date; updatedAt: Date;
  workspaceId: string; organizationId: string; createdBy: string;
} {
  return {
    id,
    type,
    content: JSON.stringify(content),
    tags: JSON.stringify([type]),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    workspaceId: 'ws-1',
    organizationId: orgId,
    createdBy: 'user-1',
  };
}

const { CsatService } = await import('@/lib/services/csat-service');

// ─────────────────────────────────────────────────────────────────────────────
// CsatService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CsatService', () => {
  beforeEach(() => { resetMock(); });

  describe('createSurvey', () => {
    it('creates a CSAT survey with defaults', async () => {
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'csat_survey');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'My CSAT');
        assert.equal(content.question, 'How satisfied are you with your experience?');
        assert.equal(content.scale, '1-5');
        assert.equal(content.status, 'active');
        return makeMemoryRecord('s1', 'csat_survey', content, 'org-1');
      };

      const result = await CsatService.createSurvey('org-1', {
        name: 'My CSAT',
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('uses custom scale when provided', async () => {
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.scale, '1-10');
        return makeMemoryRecord('s1', 'csat_survey', content, 'org-1');
      };

      await CsatService.createSurvey('org-1', {
        name: 'Survey',
        scale: '1-10',
        createdBy: 'user-1',
      });
    });
  });

  describe('getSurvey', () => {
    it('returns a survey by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'Test', question: 'Q?', scale: '1-5' });

      const result = await CsatService.getSurvey('s1');

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(result.name, 'Test');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CsatService.getSurvey('nope');
      assert.equal(result, null);
    });
  });

  describe('listSurveys', () => {
    it('returns surveys for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('s1', 'csat_survey', { name: 'S1', question: 'Q?', scale: '1-5' }),
        makeMemoryRecord('s2', 'csat_survey', { name: 'S2', question: 'Q?', scale: 'emoji' }),
      ];

      const result = await CsatService.listSurveys('org-1');

      assert.equal(result.length, 2);
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const result = await CsatService.listSurveys('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('submitResponse', () => {
    it('submits a response with clamped score', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'Survey', question: 'Q?', scale: '1-5' });
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'csat_response');
        const content = JSON.parse(args.data.content);
        assert.equal(content.score, 5); // clamped to max 5
        return makeMemoryRecord('r1', 'csat_response', content);
      };

      const result = await CsatService.submitResponse('s1', {
        score: 10, // clamped to 5 for 1-5 scale
        comment: 'Great!',
      });

      assert.ok(result);
    });

    it('throws when survey not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => CsatService.submitResponse('nope', { score: 3 }));
    });
  });

  describe('getResponses', () => {
    it('returns responses for a survey', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 5 }),
        makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 2 }),
      ];

      const result = await CsatService.getResponses('s1');

      assert.equal(result.length, 2);
    });

    it('filters by score range', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 5 }),
        makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 1 }),
        makeMemoryRecord('r3', 'csat_response', { surveyId: 's1', score: 4 }),
      ];

      const result = await CsatService.getResponses('s1', { scoreRange: [4, 5] });

      assert.equal(result.length, 2);
    });
  });

  describe('getScore', () => {
    it('calculates CSAT score for 1-5 scale (satisfied = 4-5)', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'S', question: 'Q?', scale: '1-5' });
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 5 }),
        makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 4 }),
        makeMemoryRecord('r3', 'csat_response', { surveyId: 's1', score: 3 }),
        makeMemoryRecord('r4', 'csat_response', { surveyId: 's1', score: 1 }),
      ];

      const score = await CsatService.getScore('s1');

      assert.equal(score.totalResponses, 4);
      assert.equal(score.satisfied, 2);
      assert.equal(score.neutral, 1);
      assert.equal(score.unsatisfied, 1);
      // 2/4 * 100 = 50
      assert.equal(score.score, 50);
    });

    it('returns zero score when no responses', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'S', question: 'Q?', scale: '1-5' });
      memoryFindManyImpl = async () => [];

      const score = await CsatService.getScore('s1');

      assert.equal(score.score, 0);
      assert.equal(score.totalResponses, 0);
    });

    it('calculates CSAT for 1-10 scale (satisfied = 8-10)', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'S', question: 'Q?', scale: '1-10' });
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 10 }),
        makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 8 }),
        makeMemoryRecord('r3', 'csat_response', { surveyId: 's1', score: 5 }),
      ];

      const score = await CsatService.getScore('s1');

      assert.equal(score.satisfied, 2);
      assert.equal(score.score, 67); // 2/3 * 100 ≈ 67
    });
  });

  describe('getTrend', () => {
    it('returns monthly CSAT trend', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'csat_survey', { name: 'S', question: 'Q?', scale: '1-5' });
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 5 }),
        makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 4 }),
      ];

      const trend = await CsatService.getTrend('s1');

      assert.ok(trend.length >= 1);
      assert.equal(trend[0].totalResponses, 2);
      assert.equal(trend[0].score, 100);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memoryFindManyImpl = async (args: any) => {
        if (args.where?.type === 'csat_survey') {
          return [
            makeMemoryRecord('s1', 'csat_survey', { name: 'S1', question: 'Q?', scale: '1-5' }),
          ];
        }
        return [
          makeMemoryRecord('r1', 'csat_response', { surveyId: 's1', score: 5 }),
          makeMemoryRecord('r2', 'csat_response', { surveyId: 's1', score: 4 }),
        ];
      };

      const stats = await CsatService.getStats('org-1');

      assert.equal(stats.totalSurveys, 1);
      assert.equal(stats.totalResponses, 2);
    });
  });
});
