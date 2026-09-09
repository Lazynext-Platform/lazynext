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
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'issue_comment',
    content: JSON.stringify(content),
    sourceId: 'iss-1',
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { IssueCommentService } = await import('@/lib/services/issue-comment-service');

// ─────────────────────────────────────────────────────────────────────────────
// IssueCommentService
// ─────────────────────────────────────────────────────────────────────────────

describe('IssueCommentService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a comment with type=issue_comment', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'issue_comment');
        const content = JSON.parse(args.data.content);
        assert.equal(content.issueId, 'iss-1');
        assert.equal(content.authorId, 'user-1');
        assert.equal(content.content, 'Looks good');
        assert.equal(content.edited, false);
        return makeRow('cmt-1', content);
      };

      const comment = await IssueCommentService.create('org-1', {
        issueId: 'iss-1',
        authorId: 'user-1',
        content: 'Looks good',
      });

      assert.ok(comment);
      assert.equal(comment.id, 'cmt-1');
      assert.equal(comment.issueId, 'iss-1');
      assert.equal(comment.authorId, 'user-1');
      assert.equal(comment.content, 'Looks good');
      assert.equal(comment.edited, false);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('trims content whitespace', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.content, 'trimmed');
        return makeRow('cmt-2', content);
      };

      const comment = await IssueCommentService.create('org-1', {
        issueId: 'iss-1',
        authorId: 'user-1',
        content: '  trimmed  ',
      });

      assert.equal(comment.content, 'trimmed');
    });
  });

  describe('get', () => {
    it('returns a comment by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('cmt-1', { issueId: 'iss-1', authorId: 'user-1', content: 'Hello', edited: false });

      const comment = await IssueCommentService.get('cmt-1');

      assert.ok(comment);
      assert.equal(comment.id, 'cmt-1');
      assert.equal(comment.content, 'Hello');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when comment not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const comment = await IssueCommentService.get('nope');
      assert.equal(comment, null);
    });
  });

  describe('list', () => {
    it('returns comments for an issue', async () => {
      memoryFindManyImpl = async () => [
        makeRow('cmt-1', { issueId: 'iss-1', authorId: 'u1', content: 'First', edited: false }),
        makeRow('cmt-2', { issueId: 'iss-1', authorId: 'u2', content: 'Second', edited: false }),
      ];

      const comments = await IssueCommentService.list('iss-1');

      assert.equal(comments.length, 2);
      assert.equal(comments[0].content, 'First');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const comments = await IssueCommentService.list('iss-1');
      assert.deepEqual(comments, []);
    });
  });

  describe('update', () => {
    it('updates comment content and marks as edited', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('cmt-1', { issueId: 'iss-1', authorId: 'user-1', content: 'old', edited: false });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.content, 'new content');
        assert.equal(content.edited, true);
        return makeRow('cmt-1', content);
      };

      const comment = await IssueCommentService.update('cmt-1', 'new content');

      assert.ok(comment);
      assert.equal(comment.content, 'new content');
      assert.equal(comment.edited, true);
    });

    it('returns null when comment not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const comment = await IssueCommentService.update('nope', 'x');
      assert.equal(comment, null);
    });
  });

  describe('delete', () => {
    it('deletes a comment', async () => {
      memoryDeleteImpl = async () => ({ id: 'cmt-1' });

      const result = await IssueCommentService.delete('cmt-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await IssueCommentService.delete('cmt-1');
      assert.equal(result, false);
    });
  });

  describe('getByIssue', () => {
    it('returns all comments for an issue (alias for list)', async () => {
      memoryFindManyImpl = async () => [
        makeRow('cmt-1', { issueId: 'iss-1', authorId: 'u1', content: 'A', edited: false }),
        makeRow('cmt-2', { issueId: 'iss-1', authorId: 'u2', content: 'B', edited: false }),
        makeRow('cmt-3', { issueId: 'iss-1', authorId: 'u3', content: 'C', edited: false }),
      ];

      const comments = await IssueCommentService.getByIssue('iss-1');

      assert.equal(comments.length, 3);
      assert.equal(comments[0].content, 'A');
    });
  });
});
