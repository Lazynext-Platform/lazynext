import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';

/** GET /api/travel/stats — travel stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await TravelService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
