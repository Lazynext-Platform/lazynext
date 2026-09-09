import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';

/** GET /api/travel/cost-summary — travel cost summary */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const summary = await TravelService.getTravelCostSummary(organizationId, {
    fromDate: sp.get('fromDate') ? new Date(sp.get('fromDate')!) : undefined,
    toDate: sp.get('toDate') ? new Date(sp.get('toDate')!) : undefined,
  });

  return NextResponse.json({ summary });
}
