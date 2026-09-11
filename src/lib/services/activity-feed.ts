/**
 * Live Activity Feed Service — SSE-based real-time activity stream.
 *
 * Inspired by openpolsia's live activity feed, re-implemented natively
 * for Lazynext's Prisma + D1/SQLite stack.
 *
 * The feed streams organization events (agent runs, task completions,
 * bootstrap progress, email receipts, etc.) to authenticated clients
 * via Server-Sent Events (SSE).
 *
 * @see docs/research/external-reference-architectures.md
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  actorType: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface ActivityFeedOptions {
  organizationId: string;
  /** Number of events to fetch per page */
  limit?: number;
  /** Cursor for pagination (event ID) */
  cursor?: string;
  /** Filter by event type prefix (e.g. "agent." for agent events) */
  typeFilter?: string;
}

// ── Live Activity Feed Service ──

export const ActivityFeedService = {
  /**
   * Get recent activity events for an organization.
   * This is the polling fallback for SSE.
   */
  async getRecent(options: ActivityFeedOptions): Promise<{ events: ActivityEvent[]; nextCursor?: string }> {
    const limit = Math.min(options.limit || 50, 100);

    const events = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          organizationId: options.organizationId,
          ...(options.typeFilter && { type: { startsWith: options.typeFilter } }),
          ...(options.cursor && { id: { lt: options.cursor } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // +1 to check if there are more
      }),
    []);

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    return {
      events: page.map(e => ({
        id: e.id,
        type: e.type,
        actor: e.actor || '',
        actorType: e.actorType || 'system',
        resourceType: e.resourceType || undefined,
        resourceId: e.resourceId || undefined,
        metadata: (e.metadata as unknown as Record<string, unknown>) || {},
        timestamp: e.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
    };
  },

  /**
   * Format an SSE message from an activity event.
   */
  formatSSE(event: ActivityEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
  },

  /**
   * Format an SSE comment (keepalive).
   */
  formatKeepalive(): string {
    return `: keepalive\n\n`;
  },

  /**
   * Format an SSE error message.
   */
  formatError(message: string): string {
    return `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`;
  },

  /**
   * Format an SSE connected message.
   */
  formatConnected(): string {
    return `event: connected\ndata: ${JSON.stringify({ connected: true, timestamp: new Date().toISOString() })}\n\n`;
  },

  /**
   * Get activity statistics for an organization.
   * Returns counts by event type for the last 24 hours.
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    last24h: number;
    byType: Record<string, number>;
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, last24h, byType] = await Promise.all([
      safePrisma(() => prisma.event.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.event.count({ where: { organizationId, createdAt: { gte: yesterday } } }), 0),
      safePrisma(() =>
        prisma.event.groupBy({
          by: ['type'],
          where: { organizationId, createdAt: { gte: yesterday } },
          _count: { type: true },
        }),
      []),
    ]);

    const typeMap: Record<string, number> = {};
    for (const group of byType) {
      typeMap[group.type] = group._count.type;
    }

    return { total, last24h, byType: typeMap };
  },
};
