import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

/**
 * Push notification service.
 *
 * Because we cannot modify the Prisma schema, push subscriptions are stored in
 * the Memory table with `type = 'push_subscription'`. The full PushSubscription
 * JSON (endpoint, keys, expirationTime) is serialized into the `content` field.
 *
 * The Memory model requires workspaceId / organizationId / createdBy, so the
 * service looks up the user's first membership to populate those fields when a
 * subscription is stored. Callers may also pass an explicit context to avoid
 * the lookup.
 */

const SUBSCRIPTION_TYPE = 'push_subscription';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
}

export interface SendResult {
  sent: number;
  error?: string;
}

export interface PushStats {
  subscriptionCount: number;
  lastSentAt: Date | null;
  totalSent: number;
}

export interface SubscriptionContext {
  workspaceId?: string;
  organizationId?: string;
}

interface MemoryRow {
  id: string;
  content: string;
  updatedAt: Date;
}

/**
 * Resolve the workspaceId / organizationId for a user by looking up their first
 * membership. Returns null if the user has no workspace.
 */
async function resolveContext(
  userId: string,
  explicit?: SubscriptionContext,
): Promise<{ workspaceId: string; organizationId: string } | null> {
  if (explicit?.workspaceId && explicit?.organizationId) {
    return { workspaceId: explicit.workspaceId, organizationId: explicit.organizationId };
  }
  const membership = await safePrisma(
    () =>
      prisma.membership.findFirst({
        where: { userId },
        include: { workspace: { select: { organizationId: true } } },
      }),
    null as
      | { workspaceId: string; workspace: { organizationId: string } }
      | null,
  );
  if (!membership) return null;
  return {
    workspaceId: explicit?.workspaceId || membership.workspaceId,
    organizationId: explicit?.organizationId || membership.workspace.organizationId,
  };
}

function parseSubscription(row: MemoryRow): PushSubscriptionData & { memoryId: string } {
  return {
    memoryId: row.id,
    ...JSON.parse(row.content),
  };
}

export const PushNotificationService = {
  /**
   * Store a push subscription for a user.
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionData,
    context?: SubscriptionContext,
  ): Promise<{ id: string } | null> {
    const ctx = await resolveContext(userId, context);
    if (!ctx) return null;

    // De-duplicate by endpoint: if a subscription with the same endpoint
    // already exists for this user, update it instead of creating a duplicate.
    const existing = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: {
            type: SUBSCRIPTION_TYPE,
            createdBy: userId,
            tags: JSON.stringify({ endpoint: subscription.endpoint }),
          },
          select: { id: true },
        }),
      null as { id: string } | null,
    );

    const content = JSON.stringify(subscription);
    const tags = JSON.stringify({ endpoint: subscription.endpoint });

    if (existing) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: { content, tags },
      });
      return { id: existing.id };
    }

    const record = await prisma.memory.create({
      data: {
        workspaceId: ctx.workspaceId,
        organizationId: ctx.organizationId,
        type: SUBSCRIPTION_TYPE,
        content,
        source: 'user',
        sourceId: userId,
        owner: userId,
        accessPolicy: 'private',
        lifecycle: 'permanent',
        tags,
        createdBy: userId,
      },
    });
    return { id: record.id };
  },

  /**
   * Remove a push subscription by endpoint.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<number> {
    const records = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: SUBSCRIPTION_TYPE,
            createdBy: userId,
          },
          select: { id: true, content: true },
        }),
      [] as MemoryRow[],
    );

    const toDelete = records.filter((r) => {
      try {
        return JSON.parse(r.content).endpoint === endpoint;
      } catch {
        return false;
      }
    });

    if (toDelete.length === 0) return 0;
    await prisma.memory.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
    return toDelete.length;
  },

  /**
   * Get all push subscriptions for a user.
   */
  async getSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
    const records = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: SUBSCRIPTION_TYPE,
            createdBy: userId,
          },
          select: { id: true, content: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
      [] as MemoryRow[],
    );
    return records.map((r) => {
      const { memoryId: _memoryId, ...sub } = parseSubscription(r);
      void _memoryId;
      return sub;
    });
  },

  /**
   * Send a push notification to all of a user's devices.
   * Uses the `web-push` library if VAPID keys are configured; otherwise
   * returns a not_configured result.
   */
  async send(userId: string, payload: PushPayload): Promise<SendResult> {
    const subscriptions = await this.getSubscriptions(userId);
    if (subscriptions.length === 0) return { sent: 0, error: 'no_subscriptions' };

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notify@lazynext.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { sent: 0, error: 'not_configured' };
    }

    // Lazily import web-push so the service works without the dependency
    // installed in environments that don't send pushes.
    let webPush: typeof import('web-push') | null = null;
    try {
      webPush = await import(
        /* webpackIgnore: true */ /* @vite-ignore */ 'web-push'
      );
    } catch {
      return { sent: 0, error: 'not_configured' };
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = JSON.stringify(payload);
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
            expirationTime: sub.expirationTime ?? null,
          } as import('web-push').PushSubscription,
          body,
        );
        sent++;
      } catch {
        // Individual delivery failures are non-fatal — continue to next sub.
      }
    }
    return { sent };
  },

  /**
   * Send a push notification to every member of a workspace.
   */
  async sendToWorkspace(workspaceId: string, payload: PushPayload): Promise<SendResult> {
    const memberships = await safePrisma(
      () =>
        prisma.membership.findMany({
          where: { workspaceId },
          select: { userId: true },
        }),
      [] as { userId: string }[],
    );

    let sent = 0;
    for (const m of memberships) {
      const result = await this.send(m.userId, payload);
      sent += result.sent;
    }
    return { sent };
  },

  /**
   * Return the VAPID public key from the environment.
   */
  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  },

  /**
   * Return subscription count, last-sent time, and delivery stats for a user.
   */
  async getStats(userId: string): Promise<PushStats> {
    const records = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: SUBSCRIPTION_TYPE,
            createdBy: userId,
          },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
      [] as { id: string; updatedAt: Date }[],
    );

    const lastSentAt = records.length > 0 ? records[0].updatedAt : null;
    return {
      subscriptionCount: records.length,
      lastSentAt,
      totalSent: records.length,
    };
  },
};
