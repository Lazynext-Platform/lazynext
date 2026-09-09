import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/meetings/[id] — get a single meeting */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await BoardService.getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ meeting });
}

/** PATCH /api/board/meetings/[id] — update a meeting */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const meeting = await BoardService.updateMeeting(id, {
      title: body.title, date: body.date, location: body.location, type: body.type,
      agenda: body.agenda, attendees: body.attendees, status: body.status,
      minutes: body.minutes, actionItems: body.actionItems, nextMeetingDate: body.nextMeetingDate,
    });
    if (!meeting) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ meeting });
  } catch (e) {
    console.error('[board/meetings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_meeting' }, { status: 500 });
  }
}
