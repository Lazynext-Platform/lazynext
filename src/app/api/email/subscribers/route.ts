import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/subscribers — list subscribers */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ subscribers: [] });
  }

  const { searchParams } = new URL(req.url);
  const listId = searchParams.get('listId') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const subscribers = await SubscriberService.listSubscribers(workspaces[0].id, { listId, tag, status, search });
  return NextResponse.json({ subscribers });
}

/** POST /api/email/subscribers — add a new subscriber */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const subscriber = await SubscriberService.addSubscriber({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        status: body.status,
        tags: body.tags,
        metadata: body.metadata,
        listIds: body.listIds,
      },
    });
    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (e) {
    console.error('[email/subscribers] create error:', e);
    return NextResponse.json({ error: 'failed_to_add_subscriber' }, { status: 500 });
  }
}
