import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const event = await EventsService.completeEvent(id, session.user.id);
    if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[corp-events/events/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_event' }, { status: 500 });
  }
}
