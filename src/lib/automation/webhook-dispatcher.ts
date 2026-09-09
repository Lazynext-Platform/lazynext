import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import {
  WEBHOOK_RETRY_CONFIG,
  withRetryAsync,
  type RetryConfig,
} from './retry';

// ── Webhook Dispatcher ──
//
// Production-grade outbound webhook delivery with HMAC-SHA256 signing,
// retry/backoff, and delivery stats.

export interface WebhookDispatchResult {
  success: boolean;
  statusCode: number;
  attempts: number;
  responseTime: number;
  error?: string;
}

export interface WebhookStats {
  id: string;
  url: string;
  active: boolean;
  events: string;
  lastFiredAt: Date | null;
  lastStatus: number | null;
  healthy: boolean;
}

const DEFAULT_WEBHOOK_SECRET =
  process.env.WEBHOOK_SIGNING_SECRET || 'lazynext-webhook-secret-dev';

/**
 * Sign a payload with HMAC-SHA256 using the given secret.
 * Returns a hex-encoded signature prefixed with `sha256=`.
 */
export function signPayload(payload: string | object, secret: string): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify a webhook signature against a payload.
 * Uses a constant-time comparison to prevent timing attacks.
 */
export function verifySignature(
  payload: string | object,
  signature: string,
  secret: string,
): boolean {
  const expected = signPayload(payload, secret);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Format the standard webhook headers.
 */
export function formatHeaders(
  event: string,
  signature: string,
  timestamp: string,
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Event': event,
  };
}

export const WebhookDispatcher = {
  /**
   * Dispatch a webhook to the given URL with retry/backoff.
   * Signs the payload with HMAC-SHA256 and includes standard headers.
   */
  async dispatch(
    webhookUrl: string,
    payload: unknown,
    config?: { event?: string; secret?: string; retryConfig?: RetryConfig },
  ): Promise<WebhookDispatchResult> {
    const event = config?.event ?? 'webhook.dispatch';
    const secret = config?.secret ?? DEFAULT_WEBHOOK_SECRET;
    const retryConfig = config?.retryConfig ?? WEBHOOK_RETRY_CONFIG;

    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload(body, secret);
    const headers = formatHeaders(event, signature, timestamp);

    const start = Date.now();

    try {
      const { result: response, attempts } = await withRetryAsync(async () => {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body,
        });

        if (res.status >= 500 || res.status === 408 || res.status === 429) {
          const err = new Error(`webhook returned status ${res.status}`) as Error & {
            status: number;
          };
          err.status = res.status;
          throw err;
        }

        if (res.status >= 400 && res.status < 500) {
          const err = new Error(`webhook client error ${res.status}`) as Error & {
            status: number;
          };
          err.status = res.status;
          throw err;
        }

        return res;
      }, retryConfig);

      const responseTime = Date.now() - start;
      return {
        success: response.ok,
        statusCode: response.status,
        attempts,
        responseTime,
      };
    } catch (e) {
      const responseTime = Date.now() - start;
      const err = e instanceof Error ? e : new Error(String(e));
      const status = (err as Error & { status?: number }).status ?? 0;
      return {
        success: false,
        statusCode: status,
        attempts: retryConfig.maxAttempts,
        responseTime,
        error: err.message,
      };
    }
  },

  signPayload,
  verifySignature,
  formatHeaders,

  /**
   * Get delivery stats for a webhook endpoint from the model fields.
   */
  async getWebhookStats(webhookId: string): Promise<WebhookStats | null> {
    const ep = await safePrisma(() =>
      prisma.webhookEndpoint.findUnique({
        where: { id: webhookId },
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
      healthy:
        ep.active &&
        (ep.lastStatus === null || (ep.lastStatus >= 200 && ep.lastStatus < 300)),
    };
  },
};
