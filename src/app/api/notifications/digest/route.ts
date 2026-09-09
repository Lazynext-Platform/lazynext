import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/digest — get a digest of notifications for email.
 * POST /api/notifications/digest — send a digest email now.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get('since');
  const includeRead = url.searchParams.get('includeRead') === '1';
  const since = sinceParam ? new Date(sinceParam) : undefined;

  const digest = await NotificationService.getDigest(session.user.id, { since, includeRead });
  return NextResponse.json({ digest });
}

export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await NotificationService.sendDigestEmail(session.user.id);
  return NextResponse.json(result);
}
