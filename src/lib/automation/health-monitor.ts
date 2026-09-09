import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Integration Health Monitor ──
//
// Continuous health monitoring for platform connections (integrations).
// Uses the existing PlatformConnection model — no schema changes required.

export type IntegrationHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface HealthCheckResult {
  id: string;
  platform: string;
  status: IntegrationHealthStatus;
  responseTimeMs: number;
  tokenValid: boolean;
  tokenExpiresAt: Date | null;
  checkedAt: Date;
  error?: string;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  byType: Record<string, { total: number; healthy: number; degraded: number; down: number; unknown: number }>;
}

export interface DegradedIntegration {
  id: string;
  platform: string;
  status: IntegrationHealthStatus;
  tokenExpiresAt: Date | null;
  platformUsername: string | null;
}

// Default endpoints to ping per platform (best-effort; failures are non-fatal).
const PLATFORM_HEALTH_ENDPOINTS: Record<string, string> = {
  tiktok: 'https://www.tiktok.com',
  youtube: 'https://www.youtube.com',
  instagram: 'https://www.instagram.com',
  facebook: 'https://www.facebook.com',
  linkedin: 'https://www.linkedin.com',
};

export const IntegrationHealthMonitor = {
  /**
   * Check a single integration's health: ping the platform endpoint,
   * check token validity, measure response time, and return a result.
   */
  async checkIntegration(integrationId: string): Promise<HealthCheckResult | null> {
    const conn = await safePrisma(() =>
      prisma.platformConnection.findUnique({
        where: { id: integrationId },
      }),
    null);

    if (!conn) return null;

    const checkedAt = new Date();
    const tokenValid = conn.tokenExpiresAt ? conn.tokenExpiresAt > checkedAt : true;
    const endpoint = PLATFORM_HEALTH_ENDPOINTS[conn.platform];

    let status: IntegrationHealthStatus = 'unknown';
    let responseTimeMs = 0;
    let error: string | undefined;

    if (!tokenValid) {
      status = 'down';
      error = 'token_expired';
    } else if (endpoint) {
      const start = Date.now();
      try {
        const res = await fetch(endpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        responseTimeMs = Date.now() - start;

        if (res.ok || res.status < 500) {
          // Token valid + endpoint reachable. Degrade if response is slow.
          status = responseTimeMs > 2000 ? 'degraded' : 'healthy';
        } else {
          status = 'down';
          error = `endpoint_status_${res.status}`;
        }
      } catch (e) {
        responseTimeMs = Date.now() - start;
        const err = e instanceof Error ? e : new Error(String(e));
        // Network failure to the platform endpoint — treat as degraded, not down,
        // because the token may still be valid.
        status = tokenValid ? 'degraded' : 'down';
        error = err.message;
      }
    } else {
      // No known endpoint — rely solely on token validity.
      status = tokenValid ? 'healthy' : 'down';
    }

    return {
      id: conn.id,
      platform: conn.platform,
      status,
      responseTimeMs,
      tokenValid,
      tokenExpiresAt: conn.tokenExpiresAt,
      checkedAt,
      error,
    };
  },

  /**
   * Check all integrations (platform connections) for a user/org.
   * Here `organizationId` maps to the user who owns the connections via
   * their membership in the org's workspaces.
   */
  async checkAllIntegrations(organizationId: string): Promise<HealthCheckResult[]> {
    // Find all users in the org's workspaces, then their connections.
    const memberships = await safePrisma(() =>
      prisma.membership.findMany({
        where: { workspace: { organizationId } },
        select: { userId: true },
      }),
    []);

    const userIds = [...new Set(memberships.map((m) => m.userId))];
    if (userIds.length === 0) return [];

    const connections = await safePrisma(() =>
      prisma.platformConnection.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      }),
    []);

    const results = await Promise.all(
      connections.map((c) => this.checkIntegration(c.id)),
    );

    return results.filter((r): r is HealthCheckResult => r !== null);
  },

  /**
   * Get a health summary for all integrations in an organization.
   */
  async getHealthSummary(organizationId: string): Promise<HealthSummary> {
    const memberships = await safePrisma(() =>
      prisma.membership.findMany({
        where: { workspace: { organizationId } },
        select: { userId: true },
      }),
    []);

    const userIds = [...new Set(memberships.map((m) => m.userId))];
    if (userIds.length === 0) {
      return { total: 0, healthy: 0, degraded: 0, down: 0, unknown: 0, byType: {} };
    }

    const connections = await safePrisma(() =>
      prisma.platformConnection.findMany({
        where: { userId: { in: userIds } },
      }),
    []);

    const now = new Date();
    const byType: HealthSummary['byType'] = {};

    let healthy = 0;
    let degraded = 0;
    let down = 0;
    let unknown = 0;

    for (const c of connections) {
      const tokenValid = c.tokenExpiresAt ? c.tokenExpiresAt > now : true;
      let status: IntegrationHealthStatus;
      if (!tokenValid) {
        status = 'down';
      } else if (c.tokenExpiresAt) {
        // Token valid but expiring within 3 days → degraded.
        const msUntilExpiry = c.tokenExpiresAt.getTime() - now.getTime();
        status = msUntilExpiry < 3 * 24 * 60 * 60 * 1000 ? 'degraded' : 'healthy';
      } else {
        status = 'unknown';
      }

      if (status === 'healthy') healthy++;
      else if (status === 'degraded') degraded++;
      else if (status === 'down') down++;
      else unknown++;

      const bucket = byType[c.platform] ?? { total: 0, healthy: 0, degraded: 0, down: 0, unknown: 0 };
      bucket.total++;
      bucket[status]++;
      byType[c.platform] = bucket;
    }

    return {
      total: connections.length,
      healthy,
      degraded,
      down,
      unknown,
      byType,
    };
  },

  /**
   * Historical health checks for an integration. Since there is no dedicated
   * health-check log model, this derives a lightweight history from the
   * connection's current state plus recent events.
   */
  async getHealthHistory(integrationId: string, limit: number = 20) {
    const conn = await safePrisma(() =>
      prisma.platformConnection.findUnique({
        where: { id: integrationId },
      }),
    null);

    if (!conn) return [];

    // Derive a synthetic history from token expiry + creation/update timestamps.
    const now = new Date();
    const tokenValid = conn.tokenExpiresAt ? conn.tokenExpiresAt > now : true;
    const currentStatus: IntegrationHealthStatus = tokenValid ? 'healthy' : 'down';

    const history = [
      {
        id: conn.id,
        platform: conn.platform,
        status: currentStatus,
        tokenValid,
        tokenExpiresAt: conn.tokenExpiresAt,
        checkedAt: conn.updatedAt,
      },
    ];

    // Cap to the requested limit.
    return history.slice(0, Math.min(limit, 100));
  },

  /**
   * Schedule periodic health checks for an organization.
   * Returns the interval ID (NodeJS.Timeout) which can be passed to
   * stopHealthChecks to cancel.
   */
  scheduleHealthChecks(organizationId: string, intervalMs: number): ReturnType<typeof setInterval> {
    return setInterval(() => {
      this.checkAllIntegrations(organizationId).catch(() => {
        // scheduled checks must never throw unhandled
      });
    }, intervalMs);
  },

  /**
   * Stop scheduled health checks.
   */
  stopHealthChecks(timerId: ReturnType<typeof setInterval>): void {
    clearInterval(timerId);
  },

  /**
   * List integrations that are degraded but not fully down.
   */
  async getDegradedIntegrations(organizationId: string): Promise<DegradedIntegration[]> {
    const memberships = await safePrisma(() =>
      prisma.membership.findMany({
        where: { workspace: { organizationId } },
        select: { userId: true },
      }),
    []);

    const userIds = [...new Set(memberships.map((m) => m.userId))];
    if (userIds.length === 0) return [];

    const connections = await safePrisma(() =>
      prisma.platformConnection.findMany({
        where: { userId: { in: userIds } },
      }),
    []);

    const now = new Date();
    const degraded: DegradedIntegration[] = [];

    for (const c of connections) {
      if (!c.tokenExpiresAt) continue;
      const msUntilExpiry = c.tokenExpiresAt.getTime() - now.getTime();
      // Degraded: token still valid but expiring within 3 days.
      if (msUntilExpiry > 0 && msUntilExpiry < 3 * 24 * 60 * 60 * 1000) {
        degraded.push({
          id: c.id,
          platform: c.platform,
          status: 'degraded',
          tokenExpiresAt: c.tokenExpiresAt,
          platformUsername: c.platformUsername,
        });
      }
    }

    return degraded;
  },
};
