import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryCreateArgs {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string;
    owner: string;
    accessPolicy: string;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
}

interface MemoryFindManyArgs {
  where: { type: string; createdBy: string };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}

interface MemoryFindFirstArgs {
  where: { type: string; createdBy: string; tags?: string };
  select?: Record<string, unknown>;
}

interface MemoryUpdateArgs {
  where: { id: string };
  data: { content?: string; tags?: string };
}

interface MemoryDeleteManyArgs {
  where: { id: { in: string[] } };
}

interface MembershipFindFirstArgs {
  where: { userId: string };
  include?: Record<string, unknown>;
}

interface MembershipFindManyArgs {
  where: { workspaceId: string };
  select?: Record<string, unknown>;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({ id: 'mem-1' });
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({ id: 'mem-1' });
let memoryDeleteManyImpl: (args: MemoryDeleteManyArgs) => Promise<unknown> =
  async () => ({ count: 1 });

let membershipFindFirstImpl: (args: MembershipFindFirstArgs) => Promise<unknown> =
  async () => ({ workspaceId: 'ws-1', workspace: { organizationId: 'org-1' } });
let membershipFindManyImpl: (args: MembershipFindManyArgs) => Promise<unknown[]> =
  async () => [];

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
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
    deleteMany: (args: MemoryDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'memory.deleteMany', args });
      return memoryDeleteManyImpl(args);
    },
  },
  membership: {
    findFirst: (args: MembershipFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'membership.findFirst', args });
      return membershipFindFirstImpl(args);
    },
    findMany: (args: MembershipFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'membership.findMany', args });
      return membershipFindManyImpl(args);
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
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({ id: 'mem-1' });
  memoryUpdateImpl = async () => ({ id: 'mem-1' });
  memoryDeleteManyImpl = async () => ({ count: 1 });
  membershipFindFirstImpl = async () => ({ workspaceId: 'ws-1', workspace: { organizationId: 'org-1' } });
  membershipFindManyImpl = async () => [];
}

const { PushNotificationService } = await import('@/lib/services/push-notification-service');

const SAMPLE_SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  expirationTime: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// PushNotificationService
// ─────────────────────────────────────────────────────────────────────────────

