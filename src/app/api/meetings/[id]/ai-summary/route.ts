import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** POST /api/meetings/[id]/ai-summary — generate AI summary */
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
    const meeting = await MeetingService.generateAiSummary(id);
    return NextResponse.json({ meeting });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_generate_summary';
    if (msg === 'meeting_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[meetings/ai-summary] error:', e);
    return NextResponse.json({ error: 'failed_to_generate_summary' }, { status: 500 });
  }
}
