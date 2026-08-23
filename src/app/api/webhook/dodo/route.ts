import { NextResponse } from 'next/server';
import { dodo } from '@/lib/payments/dodo';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';

// Dodo Payments webhook: verifies signature via SDK unwrap(), then grants credits on payment.succeeded.
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

  // payment.succeeded: grant credits to the user identified in metadata.
  if (event.type === 'payment.succeeded') {
    const payment = event.data as { payment_id?: string; metadata?: Record<string, string | number | boolean> };
    const userId = payment?.metadata?.userId as string | undefined;
    const credits = parseInt(String(payment?.metadata?.credits || '0'), 10);
    const ref = payment?.payment_id || '';

    // Idempotency: don't double-grant if Dodo retries the webhook.
    const already = await prisma.creditLedger.findFirst({
      where: { ref, reason: 'purchase' },
    });
    if (!already && userId && credits > 0) {
      await grantCredits(userId, credits, 'purchase', ref);
    }
  }

  return NextResponse.json({ received: true });
}
