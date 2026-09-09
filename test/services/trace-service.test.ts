import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TraceCreateArgs = {
  data: {
    organizationId: string;
    traceId: string;
    rootSpanName: string;
    status: string;
    durationMs: number;
    spanCount: number;
    serviceCount: number;
    labels: string;
  };
};

type TraceUpdateArgs = {
  where: { traceId: string };
  data: Record<string, unknown>;
};

type TraceFindUniqueArgs = {
  where: { traceId: string };
};

type TraceFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type TraceDeleteManyArgs = {
  where: { organizationId: string; startedAt: Record<string, unknown> };
};

type SpanCreateArgs = {
  data: {
    organizationId: string;
    traceId: string;
    spanId: string;
    parentSpanId: string | null;
    name: string;
    service: string;
    operation: string;
    status: string;
    durationMs: number;
    attributes: string;
    events: string;
  };
};

type SpanUpdateArgs = {
  where: { spanId: string };
  data: Record<string, unknown>;
};

type SpanFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
};

type SpanDeleteManyArgs = {
  where: { organizationId: string; startTime: Record<string, unknown> };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let traceCreateImpl: (args: TraceCreateArgs) => Promise<unknown> = async () => ({});
let traceUpdateImpl: (args: TraceUpdateArgs) => Promise<unknown> = async () => ({});
let traceFindUniqueImpl: (args: TraceFindUniqueArgs) => Promise<unknown> = async () => null;
let traceFindManyImpl: (args: TraceFindManyArgs) => Promise<unknown[]> = async () => [];
let traceDeleteManyImpl: (args: TraceDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });

let spanCreateImpl: (args: SpanCreateArgs) => Promise<unknown> = async () => ({});
let spanUpdateImpl: (args: SpanUpdateArgs) => Promise<unknown> = async () => ({});
let spanFindManyImpl: (args: SpanFindManyArgs) => Promise<unknown[]> = async () => [];
let spanDeleteManyImpl: (args: SpanDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });

const prismaMock = {
  trace: {
    create: (args: TraceCreateArgs): Promise<unknown> => {
      calls.push({ method: 'trace.create', args });
      return traceCreateImpl(args);
    },
    update: (args: TraceUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'trace.update', args });
      return traceUpdateImpl(args);
    },
    findUnique: (args: TraceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'trace.findUnique', args });
      return traceFindUniqueImpl(args);
    },
    findMany: (args: TraceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'trace.findMany', args });
      return traceFindManyImpl(args);
    },
    deleteMany: (args: TraceDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'trace.deleteMany', args });
      return traceDeleteManyImpl(args);
    },
  },
  span: {
    create: (args: SpanCreateArgs): Promise<unknown> => {
      calls.push({ method: 'span.create', args });
      return spanCreateImpl(args);
    },
    update: (args: SpanUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'span.update', args });
      return spanUpdateImpl(args);
    },
    findMany: (args: SpanFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'span.findMany', args });
      return spanFindManyImpl(args);
    },
    deleteMany: (args: SpanDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'span.deleteMany', args });
      return spanDeleteManyImpl(args);
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
  traceCreateImpl = async () => ({});
  traceUpdateImpl = async () => ({});
  traceFindUniqueImpl = async () => null;
  traceFindManyImpl = async () => [];
  traceDeleteManyImpl = async () => ({ count: 0 });
  spanCreateImpl = async () => ({});
  spanUpdateImpl = async () => ({});
  spanFindManyImpl = async () => [];
  spanDeleteManyImpl = async () => ({ count: 0 });
}

const { TraceService } = await import('@/lib/services/trace-service');

// ─────────────────────────────────────────────────────────────────────────────
// TraceService
// ─────────────────────────────────────────────────────────────────────────────

