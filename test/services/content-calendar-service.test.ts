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

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
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
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
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
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
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
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(
  id: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'content_calendar_item',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { ContentCalendarService } =
  await import('@/lib/services/content-calendar-service');

// ─────────────────────────────────────────────────────────────────────────────
// ContentCalendarService
// ─────────────────────────────────────────────────────────────────────────────

describe('ContentCalendarService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a content item with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'content_calendar_item');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'Blog Post 1');
        assert.equal(content.type, 'blog');
        assert.equal(content.status, 'planned');
        assert.equal(content.platform, null);
        assert.deepEqual(content.tags, []);
        return makeRow('ci-1', content);
      };

      const item = await ContentCalendarService.create('org-1', {
        title: 'Blog Post 1',
        type: 'blog',
        scheduledDate: '2025-02-01',
        createdBy: 'user-1',
      });

      assert.ok(item);
      assert.equal(item.id, 'ci-1');
      assert.equal(item.title, 'Blog Post 1');
      assert.equal(item.type, 'blog');
      assert.equal(item.status, 'planned');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates with platform, status, and tags', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.platform, 'linkedin');
        assert.equal(content.status, 'scheduled');
        assert.deepEqual(content.tags, ['launch', 'q1']);
        return makeRow('ci-2', content);
      };

      const item = await ContentCalendarService.create('org-1', {
        title: 'LinkedIn Post',
        type: 'social_post',
        platform: 'linkedin',
        scheduledDate: '2025-02-15',
        status: 'scheduled',
        tags: ['launch', 'q1'],
        owner: 'jane',
        createdBy: 'user-1',
      });

      assert.equal(item.platform, 'linkedin');
      assert.equal(item.status, 'scheduled');
      assert.deepEqual(item.tags, ['launch', 'q1']);
      assert.equal(item.owner, 'jane');
    });
  });

  describe('get', () => {
    it('returns a content item by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ci-1', { title: 'Blog', description: '', type: 'blog', platform: null, scheduledDate: '2025-02-01', status: 'planned', owner: '', tags: [], content: '' });

      const item = await ContentCalendarService.get('ci-1');

      assert.ok(item);
      assert.equal(item.id, 'ci-1');
      assert.equal(item.title, 'Blog');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when item not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const item = await ContentCalendarService.get('nope');
      assert.equal(item, null);
    });
  });

  describe('list', () => {
    it('returns items for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'blog', platform: null, scheduledDate: '2025-02-01', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'social_post', platform: 'twitter', scheduledDate: '2025-02-02', status: 'scheduled', owner: '', tags: [], content: '' }),
      ];

      const items = await ContentCalendarService.list('org-1');

      assert.equal(items.length, 2);
      assert.equal(items[0].id, 'ci-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'blog', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'social_post', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const items = await ContentCalendarService.list('org-1', { type: 'blog' });

      assert.equal(items.length, 1);
      assert.equal(items[0].type, 'blog');
    });

    it('filters by platform', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'social_post', platform: 'twitter', scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'social_post', platform: 'linkedin', scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const items = await ContentCalendarService.list('org-1', { platform: 'twitter' });

      assert.equal(items.length, 1);
      assert.equal(items[0].platform, 'twitter');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'Launch Blog', description: '', type: 'blog', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'Other', description: '', type: 'blog', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const items = await ContentCalendarService.list('org-1', { search: 'launch' });

      assert.equal(items.length, 1);
      assert.equal(items[0].title, 'Launch Blog');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const items = await ContentCalendarService.list('org-1');
      assert.deepEqual(items, []);
    });
  });

  describe('update', () => {
    it('updates a content item', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ci-1', { title: 'Old', description: '', type: 'blog', platform: null, scheduledDate: '2025-02-01', status: 'planned', owner: '', tags: [], content: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'New Title');
        assert.equal(content.platform, 'twitter');
        return makeRow('ci-1', content);
      };

      const item = await ContentCalendarService.update('ci-1', {
        title: 'New Title',
        platform: 'twitter',
      });

      assert.ok(item);
      assert.equal(item.title, 'New Title');
      assert.equal(item.platform, 'twitter');
    });

    it('returns null when item not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const item = await ContentCalendarService.update('nope', { title: 'x' });
      assert.equal(item, null);
    });
  });

  describe('delete', () => {
    it('deletes a content item', async () => {
      memoryDeleteImpl = async () => ({ id: 'ci-1' });

      const result = await ContentCalendarService.delete('ci-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };
      const result = await ContentCalendarService.delete('ci-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the status of a content item', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('ci-1', { title: 'A', description: '', type: 'blog', platform: null, scheduledDate: '2025-02-01', status: 'planned', owner: '', tags: [], content: '' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'published');
        return makeRow('ci-1', content);
      };

      const item = await ContentCalendarService.changeStatus('ci-1', 'published');

      assert.ok(item);
      assert.equal(item.status, 'published');
    });

    it('returns null when item not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const item = await ContentCalendarService.changeStatus('nope', 'published');
      assert.equal(item, null);
    });
  });

  describe('getByPlatform', () => {
    it('groups items by platform', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'social_post', platform: 'twitter', scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'social_post', platform: 'twitter', scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-3', { title: 'C', description: '', type: 'blog', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const grouped = await ContentCalendarService.getByPlatform('org-1');

      assert.equal(grouped.twitter.length, 2);
      assert.equal(grouped.none.length, 1);
    });
  });

  describe('getByType', () => {
    it('groups items by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'blog', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'email', platform: null, scheduledDate: '', status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const grouped = await ContentCalendarService.getByType('org-1');

      assert.equal(grouped.blog.length, 1);
      assert.equal(grouped.email.length, 1);
    });
  });

  describe('getUpcoming', () => {
    it('returns items scheduled within the next N days', async () => {
      const now = new Date();
      const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in10days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'Soon', description: '', type: 'blog', platform: null, scheduledDate: in3days.toISOString(), status: 'scheduled', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'Far', description: '', type: 'blog', platform: null, scheduledDate: in10days.toISOString(), status: 'scheduled', owner: '', tags: [], content: '' }),
        makeRow('ci-3', { title: 'Cancelled', description: '', type: 'blog', platform: null, scheduledDate: in3days.toISOString(), status: 'cancelled', owner: '', tags: [], content: '' }),
      ];

      const upcoming = await ContentCalendarService.getUpcoming('org-1', 7);

      assert.equal(upcoming.length, 1);
      assert.equal(upcoming[0].title, 'Soon');
    });
  });

  describe('getStats', () => {
    it('aggregates content stats', async () => {
      const past = new Date('2020-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('ci-1', { title: 'A', description: '', type: 'blog', platform: 'twitter', scheduledDate: '2025-02-01', status: 'published', owner: '', tags: [], content: '' }),
        makeRow('ci-2', { title: 'B', description: '', type: 'email', platform: null, scheduledDate: past, status: 'planned', owner: '', tags: [], content: '' }),
      ];

      const stats = await ContentCalendarService.getStats('org-1');

      assert.equal(stats.totalItems, 2);
      assert.equal(stats.publishedCount, 1);
      assert.equal(stats.overdueCount, 1); // ci-2 is past and not published
      assert.equal(stats.byType.blog, 1);
      assert.equal(stats.byType.email, 1);
      assert.equal(stats.byPlatform.twitter, 1);
      assert.equal(stats.byPlatform.none, 1);
    });

    it('returns zero stats when no items', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await ContentCalendarService.getStats('org-1');

      assert.equal(stats.totalItems, 0);
      assert.equal(stats.publishedCount, 0);
    });
  });
});
