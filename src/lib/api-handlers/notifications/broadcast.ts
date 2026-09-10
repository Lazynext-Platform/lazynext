import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/broadcast — broadcast a notification to all
 * members of a workspace or organization.
 *
 * Body: { target: 'workspace'|'organization', targetId, type, title, body?, category?, priority?, actionUrl?, metadata?, createdBy? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    target?: 'workspace' | 'organization';
    targetId?: string;
    type?: string;
    title?: string;
    body?: string;
    category?: string;
    priority?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.target || !body.targetId || !body.title?.trim()) {
    return NextResponse.json(
      { error: 'target, targetId, and title are required' },
      { status: 400 },
    );
  }

  const payload = {
    type: body.type || 'system',
    title: body.title,
    body: body.body,
    category: body.category as never,
    priority: body.priority as never,
    actionUrl: body.actionUrl,
    metadata: body.metadata,
    createdBy: body.createdBy || session.user.id,
  };

  if (body.target === 'workspace') {
    const notifications = await NotificationService.createForWorkspace(body.targetId, payload);
    return NextResponse.json({ notifications, count: notifications.length }, { status: 201 });
  }
  if (body.target === 'organization') {
    const notifications = await NotificationService.createForOrganization(body.targetId, payload);
    return NextResponse.json({ notifications, count: notifications.length }, { status: 201 });
  }

  return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
}
