import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type PlatformConnectionFindManyArgs = {
  where: { userId: string };
  orderBy?: Record<string, unknown>;
};

type PlatformConnectionFindUniqueArgs = {
  where: { userId_platform: { userId: string; platform: string } };
};

type WebhookEndpointFindManyArgs = {
  where: { userId: string };
  orderBy?: Record<string, unknown>;
};

type WebhookEndpointFindUniqueArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let connectionFindManyImpl: (args: PlatformConnectionFindManyArgs) => Promise<unknown[]> =
  async () => [];
let connectionFindUniqueImpl: (args: PlatformConnectionFindUniqueArgs) => Promise<unknown> =
  async () => null;

let webhookFindManyImpl: (args: WebhookEndpointFindManyArgs) => Promise<unknown[]> =
  async () => [];
let webhookFindUniqueImpl: (args: WebhookEndpointFindUniqueArgs) => Promise<unknown> =
  async () => null;

const prismaMock = {
  platformConnection: {
    findMany: (args: PlatformConnectionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'platformConnection.findMany', args });
      return connectionFindManyImpl(args);
    },
    findUnique: (args: PlatformConnectionFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.findUnique', args });
      return connectionFindUniqueImpl(args);
    },
  },
  webhookEndpoint: {
    findMany: (args: WebhookEndpointFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'webhookEndpoint.findMany', args });
      return webhookFindManyImpl(args);
    },
    findUnique: (args: WebhookEndpointFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'webhookEndpoint.findUnique', args });
      return webhookFindUniqueImpl(args);
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
  connectionFindManyImpl = async () => [];
  connectionFindUniqueImpl = async () => null;
  webhookFindManyImpl = async () => [];
  webhookFindUniqueImpl = async () => null;
}

const { IntegrationHealthService } = await import('@/lib/services/integration-health');

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationHealthService
// ─────────────────────────────────────────────────────────────────────────────

