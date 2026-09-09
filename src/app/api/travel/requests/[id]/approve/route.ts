import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';

/** POST /api/travel/requests/[id]/approve — approve a travel request */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { userId } = resolved;
  const { id } = await params;

  try {
    const request = await TravelService.approveTravelRequest(id, userId);
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[travel/requests/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_travel_request' }, { status: 500 });
  }
}
