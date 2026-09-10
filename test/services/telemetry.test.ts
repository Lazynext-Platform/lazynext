import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TelemetryCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    metricName: string;
    metricType: string;
    value: number;
    unit: string;
    labels: string;
    traceId: string | null;
    spanId: string | null;
    timestamp: Date;
  };
};

type TelemetryCreateManyArgs = {
  data: Array<Record<string, unknown>>;
};

type TelemetryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  select?: Record<string, unknown>;
  distinct?: string[];
};

type TelemetryDeleteManyArgs = {
  where: { organizationId: string; timestamp: Record<string, unknown> };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let telemetryCreateImpl: (args: TelemetryCreateArgs) => Promise<unknown> = async () => ({});
let telemetryCreateManyImpl: (args: TelemetryCreateManyArgs) => Promise<unknown> = async () => ({ count: 0 });
let telemetryFindManyImpl: (args: TelemetryFindManyArgs) => Promise<unknown[]> = async () => [];
let telemetryDeleteManyImpl: (args: TelemetryDeleteManyArgs) => Promise<unknown> = async () => ({ count: 0 });

const prismaMock = {
  telemetryPoint: {
    create: (args: TelemetryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'telemetryPoint.create', args });
      return telemetryCreateImpl(args);
    },
    createMany: (args: TelemetryCreateManyArgs): Promise<unknown> => {
      calls.push({ method: 'telemetryPoint.createMany', args });
      return telemetryCreateManyImpl(args);
    },
    findMany: (args: TelemetryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'telemetryPoint.findMany', args });
      return telemetryFindManyImpl(args);
    },
    deleteMany: (args: TelemetryDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'telemetryPoint.deleteMany', args });
      return telemetryDeleteManyImpl(args);
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
  telemetryCreateImpl = async () => ({});
  telemetryCreateManyImpl = async () => ({ count: 0 });
  telemetryFindManyImpl = async () => [];
  telemetryDeleteManyImpl = async () => ({ count: 0 });
}

const { TelemetryService } = await import('@/lib/services/telemetry');

// ─────────────────────────────────────────────────────────────────────────────
// TelemetryService
// ─────────────────────────────────────────────────────────────────────────────

