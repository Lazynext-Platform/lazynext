import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarResourceService } from '@/lib/services/calendar-resource-service';

/** GET /api/calendar/resources — list resources */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ resources: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const resources = await CalendarResourceService.list(organizationId, {
    type: sp.get('type') || undefined,
    workspaceId: sp.get('workspaceId') || undefined,
    active: sp.get('active') !== null ? sp.get('active') === 'true' : undefined,
  });

  return NextResponse.json({ resources });
}

/** POST /api/calendar/resources — create a resource */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const resource = await CalendarResourceService.create(organizationId, {
      name,
      type: body.type,
      capacity: body.capacity,
      location: body.location,
      description: body.description,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (e) {
    console.error('[calendar/resources] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_resource' }, { status: 500 });
  }
}
