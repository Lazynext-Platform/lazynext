import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/meetings — list meetings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ meetings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const meetings = await BoardService.listMeetings(organizationId, opts as never);
  return NextResponse.json({ meetings });
}

/** POST /api/board/meetings — create a meeting */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const date = String(body.date || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !date || !type) {
    return NextResponse.json({ error: 'title_date_and_type_required' }, { status: 400 });
  }
  if (!Array.isArray(body.agenda)) {
    return NextResponse.json({ error: 'agenda_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const meeting = await BoardService.createMeeting(
      ws.organizationId, ws.id,
      {
        title, date, type: type as never, agenda: body.agenda,
        location: body.location, attendees: body.attendees, status: body.status,
        minutes: body.minutes, actionItems: body.actionItems, nextMeetingDate: body.nextMeetingDate,
      },
      session.user.id,
    );
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (e) {
    console.error('[board/meetings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_meeting' }, { status: 500 });
  }
}
