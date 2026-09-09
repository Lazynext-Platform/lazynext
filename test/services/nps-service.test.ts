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

const { NpsService } = await import('@/lib/services/nps-service');

// ─────────────────────────────────────────────────────────────────────────────
// NpsService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('NpsService', () => {
  beforeEach(() => { resetMock(); });

  describe('createSurvey', () => {
    it('creates an NPS survey with defaults', async () => {
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'nps_survey');
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'My Survey');
        assert.equal(content.question, 'How likely are you to recommend us to a friend or colleague?');
        assert.equal(content.followUpQuestion, 'What is the primary reason for your score?');
        assert.equal(content.status, 'active');
        return makeMemoryRecord('s1', 'nps_survey', content, 'org-1');
      };

      const result = await NpsService.createSurvey('org-1', {
        name: 'My Survey',
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('uses custom question when provided', async () => {
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.question, 'Custom question?');
        return makeMemoryRecord('s1', 'nps_survey', content, 'org-1');
      };

      await NpsService.createSurvey('org-1', {
        name: 'Survey',
        question: 'Custom question?',
        createdBy: 'user-1',
      });
    });
  });

  describe('getSurvey', () => {
    it('returns a survey by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'nps_survey', { name: 'Test', question: 'Q?', followUpQuestion: 'F?' });

      const result = await NpsService.getSurvey('s1');

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(result.name, 'Test');
    });

    it('returns null when survey not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await NpsService.getSurvey('nope');
      assert.equal(result, null);
    });

    it('returns null when type is not nps_survey', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'other_type', { name: 'Test' });

      const result = await NpsService.getSurvey('s1');
      assert.equal(result, null);
    });
  });

  describe('listSurveys', () => {
    it('returns surveys for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('s1', 'nps_survey', { name: 'Survey 1', question: 'Q?', followUpQuestion: 'F?' }),
        makeMemoryRecord('s2', 'nps_survey', { name: 'Survey 2', question: 'Q?', followUpQuestion: 'F?' }),
      ];

      const result = await NpsService.listSurveys('org-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 's1');
      assert.equal(result[1].id, 's2');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await NpsService.listSurveys('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateSurvey', () => {
    it('updates survey name and status', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'nps_survey', { name: 'Old', question: 'Q?', followUpQuestion: 'F?', status: 'active' });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.name, 'New Name');
        assert.equal(content.status, 'paused');
        return makeMemoryRecord('s1', 'nps_survey', content);
      };

      const result = await NpsService.updateSurvey('s1', { name: 'New Name', status: 'paused' });
      assert.ok(result);
    });

    it('throws when survey not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => NpsService.updateSurvey('nope', { name: 'X' }));
    });
  });

  describe('submitResponse', () => {
    it('submits a response with clamped score', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'nps_survey', { name: 'Survey', question: 'Q?', followUpQuestion: 'F?' });
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'nps_response');
        assert.equal(args.data.sourceId, 's1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.score, 10);
        assert.equal(content.comment, 'Great!');
        return makeMemoryRecord('r1', 'nps_response', content);
      };

      const result = await NpsService.submitResponse('s1', {
        score: 15, // should be clamped to 10
        comment: 'Great!',
      });

      assert.ok(result);
    });

    it('clamps negative scores to 0', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('s1', 'nps_survey', { name: 'Survey', question: 'Q?', followUpQuestion: 'F?' });
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.score, 0);
        return makeMemoryRecord('r1', 'nps_response', content);
      };

      await NpsService.submitResponse('s1', { score: -5 });
    });

    it('throws when survey not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => NpsService.submitResponse('nope', { score: 5 }));
    });
  });

  describe('getResponses', () => {
    it('returns responses for a survey', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10, comment: 'Great' }),
        makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 3, comment: 'Bad' }),
      ];

      const result = await NpsService.getResponses('s1');

      assert.equal(result.length, 2);
      assert.equal(result[0].score, 10);
    });

    it('filters by score range', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10 }),
        makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 3 }),
        makeMemoryRecord('r3', 'nps_response', { surveyId: 's1', score: 9 }),
      ];

      const result = await NpsService.getResponses('s1', { scoreRange: [9, 10] });

      assert.equal(result.length, 2);
    });
  });

  describe('getScore', () => {
    it('calculates NPS score correctly', async () => {
      // 2 promoters (9,10), 1 passive (7,8), 2 detractors (0-6)
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10 }),
        makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 9 }),
        makeMemoryRecord('r3', 'nps_response', { surveyId: 's1', score: 7 }),
        makeMemoryRecord('r4', 'nps_response', { surveyId: 's1', score: 3 }),
        makeMemoryRecord('r5', 'nps_response', { surveyId: 's1', score: 0 }),
      ];

      const score = await NpsService.getScore('s1');

      assert.equal(score.promoterCount, 2);
      assert.equal(score.passiveCount, 1);
      assert.equal(score.detractorCount, 2);
      assert.equal(score.totalResponses, 5);
      // (2/5)*100 - (2/5)*100 = 40 - 40 = 0
      assert.equal(score.score, 0);
    });

    it('returns zero score when no responses', async () => {
      memoryFindManyImpl = async () => [];

      const score = await NpsService.getScore('s1');

      assert.equal(score.score, 0);
      assert.equal(score.totalResponses, 0);
    });

    it('calculates positive NPS with more promoters', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10 }),
        makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 9 }),
        makeMemoryRecord('r3', 'nps_response', { surveyId: 's1', score: 9 }),
        makeMemoryRecord('r4', 'nps_response', { surveyId: 's1', score: 5 }),
      ];

      const score = await NpsService.getScore('s1');

      // 3 promoters, 0 passive, 1 detractor → 75% - 25% = 50
      assert.equal(score.score, 50);
      assert.equal(score.promoterCount, 3);
      assert.equal(score.detractorCount, 1);
    });
  });

  describe('getTrend', () => {
    it('returns monthly NPS trend', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10 }),
        makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 9 }),
      ];

      const trend = await NpsService.getTrend('s1');

      assert.ok(trend.length >= 1);
      assert.equal(trend[0].totalResponses, 2);
      assert.equal(trend[0].score, 100);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memoryFindManyImpl = async (args: any) => {
        // listSurveys call
        if (args.where?.type === 'nps_survey') {
          return [
            makeMemoryRecord('s1', 'nps_survey', { name: 'S1', question: 'Q?', followUpQuestion: 'F?' }),
            makeMemoryRecord('s2', 'nps_survey', { name: 'S2', question: 'Q?', followUpQuestion: 'F?' }),
          ];
        }
        // getResponses call
        return [
          makeMemoryRecord('r1', 'nps_response', { surveyId: 's1', score: 10 }),
          makeMemoryRecord('r2', 'nps_response', { surveyId: 's1', score: 9 }),
        ];
      };

      const stats = await NpsService.getStats('org-1');

      assert.equal(stats.totalSurveys, 2);
      assert.equal(stats.totalResponses, 4); // 2 per survey
    });
  });
});
