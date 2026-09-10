import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type WebhookCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    url: string;
    secret: string;
    events: string;
    createdBy: string;
  };
};

type WebhookFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type WebhookFindUniqueArgs = {
  where: { id: string };
};

type WebhookUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type WebhookDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let webhookCreateImpl: (args: WebhookCreateArgs) => Promise<unknown> =
  async () => ({});
let webhookFindManyImpl: (args: WebhookFindManyArgs) => Promise<unknown[]> =
  async () => [];
let webhookFindUniqueImpl: (args: WebhookFindUniqueArgs) => Promise<unknown> =
  async () => null;
let webhookUpdateImpl: (args: WebhookUpdateArgs) => Promise<unknown> =
  async () => ({});
let webhookDeleteImpl: (args: WebhookDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  webhookSubscription: {
    create: (args: WebhookCreateArgs): Promise<unknown> => {
      calls.push({ method: 'webhookSubscription.create', args });
      return webhookCreateImpl(args);
    },
    findMany: (args: WebhookFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'webhookSubscription.findMany', args });
      return webhookFindManyImpl(args);
    },
    findUnique: (args: WebhookFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'webhookSubscription.findUnique', args });
      return webhookFindUniqueImpl(args);
    },
    update: (args: WebhookUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'webhookSubscription.update', args });
      return webhookUpdateImpl(args);
    },
    delete: (args: WebhookDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'webhookSubscription.delete', args });
      return webhookDeleteImpl(args);
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
  webhookCreateImpl = async () => ({});
  webhookFindManyImpl = async () => [];
  webhookFindUniqueImpl = async () => null;
  webhookUpdateImpl = async () => ({});
  webhookDeleteImpl = async () => ({});
}

const { WebhookSubscriptionService } = await import('@/lib/services/webhook-subscription-service');

// ─────────────────────────────────────────────────────────────────────────────
// WebhookSubscriptionService
// ─────────────────────────────────────────────────────────────────────────────

