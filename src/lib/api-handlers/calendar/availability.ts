import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** POST /api/calendar/availability — check attendee availability */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const attendeeIds = Array.isArray(body.attendeeIds) ? body.attendeeIds : [];
  if (attendeeIds.length === 0) {
    return NextResponse.json({ error: 'attendeeIds_required' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'start_end_required' }, { status: 400 });
  }

  const result = await CalendarService.checkAvailability(
    attendeeIds,
    new Date(body.startDate),
    new Date(body.endDate),
    body.timezone || 'UTC',
  );

  return NextResponse.json(result);
}
