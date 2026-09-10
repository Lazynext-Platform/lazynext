import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ApiUsageLogCreateArgs = {
  data: {
    organizationId: string;
    apiKeyId: string | null;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    requestBodySize: number | null;
    responseBodySize: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    rateLimited: boolean;
  };
};

type ApiUsageLogFindManyArgs = {
  where: Record<string, unknown> & { timestamp?: { gte?: Date; lte?: Date } };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type ApiUsageLogDeleteManyArgs = {
  where: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let apiUsageLogCreateImpl: (args: ApiUsageLogCreateArgs) => Promise<unknown> =
  async () => ({});
let apiUsageLogFindManyImpl: (args: ApiUsageLogFindManyArgs) => Promise<unknown[]> =
  async () => [];
let apiUsageLogDeleteManyImpl: (args: ApiUsageLogDeleteManyArgs) => Promise<{ count: number }> =
  async () => ({ count: 0 });

const prismaMock = {
  apiUsageLog: {
    create: (args: ApiUsageLogCreateArgs): Promise<unknown> => {
      calls.push({ method: 'apiUsageLog.create', args });
      return apiUsageLogCreateImpl(args);
    },
    findMany: (args: ApiUsageLogFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'apiUsageLog.findMany', args });
      return apiUsageLogFindManyImpl(args);
    },
    deleteMany: (args: ApiUsageLogDeleteManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'apiUsageLog.deleteMany', args });
      return apiUsageLogDeleteManyImpl(args);
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
  apiUsageLogCreateImpl = async () => ({});
  apiUsageLogFindManyImpl = async () => [];
  apiUsageLogDeleteManyImpl = async () => ({ count: 0 });
}

const { ApiUsageLogger } = await import('@/lib/services/api-usage-logger');

