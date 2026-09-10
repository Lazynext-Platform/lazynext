import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Integration Health Service ──

export type HealthStatus = 'healthy' | 'expired' | 'unknown';

export interface ConnectionHealth {
  id: string;
  platform: string;
  status: HealthStatus;
  tokenExpiresAt: Date | null;
  platformUsername: string | null;
}

export interface WebhookHealth {
  id: string;
  url: string;
  active: boolean;
  lastFiredAt: Date | null;
  lastStatus: number | null;
  events: string;
}

export interface HealthSummary {
  connections: ConnectionHealth[];
  webhooks: WebhookHealth[];
  healthyCount: number;
  expiredCount: number;
  unknownCount: number;
}

/**
 * IntegrationHealthService — monitors the health of platform connections
 * (OAuth tokens) and webhook endpoints for a user.
 */
export const IntegrationHealthService = {
  /**
   * List all platform connections for a user.
   */
  async listConnections(userId: string) {
    return safePrisma(() =>
      prisma.platformConnection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    []);
  },

  /**
   * Check the health of a single platform connection by inspecting its
   * token expiry. Returns a status of 'healthy', 'expired', or 'unknown'
   * (when no expiry is recorded).
   */
  async checkHealth(userId: string, platform: string): Promise<ConnectionHealth | null> {
    const conn = await safePrisma(() =>
      prisma.platformConnection.findUnique({
        where: { userId_platform: { userId, platform } },
      }),
    null);

    if (!conn) return null;

    let status: HealthStatus = 'unknown';
    if (conn.tokenExpiresAt) {
      status = conn.tokenExpiresAt > new Date() ? 'healthy' : 'expired';
    }

    return {
      id: conn.id,
      platform: conn.platform,
      status,
      tokenExpiresAt: conn.tokenExpiresAt,
      platformUsername: conn.platformUsername,
    };
  },

  /**
   * List webhook endpoints for a user.
   */
  async listWebhooks(userId: string) {
    return safePrisma(() =>
      prisma.webhookEndpoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    []);
  },

  /**
   * Get basic delivery stats for a webhook endpoint from the model fields.
   * (A full delivery log is not yet modeled; this returns the last-fire
   * status recorded by the dispatcher.)
   */
  async getWebhookDeliveryStats(endpointId: string) {
    const ep = await safePrisma(() =>
      prisma.webhookEndpoint.findUnique({
        where: { id: endpointId },
      }),
    null);

    if (!ep) return null;

    return {
      id: ep.id,
      url: ep.url,
      active: ep.active,
      events: ep.events,
      lastFiredAt: ep.lastFiredAt,
      lastStatus: ep.lastStatus,
      healthy: ep.active && (ep.lastStatus === null || (ep.lastStatus >= 200 && ep.lastStatus < 300)),
    };
  },

  /**
   * Get a health summary for all of a user's integrations — connections
   * and webhooks — with aggregated healthy/expired/unknown counts.
   */
  async getHealthSummary(userId: string): Promise<HealthSummary> {
    const [connections, webhooks] = await Promise.all([
      this.listConnections(userId),
      this.listWebhooks(userId),
    ]);

    const connectionHealth: ConnectionHealth[] = connections.map((c) => {
      let status: HealthStatus = 'unknown';
      if (c.tokenExpiresAt) {
        status = c.tokenExpiresAt > new Date() ? 'healthy' : 'expired';
      }
      return {
        id: c.id,
        platform: c.platform,
        status,
        tokenExpiresAt: c.tokenExpiresAt,
        platformUsername: c.platformUsername,
      };
    });

    const webhookHealth: WebhookHealth[] = webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      active: w.active,
      lastFiredAt: w.lastFiredAt,
      lastStatus: w.lastStatus,
      events: w.events,
    }));

    const healthyCount = connectionHealth.filter((c) => c.status === 'healthy').length;
    const expiredCount = connectionHealth.filter((c) => c.status === 'expired').length;
    const unknownCount = connectionHealth.filter((c) => c.status === 'unknown').length;

    return {
      connections: connectionHealth,
      webhooks: webhookHealth,
      healthyCount,
      expiredCount,
      unknownCount,
    };
  },
};
