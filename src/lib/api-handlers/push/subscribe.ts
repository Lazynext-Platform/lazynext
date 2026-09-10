import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PushNotificationService } from '@/lib/services/push-notification-service';

/**
 * POST /api/push/subscribe — store a push subscription for the current user.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
    expirationTime?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: 'endpoint_and_keys_required' },
      { status: 400 },
    );
  }

  try {
    const result = await PushNotificationService.subscribe(
      session.user.id,
      {
        endpoint: body.endpoint,
        keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
        expirationTime: body.expirationTime ?? null,
      },
    );
    if (!result) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (e) {
    console.error('[push/subscribe] error:', e);
    return NextResponse.json(
      { error: 'failed_to_subscribe' },
      { status: 500 },
    );
  }
}