describe('TelemetryService', () => {
  beforeEach(() => { resetMock(); });

  describe('recordPoint', () => {
    it('creates a telemetry point with defaults', async () => {
      telemetryCreateImpl = async (args: TelemetryCreateArgs) => {
        assert.equal(args.data.metricType, 'gauge');
        assert.equal(args.data.unit, 'ms');
        assert.equal(args.data.labels, '{}');
        return { id: 'tp1', ...args.data };
      };

      const result = await TelemetryService.recordPoint('org-1', {
        metricName: 'api.response_time',
        value: 42,
      });

      assert.ok(result);
      assert.equal(result.id, 'tp1');
      assert.equal(calls[0].method, 'telemetryPoint.create');
    });

    it('passes through optional fields', async () => {
      telemetryCreateImpl = async (args: TelemetryCreateArgs) => {
        assert.equal(args.data.metricType, 'counter');
        assert.equal(args.data.unit, 'count');
        assert.equal(args.data.traceId, 'trace-1');
        assert.equal(args.data.spanId, 'span-1');
        assert.equal(args.data.workspaceId, 'ws-1');
        return { id: 'tp1', ...args.data };
      };

      await TelemetryService.recordPoint('org-1', {
        workspaceId: 'ws-1',
        metricName: 'api.requests',
        metricType: 'counter',
        value: 100,
        unit: 'count',
        traceId: 'trace-1',
        spanId: 'span-1',
      });
    });

    it('serializes labels to JSON', async () => {
      telemetryCreateImpl = async (args: TelemetryCreateArgs) => {
        assert.ok(args.data.labels.includes('"route"'));
        return { id: 'tp1' };
      };

      await TelemetryService.recordPoint('org-1', {
        metricName: 'api.response_time',
        value: 42,
        labels: { route: '/api/users', method: 'GET' },
      });
    });
  });

  describe('recordPoints', () => {
    it('batch records multiple points', async () => {
      telemetryCreateManyImpl = async (args: TelemetryCreateManyArgs) => {
        assert.equal(args.data.length, 3);
        return { count: 3 };
      };

      const result = await TelemetryService.recordPoints('org-1', [
        { metricName: 'a', value: 1 },
        { metricName: 'b', value: 2 },
        { metricName: 'c', value: 3 },
      ]);

      assert.equal(result.count, 3);
      assert.equal(calls[0].method, 'telemetryPoint.createMany');
    });
  });

  describe('queryPoints', () => {
    it('queries points with metricName filter', async () => {
      telemetryFindManyImpl = async () => ([{ id: 'tp1', value: 10 }]);

      const result = await TelemetryService.queryPoints('org-1', { metricName: 'api.response_time' });

      assert.equal(result.length, 1);
      const args = calls[0].args as TelemetryFindManyArgs;
      assert.equal(args.where.metricName, 'api.response_time');
    });

    it('applies time range filters', async () => {
      telemetryFindManyImpl = async () => [];

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      await TelemetryService.queryPoints('org-1', { startTime: start, endTime: end });

      const args = calls[0].args as TelemetryFindManyArgs;
      const ts = args.where.timestamp as Record<string, unknown>;
      assert.equal(ts.gte, start);
      assert.equal(ts.lte, end);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      telemetryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await TelemetryService.queryPoints('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('aggregatePoints', () => {
    it('computes count, min, max, avg, sum, percentiles', async () => {
      telemetryFindManyImpl = async () => {
        const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        return values.map((v, i) => ({ value: v, timestamp: new Date(2024, 0, 1, 0, i) }));
      };

      const agg = await TelemetryService.aggregatePoints('org-1', 'api.response_time');

      assert.equal(agg.count, 10);
      assert.equal(agg.min, 10);
      assert.equal(agg.max, 100);
      assert.equal(agg.sum, 550);
      assert.equal(agg.avg, 55);
      assert.equal(agg.lastValue, 100);
      // p50 should be around 55
      assert.ok(agg.p50 >= 50 && agg.p50 <= 60);
      // p99 should be near 100
      assert.ok(agg.p99 >= 90 && agg.p99 <= 100);
    });

    it('returns zeros when no data', async () => {
      telemetryFindManyImpl = async () => [];

      const agg = await TelemetryService.aggregatePoints('org-1', 'api.response_time');

      assert.equal(agg.count, 0);
      assert.equal(agg.min, 0);
      assert.equal(agg.max, 0);
      assert.equal(agg.avg, 0);
      assert.equal(agg.p99, 0);
    });

    it('returns zeros on error (safePrisma fallback)', async () => {
      telemetryFindManyImpl = async () => { throw new Error('fail'); };

      const agg = await TelemetryService.aggregatePoints('org-1', 'api.response_time');
      assert.equal(agg.count, 0);
    });
  });

  describe('getTimeSeries', () => {
    it('returns time-series buckets grouped by interval', async () => {
      const baseTime = new Date('2024-01-01T00:00:00Z');
      telemetryFindManyImpl = async () => [
        { value: 10, timestamp: baseTime },
        { value: 20, timestamp: baseTime },
        { value: 30, timestamp: new Date('2024-01-01T00:05:00Z') },
      ];

      const series = await TelemetryService.getTimeSeries('org-1', 'api.response_time', {
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T01:00:00Z'),
        interval: '5m',
      });

      assert.equal(series.length, 2);
      assert.equal(series[0].count, 2);
      assert.equal(series[0].avg, 15);
      assert.equal(series[1].count, 1);
      assert.equal(series[1].avg, 30);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      telemetryFindManyImpl = async () => { throw new Error('fail'); };

      const series = await TelemetryService.getTimeSeries('org-1', 'api.response_time', {
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T01:00:00Z'),
        interval: '1h',
      });
      assert.deepEqual(series, []);
    });
  });

  describe('deleteOldPoints', () => {
    it('deletes points older than beforeDate', async () => {
      telemetryDeleteManyImpl = async (args: TelemetryDeleteManyArgs) => {
        assert.equal(args.where.organizationId, 'org-1');
        const ts = args.where.timestamp as Record<string, unknown>;
        assert.ok(ts.lt);
        return { count: 5 };
      };

      const result = await TelemetryService.deleteOldPoints('org-1', new Date('2024-01-01'));
      assert.equal(result.count, 5);
      assert.equal(calls[0].method, 'telemetryPoint.deleteMany');
    });

    it('returns count 0 on error (safePrisma fallback)', async () => {
      telemetryDeleteManyImpl = async () => { throw new Error('fail'); };

      const result = await TelemetryService.deleteOldPoints('org-1', new Date('2024-01-01'));
      assert.equal(result.count, 0);
    });
  });

  describe('getMetricNames', () => {
    it('returns distinct metric names', async () => {
      telemetryFindManyImpl = async () => ([
        { metricName: 'api.response_time' },
        { metricName: 'db.query_duration' },
      ]);

      const names = await TelemetryService.getMetricNames('org-1');

      assert.equal(names.length, 2);
      assert.ok(names.includes('api.response_time'));
      assert.ok(names.includes('db.query_duration'));
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      telemetryFindManyImpl = async () => { throw new Error('fail'); };

      const names = await TelemetryService.getMetricNames('org-1');
      assert.deepEqual(names, []);
    });
  });
});
