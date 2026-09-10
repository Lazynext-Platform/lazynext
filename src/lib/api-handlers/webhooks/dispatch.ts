import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WebhookDispatcher } from '@/lib/automation/webhook-dispatcher';

/**
 * POST /api/webhooks/dispatch — manually dispatch a webhook.
 * Body: { url, payload, event?, secret? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: string; payload?: unknown; event?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 });
  }

  try {
    const result = await WebhookDispatcher.dispatch(url, body.payload ?? {}, {
      event: body.event,
      secret: body.secret,
    });
    return NextResponse.json({ result }, { status: result.success ? 200 : 502 });
  } catch (e) {
    console.error('[webhooks/dispatch] error:', e);
    return NextResponse.json({ error: 'failed_to_dispatch_webhook' }, { status: 500 });
  }
}
