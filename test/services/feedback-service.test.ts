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
}

function makeMemoryRecord(id: string, type: string, content: object, orgId: string = 'org-1'): {
  id: string; type: string; content: string; tags: string; createdAt: Date; updatedAt: Date;
  workspaceId: string; organizationId: string; createdBy: string;
} {
  return {
    id,
    type,
    content: JSON.stringify(content),
    tags: JSON.stringify(['customer_feedback']),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    workspaceId: 'ws-1',
    organizationId: orgId,
    createdBy: 'user-1',
  };
}

const { FeedbackService } = await import('@/lib/services/feedback-service');

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FeedbackService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates feedback with sentiment analysis', async () => {
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'customer_feedback');
        const content = JSON.parse(args.data.content);
        assert.equal(content.source, 'form');
        assert.equal(content.content, 'This product is great and amazing!');
        assert.equal(content.sentiment, 'positive');
        assert.ok(content.sentimentScore > 0);
        return makeMemoryRecord('f1', 'customer_feedback', content);
      };

      const result = await FeedbackService.create('org-1', {
        source: 'form',
        content: 'This product is great and amazing!',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('detects negative sentiment', async () => {
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.sentiment, 'negative');
        assert.ok(content.sentimentScore < 0);
        return makeMemoryRecord('f1', 'customer_feedback', content);
      };

      await FeedbackService.create('org-1', {
        source: 'email',
        content: 'This is terrible and awful. I hate it.',
      });
    });

    it('detects neutral sentiment', async () => {
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.sentiment, 'neutral');
        assert.equal(content.sentimentScore, 0);
        return makeMemoryRecord('f1', 'customer_feedback', content);
      };

      await FeedbackService.create('org-1', {
        source: 'api',
        content: 'The product works as expected.',
      });
    });
  });

  describe('get', () => {
    it('returns feedback by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'Great!', sentiment: 'positive' });

      const result = await FeedbackService.get('f1');

      assert.ok(result);
      assert.equal(result.id, 'f1');
      assert.equal(result.content, 'Great!');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await FeedbackService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns feedback for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'A' }),
        makeMemoryRecord('f2', 'customer_feedback', { source: 'email', content: 'B' }),
      ];

      const result = await FeedbackService.list('org-1');

      assert.equal(result.length, 2);
    });

    it('filters by category', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'A', category: 'bug' }),
        makeMemoryRecord('f2', 'customer_feedback', { source: 'email', content: 'B', category: 'feature' }),
      ];

      const result = await FeedbackService.list('org-1', { category: 'bug' });

      assert.equal(result.length, 1);
      assert.equal(result[0].category, 'bug');
    });

    it('filters by search text', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'Great product' }),
        makeMemoryRecord('f2', 'customer_feedback', { source: 'email', content: 'Bad service' }),
      ];

      const result = await FeedbackService.list('org-1', { search: 'great' });

      assert.equal(result.length, 1);
      assert.equal(result[0].content, 'Great product');
    });
  });

  describe('update', () => {
    it('updates category and tags', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'Test', category: 'general', tags: [] });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.category, 'bug');
        assert.deepEqual(content.tags, ['urgent']);
        return makeMemoryRecord('f1', 'customer_feedback', content);
      };

      const result = await FeedbackService.update('f1', { category: 'bug', tags: ['urgent'] });
      assert.ok(result);
    });

    it('throws when feedback not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => FeedbackService.update('nope', { category: 'x' }));
    });
  });

  describe('delete', () => {
    it('deletes feedback', async () => {
      memoryDeleteImpl = async () => ({ id: 'f1' });

      const result = await FeedbackService.delete('f1');
      assert.ok(result);
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('respond', () => {
    it('responds to feedback', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'Test', response: null });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.response, 'Thank you for your feedback!');
        assert.equal(content.respondedBy, 'user-1');
        assert.ok(content.respondedAt);
        return makeMemoryRecord('f1', 'customer_feedback', content);
      };

      const result = await FeedbackService.respond('f1', 'Thank you for your feedback!', 'user-1');
      assert.ok(result);
    });

    it('throws when feedback not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => FeedbackService.respond('nope', 'resp', 'user-1'));
    });
  });

  describe('getByCategory', () => {
    it('groups feedback by category', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'A', category: 'bug' }),
        makeMemoryRecord('f2', 'customer_feedback', { source: 'email', content: 'B', category: 'bug' }),
        makeMemoryRecord('f3', 'customer_feedback', { source: 'api', content: 'C', category: 'feature' }),
      ];

      const result = await FeedbackService.getByCategory('org-1');

      assert.equal(result.bug, 2);
      assert.equal(result.feature, 1);
    });
  });

  describe('getSentiment', () => {
    it('analyzes positive sentiment', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'This is amazing and great!' });

      const result = await FeedbackService.getSentiment('f1');

      assert.ok(result);
      assert.equal(result.sentiment, 'positive');
      assert.ok(result.score > 0);
      assert.ok(result.keywords.length > 0);
    });

    it('analyzes negative sentiment', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'This is terrible and awful.' });

      const result = await FeedbackService.getSentiment('f1');

      assert.ok(result);
      assert.equal(result.sentiment, 'negative');
      assert.ok(result.score < 0);
    });

    it('analyzes neutral sentiment', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'The sky is blue.' });

      const result = await FeedbackService.getSentiment('f1');

      assert.ok(result);
      assert.equal(result.sentiment, 'neutral');
      assert.equal(result.score, 0);
    });

    it('returns null when feedback not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await FeedbackService.getSentiment('nope');
      assert.equal(result, null);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('f1', 'customer_feedback', { source: 'form', content: 'A', category: 'bug', rating: 5, sentiment: 'positive' }),
        makeMemoryRecord('f2', 'customer_feedback', { source: 'email', content: 'B', category: 'feature', rating: 3, sentiment: 'neutral' }),
        makeMemoryRecord('f3', 'customer_feedback', { source: 'form', content: 'C', category: 'bug', sentiment: 'negative' }),
      ];

      const stats = await FeedbackService.getStats('org-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.bySource.form, 2);
      assert.equal(stats.bySource.email, 1);
      assert.equal(stats.byCategory.bug, 2);
      assert.equal(stats.byCategory.feature, 1);
      assert.equal(stats.sentimentBreakdown.positive, 1);
      assert.equal(stats.sentimentBreakdown.neutral, 1);
      assert.equal(stats.sentimentBreakdown.negative, 1);
      assert.equal(stats.avgRating, 4); // (5+3)/2 = 4
    });
  });
});
