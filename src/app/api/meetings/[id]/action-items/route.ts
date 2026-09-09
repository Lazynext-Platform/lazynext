import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings/[id]/action-items — get action items for a meeting */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await MeetingService.get(id);
  if (!meeting) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ actionItems: meeting.actionItems });
}

/** POST /api/meetings/[id]/action-items — extract action items from notes */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await MeetingService.extractActionItems(id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_extract_action_items';
    if (msg === 'meeting_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[meetings/action-items] error:', e);
    return NextResponse.json({ error: 'failed_to_extract_action_items' }, { status: 500 });
  }
}
