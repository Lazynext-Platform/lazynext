import { NextRequest, NextResponse } from 'next/server';
import { TravelService } from '@/lib/services/travel-service';
import type { TransportMode } from '@/lib/services/travel-service';

/** GET /api/travel/requests/[id] — get a travel request by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await TravelService.getTravelRequest(id);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ request });
}

/** PATCH /api/travel/requests/[id] — update a travel request */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const request = await TravelService.updateTravelRequest(id, {
      destination: body.destination,
      purpose: body.purpose,
      departureDate: body.departureDate ? new Date(body.departureDate) : undefined,
      returnDate: body.returnDate ? new Date(body.returnDate) : undefined,
      estimatedCost: body.estimatedCost,
      transportMode: body.transportMode as TransportMode | undefined,
      notes: body.notes,
    });
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[travel/requests] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_travel_request' }, { status: 500 });
  }
}
