import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/lists — list subscriber lists */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ lists: [] });
  }

  const lists = await SubscriberService.listLists(workspaces[0].id);
  return NextResponse.json({ lists });
}

/** POST /api/email/lists — create a new subscriber list */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const list = await SubscriberService.createList({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        description: body.description,
        tags: body.tags,
        isPublic: body.isPublic,
      },
    });
    return NextResponse.json({ list }, { status: 201 });
  } catch (e) {
    console.error('[email/lists] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_list' }, { status: 500 });
  }
}
