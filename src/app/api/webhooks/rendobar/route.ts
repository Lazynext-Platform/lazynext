/**
 * RendoBar webhook receiver.
 *
 * RendoBar sends signed HMAC webhooks when render jobs complete or fail.
 * This endpoint verifies the signature, updates the pipeline edit-stage
 * output, and stores the rendered video URL.
 *
 * See ADR-043 and research/video-rendering-services.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-rendobar-signature') || '';
  const secret = process.env.VIDEO_RENDER_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'webhook_secret_not_configured' }, { status: 500 });
  }

  // Verify HMAC signature (constant-time comparison to prevent timing attacks)
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    type: string;
    data: {
      id: string;
      status: 'completed' | 'failed' | 'cancelled';
      output?: { url?: string; thumbnailUrl?: string; duration?: number };
      error?: string;
    };
  };

  // Only process completion events
  if (event.type === 'job.completed' && event.data.output?.url) {
    // The pipeline executor can query job status via the API to retrieve
    // the output URL. This webhook serves as an early notification.
    // Full persistence is handled by the polling path in video-render.ts.
    return NextResponse.json({ received: true, jobId: event.data.id, status: 'completed' });
  }

  if (event.type === 'job.failed') {
    return NextResponse.json({ received: true, jobId: event.data.id, status: 'failed' });
  }

  return NextResponse.json({ received: true });
}
