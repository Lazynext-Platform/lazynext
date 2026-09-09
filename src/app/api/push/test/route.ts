import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PushNotificationService } from '@/lib/services/push-notification-service';

/**
 * POST /api/push/test — send a test push notification to the current user.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { title?: string; body?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    // body remains default
  }

  try {
    const result = await PushNotificationService.send(session.user.id, {
      title: body.title?.trim() || 'Lazynext',
      body: body.body?.trim() || 'This is a test push notification.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[push/test] error:', e);
    return NextResponse.json(
      { error: 'failed_to_send' },
      { status: 500 },
    );
  }
}
