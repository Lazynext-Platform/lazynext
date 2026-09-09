import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MeetingService } from '@/lib/services/meeting-service';

/** GET /api/meetings/[id] — get a single meeting */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await MeetingService.get(id);
  if (!meeting) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ meeting });
}

/** PATCH /api/meetings/[id] — update a meeting */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const meeting = await MeetingService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      duration: body.duration,
      location: body.location,
      organizerId: body.organizerId,
      attendeeIds: Array.isArray(body.attendeeIds) ? body.attendeeIds : undefined,
      agenda: Array.isArray(body.agenda) ? body.agenda : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ meeting });
  } catch (e) {
    console.error('[meetings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_meeting' }, { status: 500 });
  }
}

/** DELETE /api/meetings/[id] — delete a meeting */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await MeetingService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[meetings] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_meeting' }, { status: 500 });
  }
}