describe('TraceService', () => {
  beforeEach(() => { resetMock(); });

  describe('startTrace', () => {
    it('creates a trace and returns a traceId', async () => {
      traceCreateImpl = async (args: TraceCreateArgs) => {
        assert.equal(args.data.organizationId, 'org-1');
        assert.equal(args.data.rootSpanName, 'GET /api/users');
        assert.equal(args.data.status, 'ok');
        return { id: 't1', ...args.data };
      };

      const traceId = await TraceService.startTrace('org-1', { rootSpanName: 'GET /api/users' });

      assert.ok(traceId);
      assert.equal(typeof traceId, 'string');
      assert.equal(calls[0].method, 'trace.create');
    });

    it('serializes labels to JSON', async () => {
      traceCreateImpl = async (args: TraceCreateArgs) => {
        assert.ok(args.data.labels.includes('"env"'));
        return { id: 't1' };
      };

      await TraceService.startTrace('org-1', {
        rootSpanName: 'request',
        labels: { env: 'prod', version: '1.0' },
      });
    });
  });

  describe('endTrace', () => {
    it('updates trace with status and duration', async () => {
      traceUpdateImpl = async (args: TraceUpdateArgs) => {
        assert.equal(args.where.traceId, 'trace-1');
        assert.equal(args.data.status, 'ok');
        assert.equal(args.data.durationMs, 150);
        assert.ok(args.data.endedAt);
        return { id: 't1', status: 'ok' };
      };

      const result = await TraceService.endTrace('trace-1', 'ok', 150);
      assert.ok(result);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      traceUpdateImpl = async () => { throw new Error('fail'); };

      const result = await TraceService.endTrace('trace-1', 'ok', 150);
      assert.equal(result, null);
    });
  });

  describe('startSpan', () => {
    it('creates a span and returns a spanId', async () => {
      spanCreateImpl = async (args: SpanCreateArgs) => {
        assert.equal(args.data.traceId, 'trace-1');
        assert.equal(args.data.service, 'api');
        assert.equal(args.data.operation, 'db.query');
        return { id: 'sp1', ...args.data };
      };
      traceUpdateImpl = async () => ({});

      const spanId = await TraceService.startSpan('org-1', {
        traceId: 'trace-1',
        name: 'DB Query',
        service: 'api',
        operation: 'db.query',
      });

      assert.ok(spanId);
      assert.equal(typeof spanId, 'string');
    });

    it('passes parentSpanId when provided', async () => {
      spanCreateImpl = async (args: SpanCreateArgs) => {
        assert.equal(args.data.parentSpanId, 'parent-1');
        return { id: 'sp1' };
      };
      traceUpdateImpl = async () => ({});

      await TraceService.startSpan('org-1', {
        traceId: 'trace-1',
        parentSpanId: 'parent-1',
        name: 'Child Span',
        service: 'api',
        operation: 'http.request',
      });
    });
  });

  describe('endSpan', () => {
    it('updates span with status, duration, and events', async () => {
      spanUpdateImpl = async (args: SpanUpdateArgs) => {
        assert.equal(args.where.spanId, 'span-1');
        assert.equal(args.data.status, 'error');
        assert.equal(args.data.durationMs, 300);
        assert.ok(args.data.events);
        return { id: 'sp1', status: 'error' };
      };

      const result = await TraceService.endSpan('span-1', 'error', 300, [{ name: 'exception', time: Date.now() }]);
      assert.ok(result);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      spanUpdateImpl = async () => { throw new Error('fail'); };

      const result = await TraceService.endSpan('span-1', 'ok', 100);
      assert.equal(result, null);
    });
  });

  describe('getTrace', () => {
    it('returns trace with spans', async () => {
      traceFindUniqueImpl = async () => ({
        id: 't1',
        traceId: 'trace-1',
        rootSpanName: 'GET /api/users',
        status: 'ok',
        durationMs: 150,
      });
      spanFindManyImpl = async () => ([
        { id: 'sp1', spanId: 's1', service: 'api', name: 'HTTP' },
        { id: 'sp2', spanId: 's2', service: 'db', name: 'Query' },
      ]);

      const result = await TraceService.getTrace('trace-1');

      assert.ok(result);
      assert.equal(result.traceId, 'trace-1');
      assert.equal(result.spans.length, 2);
      assert.equal(result.serviceCount, 2);
    });

    it('returns null when trace not found', async () => {
      traceFindUniqueImpl = async () => null;

      const result = await TraceService.getTrace('nope');
      assert.equal(result, null);
    });
  });

  describe('listTraces', () => {
    it('lists traces for an organization', async () => {
      traceFindManyImpl = async () => ([{ id: 't1', traceId: 'tr1' }]);

      const result = await TraceService.listTraces('org-1');

      assert.equal(result.length, 1);
      const args = calls[0].args as TraceFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status filter', async () => {
      traceFindManyImpl = async () => [];

      await TraceService.listTraces('org-1', { status: 'error' });

      const args = calls[0].args as TraceFindManyArgs;
      assert.equal(args.where.status, 'error');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      traceFindManyImpl = async () => { throw new Error('fail'); };

      const result = await TraceService.listTraces('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getTraceStats', () => {
    it('computes total, avg duration, error rate, slow traces', async () => {
      traceFindManyImpl = async () => ([
        { id: 't1', status: 'ok', durationMs: 100 },
        { id: 't2', status: 'ok', durationMs: 200 },
        { id: 't3', status: 'error', durationMs: 2000 },
      ]);

      const stats = await TraceService.getTraceStats('org-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.avgDurationMs, (100 + 200 + 2000) / 3);
      assert.equal(stats.errorCount, 1);
      assert.equal(stats.errorRate, 1 / 3);
      assert.equal(stats.slowTraces, 1); // only t3 > 1000ms
    });

    it('returns zeros when no traces', async () => {
      traceFindManyImpl = async () => [];

      const stats = await TraceService.getTraceStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.avgDurationMs, 0);
      assert.equal(stats.errorRate, 0);
    });
  });

  describe('getServiceMap', () => {
    it('builds a service dependency map from spans', async () => {
      spanFindManyImpl = async () => ([
        { spanId: 's1', parentSpanId: null, service: 'api', status: 'ok', durationMs: 100 },
        { spanId: 's2', parentSpanId: 's1', service: 'db', status: 'ok', durationMs: 50 },
        { spanId: 's3', parentSpanId: 's1', service: 'cache', status: 'error', durationMs: 10 },
      ]);

      const map = await TraceService.getServiceMap('org-1');

      assert.equal(map.length, 3);
      const api = map.find((n) => n.service === 'api');
      assert.ok(api);
      assert.equal(api.spanCount, 1);
      assert.equal(api.errorCount, 0);
      const db = map.find((n) => n.service === 'db');
      assert.ok(db);
      assert.ok(db.dependencies.includes('api'));
      const cache = map.find((n) => n.service === 'cache');
      assert.ok(cache);
      assert.equal(cache.errorCount, 1);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      spanFindManyImpl = async () => { throw new Error('fail'); };

      const map = await TraceService.getServiceMap('org-1');
      assert.deepEqual(map, []);
    });
  });

  describe('deleteOldTraces', () => {
    it('deletes old traces and spans', async () => {
      traceDeleteManyImpl = async (args: TraceDeleteManyArgs) => {
        assert.equal(args.where.organizationId, 'org-1');
        return { count: 5 };
      };
      spanDeleteManyImpl = async () => ({ count: 10 });

      const result = await TraceService.deleteOldTraces('org-1', new Date('2024-01-01'));

      assert.equal(result.count, 5);
      assert.ok(calls.some((c) => c.method === 'trace.deleteMany'));
      assert.ok(calls.some((c) => c.method === 'span.deleteMany'));
    });
  });
});
