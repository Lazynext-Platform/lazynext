import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/events/[id] — get a single event */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const event = await CalendarService.get(id);
  if (!event) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ event });
}

/** PATCH /api/calendar/events/[id] — update an event */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const event = await CalendarService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      allDay: body.allDay,
      timezone: body.timezone,
      location: body.location,
      meetingUrl: body.meetingUrl,
      recurrence: body.recurrence,
      color: body.color,
      tags: body.tags,
      reminders: body.reminders,
    });
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[calendar/events/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_event' }, { status: 500 });
  }
}

/** DELETE /api/calendar/events/[id] — delete an event */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await CalendarService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[calendar/events/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_event' }, { status: 500 });
  }
}
