import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EventsService } from '@/lib/services/events-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ registrations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { eventId?: string; status?: string; attendeeName?: string } = {};
  const eventId = url.searchParams.get('eventId');
  const status = url.searchParams.get('status');
  const attendeeName = url.searchParams.get('attendeeName');
  if (eventId) opts.eventId = eventId;
  if (status) opts.status = status;
  if (attendeeName) opts.attendeeName = attendeeName;
  const registrations = await EventsService.listRegistrations(organizationId, opts as never);
  return NextResponse.json({ registrations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || '').trim();
  const attendeeName = String(body.attendeeName || '').trim();
  const attendeeEmail = String(body.attendeeEmail || '').trim();
  if (!eventId || !attendeeName || !attendeeEmail) {
    return NextResponse.json({ error: 'event_name_email_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const registration = await EventsService.createRegistration(
      ws.organizationId, ws.id,
      {
        eventId, attendeeName, attendeeEmail,
        attendeePhone: body.attendeePhone, company: body.company, jobTitle: body.jobTitle,
        dietaryRequirements: body.dietaryRequirements, status: body.status, registeredDate: body.registeredDate,
      },
      session.user.id,
    );
    return NextResponse.json({ registration }, { status: 201 });
  } catch (e) {
    console.error('[corp-events/registrations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_registration' }, { status: 500 });
  }
}
