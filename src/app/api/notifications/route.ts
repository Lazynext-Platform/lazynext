import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

/**
 * GET /api/notifications — list notifications for the current user.
 * POST /api/notifications — create a notification (internal use).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { type?: string; title?: string; body?: string; workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const notification = await createNotification({
    userId: session.user.id,
    workspaceId: body.workspaceId || undefined,
    type: body.type || 'general',
    title: body.title.trim(),
    body: body.body,
  });

  return NextResponse.json({ notification }, { status: 201 });
}
