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

function makeMessageRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'org-1',
    organizationId: 'org-1',
    type: 'team_message',
    content: JSON.stringify(content),
    sourceId: 'ch-1',
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeReactionRow(id: string, emoji: string, userId: string, messageId: string): unknown {
  return {
    id,
    workspaceId: 'org-1',
    organizationId: 'org-1',
    type: 'message_reaction',
    content: JSON.stringify({ emoji, userId, messageId }),
    sourceId: `message:${messageId}`,
    createdBy: userId,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

const { MessageService } = await import('@/lib/services/message-service');

// ─────────────────────────────────────────────────────────────────────────────
// MessageService
// ─────────────────────────────────────────────────────────────────────────────

describe('MessageService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a message with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'team_message');
        assert.equal(args.data.sourceId, 'ch-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.body, 'Hello world');
        assert.equal(content.userId, 'user-1');
        assert.equal(content.edited, false);
        assert.deepEqual(content.attachments, []);
        assert.equal(content.replyTo, null);
        return makeMessageRow('msg-1', content);
      };

      const message = await MessageService.create('org-1', {
        channelId: 'ch-1',
        userId: 'user-1',
        body: 'Hello world',
      });

      assert.ok(message);
      assert.equal(message.id, 'msg-1');
      assert.equal(message.body, 'Hello world');
      assert.equal(message.channelId, 'ch-1');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a message with attachments, reply, and mentions', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.attachments.length, 1);
        assert.equal(content.replyTo, 'msg-0');
        assert.deepEqual(content.mentions, ['u2']);
        return makeMessageRow('msg-2', content);
      };

      const message = await MessageService.create('org-1', {
        channelId: 'ch-1',
        userId: 'user-1',
        body: 'Reply with file',
        attachments: [{ id: 'a1', name: 'file.pdf', url: 'http://example.com/file.pdf', type: 'pdf' }],
        replyTo: 'msg-0',
        mentions: ['u2'],
      });

      assert.equal(message.attachments.length, 1);
      assert.equal(message.replyTo, 'msg-0');
      assert.deepEqual(message.mentions, ['u2']);
    });
  });

  describe('get', () => {
    it('returns a message by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMessageRow('msg-1', { body: 'Hello', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false });

      const message = await MessageService.get('msg-1');

      assert.ok(message);
      assert.equal(message.id, 'msg-1');
      assert.equal(message.body, 'Hello');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when message not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const message = await MessageService.get('nope');
      assert.equal(message, null);
    });
  });

  describe('list', () => {
    it('returns messages for a channel', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'A', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
        makeMessageRow('msg-2', { body: 'B', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
      ];

      const messages = await MessageService.list('ch-1');

      assert.equal(messages.length, 2);
      assert.equal(messages[0].id, 'msg-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('applies limit and offset', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.take, 10);
        assert.equal(args.skip, 5);
        return [];
      };

      await MessageService.list('ch-1', { limit: 10, offset: 5 });
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const messages = await MessageService.list('ch-1');
      assert.deepEqual(messages, []);
    });
  });

  describe('update', () => {
    it('edits a message and marks as edited', async () => {
      memoryFindUniqueImpl = async () =>
        makeMessageRow('msg-1', { body: 'old', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.body, 'new body');
        assert.equal(content.edited, true);
        return makeMessageRow('msg-1', content);
      };

      const message = await MessageService.update('msg-1', 'new body');

      assert.ok(message);
      assert.equal(message.body, 'new body');
      assert.equal(message.edited, true);
    });

    it('returns null when message not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const message = await MessageService.update('nope', 'x');
      assert.equal(message, null);
    });
  });

  describe('delete', () => {
    it('deletes a message', async () => {
      memoryDeleteImpl = async () => ({ id: 'msg-1' });

      const result = await MessageService.delete('msg-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await MessageService.delete('msg-1');
      assert.equal(result, false);
    });
  });

  describe('getThread', () => {
    it('returns threaded replies for a parent message', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'parent', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
        makeMessageRow('msg-2', { body: 'reply1', userId: 'u2', attachments: [], replyTo: 'msg-1', mentions: [], edited: false }),
        makeMessageRow('msg-3', { body: 'reply2', userId: 'u3', attachments: [], replyTo: 'msg-1', mentions: [], edited: false }),
        makeMessageRow('msg-4', { body: 'other', userId: 'u4', attachments: [], replyTo: 'msg-0', mentions: [], edited: false }),
      ];

      const replies = await MessageService.getThread('ch-1', 'msg-1');

      assert.equal(replies.length, 2);
      assert.equal(replies[0].id, 'msg-2');
      assert.equal(replies[1].id, 'msg-3');
    });
  });

  describe('search', () => {
    it('searches messages by body text', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'Hello world', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
        makeMessageRow('msg-2', { body: 'Goodbye world', userId: 'u2', attachments: [], replyTo: null, mentions: [], edited: false }),
        makeMessageRow('msg-3', { body: 'No match here', userId: 'u3', attachments: [], replyTo: null, mentions: [], edited: false }),
      ];

      const results = await MessageService.search('org-1', 'world');

      assert.equal(results.length, 2);
      assert.ok(results[0].body.toLowerCase().includes('world'));
    });

    it('filters by channelId', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.sourceId, 'ch-2');
        return [
          makeMessageRow('msg-1', { body: 'test', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }, { sourceId: 'ch-2' }),
        ];
      };

      const results = await MessageService.search('org-1', 'test', { channelId: 'ch-2' });
      assert.equal(results.length, 1);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const results = await MessageService.search('org-1', 'test');
      assert.deepEqual(results, []);
    });
  });

  describe('getReactions', () => {
    it('returns reactions grouped by emoji', async () => {
      memoryFindManyImpl = async () => [
        makeReactionRow('r1', '👍', 'u1', 'msg-1'),
        makeReactionRow('r2', '👍', 'u2', 'msg-1'),
        makeReactionRow('r3', '❤️', 'u1', 'msg-1'),
      ];

      const reactions = await MessageService.getReactions('msg-1');

      assert.equal(reactions.length, 2);
      const thumbsUp = reactions.find((r) => r.emoji === '👍');
      assert.ok(thumbsUp);
      assert.equal(thumbsUp!.count, 2);
      assert.deepEqual(thumbsUp!.userIds, ['u1', 'u2']);
    });

    it('returns empty array when no reactions', async () => {
      memoryFindManyImpl = async () => [];

      const reactions = await MessageService.getReactions('msg-1');
      assert.deepEqual(reactions, []);
    });
  });

  describe('addReaction', () => {
    it('adds a reaction', async () => {
      memoryFindManyImpl = async () => [];
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'message_reaction');
        assert.equal(args.data.sourceId, 'message:msg-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.emoji, '👍');
        assert.equal(content.userId, 'u1');
        return makeReactionRow('r1', '👍', 'u1', 'msg-1');
      };

      const added = await MessageService.addReaction('msg-1', 'u1', '👍');
      assert.equal(added, true);
    });

    it('does not add duplicate reactions (idempotent)', async () => {
      memoryFindManyImpl = async () => [
        makeReactionRow('r1', '👍', 'u1', 'msg-1'),
      ];

      const added = await MessageService.addReaction('msg-1', 'u1', '👍');
      assert.equal(added, false);
    });
  });

  describe('removeReaction', () => {
    it('removes a reaction', async () => {
      memoryFindManyImpl = async () => [
        makeReactionRow('r1', '👍', 'u1', 'msg-1'),
      ];
      memoryDeleteImpl = async () => ({ id: 'r1' });

      const removed = await MessageService.removeReaction('msg-1', 'u1', '👍');
      assert.equal(removed, true);
    });

    it('returns false when reaction not found', async () => {
      memoryFindManyImpl = async () => [];

      const removed = await MessageService.removeReaction('msg-1', 'u1', '👍');
      assert.equal(removed, false);
    });
  });

  describe('getAttachments', () => {
    it('returns all attachments in a channel', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'a', userId: 'u1', attachments: [{ id: 'f1', name: 'a.pdf', url: 'u', type: 'pdf' }], replyTo: null, mentions: [], edited: false }),
        makeMessageRow('msg-2', { body: 'b', userId: 'u1', attachments: [{ id: 'f2', name: 'b.png', url: 'u', type: 'png' }, { id: 'f3', name: 'c.txt', url: 'u', type: 'txt' }], replyTo: null, mentions: [], edited: false }),
      ];

      const attachments = await MessageService.getAttachments('ch-1');

      assert.equal(attachments.length, 3);
      assert.equal(attachments[0].name, 'a.pdf');
    });

    it('respects limit', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'a', userId: 'u1', attachments: [{ id: 'f1', name: 'a.pdf', url: 'u', type: 'pdf' }, { id: 'f2', name: 'b.png', url: 'u', type: 'png' }], replyTo: null, mentions: [], edited: false }),
      ];

      const attachments = await MessageService.getAttachments('ch-1', { limit: 1 });
      assert.equal(attachments.length, 1);
    });
  });

  describe('getRecent', () => {
    it('returns recent messages across all channels', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'recent', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }),
      ];

      const messages = await MessageService.getRecent('org-1');

      assert.equal(messages.length, 1);
      assert.equal(messages[0].body, 'recent');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by userId', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.createdBy, 'u1');
        return [];
      };

      await MessageService.getRecent('org-1', { userId: 'u1' });
    });
  });

  describe('getStats', () => {
    it('aggregates message stats', async () => {
      memoryFindManyImpl = async () => [
        makeMessageRow('msg-1', { body: 'a', userId: 'u1', attachments: [{ id: 'f1', name: 'x', url: 'u', type: 'pdf' }], replyTo: null, mentions: [], edited: false }, { sourceId: 'ch-1' }),
        makeMessageRow('msg-2', { body: 'b', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }, { sourceId: 'ch-1' }),
        makeMessageRow('msg-3', { body: 'c', userId: 'u1', attachments: [], replyTo: null, mentions: [], edited: false }, { sourceId: 'ch-2' }),
      ];

      const stats = await MessageService.getStats('org-1');

      assert.equal(stats.totalMessages, 3);
      assert.equal(stats.byChannel['ch-1'], 2);
      assert.equal(stats.byChannel['ch-2'], 1);
      assert.equal(stats.attachmentsCount, 1);
      assert.equal(stats.avgPerChannel, 2); // round(3/2) = 2
    });

    it('returns zero stats when no messages', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await MessageService.getStats('org-1');

      assert.equal(stats.totalMessages, 0);
      assert.equal(stats.attachmentsCount, 0);
      assert.equal(stats.avgPerChannel, 0);
    });

    it('returns zero stats on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await MessageService.getStats('org-1');
      assert.equal(stats.totalMessages, 0);
    });
  });
});
