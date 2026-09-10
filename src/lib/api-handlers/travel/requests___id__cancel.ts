import { NextRequest, NextResponse } from 'next/server';
import { TravelService } from '@/lib/services/travel-service';

/** POST /api/travel/requests/[id]/cancel — cancel a travel request */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const request = await TravelService.cancelTravelRequest(id, reason);
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[travel/requests/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_travel_request' }, { status: 500 });
  }
}
