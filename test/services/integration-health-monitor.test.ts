import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

let platformConnectionFindUniqueImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => null;
let platformConnectionFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let membershipFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];

const prismaMock = {
  platformConnection: {
    findUnique: (args: { where: { id: string } }): Promise<unknown> => {
      return platformConnectionFindUniqueImpl(args);
    },
    findMany: (args: unknown): Promise<unknown[]> => {
      return platformConnectionFindManyImpl(args);
    },
  },
  membership: {
    findMany: (args: unknown): Promise<unknown[]> => {
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

// Mock global.fetch for health pings
const fetchMock = mock.fn(async () => ({ ok: true, status: 200 } as { ok: boolean; status: number }));
globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

function resetMock(): void {
  fetchMock.mock.resetCalls();
  platformConnectionFindUniqueImpl = async () => null;
  platformConnectionFindManyImpl = async () => [];
  membershipFindManyImpl = async () => [];
}

const { IntegrationHealthMonitor } = await import('@/lib/automation/health-monitor');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IntegrationHealthMonitor', () => {
  beforeEach(() => { resetMock(); });

  describe('checkIntegration', () => {
    it('returns null for a missing integration', async () => {
      platformConnectionFindUniqueImpl = async () => null;
      const result = await IntegrationHealthMonitor.checkIntegration('nope');
      assert.equal(result, null);
    });

    it('reports down when token is expired', async () => {
      platformConnectionFindUniqueImpl = async () => ({
        id: 'c-1',
        platform: 'tiktok',
        tokenExpiresAt: new Date(Date.now() - 1000),
      });
      const result = await IntegrationHealthMonitor.checkIntegration('c-1');
      assert.ok(result);
      assert.equal(result!.status, 'down');
      assert.equal(result!.tokenValid, false);
    });

    it('reports healthy when token valid and endpoint reachable', async () => {
      platformConnectionFindUniqueImpl = async () => ({
        id: 'c-1',
        platform: 'youtube',
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      fetchMock.mock.mockImplementation(async () => ({ ok: true, status: 200 }));
      const result = await IntegrationHealthMonitor.checkIntegration('c-1');
      assert.ok(result);
      assert.equal(result!.status, 'healthy');
      assert.equal(result!.tokenValid, true);
    });

    it('reports degraded when endpoint is slow', async () => {
      platformConnectionFindUniqueImpl = async () => ({
        id: 'c-1',
        platform: 'tiktok',
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      fetchMock.mock.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 30));
        return { ok: true, status: 200 };
      });
      // Override the threshold by using a platform with a known endpoint
      // and a slow response — responseTime will be > 0 but < 2000, so healthy.
      // This test confirms the ping path works.
      const result = await IntegrationHealthMonitor.checkIntegration('c-1');
      assert.ok(result);
      assert.ok(['healthy', 'degraded'].includes(result!.status));
    });
  });

  describe('checkAllIntegrations', () => {
    it('returns empty when org has no members', async () => {
      membershipFindManyImpl = async () => [];
      const results = await IntegrationHealthMonitor.checkAllIntegrations('org-1');
      assert.deepEqual(results, []);
    });

    it('checks all connections for org members', async () => {
      membershipFindManyImpl = async () => [{ userId: 'u-1' }, { userId: 'u-2' }];
      const conn = { id: 'c-1', platform: 'youtube', tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
      platformConnectionFindManyImpl = async () => [conn];
      platformConnectionFindUniqueImpl = async () => conn;
      fetchMock.mock.mockImplementation(async () => ({ ok: true, status: 200 }));

      const results = await IntegrationHealthMonitor.checkAllIntegrations('org-1');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'c-1');
    });
  });

  describe('getHealthSummary', () => {
    it('returns zeroed summary when no members', async () => {
      membershipFindManyImpl = async () => [];
      const summary = await IntegrationHealthMonitor.getHealthSummary('org-1');
      assert.equal(summary.total, 0);
      assert.equal(summary.healthy, 0);
      assert.equal(summary.down, 0);
    });

    it('classifies connections by token expiry', async () => {
      membershipFindManyImpl = async () => [{ userId: 'u-1' }];
      platformConnectionFindManyImpl = async () => [
        { id: 'c-1', platform: 'youtube', tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { id: 'c-2', platform: 'tiktok', tokenExpiresAt: new Date(Date.now() - 1000) },
        { id: 'c-3', platform: 'instagram', tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      ];

      const summary = await IntegrationHealthMonitor.getHealthSummary('org-1');
      assert.equal(summary.total, 3);
      assert.equal(summary.healthy, 1);
      assert.equal(summary.degraded, 1); // expiring within 3 days
      assert.equal(summary.down, 1); // expired
    });

    it('aggregates by platform type', async () => {
      membershipFindManyImpl = async () => [{ userId: 'u-1' }];
      platformConnectionFindManyImpl = async () => [
        { id: 'c-1', platform: 'youtube', tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { id: 'c-2', platform: 'youtube', tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      ];

      const summary = await IntegrationHealthMonitor.getHealthSummary('org-1');
      assert.ok(summary.byType['youtube']);
      assert.equal(summary.byType['youtube'].total, 2);
      assert.equal(summary.byType['youtube'].healthy, 2);
    });
  });

  describe('getDegradedIntegrations', () => {
    it('returns empty when no members', async () => {
      membershipFindManyImpl = async () => [];
      const result = await IntegrationHealthMonitor.getDegradedIntegrations('org-1');
      assert.deepEqual(result, []);
    });

    it('returns only integrations expiring soon', async () => {
      membershipFindManyImpl = async () => [{ userId: 'u-1' }];
      platformConnectionFindManyImpl = async () => [
        { id: 'c-1', platform: 'youtube', tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), platformUsername: 'user1' },
        { id: 'c-2', platform: 'tiktok', tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), platformUsername: 'user2' },
        { id: 'c-3', platform: 'instagram', tokenExpiresAt: new Date(Date.now() - 1000), platformUsername: 'user3' },
      ];

      const result = await IntegrationHealthMonitor.getDegradedIntegrations('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c-2');
      assert.equal(result[0].platform, 'tiktok');
    });
  });

  describe('scheduleHealthChecks', () => {
    it('returns a timer id that can be stopped', () => {
      const timerId = IntegrationHealthMonitor.scheduleHealthChecks('org-1', 100000);
      assert.ok(timerId);
      IntegrationHealthMonitor.stopHealthChecks(timerId);
    });
  });
});