// ─────────────────────────────────────────────────────────────────────────────
// ApiUsageLogger
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiUsageLogger', () => {
  beforeEach(() => { resetMock(); });

  describe('log', () => {
    it('creates a usage log entry with all fields', async () => {
      apiUsageLogCreateImpl = async (args: ApiUsageLogCreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.apiKeyId, 'key-1');
        assert.equal(args.data.endpoint, '/api/v1/workspaces');
        assert.equal(args.data.method, 'GET');
        assert.equal(args.data.statusCode, 200);
        assert.equal(args.data.responseTimeMs, 50);
        assert.equal(args.data.rateLimited, false);
        return { id: 'log-1' };
      };

      await ApiUsageLogger.log({
        organizationId: 'org-1',
        apiKeyId: 'key-1',
        endpoint: '/api/v1/workspaces',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 50,
      });

      assert.equal(calls[0].method, 'apiUsageLog.create');
    });

    it('swallows errors (best-effort)', async () => {
      apiUsageLogCreateImpl = async () => { throw new Error('DB down'); };

      // Should not throw
      await ApiUsageLogger.log({
        organizationId: 'org-1',
        endpoint: '/api/v1/workspaces',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 50,
      });
    });

    it('defaults apiKeyId to null and rateLimited to false', async () => {
      apiUsageLogCreateImpl = async (args: ApiUsageLogCreateArgs) => {
        assert.equal(args.data.apiKeyId, null);
        assert.equal(args.data.rateLimited, false);
        return { id: 'log-1' };
      };

      await ApiUsageLogger.log({
        organizationId: 'org-1',
        endpoint: '/test',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 10,
      });
    });
  });

  describe('getUsageStats', () => {
    it('aggregates usage stats for an organization', async () => {
      apiUsageLogFindManyImpl = async () => [
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 200, responseTimeMs: 50, rateLimited: false },
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 200, responseTimeMs: 100, rateLimited: false },
        { endpoint: '/api/platform/keys', method: 'POST', statusCode: 429, responseTimeMs: 10, rateLimited: true },
      ];

      const stats = await ApiUsageLogger.getUsageStats('org-1');

      assert.equal(stats.totalRequests, 3);
      assert.equal(stats.rateLimitedRequests, 1);
      assert.equal(stats.errorCount, 1); // 429
      assert.equal(stats.avgResponseTime, 53); // (50+100+10)/3 ≈ 53
      assert.equal(stats.errorRate, 1 / 3);
      assert.ok(stats.byEndpoint.length >= 2);
      assert.ok(stats.byMethod.length >= 2);
      assert.ok(stats.byStatusCode.length >= 2);
    });

    it('applies apiKeyId filter in where clause', async () => {
      apiUsageLogFindManyImpl = async () => [];

      await ApiUsageLogger.getUsageStats('org-1', { apiKeyId: 'key-1' });

      const args = calls[0].args as ApiUsageLogFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.apiKeyId, 'key-1');
    });

    it('applies date range filter in where clause', async () => {
      apiUsageLogFindManyImpl = async () => [];
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');

      await ApiUsageLogger.getUsageStats('org-1', { startDate: start, endDate: end });

      const args = calls[0].args as ApiUsageLogFindManyArgs;
      assert.equal(args.where.timestamp?.gte, start);
      assert.equal(args.where.timestamp?.lte, end);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      apiUsageLogFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await ApiUsageLogger.getUsageStats('org-1');

      assert.equal(stats.totalRequests, 0);
      assert.equal(stats.errorRate, 0);
    });
  });

  describe('getUsageByApiKey', () => {
    it('aggregates stats for a specific API key', async () => {
      apiUsageLogFindManyImpl = async () => [
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 200, responseTimeMs: 30, rateLimited: false },
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 500, responseTimeMs: 200, rateLimited: false },
      ];

      const stats = await ApiUsageLogger.getUsageByApiKey('key-1');

      assert.equal(stats.totalRequests, 2);
      assert.equal(stats.errorCount, 1);
      assert.equal(stats.avgResponseTime, 115); // (30+200)/2 = 115
      const args = calls[0].args as ApiUsageLogFindManyArgs;
      assert.equal(args.where.apiKeyId, 'key-1');
    });
  });

  describe('getSlowRequests', () => {
    it('returns the slowest requests ordered by response time', async () => {
      apiUsageLogFindManyImpl = async () => [
        { id: 'log-1', endpoint: '/slow', method: 'GET', statusCode: 200, responseTimeMs: 5000, timestamp: new Date() },
        { id: 'log-2', endpoint: '/fast', method: 'GET', statusCode: 200, responseTimeMs: 50, timestamp: new Date() },
      ];

      const result = await ApiUsageLogger.getSlowRequests('org-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'log-1');
      assert.equal(result[0].responseTimeMs, 5000);
      const args = calls[0].args as ApiUsageLogFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.orderBy?.responseTimeMs, 'desc');
    });

    it('respects the limit parameter', async () => {
      apiUsageLogFindManyImpl = async () => [];

      await ApiUsageLogger.getSlowRequests('org-1', 5);

      const args = calls[0].args as ApiUsageLogFindManyArgs;
      assert.equal(args.take, 5);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      apiUsageLogFindManyImpl = async () => { throw new Error('fail'); };

      const result = await ApiUsageLogger.getSlowRequests('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getErrorRate', () => {
    it('buckets errors by day and calculates error rate', async () => {
      const day1 = new Date('2024-06-01T10:00:00Z');
      const day2 = new Date('2024-06-02T10:00:00Z');
      apiUsageLogFindManyImpl = async () => [
        { statusCode: 200, timestamp: day1 },
        { statusCode: 500, timestamp: day1 },
        { statusCode: 200, timestamp: day2 },
      ];

      const result = await ApiUsageLogger.getErrorRate('org-1');

      assert.equal(result.length, 2);
      // Sorted by date
      assert.equal(result[0].date, '2024-06-01');
      assert.equal(result[0].total, 2);
      assert.equal(result[0].errors, 1);
      assert.equal(result[0].errorRate, 0.5);
      assert.equal(result[1].date, '2024-06-02');
      assert.equal(result[1].total, 1);
      assert.equal(result[1].errors, 0);
      assert.equal(result[1].errorRate, 0);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      apiUsageLogFindManyImpl = async () => { throw new Error('fail'); };

      const result = await ApiUsageLogger.getErrorRate('org-1');
      assert.deepEqual(result, []);
    });
  });
});
