import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EventsService } from '@/lib/services/events-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const venue = await EventsService.getVenue(id);
  if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ venue });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const venue = await EventsService.updateVenue(id, {
      name: body.name, address: body.address, capacity: body.capacity,
      description: body.description, facilities: body.facilities, rentalCost: body.rentalCost,
      contactName: body.contactName, contactPhone: body.contactPhone, contactEmail: body.contactEmail,
      status: body.status,
    });
    if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ venue });
  } catch (e) {
    console.error('[corp-events/venues] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_venue' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EventsService.deleteVenue(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
