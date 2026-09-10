import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** PATCH /api/meetings/[id]/follow-ups/[followUpId] — mark follow-up complete */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string; followUpId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, followUpId } = params;
  try {
    const result = await MeetingService.completeFollowUp(id, followUpId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_complete_follow_up';
    if (msg === 'meeting_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[meetings/follow-ups/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_follow_up' }, { status: 500 });
  }
}
