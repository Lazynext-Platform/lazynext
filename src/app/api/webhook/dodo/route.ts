import { NextResponse } from 'next/server';
import { dodo } from '@/lib/payments/dodo';
import { grantCreditsWithIdempotency } from '@/lib/credits';

// Dodo Payments webhook: verifies signature via SDK unwrap(), then handles
// payment lifecycle events (succeeded, failed, dispute.created, refund.succeeded).
// The webhook-signature and webhook-timestamp headers are required for verification.
export async function POST(req: Request) {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookSecret) return new Response('webhook not configured', { status: 400 });

  const body = await req.text();
  const signature = req.headers.get('webhook-signature');
  const timestamp = req.headers.get('webhook-timestamp');
  if (!signature || !timestamp) return new Response('missing webhook headers', { status: 400 });

  let event;
  try {
    // SDK unwrap() verifies the HMAC SHA256 signature and parses the payload.
    event = dodo.webhooks.unwrap(body, {
      headers: {
        'webhook-signature': signature,
        'webhook-timestamp': timestamp,
      },
      key: webhookSecret,
    });
  } catch (e) {
    console.error('[dodo-webhook] signature verification failed:', e instanceof Error ? e.message : String(e));
    return new Response('Webhook Error: signature_verification_failed', { status: 401 });
  }

  const payment = event.data as {
    payment_id?: string;
    metadata?: Record<string, string | number | boolean>;
    total_amount?: number;
    currency?: string;
  };
  const userId = payment?.metadata?.userId as string | undefined;
  const credits = parseInt(String(payment?.metadata?.credits || '0'), 10);
  const ref = payment?.payment_id || '';

  switch (event.type) {
    // ── Successful payment: grant credits (idempotent via idempotencyKey) ──
    case 'payment.succeeded': {
      if (userId && credits > 0 && ref) {
        // Use idempotencyKey to prevent double-credit on concurrent/duplicate webhooks.
        // The unique constraint on (userId, idempotencyKey) ensures only one grant succeeds.
        try {
          await grantCreditsWithIdempotency(userId, credits, 'purchase', ref, `dodo-pay-${ref}`);
        } catch (e) {
          // If unique constraint violation, this webhook was already processed — safe to ignore
          const err = e as { code?: string; message?: string };
          if (err?.code === 'P2002' || String(err?.message || '').includes('UNIQUE constraint') || String(err?.message || '').includes('unique')) {
            console.info(`[dodo-webhook] payment.succeeded already processed for ref=${ref}`);
          } else {
            throw e;
          }
        }
      }
      break;
    }

    // ── Failed payment: log for support (no credits granted) ──
    case 'payment.failed': {
      console.warn(`[dodo-webhook] payment.failed for user=${userId} ref=${ref} credits=${credits}`);
      // No action needed — credits were never granted. Log for support dashboards.
      break;
    }

    // ── Dispute opened: log alert for manual review ──
    case 'dispute.opened': {
      console.warn(`[dodo-webhook] dispute.opened for payment=${ref} user=${userId}`);
      // In production, send an alert to support/Slack. Credits remain granted
      // until the dispute is resolved (Dodo handles fund holds as MoR).
      break;
    }

    // ── Refund succeeded: claw back credits (idempotent via idempotencyKey) ──
    case 'refund.succeeded': {
      console.info(`[dodo-webhook] refund.succeeded for payment=${ref} user=${userId}`);
      if (userId && credits > 0 && ref) {
        try {
          await grantCreditsWithIdempotency(userId, -credits, 'refund', `refund-${ref}`, `dodo-refund-${ref}`);
        } catch (e) {
          const err = e as { code?: string; message?: string };
          if (err?.code === 'P2002' || String(err?.message || '').includes('UNIQUE constraint') || String(err?.message || '').includes('unique')) {
            console.info(`[dodo-webhook] refund.succeeded already processed for ref=${ref}`);
          } else {
            throw e;
          }
        }
      }
      break;
    }

    // ── Other event types: acknowledge but don't act ──
    default:
      console.info(`[dodo-webhook] unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
