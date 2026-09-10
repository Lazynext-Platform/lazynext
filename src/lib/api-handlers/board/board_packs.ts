import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/board-packs — list board packs */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ boardPacks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { meetingId?: string; status?: string } = {};
  const meetingId = url.searchParams.get('meetingId');
  const status = url.searchParams.get('status');
  if (meetingId) opts.meetingId = meetingId;
  if (status) opts.status = status;

  const boardPacks = await BoardService.listBoardPacks(organizationId, opts as never);
  return NextResponse.json({ boardPacks });
}

/** POST /api/board/board-packs — create a board pack */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const meetingId = String(body.meetingId || '').trim();
  const title = String(body.title || '').trim();
  if (!meetingId || !title) {
    return NextResponse.json({ error: 'meeting_id_and_title_required' }, { status: 400 });
  }
  if (!Array.isArray(body.sections)) {
    return NextResponse.json({ error: 'sections_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const boardPack = await BoardService.createBoardPack(
      ws.organizationId, ws.id,
      {
        meetingId, title, sections: body.sections,
        status: body.status, distributedDate: body.distributedDate,
        distributedTo: body.distributedTo, confidential: body.confidential,
      },
      session.user.id,
    );
    return NextResponse.json({ boardPack }, { status: 201 });
  } catch (e) {
    console.error('[board/board-packs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_board_pack' }, { status: 500 });
  }
}
