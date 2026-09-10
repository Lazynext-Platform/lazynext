import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';
import type { ItineraryType } from '@/lib/services/travel-service';

/** GET /api/travel/requests/[id]/itinerary — list itinerary items */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const itinerary = await TravelService.getItinerary(id);
  return NextResponse.json({ itinerary });
}

/** POST /api/travel/requests/[id]/itinerary — add an itinerary item */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;
  const { id } = params;

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim() as ItineraryType;
  const title = String(body.title || '').trim();
  const date = body.date ? new Date(body.date) : null;
  if (!type || !title || !date) {
    return NextResponse.json({ error: 'type_title_date_required' }, { status: 400 });
  }

  try {
    const item = await TravelService.addItineraryItem(
      id,
      organizationId,
      body.workspaceId || organizationId,
      {
        type,
        title,
        date,
        location: body.location,
        details: body.details,
        cost: body.cost,
      },
      userId,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[travel/itinerary] create error:', e);
    return NextResponse.json({ error: 'failed_to_add_itinerary_item' }, { status: 500 });
  }
}
