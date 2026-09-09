import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/segments — list segments for the workspace */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ segments: [] });
  }

  const memories = await SubscriberService.listLists(workspaces[0].id);
  // Segments are stored as email_segment type; expose via a simple query
  return NextResponse.json({ segments: memories });
}

/** POST /api/email/segments — create a new segment */
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
    const segment = await SubscriberService.createSegment({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      createdBy: session.user.id,
      data: {
        name,
        description: body.description,
        rules: body.rules || [],
        listId: body.listId,
      },
    });
    return NextResponse.json({ segment }, { status: 201 });
  } catch (e) {
    console.error('[email/segments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_segment' }, { status: 500 });
  }
}
