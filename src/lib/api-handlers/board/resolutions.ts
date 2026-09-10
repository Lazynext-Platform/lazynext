import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/resolutions — list resolutions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ resolutions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const resolutions = await BoardService.listResolutions(organizationId, opts as never);
  return NextResponse.json({ resolutions });
}

/** POST /api/board/resolutions — create a resolution */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const proposedBy = String(body.proposedBy || '').trim();
  if (!title || !type || !proposedBy) {
    return NextResponse.json({ error: 'title_type_and_proposed_by_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const resolution = await BoardService.createResolution(
      ws.organizationId, ws.id,
      {
        title, type: type as never, proposedBy,
        description: body.description, voteDeadline: body.voteDeadline, status: body.status,
        votes: body.votes, outcome: body.outcome, attachments: body.attachments,
      },
      session.user.id,
    );
    return NextResponse.json({ resolution }, { status: 201 });
  } catch (e) {
    console.error('[board/resolutions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_resolution' }, { status: 500 });
  }
}
