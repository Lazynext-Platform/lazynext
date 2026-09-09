import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const event = await EventsService.getEvent(id);
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const event = await EventsService.updateEvent(id, {
      title: body.title, type: body.type, description: body.description,
      startDate: body.startDate, endDate: body.endDate, location: body.location,
      capacity: body.capacity, budget: body.budget, status: body.status,
      organizer: body.organizer, targetAudience: body.targetAudience, notes: body.notes,
    });
    if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[corp-events/events] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_event' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EventsService.deleteEvent(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
