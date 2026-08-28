import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

export type WebhookEvent =
  | 'creative.generated'
  | 'creative.scored'
  | 'campaign.deployed'
  | 'campaign.metrics_updated'
  | 'campaign.budget_updated'
  | 'campaign.report_generated'
  | 'pipeline.completed'
  | 'performance.recorded';

/**
 * Dispatch a webhook event to all active endpoints subscribed to that event.
 * Non-blocking — errors are logged but do not affect the caller.
 */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        userId,
        active: true,
        events: { contains: event },
      },
    });

    if (endpoints.length === 0) return;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(endpoints.map(async (ep) => {
      try {
        const signature = createHmac('sha256', ep.secret)
          .update(body)
          .digest('hex');

        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Lazynext-Event': event,
            'X-Lazynext-Signature': `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        await prisma.webhookEndpoint.update({
          where: { id: ep.id },
          data: {
            lastFiredAt: new Date(),
            lastStatus: res.status,
          },
        });
      } catch (err) {
        // Update with error status
        await prisma.webhookEndpoint.update({
          where: { id: ep.id },
          data: {
            lastFiredAt: new Date(),
            lastStatus: 0,
          },
        }).catch(() => {});
      }
    }));
  } catch {
    // Webhook dispatch should never block the main operation
  }
}
