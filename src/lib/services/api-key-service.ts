import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── API Key Service (Phase 12: API Platform) ──
//
// Org-scoped API keys for the Developer Portal. Keys are generated with a
// `lnxt_` prefix, hashed with SHA-256, and only ever returned as plaintext
// once at creation time. Backed by the PlatformApiKey model (renamed from
// ApiKey to avoid collision with the existing user-scoped v1 API key model).

const KEY_PREFIX = 'lnxt_';

export interface ApiKeyCreateInput {
  name: string;
  description?: string;
  workspaceId?: string;
  scopes?: string[];
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
  expiresAt?: Date;
  createdBy: string;
}

export interface ApiKeyUpdateInput {
  name?: string;
  description?: string;
  scopes?: string[];
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  rateLimitedRequests: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
  byMethod: Array<{ method: string; count: number }>;
  byStatusCode: Array<{ statusCode: number; count: number }>;
}

export interface ApiKeyRateLimitStatus {
  remainingMin: number;
  remainingDay: number;
  resetAt: number;
}

/** Generate a random API key: `lnxt_` + 32 random hex chars. */
export function generatePlatformKey(): string {
  return KEY_PREFIX + crypto.randomBytes(16).toString('hex');
}

/** Hash a full key using SHA-256. */
export function hashPlatformKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const ApiKeyService = {
  /**
   * Create a new API key. Returns the persisted record and the plaintext key
   * (which is only returned once at creation time).
   */
  async create(organizationId: string, input: ApiKeyCreateInput) {
    const plaintextKey = generatePlatformKey();
    const keyHash = hashPlatformKey(plaintextKey);
    const keyPrefix = plaintextKey.slice(0, 12);

    const apiKey = await prisma.platformApiKey.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 200),
        description: input.description?.slice(0, 2000) || '',
        keyPrefix,
        keyHash,
        scopes: JSON.stringify(input.scopes || ['read']),
        rateLimitPerMin: input.rateLimitPerMin ?? 60,
        rateLimitPerDay: input.rateLimitPerDay ?? 10000,
        expiresAt: input.expiresAt || null,
        createdBy: input.createdBy,
      },
    });

    return { apiKey, plaintextKey };
  },

  /**
   * List API keys for an organization (without the full key — only the prefix).
   */
  async list(organizationId: string) {
    return safePrisma(() =>
      prisma.platformApiKey.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
    []);
  },

  /**
   * Get a single API key record by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.platformApiKey.findUnique({ where: { id } }),
    null);
  },

  /**
   * Verify an API key by its plaintext value. Returns the key record if valid
   * (not revoked, not expired), otherwise null. Updates lastUsedAt.
   */
  async verify(plaintextKey: string) {
    if (!plaintextKey || !plaintextKey.startsWith(KEY_PREFIX)) return null;

    const keyHash = hashPlatformKey(plaintextKey);
    const apiKey = await safePrisma(() =>
      prisma.platformApiKey.findUnique({ where: { keyHash } }),
    null);

    if (!apiKey) return null;
    if (apiKey.revokedAt) return null;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) return null;

    // Update last used (best-effort)
    await prisma.platformApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return apiKey;
  },

  /**
   * Revoke an API key. Once revoked it can no longer be used to authenticate.
   */
  async revoke(id: string, revokedBy: string) {
    return prisma.platformApiKey.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy },
    });
  },

  /**
   * Update an API key's mutable fields (name, description, scopes, rate limits).
   */
  async update(id: string, input: ApiKeyUpdateInput) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.description !== undefined) data.description = input.description.slice(0, 2000);
    if (input.scopes !== undefined) data.scopes = JSON.stringify(input.scopes);
    if (input.rateLimitPerMin !== undefined) data.rateLimitPerMin = input.rateLimitPerMin;
    if (input.rateLimitPerDay !== undefined) data.rateLimitPerDay = input.rateLimitPerDay;

    return prisma.platformApiKey.update({ where: { id }, data });
  },

  /**
   * Permanently delete an API key.
   */
  async delete(id: string) {
    return prisma.platformApiKey.delete({ where: { id } });
  },

  /**
   * Usage stats for a specific API key.
   */
  async getUsageStats(
    apiKeyId: string,
    opts?: { startDate?: Date; endDate?: Date },
  ): Promise<ApiKeyUsageStats> {
    const where: Record<string, unknown> = { apiKeyId };
    if (opts?.startDate || opts?.endDate) {
      where.timestamp = {} as Record<string, Date>;
      if (opts?.startDate) (where.timestamp as Record<string, Date>).gte = opts.startDate;
      if (opts?.endDate) (where.timestamp as Record<string, Date>).lte = opts.endDate;
    }

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
  },

  /**
   * Get the current rate-limit status for a key. Delegates to the RateLimiter
   * but is exposed here for convenience. Returns remaining counts and reset time.
   */
  async getRateLimitStatus(apiKeyId: string): Promise<ApiKeyRateLimitStatus> {
    // Defer import to avoid circular dependency at module load time.
    const { RateLimiter } = await import('@/lib/services/rate-limiter');
    const key = await safePrisma(() =>
      prisma.platformApiKey.findUnique({ where: { id: apiKeyId } }),
    null);
    if (!key) {
      return { remainingMin: 0, remainingDay: 0, resetAt: Date.now() };
    }
    const status = RateLimiter.getStatus(apiKeyId);
    return {
      remainingMin: Math.max(0, key.rateLimitPerMin - status.countMin),
      remainingDay: Math.max(0, key.rateLimitPerDay - status.countDay),
      resetAt: status.resetAt,
    };
  },
};
