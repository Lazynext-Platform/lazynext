import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings — list meetings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ meetings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: {
    type?: string;
    status?: string;
    organizerId?: string;
    search?: string;
    dateRange?: { start: Date; end: Date };
  } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const organizerId = url.searchParams.get('organizerId');
  const search = url.searchParams.get('search');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (type) filters.type = type;
  if (status) filters.status = status;
  if (organizerId) filters.organizerId = organizerId;
  if (search) filters.search = search;
  if (dateStart && dateEnd) {
    filters.dateRange = { start: new Date(dateStart), end: new Date(dateEnd) };
  }

  const meetings = await MeetingService.list(organizationId, filters);
  return NextResponse.json({ meetings });
}

/** POST /api/meetings — create a meeting */
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
  if (!body.scheduledAt) {
    return NextResponse.json({ error: 'scheduledAt_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const meeting = await MeetingService.create(organizationId, {
      title,
      description: body.description,
      type: body.type,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration,
      location: body.location,
      organizerId: body.organizerId || session.user.id,
      attendeeIds: Array.isArray(body.attendeeIds) ? body.attendeeIds : undefined,
      agenda: Array.isArray(body.agenda) ? body.agenda : undefined,
      workspaceId: body.workspaceId,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (e) {
    console.error('[meetings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_meeting' }, { status: 500 });
  }
}
