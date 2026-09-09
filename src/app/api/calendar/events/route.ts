import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';

/** GET /api/calendar/events — list calendar events with filters */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const events = await CalendarService.list(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    type: sp.get('type') || undefined,
    status: sp.get('status') || undefined,
    organizerId: sp.get('organizerId') || undefined,
    attendeeUserId: sp.get('attendeeUserId') || undefined,
    tag: sp.get('tag') || undefined,
    startDate: sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined,
    endDate: sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined,
    limit: sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined,
  });

  return NextResponse.json({ events });
}

/** POST /api/calendar/events — create a calendar event */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'start_end_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const event = await CalendarService.create(organizationId, {
      title,
      description: body.description,
      type: body.type,
      workspaceId: body.workspaceId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      allDay: body.allDay,
      timezone: body.timezone,
      location: body.location,
      meetingUrl: body.meetingUrl,
      organizerId: session.user.id,
      attendees: body.attendees,
      resources: body.resources,
      recurrence: body.recurrence,
      color: body.color,
      tags: body.tags,
      reminders: body.reminders,
      linkedTaskId: body.linkedTaskId,
      linkedGoalId: body.linkedGoalId,
      linkedProjectId: body.linkedProjectId,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error('[calendar/events] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_event' }, { status: 500 });
  }
}
