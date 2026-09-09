import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { WebhookDispatcher } from '@/lib/automation/webhook-dispatcher';

// ── Webhook Subscription Service (Phase 12: API Platform) ──
//
// Org-scoped outbound webhook subscriptions with HMAC-SHA256 signing,
// delivery stats, and event matching. Backed by the WebhookSubscription model.

export interface WebhookSubscriptionCreateInput {
  name: string;
  url: string;
  events: string[];
  workspaceId?: string;
  createdBy: string;
}

export interface WebhookSubscriptionUpdateInput {
  name?: string;
  url?: string;
  events?: string[];
  status?: string;
}

export interface WebhookDeliveryStats {
  successCount: number;
  failureCount: number;
  lastDeliveryAt: Date | null;
  lastDeliveryStatus: string | null;
  lastDeliveryCode: number | null;
  totalDeliveries: number;
}

export interface WebhookSubscriptionStats {
  total: number;
  active: number;
  paused: number;
  disabled: number;
}

/** Generate a random secret for HMAC signing. */
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const WebhookSubscriptionService = {
  /**
   * Create a new webhook subscription. Returns the subscription record and the
   * signing secret (only returned once at creation time).
   */
  async create(organizationId: string, input: WebhookSubscriptionCreateInput) {
    const secret = generateSecret();
    const subscription = await prisma.webhookSubscription.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 200),
        url: input.url.slice(0, 2048),
        secret,
        events: JSON.stringify(input.events),
        createdBy: input.createdBy,
      },
    });

    return { subscription, secret };
  },

  /**
   * List webhook subscriptions for an organization.
   */
  async list(organizationId: string) {
    return safePrisma(() =>
      prisma.webhookSubscription.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
    []);
  },

  /**
   * Get a single webhook subscription by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.webhookSubscription.findUnique({ where: { id } }),
    null);
  },

  /**
   * Update a webhook subscription's mutable fields.
   */
  async update(id: string, input: WebhookSubscriptionUpdateInput) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.url !== undefined) data.url = input.url.slice(0, 2048);
    if (input.events !== undefined) data.events = JSON.stringify(input.events);
    if (input.status !== undefined) data.status = input.status;

    return prisma.webhookSubscription.update({ where: { id }, data });
  },

  /**
   * Permanently delete a webhook subscription.
   */
  async delete(id: string) {
    return prisma.webhookSubscription.delete({ where: { id } });
  },

  /**
   * Pause a webhook subscription (stops deliveries).
   */
  async pause(id: string) {
    return prisma.webhookSubscription.update({
      where: { id },
      data: { status: 'paused' },
    });
  },

  /**
   * Resume a paused webhook subscription.
   */
  async resume(id: string) {
    return prisma.webhookSubscription.update({
      where: { id },
      data: { status: 'active' },
    });
  },

  /**
   * Send a test event (ping) to the webhook URL and record the result.
   */
  async test(id: string) {
    const subscription = await safePrisma(() =>
      prisma.webhookSubscription.findUnique({ where: { id } }),
    null);
    if (!subscription) return null;

    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook from Lazynext Developer Portal' },
    };

    const result = await WebhookDispatcher.dispatch(subscription.url, payload, {
      event: 'webhook.test',
      secret: subscription.secret,
    });

    // Record delivery result
    await prisma.webhookSubscription.update({
      where: { id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: result.success ? 'success' : 'failed',
        lastDeliveryCode: result.statusCode,
        ...(result.success
          ? { successCount: { increment: 1 } }
          : { failureCount: { increment: 1 } }),
      },
    }).catch(() => {});

    return result;
  },

  /**
   * Get delivery stats for a webhook subscription.
   */
  async getDeliveryStats(id: string): Promise<WebhookDeliveryStats | null> {
    const sub = await safePrisma(() =>
      prisma.webhookSubscription.findUnique({ where: { id } }),
    null);
    if (!sub) return null;
    return {
      successCount: sub.successCount,
      failureCount: sub.failureCount,
      lastDeliveryAt: sub.lastDeliveryAt,
      lastDeliveryStatus: sub.lastDeliveryStatus,
      lastDeliveryCode: sub.lastDeliveryCode,
      totalDeliveries: sub.successCount + sub.failureCount,
    };
  },

  /**
   * Find all active subscriptions (across all orgs) that match a given event
   * type. Used by the event dispatcher to fan out events.
   */
  async matchEvent(eventType: string) {
    const subs = await safePrisma(() =>
      prisma.webhookSubscription.findMany({
        where: { status: 'active' },
      }),
    []);
    return subs.filter((s) => {
      try {
        const events: string[] = JSON.parse(s.events);
        return events.includes(eventType) || events.includes('*');
      } catch {
        return false;
      }
    });
  },

  /**
   * Summary stats for an organization's webhook subscriptions.
   */
  async getStats(organizationId: string): Promise<WebhookSubscriptionStats> {
    const subs = await safePrisma(() =>
      prisma.webhookSubscription.findMany({
        where: { organizationId },
        select: { status: true },
      }),
    []);
    return {
      total: subs.length,
      active: subs.filter((s) => s.status === 'active').length,
      paused: subs.filter((s) => s.status === 'paused').length,
      disabled: subs.filter((s) => s.status === 'disabled').length,
    };
  },
};
