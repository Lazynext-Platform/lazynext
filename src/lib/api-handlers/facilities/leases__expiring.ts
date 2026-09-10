import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** GET /api/facilities/leases/expiring — list expiring leases */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get('days')) || 90;

  const leases = await FacilitiesService.getExpiringLeases(organizationId, days);
  return NextResponse.json({ leases });
}
