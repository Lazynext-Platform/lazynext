import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EventsService } from '@/lib/services/events-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ speakers: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { eventId?: string; status?: string } = {};
  const eventId = url.searchParams.get('eventId');
  const status = url.searchParams.get('status');
  if (eventId) opts.eventId = eventId;
  if (status) opts.status = status;
  const speakers = await EventsService.listSpeakers(organizationId, opts as never);
  return NextResponse.json({ speakers });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || '').trim();
  const name = String(body.name || '').trim();
  const title = String(body.title || '').trim();
  if (!eventId || !name || !title) {
    return NextResponse.json({ error: 'event_name_title_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const speaker = await EventsService.createSpeaker(
      ws.organizationId, ws.id,
      {
        eventId, name, title, bio: body.bio, company: body.company, email: body.email,
        phone: body.phone, photoUrl: body.photoUrl, topic: body.topic, status: body.status,
        presentationTitle: body.presentationTitle, presentationDuration: body.presentationDuration,
      },
      session.user.id,
    );
    return NextResponse.json({ speaker }, { status: 201 });
  } catch (e) {
    console.error('[corp-events/speakers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_speaker' }, { status: 500 });
  }
}