describe('PushNotificationService', () => {
  beforeEach(() => { resetMock(); });

  describe('subscribe', () => {
    it('stores a new subscription in the Memory table', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'push_subscription');
        assert.equal(args.data.createdBy, 'user-1');
        assert.equal(args.data.workspaceId, 'ws-1');
        assert.equal(args.data.organizationId, 'org-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.endpoint, SAMPLE_SUB.endpoint);
        return { id: 'mem-99' };
      };

      const result = await PushNotificationService.subscribe('user-1', SAMPLE_SUB);

      assert.ok(result);
      assert.equal(result!.id, 'mem-99');
      assert.equal(calls[0].method, 'membership.findFirst');
      assert.equal(calls[1].method, 'memory.findFirst');
      assert.equal(calls[2].method, 'memory.create');
    });

    it('updates an existing subscription with the same endpoint', async () => {
      memoryFindFirstImpl = async () => ({ id: 'mem-existing' });

      const result = await PushNotificationService.subscribe('user-1', SAMPLE_SUB);

      assert.ok(result);
      assert.equal(result!.id, 'mem-existing');
      assert.equal(calls[1].method, 'memory.findFirst');
      assert.equal(calls[2].method, 'memory.update');
    });

    it('returns null when the user has no workspace', async () => {
      membershipFindFirstImpl = async () => null;

      const result = await PushNotificationService.subscribe('user-1', SAMPLE_SUB);

      assert.equal(result, null);
    });

    it('uses explicit context when provided', async () => {
      let createdArgs: MemoryCreateArgs | null = null;
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        createdArgs = args;
        return { id: 'mem-ctx' };
      };

      await PushNotificationService.subscribe('user-1', SAMPLE_SUB, {
        workspaceId: 'ws-explicit',
        organizationId: 'org-explicit',
      });

      assert.ok(createdArgs);
      const data = (createdArgs as MemoryCreateArgs).data;
      assert.equal(data.workspaceId, 'ws-explicit');
      assert.equal(data.organizationId, 'org-explicit');
    });
  });

  describe('unsubscribe', () => {
    it('removes a subscription matching the endpoint', async () => {
      memoryFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify({ endpoint: 'other' }) },
        { id: 'm2', content: JSON.stringify(SAMPLE_SUB) },
      ];

      const removed = await PushNotificationService.unsubscribe('user-1', SAMPLE_SUB.endpoint);

      assert.equal(removed, 1);
      const delArgs = calls.find((c) => c.method === 'memory.deleteMany')!.args as MemoryDeleteManyArgs;
      assert.deepEqual(delArgs.where.id.in, ['m2']);
    });

    it('returns 0 when no subscription matches', async () => {
      memoryFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify({ endpoint: 'other' }) },
      ];

      const removed = await PushNotificationService.unsubscribe('user-1', SAMPLE_SUB.endpoint);

      assert.equal(removed, 0);
    });

    it('returns 0 on DB error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const removed = await PushNotificationService.unsubscribe('user-1', SAMPLE_SUB.endpoint);

      assert.equal(removed, 0);
    });
  });

  describe('getSubscriptions', () => {
    it('returns parsed subscriptions for a user', async () => {
      memoryFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify(SAMPLE_SUB), updatedAt: new Date() },
      ];

      const subs = await PushNotificationService.getSubscriptions('user-1');

      assert.equal(subs.length, 1);
      assert.equal(subs[0].endpoint, SAMPLE_SUB.endpoint);
      assert.equal(subs[0].keys.p256dh, 'p256dh-key');
    });

    it('returns empty array on DB error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };

      const subs = await PushNotificationService.getSubscriptions('user-1');

      assert.deepEqual(subs, []);
    });
  });

  describe('send', () => {
    it('returns not_configured when VAPID keys are missing', async () => {
      const origPublic = process.env.VAPID_PUBLIC_KEY;
      const origPrivate = process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      memoryFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify(SAMPLE_SUB), updatedAt: new Date() },
      ];

      const result = await PushNotificationService.send('user-1', { title: 'Hi', body: 'Test' });

      assert.equal(result.sent, 0);
      assert.equal(result.error, 'not_configured');

      process.env.VAPID_PUBLIC_KEY = origPublic;
      process.env.VAPID_PRIVATE_KEY = origPrivate;
    });

    it('returns no_subscriptions when user has none', async () => {
      memoryFindManyImpl = async () => [];

      const result = await PushNotificationService.send('user-1', { title: 'Hi', body: 'Test' });

      assert.equal(result.sent, 0);
      assert.equal(result.error, 'no_subscriptions');
    });
  });

  describe('getVapidPublicKey', () => {
    it('returns the key from env when set', () => {
      process.env.VAPID_PUBLIC_KEY = 'test-key';
      assert.equal(PushNotificationService.getVapidPublicKey(), 'test-key');
      delete process.env.VAPID_PUBLIC_KEY;
    });

    it('returns null when not set', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      assert.equal(PushNotificationService.getVapidPublicKey(), null);
    });
  });

  describe('getStats', () => {
    it('returns subscription count and last-sent time', async () => {
      const date = new Date('2025-01-01');
      memoryFindManyImpl = async () => [
        { id: 'm1', updatedAt: date },
        { id: 'm2', updatedAt: new Date('2024-12-01') },
      ];

      const stats = await PushNotificationService.getStats('user-1');

      assert.equal(stats.subscriptionCount, 2);
      assert.equal(stats.lastSentAt?.toISOString(), date.toISOString());
    });

    it('returns zero stats with null lastSentAt when no subscriptions', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await PushNotificationService.getStats('user-1');

      assert.equal(stats.subscriptionCount, 0);
      assert.equal(stats.lastSentAt, null);
    });
  });

  describe('sendToWorkspace', () => {
    it('sends to all workspace members', async () => {
      membershipFindManyImpl = async () => [
        { userId: 'u1' },
        { userId: 'u2' },
      ];
      // No VAPID keys → each send returns not_configured with sent 0.
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      memoryFindManyImpl = async () => [
        { id: 'm1', content: JSON.stringify(SAMPLE_SUB), updatedAt: new Date() },
      ];

      const result = await PushNotificationService.sendToWorkspace('ws-1', { title: 'Hi', body: 'All' });

      assert.equal(result.sent, 0);
      const findManyCalls = calls.filter((c) => c.method === 'membership.findMany');
      assert.equal(findManyCalls.length, 1);
    });
  });
});
