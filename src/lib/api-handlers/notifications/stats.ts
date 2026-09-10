import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/stats — aggregate notification stats for the current user.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const stats = await NotificationService.getNotificationStats(session.user.id);
  return NextResponse.json({ stats });
}