describe('WebhookSubscriptionService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('generates a secret and creates a subscription', async () => {
      webhookCreateImpl = async (args: WebhookCreateArgs) => ({
        id: 'sub-1',
        ...args.data,
      });

      const result = await WebhookSubscriptionService.create('org-1', {
        name: 'My Webhook',
        url: 'https://example.com/webhook',
        events: ['task.created', 'task.completed'],
        createdBy: 'user-1',
      });

      assert.ok(result.subscription);
      assert.equal(result.subscription.id, 'sub-1');
      assert.ok(result.secret);
      assert.equal(result.secret.length, 64); // 32 bytes = 64 hex chars
      assert.equal(calls[0].method, 'webhookSubscription.create');
      const args = calls[0].args as WebhookCreateArgs;
      assert.equal(args.data.organizationId, 'org-1');
      assert.equal(args.data.name, 'My Webhook');
      assert.equal(args.data.url, 'https://example.com/webhook');
      assert.equal(args.data.secret, result.secret);
      assert.equal(args.data.events, JSON.stringify(['task.created', 'task.completed']));
      assert.equal(args.data.createdBy, 'user-1');
    });

    it('truncates long names to 200 characters and urls to 2048', async () => {
      webhookCreateImpl = async (args: WebhookCreateArgs) => {
        assert.ok(args.data.name.length <= 200);
        assert.ok(args.data.url.length <= 2048);
        return { id: 'sub-1', ...args.data };
      };

      await WebhookSubscriptionService.create('org-1', {
        name: 'A'.repeat(300),
        url: 'https://example.com/' + 'x'.repeat(2100),
        events: ['*'],
        createdBy: 'user-1',
      });
    });
  });

  describe('list', () => {
    it('returns webhook subscriptions for an organization', async () => {
      webhookFindManyImpl = async () => [
        { id: 'sub-1', name: 'Webhook 1', organizationId: 'org-1' },
        { id: 'sub-2', name: 'Webhook 2', organizationId: 'org-1' },
      ];

      const result = await WebhookSubscriptionService.list('org-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'sub-1');
      assert.equal(calls[0].method, 'webhookSubscription.findMany');
      const args = calls[0].args as WebhookFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      webhookFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await WebhookSubscriptionService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates mutable fields', async () => {
      webhookUpdateImpl = async (args: WebhookUpdateArgs) => {
        assert.equal(args.data.name, 'New Name');
        assert.equal(args.data.url, 'https://new.example.com/webhook');
        return { id: 'sub-1', name: 'New Name' };
      };

      const result = await WebhookSubscriptionService.update('sub-1', {
        name: 'New Name',
        url: 'https://new.example.com/webhook',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'webhookSubscription.update');
      const args = calls[0].args as WebhookUpdateArgs;
      assert.equal(args.where.id, 'sub-1');
    });

    it('serializes events to JSON', async () => {
      webhookUpdateImpl = async (args: WebhookUpdateArgs) => {
        assert.equal(args.data.events, JSON.stringify(['a', 'b']));
        return { id: 'sub-1' };
      };

      await WebhookSubscriptionService.update('sub-1', {
        events: ['a', 'b'],
      });
    });
  });

  describe('pause', () => {
    it('sets status to paused', async () => {
      webhookUpdateImpl = async (args: WebhookUpdateArgs) => {
        assert.equal(args.data.status, 'paused');
        return { id: 'sub-1', status: 'paused' };
      };

      const result = await WebhookSubscriptionService.pause('sub-1');

      assert.ok(result);
      assert.equal(calls[0].method, 'webhookSubscription.update');
    });
  });

  describe('resume', () => {
    it('sets status to active', async () => {
      webhookUpdateImpl = async (args: WebhookUpdateArgs) => {
        assert.equal(args.data.status, 'active');
        return { id: 'sub-1', status: 'active' };
      };

      const result = await WebhookSubscriptionService.resume('sub-1');

      assert.ok(result);
      assert.equal(calls[0].method, 'webhookSubscription.update');
    });
  });

  describe('getDeliveryStats', () => {
    it('returns delivery stats for a subscription', async () => {
      webhookFindUniqueImpl = async () => ({
        id: 'sub-1',
        successCount: 10,
        failureCount: 2,
        lastDeliveryAt: new Date('2024-06-01'),
        lastDeliveryStatus: 'success',
        lastDeliveryCode: 200,
      });

      const stats = await WebhookSubscriptionService.getDeliveryStats('sub-1');

      assert.ok(stats);
      assert.equal(stats.successCount, 10);
      assert.equal(stats.failureCount, 2);
      assert.equal(stats.totalDeliveries, 12);
      assert.equal(stats.lastDeliveryStatus, 'success');
      assert.equal(stats.lastDeliveryCode, 200);
    });

    it('returns null when subscription not found', async () => {
      webhookFindUniqueImpl = async () => null;

      const stats = await WebhookSubscriptionService.getDeliveryStats('nope');
      assert.equal(stats, null);
    });
  });

  describe('matchEvent', () => {
    it('finds active subscriptions matching the event', async () => {
      webhookFindManyImpl = async () => [
        { id: 'sub-1', events: JSON.stringify(['task.created', 'task.completed']) },
        { id: 'sub-2', events: JSON.stringify(['comment.created']) },
      ];

      const result = await WebhookSubscriptionService.matchEvent('task.created');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'sub-1');
    });

    it('supports wildcard (*) events', async () => {
      webhookFindManyImpl = async () => [
        { id: 'sub-1', events: JSON.stringify(['*']) },
        { id: 'sub-2', events: JSON.stringify(['task.created']) },
      ];

      const result = await WebhookSubscriptionService.matchEvent('random.event');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'sub-1');
    });

    it('skips subscriptions with invalid JSON events', async () => {
      webhookFindManyImpl = async () => [
        { id: 'sub-1', events: 'not valid json' },
        { id: 'sub-2', events: JSON.stringify(['task.created']) },
      ];

      const result = await WebhookSubscriptionService.matchEvent('task.created');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'sub-2');
    });
  });

  describe('getStats', () => {
    it('summarizes subscription stats by status', async () => {
      webhookFindManyImpl = async () => [
        { status: 'active' },
        { status: 'active' },
        { status: 'paused' },
        { status: 'disabled' },
      ];

      const stats = await WebhookSubscriptionService.getStats('org-1');

      assert.equal(stats.total, 4);
      assert.equal(stats.active, 2);
      assert.equal(stats.paused, 1);
      assert.equal(stats.disabled, 1);
    });

    it('returns zero stats when no subscriptions', async () => {
      webhookFindManyImpl = async () => [];

      const stats = await WebhookSubscriptionService.getStats('org-1');

      assert.equal(stats.total, 0);
      assert.equal(stats.active, 0);
    });
  });
});
