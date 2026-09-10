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

interface EventRow {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  actor: string | null;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string;
  correlationId: string | null;
  source: string;
  createdAt: Date;
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
let eventCreateImpl: (args: unknown) => Promise<EventRow> = async () => ({}) as EventRow;
let eventFindManyImpl: (args: unknown) => Promise<EventRow[]> = async () => [];

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
  event: {
    create: (args: unknown): Promise<EventRow> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
    },
    findMany: (args: unknown): Promise<EventRow[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
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

function makeMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'email_campaign',
    content: JSON.stringify({ name: 'Test', subject: 'Hello', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["email_campaign"]',
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
  eventCreateImpl = async () => ({}) as EventRow;
  eventFindManyImpl = async () => [];
}

const { EmailCampaignService } = await import('@/lib/services/email-campaign-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EmailCampaignService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a campaign memory record with type email_campaign', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string; tags: string } };
        assert.equal(a.data.type, 'email_campaign');
        assert.ok(a.data.content.includes('"name":"Welcome"'));
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Welcome', subject: 'Hello' },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('defaults status to draft', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'draft');
        return makeMemory({ content: a.data.content });
      };

      await EmailCampaignService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Test', subject: 'Hi' },
      });
    });
  });

  describe('get', () => {
    it('returns a campaign by id', async () => {
      memoryFindUniqueImpl = async () => makeMemory();

      const result = await EmailCampaignService.get('mem-1');

      assert.ok(result);
      assert.equal(result.id, 'mem-1');
      assert.equal(result.name, 'Test');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await EmailCampaignService.get('nope');
      assert.equal(result, null);
    });

    it('returns null when type is not email_campaign', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ type: 'fact' });

      const result = await EmailCampaignService.get('mem-1');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      memoryFindUniqueImpl = async () => { throw new Error('DB down'); };

      const result = await EmailCampaignService.get('mem-1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns campaigns for a workspace', async () => {
      memoryFindManyImpl = async () => [makeMemory({ id: 'c1' }), makeMemory({ id: 'c2' })];

      const result = await EmailCampaignService.list('ws-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status via content contains', async () => {
      memoryFindManyImpl = async () => [];

      await EmailCampaignService.list('ws-1', { status: 'sent' });

      const args = calls[0].args as { where: { content: { contains: string } } };
      assert.equal(args.where.content.contains, '"status":"sent"');
    });

    it('filters by search term', async () => {
      memoryFindManyImpl = async () => [
        makeMemory({ content: JSON.stringify({ name: 'Welcome Campaign', subject: 'Hi', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) }),
        makeMemory({ content: JSON.stringify({ name: 'Newsletter', subject: 'Hi', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) }),
      ];

      const result = await EmailCampaignService.list('ws-1', { search: 'welcome' });

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Welcome Campaign');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await EmailCampaignService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates campaign fields by merging with existing', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'Old', subject: 'Old Subject', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.name, 'New Name');
        assert.equal(content.subject, 'Old Subject');
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.update('mem-1', { name: 'New Name' });
      assert.ok(result);
      assert.equal(calls[1].method, 'memory.update');
    });

    it('throws if campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => EmailCampaignService.update('nope', { name: 'X' }), /Campaign not found/);
    });
  });

  describe('delete', () => {
    it('deletes a campaign', async () => {
      memoryDeleteImpl = async () => makeMemory();

      const result = await EmailCampaignService.delete('mem-1');
      assert.ok(result);
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('send', () => {
    it('records send events and updates stats', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'Test', subject: 'Hi', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) });
      let eventCount = 0;
      eventCreateImpl = async (args: unknown) => {
        eventCount += 1;
        const a = args as { data: { type: string; resourceId: string } };
        assert.equal(a.data.type, 'email.sent');
        assert.equal(a.data.resourceId, 'mem-1');
        return {} as EventRow;
      };
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'sent');
        assert.equal(content.stats.sent, 2);
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.send('mem-1', ['sub-1', 'sub-2'], 'user-1');

      assert.equal(result.sent, 2);
      assert.equal(eventCount, 2);
    });

    it('throws if campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => EmailCampaignService.send('nope', ['s1'], 'u1'), /Campaign not found/);
    });
  });

  describe('schedule', () => {
    it('sets status to scheduled and scheduledAt', async () => {
      memoryFindUniqueImpl = async () => makeMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'scheduled');
        assert.equal(content.scheduledAt, '2025-01-01T00:00:00Z');
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.schedule('mem-1', '2025-01-01T00:00:00Z');
      assert.ok(result);
    });
  });

  describe('cancelSchedule', () => {
    it('sets status back to draft and clears scheduledAt', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'T', subject: 'S', status: 'scheduled', scheduledAt: '2025-01-01', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) });
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'draft');
        assert.equal(content.scheduledAt, null);
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.cancelSchedule('mem-1');
      assert.ok(result);
    });
  });

  describe('duplicate', () => {
    it('creates a copy with (Copy) suffix and draft status', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'Original', subject: 'Hi', status: 'sent', stats: { sent: 10, delivered: 10, opens: 5, clicks: 2, bounces: 0, unsubscribes: 0 } }) });
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.name, 'Original (Copy)');
        assert.equal(content.status, 'draft');
        assert.equal(content.stats.sent, 0);
        return makeMemory({ content: a.data.content });
      };

      const result = await EmailCampaignService.duplicate('mem-1', 'user-1');
      assert.ok(result);
    });

    it('throws if campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;
      await assert.rejects(() => EmailCampaignService.duplicate('nope', 'u1'), /Campaign not found/);
    });
  });

  describe('getStats', () => {
    it('returns stats from campaign data', async () => {
      memoryFindUniqueImpl = async () => makeMemory({ content: JSON.stringify({ name: 'T', subject: 'S', status: 'sent', stats: { sent: 100, delivered: 95, opens: 50, clicks: 10, bounces: 5, unsubscribes: 2 } }) });

      const stats = await EmailCampaignService.getStats('mem-1');
      assert.equal(stats.sent, 100);
      assert.equal(stats.opens, 50);
    });

    it('returns empty stats when campaign not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const stats = await EmailCampaignService.getStats('nope');
      assert.equal(stats.sent, 0);
    });
  });

  describe('getOverview', () => {
    it('aggregates campaign stats', async () => {
      memoryFindManyImpl = async () => [
        makeMemory({ id: 'c1', content: JSON.stringify({ name: 'A', subject: 'S', status: 'sent', stats: { sent: 100, delivered: 95, opens: 50, clicks: 10, bounces: 5, unsubscribes: 2 } }) }),
        makeMemory({ id: 'c2', content: JSON.stringify({ name: 'B', subject: 'S', status: 'draft', stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 } }) }),
      ];

      const overview = await EmailCampaignService.getOverview('ws-1');

      assert.equal(overview.total, 2);
      assert.equal(overview.byStatus.sent, 1);
      assert.equal(overview.byStatus.draft, 1);
      assert.equal(overview.totalSent, 100);
      assert.equal(overview.totalOpens, 50);
    });

    it('returns zero stats when no campaigns', async () => {
      memoryFindManyImpl = async () => [];

      const overview = await EmailCampaignService.getOverview('ws-1');
      assert.equal(overview.total, 0);
      assert.equal(overview.totalSent, 0);
      assert.equal(overview.avgOpenRate, 0);
    });
  });

  describe('getTracking', () => {
    it('returns opens and clicks from events', async () => {
      eventFindManyImpl = async () => [
        { id: 'e1', workspaceId: null, organizationId: null, type: 'email.opened', actor: null, actorType: 'system', resourceType: null, resourceId: 'mem-1', metadata: JSON.stringify({ subscriberId: 's1' }), correlationId: null, source: 'email', createdAt: new Date() },
        { id: 'e2', workspaceId: null, organizationId: null, type: 'email.clicked', actor: null, actorType: 'system', resourceType: null, resourceId: 'mem-1', metadata: JSON.stringify({ subscriberId: 's1', url: 'https://example.com' }), correlationId: null, source: 'email', createdAt: new Date() },
      ];

      const tracking = await EmailCampaignService.getTracking('mem-1');
      assert.equal(tracking.opens.length, 1);
      assert.equal(tracking.clicks.length, 1);
      assert.equal(tracking.clicks[0].url, 'https://example.com');
    });

    it('returns empty tracking on error', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };

      const tracking = await EmailCampaignService.getTracking('mem-1');
      assert.equal(tracking.opens.length, 0);
    });
  });

  describe('getStatsByDate', () => {
    it('groups events by date', async () => {
      const date1 = new Date('2025-01-01T10:00:00Z');
      const date2 = new Date('2025-01-02T10:00:00Z');
      eventFindManyImpl = async () => [
        { id: 'e1', workspaceId: null, organizationId: null, type: 'email.sent', actor: null, actorType: 'system', resourceType: null, resourceId: 'mem-1', metadata: '{}', correlationId: null, source: 'email', createdAt: date1 },
        { id: 'e2', workspaceId: null, organizationId: null, type: 'email.opened', actor: null, actorType: 'system', resourceType: null, resourceId: 'mem-1', metadata: '{}', correlationId: null, source: 'email', createdAt: date1 },
        { id: 'e3', workspaceId: null, organizationId: null, type: 'email.sent', actor: null, actorType: 'system', resourceType: null, resourceId: 'mem-1', metadata: '{}', correlationId: null, source: 'email', createdAt: date2 },
      ];

      const byDate = await EmailCampaignService.getStatsByDate('mem-1');
      assert.equal(byDate.length, 2);
      const d1 = byDate.find((d) => d.date === '2025-01-01');
      assert.ok(d1);
      assert.equal(d1.sent, 1);
      assert.equal(d1.opens, 1);
    });

    it('returns empty array on error', async () => {
      eventFindManyImpl = async () => { throw new Error('fail'); };

      const byDate = await EmailCampaignService.getStatsByDate('mem-1');
      assert.equal(byDate.length, 0);
    });
  });
});
