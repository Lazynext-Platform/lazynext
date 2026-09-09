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
type AggregateArgs = { where: Record<string, unknown>; _sum: Record<string, boolean> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let articleFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let articleFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let articleCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let articleUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let articleDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let articleCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let articleGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];
let articleAggregateImpl: (args: AggregateArgs) => Promise<unknown> = async () => ({ _sum: { views: 0 } });

const prismaMock = {
  iTSMArticle: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'itsmArticle.findMany', args }); return articleFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'itsmArticle.findUnique', args }); return articleFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'itsmArticle.create', args }); return articleCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'itsmArticle.update', args }); return articleUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'itsmArticle.delete', args }); return articleDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'itsmArticle.count', args }); return articleCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'itsmArticle.groupBy', args }); return articleGroupByImpl(args); },
    aggregate: (args: AggregateArgs): Promise<unknown> => { calls.push({ method: 'itsmArticle.aggregate', args }); return articleAggregateImpl(args); },
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
  articleFindManyImpl = async () => [];
  articleFindUniqueImpl = async () => null;
  articleCreateImpl = async () => ({});
  articleUpdateImpl = async () => ({});
  articleDeleteImpl = async () => ({});
  articleCountImpl = async () => 0;
  articleGroupByImpl = async () => [];
  articleAggregateImpl = async () => ({ _sum: { views: 0 } });
}

const { KnowledgeBaseService } = await import('@/lib/services/knowledge-base-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeBaseService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns articles for an organization', async () => {
      articleFindManyImpl = async () => [{ id: 'a1', title: 'How to reset password' }];

      const result = await KnowledgeBaseService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a1');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status, category, and type filters', async () => {
      articleFindManyImpl = async () => [];

      await KnowledgeBaseService.list('org-1', { status: 'published', category: 'how_to', type: 'faq' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'published');
      assert.equal(args.where.category, 'how_to');
      assert.equal(args.where.type, 'faq');
    });

    it('applies search filter with OR clause', async () => {
      articleFindManyImpl = async () => [];

      await KnowledgeBaseService.list('org-1', { search: 'password' });

      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });
  });

  describe('get', () => {
    it('returns an article by id', async () => {
      articleFindUniqueImpl = async () => ({ id: 'a1', title: 'Test' });

      const result = await KnowledgeBaseService.get('a1');
      assert.ok(result);
      assert.equal(result.id, 'a1');
    });

    it('returns null when not found', async () => {
      articleFindUniqueImpl = async () => null;
      const result = await KnowledgeBaseService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an article with defaults', async () => {
      articleCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.category, 'general');
        assert.equal(args.data.type, 'article');
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.tags, JSON.stringify([]));
        assert.equal(args.data.authorId, 'u1');
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.create({
        organizationId: 'org-1',
        title: 'How to reset password',
        authorId: 'u1',
      });
      assert.ok(result);
      assert.equal(result.id, 'a1');
    });

    it('serializes tags as JSON array string', async () => {
      articleCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['auth', 'faq']));
        return { id: 'a1', ...args.data };
      };

      await KnowledgeBaseService.create({
        organizationId: 'org-1',
        title: 'Test',
        authorId: 'u1',
        tags: ['auth', 'faq'],
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.content, undefined);
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.update('a1', { title: 'Updated' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes an article', async () => {
      articleDeleteImpl = async () => ({ id: 'a1' });

      const result = await KnowledgeBaseService.delete('a1');
      assert.ok(result);
      assert.equal(calls[0].method, 'itsmArticle.delete');
    });
  });

  describe('publishArticle', () => {
    it('sets status to published with publishedAt', async () => {
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'published');
        assert.ok(args.data.publishedAt instanceof Date);
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.publishArticle('a1');
      assert.ok(result);
    });
  });

  describe('archiveArticle', () => {
    it('sets status to archived', async () => {
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'archived');
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.archiveArticle('a1');
      assert.ok(result);
    });
  });

  describe('incrementViews', () => {
    it('increments the views counter by 1', async () => {
      articleFindUniqueImpl = async () => ({ id: 'a1', views: 5 });
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.views, 6);
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.incrementViews('a1') as { views: number };
      assert.equal(result.views, 6);
    });

    it('throws when article not found', async () => {
      articleFindUniqueImpl = async () => null;
      await assert.rejects(() => KnowledgeBaseService.incrementViews('nope'), /article_not_found/);
    });
  });

  describe('voteArticle', () => {
    it('increments helpfulVotes when helpful=true', async () => {
      articleFindUniqueImpl = async () => ({ id: 'a1', helpfulVotes: 3, unhelpfulVotes: 1 });
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.helpfulVotes, 4);
        assert.equal(args.data.unhelpfulVotes, undefined);
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.voteArticle('a1', true) as { helpfulVotes: number };
      assert.equal(result.helpfulVotes, 4);
    });

    it('increments unhelpfulVotes when helpful=false', async () => {
      articleFindUniqueImpl = async () => ({ id: 'a1', helpfulVotes: 3, unhelpfulVotes: 1 });
      articleUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.unhelpfulVotes, 2);
        assert.equal(args.data.helpfulVotes, undefined);
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeBaseService.voteArticle('a1', false) as { unhelpfulVotes: number };
      assert.equal(result.unhelpfulVotes, 2);
    });

    it('throws when article not found', async () => {
      articleFindUniqueImpl = async () => null;
      await assert.rejects(() => KnowledgeBaseService.voteArticle('nope', true), /article_not_found/);
    });
  });

  describe('searchArticles', () => {
    it('searches published articles with OR clause', async () => {
      articleFindManyImpl = async () => [{ id: 'a1', title: 'Reset password' }];

      const result = await KnowledgeBaseService.searchArticles('org-1', 'password');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'published');
      assert.ok(args.where.OR);
    });
  });

  describe('getByCategory', () => {
    it('filters articles by category', async () => {
      articleFindManyImpl = async () => [{ id: 'a1' }];
      const result = await KnowledgeBaseService.getByCategory('org-1', 'how_to');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.category, 'how_to');
    });
  });

  describe('getPopular', () => {
    it('returns popular published articles ordered by views', async () => {
      articleFindManyImpl = async () => [{ id: 'a1', views: 100 }, { id: 'a2', views: 50 }];

      const result = await KnowledgeBaseService.getPopular('org-1', 5);
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.take, 5);
      assert.equal(args.where.status, 'published');
    });
  });

  describe('getStats', () => {
    it('returns total, byStatus, byCategory, and totalViews', async () => {
      articleCountImpl = async () => 12;
      articleGroupByImpl = async (args: GroupByArgs) => {
        if (args.by[0] === 'status') return [{ status: 'published', _count: 8 }, { status: 'draft', _count: 4 }];
        return [{ category: 'how_to', _count: 5 }, { category: 'faq', _count: 7 }];
      };
      articleAggregateImpl = async () => ({ _sum: { views: 1234 } });

      const result = await KnowledgeBaseService.getStats('org-1');
      assert.equal(result.total, 12);
      assert.equal(result.byStatus.published, 8);
      assert.equal(result.byStatus.draft, 4);
      assert.equal(result.byCategory.how_to, 5);
      assert.equal(result.byCategory.faq, 7);
      assert.equal(result.totalViews, 1234);
    });
  });
});
