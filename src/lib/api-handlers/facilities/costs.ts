import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** GET /api/facilities/costs — facility costs */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;
  const fromDate = sp.get('fromDate') ? new Date(sp.get('fromDate')!) : undefined;
  const toDate = sp.get('toDate') ? new Date(sp.get('toDate')!) : undefined;

  const costs = await FacilitiesService.getFacilityCosts(resolved.organizationId, { fromDate, toDate });
  return NextResponse.json({ costs });
}
