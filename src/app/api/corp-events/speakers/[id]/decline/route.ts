import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  try {
    const speaker = await EventsService.declineSpeaker(id, reason, session.user.id);
    if (!speaker) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ speaker });
  } catch (e) {
    console.error('[corp-events/speakers/decline] error:', e);
    return NextResponse.json({ error: 'failed_to_decline_speaker' }, { status: 500 });
  }
}