describe('IntegrationHealthService', () => {
  beforeEach(() => { resetMock(); });

  describe('listConnections', () => {
    it('returns platform connections for a user', async () => {
      connectionFindManyImpl = async () =>
        ([{ id: 'c1', platform: 'tiktok', userId: 'u1' }]);

      const result = await IntegrationHealthService.listConnections('u1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'platformConnection.findMany');
      const args = calls[0].args as PlatformConnectionFindManyArgs;
      assert.equal(args.where.userId, 'u1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      connectionFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await IntegrationHealthService.listConnections('u1');
      assert.deepEqual(result, []);
    });
  });

  describe('checkHealth', () => {
    it('returns healthy when token expires in the future', async () => {
      connectionFindUniqueImpl = async () => ({
        id: 'c1',
        platform: 'tiktok',
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        platformUsername: 'user1',
      });

      const result = await IntegrationHealthService.checkHealth('u1', 'tiktok');

      assert.ok(result);
      assert.equal(result.status, 'healthy');
    });

    it('returns expired when token expired in the past', async () => {
      connectionFindUniqueImpl = async () => ({
        id: 'c1',
        platform: 'tiktok',
        tokenExpiresAt: new Date(Date.now() - 3600_000),
        platformUsername: 'user1',
      });

      const result = await IntegrationHealthService.checkHealth('u1', 'tiktok');

      assert.ok(result);
      assert.equal(result.status, 'expired');
    });

    it('returns unknown when no token expiry is set', async () => {
      connectionFindUniqueImpl = async () => ({
        id: 'c1',
        platform: 'tiktok',
        tokenExpiresAt: null,
        platformUsername: 'user1',
      });

      const result = await IntegrationHealthService.checkHealth('u1', 'tiktok');

      assert.ok(result);
      assert.equal(result.status, 'unknown');
    });

    it('returns null when connection not found', async () => {
      connectionFindUniqueImpl = async () => null;

      const result = await IntegrationHealthService.checkHealth('u1', 'tiktok');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      connectionFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await IntegrationHealthService.checkHealth('u1', 'tiktok');
      assert.equal(result, null);
    });
  });

  describe('listWebhooks', () => {
    it('returns webhook endpoints for a user', async () => {
      webhookFindManyImpl = async () =>
        ([{ id: 'w1', url: 'https://example.com/hook', active: true }]);

      const result = await IntegrationHealthService.listWebhooks('u1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'w1');
      assert.equal(calls[0].method, 'webhookEndpoint.findMany');
      const args = calls[0].args as WebhookEndpointFindManyArgs;
      assert.equal(args.where.userId, 'u1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      webhookFindManyImpl = async () => { throw new Error('fail'); };

      const result = await IntegrationHealthService.listWebhooks('u1');
      assert.deepEqual(result, []);
    });
  });

  describe('getWebhookDeliveryStats', () => {
    it('returns delivery stats for a webhook endpoint', async () => {
      webhookFindUniqueImpl = async () => ({
        id: 'w1',
        url: 'https://example.com/hook',
        active: true,
        events: 'creative.generated,creative.scored',
        lastFiredAt: new Date(),
        lastStatus: 200,
      });

      const result = await IntegrationHealthService.getWebhookDeliveryStats('w1');

      assert.ok(result);
      assert.equal(result.id, 'w1');
      assert.equal(result.healthy, true);
    });

    it('returns null when endpoint not found', async () => {
      webhookFindUniqueImpl = async () => null;

      const result = await IntegrationHealthService.getWebhookDeliveryStats('nope');
      assert.equal(result, null);
    });

    it('marks unhealthy when lastStatus is an error code', async () => {
      webhookFindUniqueImpl = async () => ({
        id: 'w1',
        url: 'https://example.com/hook',
        active: true,
        events: 'creative.generated',
        lastFiredAt: new Date(),
        lastStatus: 500,
      });

      const result = await IntegrationHealthService.getWebhookDeliveryStats('w1');

      assert.ok(result);
      assert.equal(result.healthy, false);
    });
  });

  describe('getHealthSummary', () => {
    it('aggregates connections and webhooks with health counts', async () => {
      connectionFindManyImpl = async () => ([
        { id: 'c1', platform: 'tiktok', tokenExpiresAt: new Date(Date.now() + 3600_000), platformUsername: 'u1' },
        { id: 'c2', platform: 'youtube', tokenExpiresAt: new Date(Date.now() - 3600_000), platformUsername: 'u2' },
        { id: 'c3', platform: 'instagram', tokenExpiresAt: null, platformUsername: 'u3' },
      ]);
      webhookFindManyImpl = async () => ([
        { id: 'w1', url: 'https://example.com', active: true, lastFiredAt: null, lastStatus: null, events: 'creative.generated' },
      ]);

      const summary = await IntegrationHealthService.getHealthSummary('u1');

      assert.equal(summary.connections.length, 3);
      assert.equal(summary.webhooks.length, 1);
      assert.equal(summary.healthyCount, 1);
      assert.equal(summary.expiredCount, 1);
      assert.equal(summary.unknownCount, 1);
    });

    it('returns empty summary when no connections or webhooks', async () => {
      connectionFindManyImpl = async () => [];
      webhookFindManyImpl = async () => [];

      const summary = await IntegrationHealthService.getHealthSummary('u1');

      assert.equal(summary.connections.length, 0);
      assert.equal(summary.webhooks.length, 0);
      assert.equal(summary.healthyCount, 0);
      assert.equal(summary.expiredCount, 0);
      assert.equal(summary.unknownCount, 0);
    });

    it('returns empty summary on error (safePrisma fallback)', async () => {
      connectionFindManyImpl = async () => { throw new Error('fail'); };
      webhookFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await IntegrationHealthService.getHealthSummary('u1');

      assert.equal(summary.connections.length, 0);
      assert.equal(summary.webhooks.length, 0);
    });
  });
});
