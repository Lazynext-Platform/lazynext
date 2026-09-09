import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const speaker = await EventsService.confirmSpeaker(id, session.user.id);
    if (!speaker) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ speaker });
  } catch (e) {
    console.error('[corp-events/speakers/confirm] error:', e);
    return NextResponse.json({ error: 'failed_to_confirm_speaker' }, { status: 500 });
  }
}
