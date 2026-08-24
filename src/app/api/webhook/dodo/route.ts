import { NextResponse } from 'next/server';
import { dodo } from '@/lib/payments/dodo';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';

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
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`Webhook Error: ${msg}`, { status: 401 });
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
    // ── Successful payment: grant credits (idempotent) ──
    case 'payment.succeeded': {
      const already = await prisma.creditLedger.findFirst({
        where: { ref, reason: 'purchase' },
      });
      if (!already && userId && credits > 0) {
        await grantCredits(userId, credits, 'purchase', ref);
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

    // ── Refund succeeded: optionally claw back credits ──
    case 'refund.succeeded': {
      console.info(`[dodo-webhook] refund.succeeded for payment=${ref} user=${userId}`);
      // Claw back the credits that were granted for this payment (idempotent).
      // We use a negative credit ledger entry with reason 'refund'.
      if (userId && credits > 0) {
        const alreadyClawed = await prisma.creditLedger.findFirst({
          where: { ref: `refund-${ref}`, reason: 'refund' },
        });
        if (!alreadyClawed) {
          await grantCredits(userId, -credits, 'refund', `refund-${ref}`);
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
