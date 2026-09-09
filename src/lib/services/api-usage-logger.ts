import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── API Usage Logger (Phase 12: API Platform) ──
//
// Persists per-request usage logs for org-scoped API keys and provides
// aggregation queries for the Developer Portal dashboard.

export interface UsageLogInput {
  organizationId: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  requestBodySize?: number;
  responseBodySize?: number;
  ipAddress?: string;
  userAgent?: string;
  rateLimited?: boolean;
}

export interface UsageStats {
  totalRequests: number;
  rateLimitedRequests: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
  byMethod: Array<{ method: string; count: number }>;
  byStatusCode: Array<{ statusCode: number; count: number }>;
}

export interface ErrorRatePoint {
  date: string;
  total: number;
  errors: number;
  errorRate: number;
}

export interface SlowRequest {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: Date;
}

function buildWhere(
  organizationId: string,
  opts?: { startDate?: Date; endDate?: Date; apiKeyId?: string },
): Record<string, unknown> {
  const where: Record<string, unknown> = { organizationId };
  if (opts?.apiKeyId) where.apiKeyId = opts.apiKeyId;
  if (opts?.startDate || opts?.endDate) {
    where.timestamp = {} as Record<string, Date>;
    if (opts?.startDate) (where.timestamp as Record<string, Date>).gte = opts.startDate;
    if (opts?.endDate) (where.timestamp as Record<string, Date>).lte = opts.endDate;
  }
  return where;
}

function aggregate(logs: Array<{ endpoint: string; method: string; statusCode: number; responseTimeMs: number; rateLimited: boolean }>): UsageStats {
  const totalRequests = logs.length;
  const rateLimitedRequests = logs.filter((l) => l.rateLimited).length;
  const errorCount = logs.filter((l) => l.statusCode >= 400).length;
  const avgResponseTime = totalRequests > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.responseTimeMs, 0) / totalRequests)
    : 0;

  const endpointMap = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const statusMap = new Map<number, number>();
  for (const l of logs) {
    endpointMap.set(l.endpoint, (endpointMap.get(l.endpoint) || 0) + 1);
    methodMap.set(l.method, (methodMap.get(l.method) || 0) + 1);
    statusMap.set(l.statusCode, (statusMap.get(l.statusCode) || 0) + 1);
  }

  return {
    totalRequests,
    rateLimitedRequests,
    avgResponseTime,
    errorCount,
    errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
    byEndpoint: [...endpointMap.entries()].map(([endpoint, count]) => ({ endpoint, count })),
    byMethod: [...methodMap.entries()].map(([method, count]) => ({ method, count })),
    byStatusCode: [...statusMap.entries()].map(([statusCode, count]) => ({ statusCode, count })),
  };
}

export const ApiUsageLogger = {
  /**
   * Log a single API request. Best-effort — failures are swallowed so they
   * never break the actual API response.
   */
  async log(input: UsageLogInput): Promise<void> {
    await prisma.apiUsageLog.create({
      data: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId || null,
        endpoint: input.endpoint.slice(0, 500),
        method: input.method.slice(0, 10),
        statusCode: input.statusCode,
        responseTimeMs: input.responseTimeMs,
        requestBodySize: input.requestBodySize ?? null,
        responseBodySize: input.responseBodySize ?? null,
        ipAddress: input.ipAddress?.slice(0, 100) || null,
        userAgent: input.userAgent?.slice(0, 500) || null,
        rateLimited: input.rateLimited ?? false,
      },
    }).catch(() => {});
  },

  /**
   * Aggregate usage stats for an organization.
   */
  async getUsageStats(
    organizationId: string,
    opts?: { startDate?: Date; endDate?: Date; apiKeyId?: string },
  ): Promise<UsageStats> {
    const where = buildWhere(organizationId, opts);
    const logs = await safePrisma(() =>
      prisma.apiUsageLog.findMany({
        where: where as never,
        select: {
          endpoint: true,
          method: true,
          statusCode: true,
          responseTimeMs: true,
          rateLimited: true,
        },
      }),
    []);
    return aggregate(logs);
  },

  /**
   * Usage stats for a specific API key.
   */
  async getUsageByApiKey(
    apiKeyId: string,
    opts?: { startDate?: Date; endDate?: Date },
  ): Promise<UsageStats> {
    const logs = await safePrisma(() =>
      prisma.apiUsageLog.findMany({
        where: { apiKeyId, ...(opts?.startDate || opts?.endDate ? { timestamp: {} } : {}) } as never,
        select: {
          endpoint: true,
          method: true,
          statusCode: true,
          responseTimeMs: true,
          rateLimited: true,
        },
      }),
    []);
    return aggregate(logs);
  },

  /**
   * Usage stats for a specific endpoint within an organization.
   */
  async getUsageByEndpoint(
    organizationId: string,
    endpoint: string,
    opts?: { startDate?: Date; endDate?: Date },
  ): Promise<UsageStats> {
    const where = buildWhere(organizationId, opts);
    where.endpoint = endpoint;
    const logs = await safePrisma(() =>
      prisma.apiUsageLog.findMany({
        where: where as never,
        select: {
          endpoint: true,
          method: true,
          statusCode: true,
          responseTimeMs: true,
          rateLimited: true,
        },
      }),
    []);
    return aggregate(logs);
  },

  /**
   * The slowest requests within an organization.
   */
  async getSlowRequests(organizationId: string, limit = 20): Promise<SlowRequest[]> {
    return safePrisma(() =>
      prisma.apiUsageLog.findMany({
        where: { organizationId },
        orderBy: { responseTimeMs: 'desc' },
        take: limit,
        select: {
          id: true,
          endpoint: true,
          method: true,
          statusCode: true,
          responseTimeMs: true,
          timestamp: true,
        },
      }),
    []);
  },

  /**
   * Error rate over time, bucketed by day.
   */
  async getErrorRate(
    organizationId: string,
    opts?: { startDate?: Date; endDate?: Date },
  ): Promise<ErrorRatePoint[]> {
    const where = buildWhere(organizationId, opts);
    const logs = await safePrisma(() =>
      prisma.apiUsageLog.findMany({
        where: where as never,
        select: { statusCode: true, timestamp: true },
      }),
    []);

    const buckets = new Map<string, { total: number; errors: number }>();
    for (const l of logs) {
      const date = new Date(l.timestamp).toISOString().slice(0, 10);
      const bucket = buckets.get(date) || { total: 0, errors: 0 };
      bucket.total += 1;
      if (l.statusCode >= 400) bucket.errors += 1;
      buckets.set(date, bucket);
    }

    return [...buckets.entries()]
      .map(([date, b]) => ({
        date,
        total: b.total,
        errors: b.errors,
        errorRate: b.total > 0 ? b.errors / b.total : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Delete usage logs older than the given date for an organization.
   */
  async deleteOldLogs(organizationId: string, beforeDate: Date): Promise<number> {
    const result = await prisma.apiUsageLog.deleteMany({
      where: { organizationId, timestamp: { lt: beforeDate } },
    }).catch(() => ({ count: 0 }));
    return result.count;
  },
};
