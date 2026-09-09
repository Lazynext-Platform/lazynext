import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** POST /api/calendar/free-slots — find free time slots */
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
  if (!body.date) {
    return NextResponse.json({ error: 'date_required' }, { status: 400 });
  }
  const durationMin = parseInt(body.durationMin, 10) || 30;

  const slots = await CalendarService.findFreeSlots(
    attendeeIds,
    new Date(body.date),
    durationMin,
    body.timezone || 'UTC',
    body.workingHours,
  );

  return NextResponse.json({ slots });
}
