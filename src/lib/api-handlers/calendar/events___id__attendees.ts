import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/events/[id]/attendees — list attendees */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const attendees = await CalendarService.getAttendees(id);
  return NextResponse.json({ attendees });
}

/** POST /api/calendar/events/[id]/attendees — add an attendee */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId_required' }, { status: 400 });
  }

  try {
    const event = await CalendarService.addAttendee(id, userId);
    if (!event) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[calendar/events/[id]/attendees] add error:', e);
    return NextResponse.json({ error: 'failed_to_add_attendee' }, { status: 500 });
  }
}

/** DELETE /api/calendar/events/[id]/attendees — remove an attendee */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const userId = sp.get('userId') || '';
  if (!userId) {
    return NextResponse.json({ error: 'userId_required' }, { status: 400 });
  }

  try {
    const event = await CalendarService.removeAttendee(id, userId);
    if (!event) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[calendar/events/[id]/attendees] remove error:', e);
    return NextResponse.json({ error: 'failed_to_remove_attendee' }, { status: 500 });
  }
}
