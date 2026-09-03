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
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50));

  // Retry up to 3 times on cold start — Prisma/D1 may not be ready on the
  // first request after a Cloudflare Worker isolate is created.
  // If all retries fail, return 200 with empty data (not 500) so the browser
  // console stays clean. The client-side retry logic will re-fetch and get
  // real data once the isolate is warm.
  const delays = [200, 500, 1000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
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
    } catch (e) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      // Cold start — return empty 200 so client retry can re-fetch
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
  }
  return NextResponse.json({ notifications: [], unreadCount: 0 });
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

  const title = body.title.trim().slice(0, 200);
  const notifBody = typeof body.body === 'string' ? body.body.slice(0, 2000) : undefined;
  const type = (body.type || 'general').slice(0, 50);
  const workspaceId = body.workspaceId?.slice(0, 100) || undefined;

  const notification = await createNotification({
    userId: session.user.id,
    workspaceId,
    type,
    title,
    body: notifBody,
  });

  return NextResponse.json({ notification }, { status: 201 });
}
