import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type KBFindManyArgs = {
  where: { workspaceId: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type KBFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type KBCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string;
    name: string;
    description?: string | null;
    visibility: string;
    ownerId?: string | null;
    tags: string;
    metadata: string;
  };
};

type KBUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type ArticleFindManyArgs = {
  where: { knowledgeBaseId?: string; knowledgeBase?: { workspaceId: string }; OR?: unknown[] };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type ArticleFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type ArticleCreateArgs = {
  data: {
    knowledgeBaseId: string;
    title: string;
    content: string;
    summary?: string | null;
    source: string;
    sourceUrl?: string | null;
    tags: string;
    status: string;
    wordCount: number;
    createdBy?: string | null;
  };
};

type ArticleUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let kbFindManyImpl: (args: KBFindManyArgs) => Promise<unknown[]> = async () => [];
let kbFindUniqueImpl: (args: KBFindUniqueArgs) => Promise<unknown> = async () => null;
let kbCreateImpl: (args: KBCreateArgs) => Promise<unknown> = async () => ({});
let kbUpdateImpl: (args: KBUpdateArgs) => Promise<unknown> = async () => ({});
let kbDeleteImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => ({});

let articleFindManyImpl: (args: ArticleFindManyArgs) => Promise<unknown[]> = async () => [];
let articleFindUniqueImpl: (args: ArticleFindUniqueArgs) => Promise<unknown> = async () => null;
let articleCreateImpl: (args: ArticleCreateArgs) => Promise<unknown> = async () => ({});
let articleUpdateImpl: (args: ArticleUpdateArgs) => Promise<unknown> = async () => ({});
let articleDeleteImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => ({});

const prismaMock = {
  knowledgeBase: {
    findMany: (args: KBFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeBase.findMany', args });
      return kbFindManyImpl(args);
    },
    findUnique: (args: KBFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeBase.findUnique', args });
      return kbFindUniqueImpl(args);
    },
    create: (args: KBCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeBase.create', args });
      return kbCreateImpl(args);
    },
    update: (args: KBUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeBase.update', args });
      return kbUpdateImpl(args);
    },
    delete: (args: { where: { id: string } }): Promise<unknown> => {
      calls.push({ method: 'knowledgeBase.delete', args });
      return kbDeleteImpl(args);
    },
  },
  knowledgeArticle: {
    findMany: (args: ArticleFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'knowledgeArticle.findMany', args });
      return articleFindManyImpl(args);
    },
    findUnique: (args: ArticleFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeArticle.findUnique', args });
      return articleFindUniqueImpl(args);
    },
    create: (args: ArticleCreateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeArticle.create', args });
      return articleCreateImpl(args);
    },
    update: (args: ArticleUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'knowledgeArticle.update', args });
      return articleUpdateImpl(args);
    },
    delete: (args: { where: { id: string } }): Promise<unknown> => {
      calls.push({ method: 'knowledgeArticle.delete', args });
      return articleDeleteImpl(args);
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
  kbFindManyImpl = async () => [];
  kbFindUniqueImpl = async () => null;
  kbCreateImpl = async () => ({});
  kbUpdateImpl = async () => ({});
  kbDeleteImpl = async () => ({});
  articleFindManyImpl = async () => [];
  articleFindUniqueImpl = async () => null;
  articleCreateImpl = async () => ({});
  articleUpdateImpl = async () => ({});
  articleDeleteImpl = async () => ({});
}

