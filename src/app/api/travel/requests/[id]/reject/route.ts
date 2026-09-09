import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';

/** POST /api/travel/requests/[id]/reject — reject a travel request */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const request = await TravelService.rejectTravelRequest(id, reason, userId);
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[travel/requests/reject] error:', e);
    return NextResponse.json({ error: 'failed_to_reject_travel_request' }, { status: 500 });
  }
}
