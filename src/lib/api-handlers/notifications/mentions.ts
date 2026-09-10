import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/mentions — process @mentions from content and
 * create mention notifications for each found user.
 *
 * Body: { workspaceId, organizationId?, content, resourceType, resourceId }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    content?: string;
    resourceType?: string;
    resourceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.workspaceId?.trim() || !body.content?.trim() || !body.resourceType?.trim() || !body.resourceId?.trim()) {
    return NextResponse.json(
      { error: 'workspaceId, content, resourceType, and resourceId are required' },
      { status: 400 },
    );
  }

  const notifications = await NotificationService.processMentions(
    body.workspaceId,
    body.organizationId,
    body.content,
    session.user.id,
    body.resourceType,
    body.resourceId,
  );

  return NextResponse.json({ notifications }, { status: 201 });
}
