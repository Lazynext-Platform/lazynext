import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EventsService } from '@/lib/services/events-service';

/** GET /api/corp-events/events — list events */
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
  const url = new URL(req.url);
  const opts: { type?: string; status?: string; organizer?: string; dateFrom?: string; dateTo?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const organizer = url.searchParams.get('organizer');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (organizer) opts.organizer = organizer;
  if (dateFrom) opts.dateFrom = dateFrom;
  if (dateTo) opts.dateTo = dateTo;

  const events = await EventsService.listEvents(organizationId, opts as never);
  return NextResponse.json({ events });
}

/** POST /api/corp-events/events — create an event */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const startDate = String(body.startDate || '').trim();
  if (!title || !type || !startDate) {
    return NextResponse.json({ error: 'title_type_startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const event = await EventsService.createEvent(
      ws.organizationId, ws.id,
      {
        title, type: type as never, startDate,
        description: body.description, endDate: body.endDate, location: body.location,
        capacity: body.capacity, budget: body.budget, status: body.status,
        organizer: body.organizer, targetAudience: body.targetAudience, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error('[corp-events/events] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_event' }, { status: 500 });
  }
}
