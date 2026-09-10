import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface TelemetryPointInput {
  workspaceId?: string;
  metricName: string;
  metricType?: string; // gauge | counter | histogram | summary
  value: number;
  unit?: string; // ms | bytes | count | percent | ratio
  labels?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  timestamp?: Date;
}

export interface QueryPointsOptions {
  workspaceId?: string;
  metricName?: string;
  startTime?: Date;
  endTime?: Date;
  labels?: Record<string, unknown>;
  limit?: number;
  orderBy?: 'asc' | 'desc';
}

export interface AggregateOptions {
  startTime?: Date;
  endTime?: Date;
  interval?: string; // for compatibility; not used in flat aggregate
}

export interface AggregateResult {
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  p50: number;
  p90: number;
  p99: number;
  lastValue: number;
}

export interface TimeSeriesOptions {
  startTime: Date;
  endTime: Date;
  interval: '1m' | '5m' | '1h' | '1d';
}

export interface TimeSeriesBucket {
  timestamp: string; // ISO string of bucket start
  avg: number;
  min: number;
  max: number;
  count: number;
}

// ── Helpers ──

/**
 * Compute a percentile value from a sorted array of numbers.
 * Uses nearest-rank interpolation.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Truncate a Date to the start of the given interval bucket.
 */
function truncateToInterval(date: Date, interval: TimeSeriesOptions['interval']): Date {
  const d = new Date(date);
  if (interval === '1m') {
    d.setSeconds(0, 0);
  } else if (interval === '5m') {
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
  } else if (interval === '1h') {
    d.setMinutes(0, 0, 0);
  } else if (interval === '1d') {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

// ── Telemetry Service ──

export const TelemetryService = {
  /**
   * Record a single telemetry data point.
   */
  async recordPoint(organizationId: string, input: TelemetryPointInput) {
    return prisma.telemetryPoint.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        metricName: input.metricName.slice(0, 200),
        metricType: input.metricType || 'gauge',
        value: input.value,
        unit: input.unit || 'ms',
        labels: JSON.stringify(input.labels || {}),
        traceId: input.traceId || null,
        spanId: input.spanId || null,
        timestamp: input.timestamp || new Date(),
      },
    });
  },

  /**
   * Batch record multiple telemetry data points.
   */
  async recordPoints(organizationId: string, points: TelemetryPointInput[]) {
    const data = points.map((p) => ({
      organizationId,
      workspaceId: p.workspaceId || null,
      metricName: p.metricName.slice(0, 200),
      metricType: p.metricType || 'gauge',
      value: p.value,
      unit: p.unit || 'ms',
      labels: JSON.stringify(p.labels || {}),
      traceId: p.traceId || null,
      spanId: p.spanId || null,
      timestamp: p.timestamp || new Date(),
    }));
    return prisma.telemetryPoint.createMany({ data });
  },

  /**
   * Query telemetry points with optional filters.
   */
  async queryPoints(organizationId: string, opts?: QueryPointsOptions) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.metricName) where.metricName = opts.metricName;
    if (opts?.startTime || opts?.endTime) {
      where.timestamp = {};
      if (opts?.startTime) (where.timestamp as Record<string, unknown>).gte = opts.startTime;
      if (opts?.endTime) (where.timestamp as Record<string, unknown>).lte = opts.endTime;
    }
    if (opts?.labels) {
      where.labels = { contains: JSON.stringify(opts.labels).slice(0, -2) };
    }

    return safePrisma(() =>
      prisma.telemetryPoint.findMany({
        where: where as never,
        orderBy: { timestamp: opts?.orderBy === 'asc' ? 'asc' : 'desc' },
        take: opts?.limit ?? 200,
      }),
    []);
  },

  /**
   * Aggregate telemetry for a metric over a time window.
   * Returns count, min, max, avg, sum, p50, p90, p99, lastValue.
   */
  async aggregatePoints(
    organizationId: string,
    metricName: string,
    opts?: AggregateOptions,
  ): Promise<AggregateResult> {
    const startTime = opts?.startTime ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = opts?.endTime ?? new Date();

    const points = await safePrisma(() =>
      prisma.telemetryPoint.findMany({
        where: {
          organizationId,
          metricName,
          timestamp: { gte: startTime, lte: endTime },
        },
        orderBy: { timestamp: 'asc' },
        take: 10000,
        select: { value: true, timestamp: true },
      }),
    []);

    if (points.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        sum: 0,
        p50: 0,
        p90: 0,
        p99: 0,
        lastValue: 0,
      };
    }

    const values = points.map((p) => p.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const lastValue = points[points.length - 1].value;

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      sum,
      p50: percentile(values, 50),
      p90: percentile(values, 90),
      p99: percentile(values, 99),
      lastValue,
    };
  },

  /**
   * Return time-series buckets for a metric over a time range.
   * Interval: '1m', '5m', '1h', '1d'.
   */
  async getTimeSeries(
    organizationId: string,
    metricName: string,
    opts: TimeSeriesOptions,
  ): Promise<TimeSeriesBucket[]> {
    const points = await safePrisma(() =>
      prisma.telemetryPoint.findMany({
        where: {
          organizationId,
          metricName,
          timestamp: { gte: opts.startTime, lte: opts.endTime },
        },
        orderBy: { timestamp: 'asc' },
        take: 20000,
        select: { value: true, timestamp: true },
      }),
    []);

    const buckets: Record<string, number[]> = {};
    for (const p of points) {
      const bucketStart = truncateToInterval(p.timestamp, opts.interval);
      const key = bucketStart.toISOString();
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(p.value);
    }

    return Object.entries(buckets)
      .map(([key, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, v) => acc + v, 0);
        return {
          timestamp: key,
          avg: sum / sorted.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          count: sorted.length,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  /**
   * Delete telemetry points older than the given date (retention cleanup).
   */
  async deleteOldPoints(organizationId: string, beforeDate: Date) {
    return safePrisma(() =>
      prisma.telemetryPoint.deleteMany({
        where: {
          organizationId,
          timestamp: { lt: beforeDate },
        },
      }),
    { count: 0 });
  },

  /**
   * Get distinct metric names for an organization.
   */
  async getMetricNames(organizationId: string): Promise<string[]> {
    const points = await safePrisma(() =>
      prisma.telemetryPoint.findMany({
        where: { organizationId },
        distinct: ['metricName'],
        select: { metricName: true },
        take: 500,
      }),
    []);
    return points.map((p) => p.metricName);
  },
};
