import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarResourceService } from '@/lib/services/calendar-resource-service';

/** GET /api/calendar/resources/[id] — get a single resource */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const resource = await CalendarResourceService.get(id);
  if (!resource) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ resource });
}

/** PATCH /api/calendar/resources/[id] — update a resource */
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
    const resource = await CalendarResourceService.update(id, {
      name: body.name,
      type: body.type,
      capacity: body.capacity,
      location: body.location,
      description: body.description,
      active: body.active,
    });
    return NextResponse.json({ resource });
  } catch (e) {
    console.error('[calendar/resources/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_resource' }, { status: 500 });
  }
}

/** DELETE /api/calendar/resources/[id] — delete a resource */
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
    await CalendarResourceService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[calendar/resources/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_resource' }, { status: 500 });
  }
}
