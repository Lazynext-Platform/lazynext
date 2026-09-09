import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EventsService } from '@/lib/services/events-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ venues: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; capacityMin?: number } = {};
  const status = url.searchParams.get('status');
  const capacityMin = url.searchParams.get('capacityMin');
  if (status) opts.status = status;
  if (capacityMin) opts.capacityMin = Number(capacityMin);
  const venues = await EventsService.listVenues(organizationId, opts as never);
  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const address = String(body.address || '').trim();
  const capacity = Number(body.capacity);
  if (!name || !address || isNaN(capacity)) {
    return NextResponse.json({ error: 'name_address_capacity_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const venue = await EventsService.createVenue(
      ws.organizationId, ws.id,
      {
        name, address, capacity, description: body.description, facilities: body.facilities,
        rentalCost: body.rentalCost, contactName: body.contactName, contactPhone: body.contactPhone,
        contactEmail: body.contactEmail, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ venue }, { status: 201 });
  } catch (e) {
    console.error('[corp-events/venues] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_venue' }, { status: 500 });
  }
}
