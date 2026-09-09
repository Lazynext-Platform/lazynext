import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** POST /api/calendar/events/[id]/cancel — cancel an event */
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
    const event = await CalendarService.cancel(id);
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[calendar/events/[id]/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_event' }, { status: 500 });
  }
}
