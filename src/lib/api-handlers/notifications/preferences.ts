import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/preferences — get the current user's notification preferences.
 * PATCH /api/notifications/preferences — update notification preferences.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const preferences = await NotificationService.getNotificationPreferences(session.user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const preferences = await NotificationService.updateNotificationPreferences(session.user.id, body);
  return NextResponse.json({ preferences });
}
