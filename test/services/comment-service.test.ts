import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let memoryFindFirstImpl: (args: unknown) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryDeleteManyImpl: (args: unknown) => Promise<unknown> = async () => ({ count: 0 });
let memoryCountImpl: (args: unknown) => Promise<number> = async () => 0;

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
    findFirst: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
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
    count: (args: unknown): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return memoryCountImpl(args);
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

// Mock NotificationService so CommentService.create doesn't hit the DB.
mock.module('@/lib/services/notification-service', {
  namedExports: {
    NotificationService: {
      create: async () => null,
    },
  },
});

function makeRow(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'comment',
    content: JSON.stringify({ body: 'hello', parentId: null, mentions: [], edited: false }),
    source: 'user',
    sourceId: 'task:task-1',
    confidence: 1.0,
    lifecycle: 'medium',
    tags: JSON.stringify(['comment', 'task']),
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryDeleteManyImpl = async () => ({ count: 0 });
  memoryCountImpl = async () => 0;
}

const { CommentService } = await import('@/lib/services/comment-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CommentService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a comment and returns a structured comment', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        return makeRow({ id: 'c1', content: a.data.content as string, sourceId: a.data.sourceId as string });
      };

      const result = await CommentService.create('org-1', {
        resourceType: 'task',
        resourceId: 'task-1',
        body: 'hello world',
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(result.body, 'hello world');
      assert.equal(result.resourceType, 'task');
      assert.equal(result.resourceId, 'task-1');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('encodes resourceType and resourceId into sourceId key', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.sourceId, 'goal:g1');
        return makeRow({ sourceId: 'goal:g1' });
      };

      await CommentService.create('org-1', {
        resourceType: 'goal',
        resourceId: 'g1',
        body: 'x',
        createdBy: 'u1',
      });
    });

    it('creates mention notifications when mentions provided', async () => {
      let created = false;
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        const content = JSON.parse(a.data.content as string);
        assert.deepEqual(content.mentions, ['user-2']);
        created = true;
        return makeRow({ content: a.data.content as string });
      };

      await CommentService.create('org-1', {
        resourceType: 'task',
        resourceId: 't1',
        body: 'hey @user-2',
        mentions: ['user-2'],
        createdBy: 'user-1',
      });

      assert.ok(created);
    });
  });

  describe('list', () => {
    it('returns comments for a resource', async () => {
      memoryFindManyImpl = async () => [makeRow({ id: 'c1' }), makeRow({ id: 'c2' })];

      const result = await CommentService.list('task', 'task-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters out replies when includeReplies is false', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ body: 'root', parentId: null, mentions: [], edited: false }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ body: 'reply', parentId: 'c1', mentions: [], edited: false }) }),
      ];

      const result = await CommentService.list('task', 'task-1', { includeReplies: false });

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await CommentService.list('task', 'task-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns a comment by id', async () => {
      memoryFindUniqueImpl = async () => makeRow({ id: 'c1' });

      const result = await CommentService.get('c1');

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when comment not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CommentService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('update', () => {
    it('updates the body and marks edited', async () => {
      memoryFindUniqueImpl = async () => makeRow({ id: 'c1' });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.body, 'updated');
        assert.equal(content.edited, true);
        return makeRow({ id: 'c1', content: a.data.content });
      };

      const result = await CommentService.update('c1', 'updated', 'user-2');

      assert.ok(result);
      assert.equal(result.body, 'updated');
      assert.equal(result.edited, true);
    });

    it('returns null when comment not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await CommentService.update('nope', 'x', 'u1');
      assert.equal(result, null);
    });
  });

  describe('delete', () => {
    it('deletes a comment with no replies', async () => {
      memoryFindManyImpl = async () => [];
      memoryDeleteManyImpl = async () => ({ count: 0 });
      memoryDeleteImpl = async () => ({ id: 'c1' });

      const result = await CommentService.delete('c1');

      assert.equal(result.deleted, true);
      assert.equal(result.repliesDeleted, 0);
    });

    it('deletes a comment and its replies recursively', async () => {
      // First call finds reply c2, then recursive delete for c2 finds no further replies.
      let findManyCallCount = 0;
      memoryFindManyImpl = async () => {
        findManyCallCount++;
        if (findManyCallCount === 1) {
          return [makeRow({ id: 'c2', content: JSON.stringify({ body: 'reply', parentId: 'c1', mentions: [], edited: false }) })];
        }
        return [];
      };
      memoryDeleteImpl = async () => ({ id: 'c1' });

      const result = await CommentService.delete('c1');

      assert.equal(result.deleted, true);
      assert.equal(result.repliesDeleted, 1);
    });
  });

  describe('getThread', () => {
    it('builds a tree from flat comments', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ body: 'root', parentId: null, mentions: [], edited: false }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ body: 'reply', parentId: 'c1', mentions: [], edited: false }) }),
      ];

      const thread = await CommentService.getThread('task', 'task-1');

      assert.equal(thread.length, 1);
      assert.equal(thread[0].id, 'c1');
      assert.ok(thread[0].replies);
      assert.equal(thread[0].replies!.length, 1);
      assert.equal(thread[0].replies![0].id, 'c2');
    });
  });

  describe('getReplies', () => {
    it('returns direct replies for a comment', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'c2', content: JSON.stringify({ body: 'reply', parentId: 'c1', mentions: [], edited: false }) }),
        makeRow({ id: 'c3', content: JSON.stringify({ body: 'other', parentId: 'c9', mentions: [], edited: false }) }),
      ];

      const replies = await CommentService.getReplies('c1');

      assert.equal(replies.length, 1);
      assert.equal(replies[0].id, 'c2');
    });
  });

  describe('addReaction', () => {
    it('adds a reaction when none exists', async () => {
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.type, 'reaction');
        return makeRow({ id: 'r1', type: 'reaction' });
      };

      const added = await CommentService.addReaction('c1', 'user-1', '👍');

      assert.equal(added, true);
    });

    it('returns false when reaction already exists', async () => {
      memoryFindManyImpl = async () => [
        makeRow({
          id: 'r1',
          type: 'reaction',
          sourceId: 'comment:c1',
          content: JSON.stringify({ emoji: '👍', userId: 'user-1', commentId: 'c1' }),
        }),
      ];

      const added = await CommentService.addReaction('c1', 'user-1', '👍');

      assert.equal(added, false);
    });
  });

  describe('removeReaction', () => {
    it('removes an existing reaction', async () => {
      memoryFindManyImpl = async () => [
        makeRow({
          id: 'r1',
          type: 'reaction',
          sourceId: 'comment:c1',
          content: JSON.stringify({ emoji: '👍', userId: 'user-1', commentId: 'c1' }),
        }),
      ];
      memoryDeleteImpl = async () => ({ id: 'r1' });

      const removed = await CommentService.removeReaction('c1', 'user-1', '👍');

      assert.equal(removed, true);
    });

    it('returns false when reaction not found', async () => {
      memoryFindManyImpl = async () => [];

      const removed = await CommentService.removeReaction('c1', 'user-1', '👍');

      assert.equal(removed, false);
    });
  });

  describe('getReactions', () => {
    it('groups reactions by emoji', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'reaction', sourceId: 'comment:c1', content: JSON.stringify({ emoji: '👍', userId: 'u1', commentId: 'c1' }) }),
        makeRow({ id: 'r2', type: 'reaction', sourceId: 'comment:c1', content: JSON.stringify({ emoji: '👍', userId: 'u2', commentId: 'c1' }) }),
        makeRow({ id: 'r3', type: 'reaction', sourceId: 'comment:c1', content: JSON.stringify({ emoji: '🎉', userId: 'u1', commentId: 'c1' }) }),
      ];

      const groups = await CommentService.getReactions('c1');

      assert.equal(groups.length, 2);
      const thumbs = groups.find((g) => g.emoji === '👍');
      assert.ok(thumbs);
      assert.equal(thumbs!.count, 2);
      assert.deepEqual(thumbs!.userIds, ['u1', 'u2']);
    });
  });

  describe('getCommentCount', () => {
    it('counts comments for a resource', async () => {
      memoryCountImpl = async () => 5;

      const count = await CommentService.getCommentCount('task', 'task-1');

      assert.equal(count, 5);
      assert.equal(calls[0].method, 'memory.count');
    });

    it('returns 0 on error (safePrisma fallback)', async () => {
      memoryCountImpl = async () => { throw new Error('fail'); };

      const count = await CommentService.getCommentCount('task', 'task-1');
      assert.equal(count, 0);
    });
  });

  describe('getRecentComments', () => {
    it('returns recent comments for an organization', async () => {
      memoryFindManyImpl = async () => [makeRow({ id: 'c1' }), makeRow({ id: 'c2' })];

      const result = await CommentService.getRecentComments('org-1');

      assert.equal(result.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('applies workspace and user filters', async () => {
      memoryFindManyImpl = async (args: unknown) => {
        const a = args as { where: Record<string, unknown> };
        assert.equal(a.where.workspaceId, 'ws-1');
        assert.equal(a.where.createdBy, 'user-1');
        return [];
      };

      await CommentService.getRecentComments('org-1', { workspaceId: 'ws-1', userId: 'user-1' });
    });
  });

  describe('resolveThread', () => {
    it('marks a thread as resolved', async () => {
      memoryFindFirstImpl = async () => null;
      memoryFindUniqueImpl = async () => makeRow({ id: 'c1' });
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: Record<string, unknown> };
        assert.equal(a.data.type, 'thread_resolution');
        return makeRow({ id: 'res1', type: 'thread_resolution' });
      };

      const resolved = await CommentService.resolveThread('c1', 'user-1');

      assert.equal(resolved, true);
    });

    it('returns false when already resolved', async () => {
      memoryFindFirstImpl = async () => makeRow({ id: 'res1', type: 'thread_resolution' });

      const resolved = await CommentService.resolveThread('c1', 'user-1');

      assert.equal(resolved, false);
    });

    it('returns false when comment not found', async () => {
      memoryFindFirstImpl = async () => null;
      memoryFindUniqueImpl = async () => null;

      const resolved = await CommentService.resolveThread('nope', 'user-1');

      assert.equal(resolved, false);
    });
  });

  describe('unresolveThread', () => {
    it('unmarks a thread as resolved', async () => {
      memoryDeleteManyImpl = async () => ({ count: 1 });

      const unresolved = await CommentService.unresolveThread('c1');

      assert.equal(unresolved, true);
      assert.equal(calls[0].method, 'memory.deleteMany');
    });

    it('returns false on error', async () => {
      memoryDeleteManyImpl = async () => { throw new Error('fail'); };

      const unresolved = await CommentService.unresolveThread('c1');

      assert.equal(unresolved, false);
    });
  });

  describe('getMentions', () => {
    it('returns comments that mention the user', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ body: 'hey @u2', parentId: null, mentions: ['u2'], edited: false }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ body: 'no mention', parentId: null, mentions: [], edited: false }) }),
      ];

      const result = await CommentService.getMentions('u2');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
    });

    it('respects the limit option', async () => {
      memoryFindManyImpl = async () => [
        makeRow({ id: 'c1', content: JSON.stringify({ body: 'a', parentId: null, mentions: ['u2'], edited: false }) }),
        makeRow({ id: 'c2', content: JSON.stringify({ body: 'b', parentId: null, mentions: ['u2'], edited: false }) }),
        makeRow({ id: 'c3', content: JSON.stringify({ body: 'c', parentId: null, mentions: ['u2'], edited: false }) }),
      ];

      const result = await CommentService.getMentions('u2', { limit: 2 });

      assert.equal(result.length, 2);
    });
  });
});