const { KnowledgeService } = await import('@/lib/services/knowledge');

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — Knowledge Bases
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService — Knowledge Bases', () => {
  beforeEach(() => { resetMock(); });

  describe('listKnowledgeBases', () => {
    it('returns knowledge bases for a workspace', async () => {
      kbFindManyImpl = async () =>
        ([{ id: 'kb1', name: 'Marketing KB', _count: { articles: 3 } }]);

      const result = await KnowledgeService.listKnowledgeBases('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'kb1');
      assert.equal(calls[0].method, 'knowledgeBase.findMany');
      const args = calls[0].args as KBFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      kbFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await KnowledgeService.listKnowledgeBases('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getKnowledgeBase', () => {
    it('returns a knowledge base by id with articles', async () => {
      kbFindUniqueImpl = async () =>
        ({ id: 'kb1', name: 'KB', articles: [{ id: 'a1' }] });

      const result = await KnowledgeService.getKnowledgeBase('kb1');

      assert.ok(result);
      assert.equal(result.id, 'kb1');
      assert.equal(calls[0].method, 'knowledgeBase.findUnique');
    });

    it('returns null when knowledge base not found', async () => {
      kbFindUniqueImpl = async () => null;

      const result = await KnowledgeService.getKnowledgeBase('nope');
      assert.equal(result, null);
    });
  });

  describe('createKnowledgeBase', () => {
    it('creates a knowledge base with defaults', async () => {
      kbCreateImpl = async (args: KBCreateArgs) => {
        assert.equal(args.data.visibility, 'workspace');
        assert.equal(args.data.tags, '[]');
        assert.equal(args.data.metadata, '{}');
        return { id: 'kb1', ...args.data };
      };

      const result = await KnowledgeService.createKnowledgeBase('ws-1', {
        organizationId: 'org-1',
        name: 'New KB',
      });

      assert.ok(result);
      assert.equal(result.id, 'kb1');
      assert.equal(calls[0].method, 'knowledgeBase.create');
    });

    it('serializes tags and metadata to JSON', async () => {
      kbCreateImpl = async (args: KBCreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['marketing', 'ads']));
        assert.equal(args.data.metadata, JSON.stringify({ priority: 'high' }));
        return { id: 'kb1' };
      };

      await KnowledgeService.createKnowledgeBase('ws-1', {
        organizationId: 'org-1',
        name: 'KB',
        tags: ['marketing', 'ads'],
        metadata: { priority: 'high' },
      });
    });
  });

  describe('updateKnowledgeBase', () => {
    it('updates only provided fields', async () => {
      kbUpdateImpl = async (args: KBUpdateArgs) => {
        assert.equal(args.data.name, 'Updated KB');
        assert.equal(args.data.description, undefined);
        return { id: 'kb1', ...args.data };
      };

      const result = await KnowledgeService.updateKnowledgeBase('kb1', { name: 'Updated KB' });
      assert.ok(result);
      assert.equal(calls[0].method, 'knowledgeBase.update');
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('deletes a knowledge base', async () => {
      kbDeleteImpl = async () => ({ id: 'kb1' });

      const result = await KnowledgeService.deleteKnowledgeBase('kb1');
      assert.ok(result);
      assert.equal(calls[0].method, 'knowledgeBase.delete');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeService — Articles
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeService — Articles', () => {
  beforeEach(() => { resetMock(); });

  describe('listArticles', () => {
    it('returns articles for a knowledge base', async () => {
      articleFindManyImpl = async () =>
        ([{ id: 'a1', title: 'Article 1', wordCount: 100 }]);

      const result = await KnowledgeService.listArticles('kb1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a1');
      assert.equal(calls[0].method, 'knowledgeArticle.findMany');
      const args = calls[0].args as ArticleFindManyArgs;
      assert.equal(args.where.knowledgeBaseId, 'kb1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      articleFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await KnowledgeService.listArticles('kb1');
      assert.deepEqual(result, []);
    });
  });

  describe('createArticle', () => {
    it('creates an article with computed wordCount', async () => {
      articleCreateImpl = async (args: ArticleCreateArgs) => {
        // "hello world foo bar baz" = 5 words
        assert.equal(args.data.wordCount, 5);
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.source, 'manual');
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeService.createArticle('kb1', {
        title: 'Test Article',
        content: 'hello world foo bar baz',
      });

      assert.ok(result);
      assert.equal(result.id, 'a1');
      assert.equal(calls[0].method, 'knowledgeArticle.create');
    });

    it('handles empty content with wordCount 0', async () => {
      articleCreateImpl = async (args: ArticleCreateArgs) => {
        assert.equal(args.data.wordCount, 0);
        return { id: 'a1', ...args.data };
      };

      await KnowledgeService.createArticle('kb1', {
        title: 'Empty',
        content: '   ',
      });
    });
  });

  describe('updateArticle', () => {
    it('updates content and recomputes wordCount', async () => {
      articleUpdateImpl = async (args: ArticleUpdateArgs) => {
        // "one two three" = 3 words
        assert.equal(args.data.wordCount, 3);
        assert.equal(args.data.content, 'one two three');
        return { id: 'a1', ...args.data };
      };

      const result = await KnowledgeService.updateArticle('a1', { content: 'one two three' });
      assert.ok(result);
      assert.equal(calls[0].method, 'knowledgeArticle.update');
    });

    it('increments version on update', async () => {
      articleUpdateImpl = async (args: ArticleUpdateArgs) => {
        assert.deepEqual(args.data.version, { increment: 1 });
        return { id: 'a1', version: 2 };
      };

      const result = await KnowledgeService.updateArticle('a1', { title: 'Updated' });
      assert.ok(result);
    });
  });

  describe('deleteArticle', () => {
    it('deletes an article', async () => {
      articleDeleteImpl = async () => ({ id: 'a1' });

      const result = await KnowledgeService.deleteArticle('a1');
      assert.ok(result);
      assert.equal(calls[0].method, 'knowledgeArticle.delete');
    });
  });

  describe('searchArticles', () => {
    it('searches articles by title and content in a workspace', async () => {
      articleFindManyImpl = async (args: ArticleFindManyArgs) => {
        assert.equal(args.where?.knowledgeBase?.workspaceId, 'ws-1');
        assert.ok(args.where.OR);
        return [{ id: 'a1', title: 'Match', knowledgeBase: { id: 'kb1', name: 'KB' } }];
      };

      const result = await KnowledgeService.searchArticles('ws-1', 'marketing');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a1');
      assert.equal(calls[0].method, 'knowledgeArticle.findMany');
    });

    it('returns empty array for empty query', async () => {
      const result = await KnowledgeService.searchArticles('ws-1', '  ');
      assert.deepEqual(result, []);
      assert.equal(calls.length, 0);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      articleFindManyImpl = async () => { throw new Error('fail'); };

      const result = await KnowledgeService.searchArticles('ws-1', 'test');
      assert.deepEqual(result, []);
    });
  });
});
