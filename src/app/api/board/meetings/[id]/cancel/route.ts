import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BoardService } from '@/lib/services/board-service';

/** POST /api/board/meetings/[id]/cancel — cancel a meeting */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const meeting = await BoardService.cancelMeeting(id, reason, session.user.id);
    if (!meeting) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ meeting });
  } catch (e) {
    console.error('[board/meetings] cancel error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_meeting' }, { status: 500 });
  }
}
