import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/committees — list committees */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ committees: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const committees = await BoardService.listCommittees(organizationId, opts as never);
  return NextResponse.json({ committees });
}

/** POST /api/board/committees — create a committee */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const committee = await BoardService.createCommittee(
      ws.organizationId, ws.id,
      {
        name, type: type as never,
        charter: body.charter, members: body.members, chair: body.chair,
        meetingFrequency: body.meetingFrequency, status: body.status, establishedDate: body.establishedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ committee }, { status: 201 });
  } catch (e) {
    console.error('[board/committees] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_committee' }, { status: 500 });
  }
}
