import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { cache } from '@/lib/cache';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

export interface QueryStats {
  connected: boolean;
  modelCount: number;
  models: string[];
  checkedAt: string;
}

export interface IndexInfo {
  fields: string[];
  unique: boolean;
}

export interface ModelIndexInfo {
  model: string;
  indexes: IndexInfo[];
  foreignKeys: string[];
  missingIndexFks: string[];
}

export interface IndexReport {
  modelsWithIndexes: ModelIndexInfo[];
  modelsWithoutIndexes: string[];
  modelsNeedingIndexes: ModelIndexInfo[];
  totalModels: number;
  totalIndexes: number;
  generatedAt: string;
}

export interface ApiHealthResult {
  endpoint: string;
  status: number;
  responseTimeMs: number;
  ok: boolean;
  error?: string;
}

export interface ApiHealthSummary {
  endpoints: ApiHealthResult[];
  allHealthy: boolean;
  checkedAt: string;
}

export interface CacheStats {
  active: boolean;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface QueryMetricInput {
  workspaceId?: string;
  queryName: string;
  durationMs: number;
  rowCount?: number;
  model?: string;
  operation?: string;
}

export interface SlowQueryRecord {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  timestamp: Date;
  dimensions: Record<string, unknown>;
}

export interface PerformanceRecommendation {
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
}

export interface PerformanceDashboard {
  indexReport: IndexReport;
  apiHealth: ApiHealthSummary;
  slowQueries: SlowQueryRecord[];
  cacheStats: CacheStats;
  recommendations: PerformanceRecommendation[];
  generatedAt: string;
}

// ── Helpers ──

/**
 * Parse the Prisma schema file and extract per-model index and foreign-key info.
 */
function parseSchemaIndexes(schemaPath: string): {
  models: ModelIndexInfo[];
} {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models: ModelIndexInfo[] = [];

  // Split into model blocks
  const modelRegex = /^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];

    const indexes: IndexInfo[] = [];
    const foreignKeys: string[] = [];

    // Match @@index([field1, field2]) or @@unique([...])
    const indexRegex = /@@index\(\[([^\]]+)\]\)/g;
    let idxMatch: RegExpExecArray | null;
    while ((idxMatch = indexRegex.exec(body)) !== null) {
      const fields = idxMatch[1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      indexes.push({ fields, unique: false });
    }

    const uniqueRegex = /@@unique\(\[([^\]]+)\]\)/g;
    let uniqMatch: RegExpExecArray | null;
    while ((uniqMatch = uniqueRegex.exec(body)) !== null) {
      const fields = uniqMatch[1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      indexes.push({ fields, unique: true });
    }

    // Match relation lines: `user User @relation(fields: [userId], references: [id])`
    const relationRegex =
      /\w+\s+\w+\s+@relation\(\s*fields:\s*\[([^\]]+)\]/g;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relationRegex.exec(body)) !== null) {
      const fkFields = relMatch[1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      foreignKeys.push(...fkFields);
    }

    // Determine which FKs are missing an index.
    // A FK is considered indexed if any @@index or @@unique covers it
    // (single-field or as the first field of a composite index).
    const indexedFields = new Set<string>();
    for (const idx of indexes) {
      for (const f of idx.fields) {
        indexedFields.add(f);
      }
    }
    const missingIndexFks = foreignKeys.filter((fk) => !indexedFields.has(fk));

    models.push({ model: modelName, indexes, foreignKeys, missingIndexFks });
  }

  return { models };
}

// ── Performance Service ──

