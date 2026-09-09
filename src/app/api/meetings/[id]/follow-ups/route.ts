import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings/[id]/follow-ups — get follow-ups for a meeting */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const followUps = await MeetingService.getFollowUps(id);
  return NextResponse.json({ followUps });
}

/** POST /api/meetings/[id]/follow-ups — add a follow-up */
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
  const text = String(body.text || '').trim();
  if (!text) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }

  try {
    const result = await MeetingService.addFollowUp(id, {
      text,
      assignee: body.assignee,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_add_follow_up';
    if (msg === 'meeting_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[meetings/follow-ups] error:', e);
    return NextResponse.json({ error: 'failed_to_add_follow_up' }, { status: 500 });
  }
}
