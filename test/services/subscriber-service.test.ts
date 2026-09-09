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
  owner: string | null;
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

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRow> => {
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

function makeSubscriberMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'sub-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'email_subscriber',
    content: JSON.stringify({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      status: 'active',
      tags: ['vip'],
      metadata: {},
      listIds: ['list-1'],
      subscribedAt: '2024-01-01T00:00:00.000Z',
    }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["email_subscriber","vip"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeListMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'list-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'email_list',
    content: JSON.stringify({
      name: 'Newsletter',
      description: 'Monthly newsletter',
      tags: [],
      isPublic: true,
      subscriberCount: 0,
    }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["email_list"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteImpl = async () => ({}) as MemoryRow;
}

const { SubscriberService } = await import('@/lib/services/subscriber-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SubscriberService', () => {
  beforeEach(() => { resetMock(); });

  describe('addSubscriber', () => {
    it('creates a subscriber memory record with type email_subscriber', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'email_subscriber');
        assert.ok(a.data.content.includes('"email":"alice@example.com"'));
        return makeSubscriberMemory({ content: a.data.content });
      };

      const result = await SubscriberService.addSubscriber({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { email: 'alice@example.com', firstName: 'Alice', status: 'active' },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('defaults status to pending when not specified', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'pending');
        return makeSubscriberMemory({ content: a.data.content });
      };

      await SubscriberService.addSubscriber({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { email: 'bob@example.com' },
      });
    });
  });

  describe('getSubscriber', () => {
    it('returns a subscriber by id', async () => {
      memoryFindUniqueImpl = async () => makeSubscriberMemory();

      const result = await SubscriberService.getSubscriber('sub-1');

      assert.ok(result);
      assert.equal(result!.id, 'sub-1');
      assert.equal(result!.email, 'alice@example.com');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await SubscriberService.getSubscriber('nonexistent');

      assert.equal(result, null);
    });

    it('returns null when type is not email_subscriber', async () => {
      memoryFindUniqueImpl = async () => makeSubscriberMemory({ type: 'email_list' });

      const result = await SubscriberService.getSubscriber('sub-1');

      assert.equal(result, null);
    });
  });

  describe('getSubscriberByEmail', () => {
    it('returns a subscriber matching the email', async () => {
      memoryFindManyImpl = async () => [makeSubscriberMemory()];

      const result = await SubscriberService.getSubscriberByEmail('ws-1', 'alice@example.com');

      assert.ok(result);
      assert.equal(result!.email, 'alice@example.com');
    });

    it('returns null when no match', async () => {
      memoryFindManyImpl = async () => [];

      const result = await SubscriberService.getSubscriberByEmail('ws-1', 'nobody@example.com');

      assert.equal(result, null);
    });
  });

  describe('updateSubscriber', () => {
    it('updates subscriber data', async () => {
      memoryFindUniqueImpl = async () => makeSubscriberMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'unsubscribed');
        return makeSubscriberMemory({ content: a.data.content });
      };

      const result = await SubscriberService.updateSubscriber('sub-1', { status: 'unsubscribed' });

      assert.ok(result);
      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when subscriber not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => SubscriberService.updateSubscriber('nonexistent', { status: 'active' }),
        /Subscriber not found/,
      );
    });
  });

  describe('removeSubscriber', () => {
    it('deletes the subscriber memory record', async () => {
      memoryDeleteImpl = async () => makeSubscriberMemory();

      await SubscriberService.removeSubscriber('sub-1');

      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('unsubscribe', () => {
    it('sets status to unsubscribed via updateSubscriber', async () => {
      memoryFindUniqueImpl = async () => makeSubscriberMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'unsubscribed');
        return makeSubscriberMemory({ content: a.data.content });
      };

      await SubscriberService.unsubscribe('sub-1');

      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });
  });

  describe('listSubscribers', () => {
    it('returns subscribers for a workspace', async () => {
      memoryFindManyImpl = async () => [
        makeSubscriberMemory({ id: 'sub-1' }),
        makeSubscriberMemory({ id: 'sub-2', content: JSON.stringify({ email: 'bob@example.com', status: 'pending' }) }),
      ];

      const result = await SubscriberService.listSubscribers('ws-1');

      assert.equal(result.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by listId in memory', async () => {
      memoryFindManyImpl = async () => [
        makeSubscriberMemory({ id: 'sub-1' }),
        makeSubscriberMemory({ id: 'sub-2', content: JSON.stringify({ email: 'bob@example.com', status: 'pending', listIds: ['other'] }) }),
      ];

      const result = await SubscriberService.listSubscribers('ws-1', { listId: 'list-1' });

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'sub-1');
    });

    it('filters by search term', async () => {
      memoryFindManyImpl = async () => [
        makeSubscriberMemory({ id: 'sub-1' }),
        makeSubscriberMemory({ id: 'sub-2', content: JSON.stringify({ email: 'bob@example.com', firstName: 'Bob', status: 'pending' }) }),
      ];

      const result = await SubscriberService.listSubscribers('ws-1', { search: 'alice' });

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'sub-1');
    });
  });

  describe('importSubscribers', () => {
    it('imports new subscribers and skips duplicates', async () => {
      let emailCallCount = 0;
      memoryFindManyImpl = async () => {
        // First call (getSubscriberByEmail for alice) returns existing
        emailCallCount++;
        if (emailCallCount === 1) return [makeSubscriberMemory()];
        return [];
      };
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        return makeSubscriberMemory({ content: a.data.content, id: 'sub-new' });
      };

      const result = await SubscriberService.importSubscribers({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        subscribers: [
          { email: 'alice@example.com' }, // duplicate
          { email: 'carol@example.com' }, // new
        ],
      });

      assert.equal(result.imported, 1);
      assert.equal(result.duplicates, 1);
    });
  });

  describe('exportSubscribers', () => {
    it('returns CSV string with headers and rows', async () => {
      memoryFindManyImpl = async () => [makeSubscriberMemory()];

      const csv = await SubscriberService.exportSubscribers('ws-1');

      assert.ok(csv.includes('"id"'));
      assert.ok(csv.includes('"email"'));
      assert.ok(csv.includes('alice@example.com'));
    });
  });

  describe('createList', () => {
    it('creates a list memory record with type email_list', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'email_list');
        assert.ok(a.data.content.includes('"name":"Newsletter"'));
        return makeListMemory({ content: a.data.content });
      };

      const result = await SubscriberService.createList({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Newsletter', description: 'Monthly' },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });
  });

  describe('listLists', () => {
    it('returns lists for a workspace', async () => {
      memoryFindManyImpl = async () => [makeListMemory()];

      const result = await SubscriberService.listLists('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'list-1');
      assert.equal(result[0].name, 'Newsletter');
    });
  });

  describe('addToList', () => {
    it('adds a list id to subscriber listIds', async () => {
      memoryFindUniqueImpl = async () => makeSubscriberMemory({
        content: JSON.stringify({ email: 'alice@example.com', status: 'active', listIds: [] }),
      });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.ok(content.listIds.includes('list-99'));
        return makeSubscriberMemory({ content: a.data.content });
      };

      await SubscriberService.addToList('list-99', 'sub-1');

      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when subscriber not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => SubscriberService.addToList('list-1', 'nonexistent'),
        /Subscriber not found/,
      );
    });
  });

  describe('getListStats', () => {
    it('returns total and byStatus counts', async () => {
      // getList calls findUnique, listSubscribers calls findMany
      memoryFindUniqueImpl = async () => makeListMemory();
      memoryFindManyImpl = async () => [
        makeSubscriberMemory({ content: JSON.stringify({ email: 'a@x.com', status: 'active', listIds: ['list-1'] }) }),
        makeSubscriberMemory({ content: JSON.stringify({ email: 'b@x.com', status: 'pending', listIds: ['list-1'] }) }),
      ];

      const result = await SubscriberService.getListStats('list-1');

      assert.equal(result.total, 2);
      assert.equal(result.byStatus.active, 1);
      assert.equal(result.byStatus.pending, 1);
    });

    it('returns empty stats when list not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await SubscriberService.getListStats('nonexistent');

      assert.equal(result.total, 0);
    });
  });

  describe('getStats', () => {
    it('returns aggregate subscriber stats', async () => {
      memoryFindManyImpl = async (args: unknown) => {
        const a = args as { where: { type: string } };
        if (a.where.type === 'email_segment') return [makeSubscriberMemory({ type: 'email_segment' })];
        if (a.where.type === 'email_list') return [makeListMemory()];
        // email_subscriber
        return [
          makeSubscriberMemory({ content: JSON.stringify({ email: 'a@x.com', status: 'active' }) }),
          makeSubscriberMemory({ content: JSON.stringify({ email: 'b@x.com', status: 'pending' }) }),
        ];
      };

      const result = await SubscriberService.getStats('ws-1');

      assert.equal(result.total, 2);
      assert.equal(result.totalLists, 1);
      assert.equal(result.totalSegments, 1);
      assert.equal(result.byStatus.active, 1);
      assert.equal(result.byStatus.pending, 1);
    });
  });
});