export const PerformanceService = {
  /**
   * Return diagnostic info about the Prisma client and database connection.
   */
  async getQueryStats(): Promise<QueryStats> {
    const modelNames = Object.keys(prisma as unknown as Record<string, unknown>).filter(
      (k) => !k.startsWith('_') && typeof (prisma as unknown as Record<string, unknown>)[k] === 'object',
    );
    let connected = false;
    try {
      // A lightweight probe — count users. If this throws, the DB is down.
      await prisma.user.count();
      connected = true;
    } catch {
      connected = false;
    }
    return {
      connected,
      modelCount: modelNames.length,
      models: modelNames,
      checkedAt: new Date().toISOString(),
    };
  },

  /**
   * Read the Prisma schema and return a report of all indexes across all models.
   * Groups by: models with indexes, models without indexes, and models that
   * likely need indexes (have foreign keys but no index on them).
   */
  async getIndexReport(): Promise<IndexReport> {
    const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
    const { models } = parseSchemaIndexes(schemaPath);

    const modelsWithIndexes = models.filter(
      (m) => m.indexes.length > 0 && m.missingIndexFks.length === 0,
    );
    const modelsWithoutIndexes = models
      .filter((m) => m.indexes.length === 0 && m.foreignKeys.length === 0)
      .map((m) => m.model);
    const modelsNeedingIndexes = models.filter((m) => m.missingIndexFks.length > 0);

    const totalIndexes = models.reduce((sum, m) => sum + m.indexes.length, 0);

    return {
      modelsWithIndexes,
      modelsWithoutIndexes,
      modelsNeedingIndexes,
      totalModels: models.length,
      totalIndexes,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Check the health of key API endpoints by making internal fetch calls.
   */
  async getApiHealth(baseUrl?: string): Promise<ApiHealthSummary> {
    const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3100';
    const endpoints = [
      '/api/health',
      '/api/observability/metrics',
      '/api/analytics/dashboard',
    ];

    const results = await Promise.all(
      endpoints.map(async (endpoint): Promise<ApiHealthResult> => {
        const start = Date.now();
        try {
          const res = await fetch(`${base}${endpoint}`, {
            signal: AbortSignal.timeout(5000),
          });
          const responseTimeMs = Date.now() - start;
          return {
            endpoint,
            status: res.status,
            responseTimeMs,
            ok: res.ok,
          };
        } catch (e) {
          const responseTimeMs = Date.now() - start;
          return {
            endpoint,
            status: 0,
            responseTimeMs,
            ok: false,
            error: e instanceof Error ? e.message : 'fetch_failed',
          };
        }
      }),
    );

    return {
      endpoints: results,
      allHealthy: results.every((r) => r.ok),
      checkedAt: new Date().toISOString(),
    };
  },

  /**
   * Return cache statistics. For now, reports the in-memory cache state.
   */
  async getCacheStats(): Promise<CacheStats> {
    const stats = cache.getStats();
    return {
      active: true,
      size: stats.size,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hitRate,
    };
  },

  /**
   * Record a query performance metric using the existing Metric model.
   */
  async recordQueryMetric(
    organizationId: string,
    input: QueryMetricInput,
  ) {
    return prisma.metric.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: `query.${input.queryName}`.slice(0, 200),
        value: input.durationMs,
        unit: 'ms',
        dimensions: JSON.stringify({
          rowCount: input.rowCount ?? null,
          model: input.model ?? null,
          operation: input.operation ?? null,
        }),
        timestamp: new Date(),
      },
    });
  },

  /**
   * Get the slowest recorded queries from the Metric model.
   */
  async getSlowQueries(
    organizationId: string,
    limit: number = 20,
  ): Promise<SlowQueryRecord[]> {
    const metrics = await safePrisma(() =>
      prisma.metric.findMany({
        where: {
          organizationId,
          name: { startsWith: 'query.' },
          unit: 'ms',
        },
        orderBy: { value: 'desc' },
        take: limit,
      }),
    [] as unknown as Array<{ id: string; name: string; value: number; unit: string | null; dimensions: string; timestamp: Date }>);

    return metrics.map((m) => {
      let dimensions: Record<string, unknown> = {};
      try {
        dimensions = JSON.parse(m.dimensions || '{}');
      } catch {
        dimensions = {};
      }
      return {
        id: m.id,
        name: m.name,
        value: m.value,
        unit: m.unit,
        timestamp: m.timestamp,
        dimensions,
      };
    });
  },

  /**
   * Combined performance dashboard: index report summary, API health,
   * slow queries, cache stats, and recommendations.
   */
  async getPerformanceDashboard(
    organizationId: string,
  ): Promise<PerformanceDashboard> {
    const [indexReport, apiHealth, slowQueries, cacheStats] = await Promise.all([
      this.getIndexReport(),
      this.getApiHealth(),
      this.getSlowQueries(organizationId, 10),
      this.getCacheStats(),
    ]);

    // Build recommendations
    const recommendations: PerformanceRecommendation[] = [];

    if (indexReport.modelsNeedingIndexes.length > 0) {
      recommendations.push({
        severity: 'high',
        category: 'database',
        title: 'Add missing foreign-key indexes',
        description: `${indexReport.modelsNeedingIndexes.length} model(s) have foreign keys without a corresponding @@index. See the index audit report for details.`,
      });
    }

    const unhealthy = apiHealth.endpoints.filter((e) => !e.ok);
    if (unhealthy.length > 0) {
      recommendations.push({
        severity: 'medium',
        category: 'api',
        title: 'Unhealthy API endpoints detected',
        description: `${unhealthy.length} endpoint(s) returned non-OK responses: ${unhealthy.map((u) => u.endpoint).join(', ')}`,
      });
    }

    const slowApis = apiHealth.endpoints.filter((e) => e.responseTimeMs > 1000);
    if (slowApis.length > 0) {
      recommendations.push({
        severity: 'medium',
        category: 'api',
        title: 'Slow API responses',
        description: `${slowApis.length} endpoint(s) took over 1000ms: ${slowApis.map((s) => s.endpoint).join(', ')}`,
      });
    }

    if (slowQueries.length > 0 && slowQueries[0].value > 2000) {
      recommendations.push({
        severity: 'high',
        category: 'database',
        title: 'Slow database queries detected',
        description: `Slowest query took ${slowQueries[0].value}ms (${slowQueries[0].name}). Consider optimizing or adding indexes.`,
      });
    }

    if (cacheStats.hitRate < 0.5 && cacheStats.hits + cacheStats.misses > 5) {
      recommendations.push({
        severity: 'low',
        category: 'caching',
        title: 'Low cache hit rate',
        description: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%. Consider caching more frequently-accessed data.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        severity: 'low',
        category: 'general',
        title: 'Performance looks healthy',
        description: 'No critical performance issues detected at this time.',
      });
    }

    return {
      indexReport,
      apiHealth,
      slowQueries,
      cacheStats,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  },
};
