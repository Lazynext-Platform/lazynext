import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PushNotificationService } from '@/lib/services/push-notification-service';

/**
 * POST /api/push/unsubscribe — remove a push subscription by endpoint.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'endpoint_required' }, { status: 400 });
  }

  try {
    const removed = await PushNotificationService.unsubscribe(
      session.user.id,
      body.endpoint,
    );
    return NextResponse.json({ removed });
  } catch (e) {
    console.error('[push/unsubscribe] error:', e);
    return NextResponse.json(
      { error: 'failed_to_unsubscribe' },
      { status: 500 },
    );
  }
}
