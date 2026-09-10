import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type UserCountArgs = Record<string, unknown>;

type MetricCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    value: number;
    unit: string | null;
    dimensions: string;
    timestamp: Date;
  };
};

type MetricFindManyArgs = {
  where: {
    organizationId: string;
    name: { startsWith: string };
    unit: string;
  };
  orderBy: Record<string, unknown>;
  take: number;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Prisma mock ──

let userCountImpl: (args?: UserCountArgs) => Promise<number> =
  async () => 0;
let metricCreateImpl: (args: MetricCreateArgs) => Promise<unknown> =
  async () => ({});
let metricFindManyImpl: (args: MetricFindManyArgs) => Promise<unknown[]> =
  async () => [];

const prismaMock = {
  user: {
    count: (args?: UserCountArgs): Promise<number> => {
      calls.push({ method: 'user.count', args });
      return userCountImpl(args);
    },
  },
  metric: {
    create: (args: MetricCreateArgs): Promise<unknown> => {
      calls.push({ method: 'metric.create', args });
      return metricCreateImpl(args);
    },
    findMany: (args: MetricFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'metric.findMany', args });
      return metricFindManyImpl(args);
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

// ── Cache mock ──

let cacheGetStatsImpl: () => { size: number; hits: number; misses: number; hitRate: number } =
  () => ({ size: 0, hits: 0, misses: 0, hitRate: 0 });

const cacheMock = {
  getStats: (): { size: number; hits: number; misses: number; hitRate: number } => {
    calls.push({ method: 'cache.getStats' });
    return cacheGetStatsImpl();
  },
};

mock.module('@/lib/cache', {
  namedExports: { cache: cacheMock },
});

// ── fetch mock ──

interface FetchCall {
  url: string;
}

const fetchMock = {
  calls: [] as FetchCall[],
  implementation: null as ((url: string) => Promise<Response>) | null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;

function resetMock(): void {
  calls.length = 0;
  fetchMock.calls.length = 0;
  fetchMock.implementation = null;
  userCountImpl = async () => 0;
  metricCreateImpl = async () => ({});
  metricFindManyImpl = async () => [];
  cacheGetStatsImpl = () => ({ size: 0, hits: 0, misses: 0, hitRate: 0 });
  globalThis.fetch = originalFetch;
}

const { PerformanceService } = await import('@/lib/services/performance');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PerformanceService', () => {
  beforeEach(() => { resetMock(); });

  describe('getQueryStats', () => {
    it('returns connection status and model list from prisma client', async () => {
      userCountImpl = async () => 5;

      const stats = await PerformanceService.getQueryStats();

      assert.equal(stats.connected, true);
      assert.ok(stats.modelCount > 0);
      assert.ok(stats.models.includes('user'));
      assert.ok(stats.models.includes('metric'));
      assert.ok(stats.checkedAt);
      assert.equal(calls[0].method, 'user.count');
    });

    it('reports disconnected when user.count throws', async () => {
      userCountImpl = async () => { throw new Error('DB down'); };

      const stats = await PerformanceService.getQueryStats();

      assert.equal(stats.connected, false);
      assert.ok(stats.modelCount > 0);
    });
  });

  describe('getIndexReport', () => {
    it('parses the schema and returns grouped index info', async () => {
      const report = await PerformanceService.getIndexReport();

      assert.ok(report.totalModels > 0);
      assert.ok(report.totalIndexes > 0);
      assert.ok(Array.isArray(report.modelsWithIndexes));
      assert.ok(Array.isArray(report.modelsWithoutIndexes));
      assert.ok(Array.isArray(report.modelsNeedingIndexes));
      assert.ok(report.generatedAt);
    });

    it('identifies Account as missing a userId index', async () => {
      const report = await PerformanceService.getIndexReport();

      const account = report.modelsNeedingIndexes.find(
        (m) => m.model === 'Account',
      );
      assert.ok(account, 'Account should be in modelsNeedingIndexes');
      assert.ok(account!.missingIndexFks.includes('userId'));
    });

    it('includes foreign keys and index fields in model info', async () => {
      const report = await PerformanceService.getIndexReport();

      const session = report.modelsWithIndexes.find(
        (m) => m.model === 'Session',
      );
      assert.ok(session, 'Session should be in modelsWithIndexes');
      assert.ok(session!.foreignKeys.includes('userId'));
      const hasUserIdIndex = session!.indexes.some(
        (idx) => idx.fields.includes('userId'),
      );
      assert.ok(hasUserIdIndex, 'Session should have a userId index');
    });
  });

  describe('getApiHealth', () => {
    it('returns health for each endpoint with status and response time', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        return jsonResponse({ ok: true }, 200);
      };
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;

      const health = await PerformanceService.getApiHealth('http://test:9999');

      assert.equal(health.endpoints.length, 3);
      assert.ok(health.allHealthy);
      for (const e of health.endpoints) {
        assert.equal(e.status, 200);
        assert.equal(e.ok, true);
        assert.ok(e.responseTimeMs >= 0);
      }
      assert.ok(health.checkedAt);
    });

    it('marks endpoints as unhealthy on non-200 status', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/api/health')) return jsonResponse({}, 200);
        return jsonResponse({ error: 'no' }, 500);
      };
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;

      const health = await PerformanceService.getApiHealth('http://test:9999');

      assert.equal(health.allHealthy, false);
      const healthEndpoint = health.endpoints.find(
        (e) => e.endpoint === '/api/health',
      );
      assert.equal(healthEndpoint!.ok, true);
      const metricsEndpoint = health.endpoints.find(
        (e) => e.endpoint === '/api/observability/metrics',
      );
      assert.equal(metricsEndpoint!.ok, false);
      assert.equal(metricsEndpoint!.status, 500);
    });

    it('handles fetch errors gracefully', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        throw new Error('connection refused');
      };
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;

      const health = await PerformanceService.getApiHealth('http://test:9999');

      assert.equal(health.allHealthy, false);
      for (const e of health.endpoints) {
        assert.equal(e.ok, false);
        assert.equal(e.status, 0);
        assert.ok(e.error);
      }
    });
  });

  describe('getCacheStats', () => {
    it('returns cache statistics from the cache module', async () => {
      cacheGetStatsImpl = () => ({ size: 5, hits: 10, misses: 2, hitRate: 0.833 });

      const stats = await PerformanceService.getCacheStats();

      assert.equal(stats.active, true);
      assert.equal(stats.size, 5);
      assert.equal(stats.hits, 10);
      assert.equal(stats.misses, 2);
      assert.equal(stats.hitRate, 0.833);
      assert.equal(calls[0].method, 'cache.getStats');
    });
  });

  describe('recordQueryMetric', () => {
    it('creates a metric with query name prefix and ms unit', async () => {
      metricCreateImpl = async (args: MetricCreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.name, 'query.getDashboard');
        assert.equal(args.data.value, 350);
        assert.equal(args.data.unit, 'ms');
        assert.ok(args.data.dimensions.includes('rowCount'));
        return { id: 'm1', ...args.data };
      };

      const result = await PerformanceService.recordQueryMetric('org-1', {
        queryName: 'getDashboard',
        durationMs: 350,
        rowCount: 42,
        model: 'metric',
        operation: 'findMany',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'metric.create');
    });

    it('passes workspaceId when provided', async () => {
      metricCreateImpl = async (args: MetricCreateArgs) => {
        assert.equal(args.data.workspaceId, 'ws-1');
        return { id: 'm2', ...args.data };
      };

      await PerformanceService.recordQueryMetric('org-1', {
        workspaceId: 'ws-1',
        queryName: 'listTasks',
        durationMs: 120,
      });
    });
  });

  describe('getSlowQueries', () => {
    it('returns slow queries sorted by duration descending', async () => {
      metricFindManyImpl = async () => ([
        { id: 'm1', name: 'query.slow', value: 5000, unit: 'ms', dimensions: '{"model":"task"}', timestamp: new Date() },
        { id: 'm2', name: 'query.fast', value: 50, unit: 'ms', dimensions: '{}', timestamp: new Date() },
      ]);

      const queries = await PerformanceService.getSlowQueries('org-1', 10);

      assert.equal(queries.length, 2);
      assert.equal(queries[0].id, 'm1');
      assert.equal(queries[0].value, 5000);
      assert.equal(queries[0].name, 'query.slow');
      assert.deepEqual(queries[0].dimensions, { model: 'task' });
      assert.equal(calls[0].method, 'metric.findMany');
      const args = calls[0].args as MetricFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
      assert.equal(args.where.name.startsWith, 'query.');
      assert.equal(args.where.unit, 'ms');
      assert.equal(args.take, 10);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      metricFindManyImpl = async () => { throw new Error('DB down'); };

      const queries = await PerformanceService.getSlowQueries('org-1');
      assert.deepEqual(queries, []);
    });

    it('handles malformed dimensions JSON gracefully', async () => {
      metricFindManyImpl = async () => ([
        { id: 'm3', name: 'query.bad', value: 100, unit: 'ms', dimensions: 'not-json', timestamp: new Date() },
      ]);

      const queries = await PerformanceService.getSlowQueries('org-1');
      assert.equal(queries.length, 1);
      assert.deepEqual(queries[0].dimensions, {});
    });
  });

  describe('getPerformanceDashboard', () => {
    it('combines index report, api health, slow queries, cache stats, and recommendations', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        return jsonResponse({ ok: true }, 200);
      };
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;
      metricFindManyImpl = async () => [];
      cacheGetStatsImpl = () => ({ size: 3, hits: 8, misses: 2, hitRate: 0.8 });

      const dashboard = await PerformanceService.getPerformanceDashboard('org-1');

      assert.ok(dashboard.indexReport);
      assert.ok(dashboard.apiHealth);
      assert.ok(Array.isArray(dashboard.slowQueries));
      assert.ok(dashboard.cacheStats);
      assert.ok(Array.isArray(dashboard.recommendations));
      assert.ok(dashboard.recommendations.length > 0);
      assert.ok(dashboard.generatedAt);
    });

    it('includes a high-severity recommendation when models need indexes', async () => {
      fetchMock.implementation = async () => jsonResponse({}, 200);
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;
      metricFindManyImpl = async () => [];
      cacheGetStatsImpl = () => ({ size: 0, hits: 0, misses: 0, hitRate: 0 });

      const dashboard = await PerformanceService.getPerformanceDashboard('org-1');

      const indexRec = dashboard.recommendations.find(
        (r) => r.category === 'database' && r.title.includes('missing foreign-key indexes'),
      );
      assert.ok(indexRec, 'should recommend adding missing FK indexes');
      assert.equal(indexRec!.severity, 'high');
    });

    it('includes an unhealthy API recommendation when endpoints fail', async () => {
      fetchMock.implementation = async () => {
        throw new Error('refused');
      };
      globalThis.fetch = ((url: string) => fetchMock.implementation!(url)) as typeof fetch;
      metricFindManyImpl = async () => [];
      cacheGetStatsImpl = () => ({ size: 0, hits: 0, misses: 0, hitRate: 0 });

      const dashboard = await PerformanceService.getPerformanceDashboard('org-1');

      const apiRec = dashboard.recommendations.find(
        (r) => r.category === 'api' && r.title.includes('Unhealthy API'),
      );
      assert.ok(apiRec, 'should flag unhealthy API endpoints');
    });
  });
});
