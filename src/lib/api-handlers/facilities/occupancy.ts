import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** GET /api/facilities/occupancy — occupancy report */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const report = await FacilitiesService.getOccupancyReport(resolved.organizationId);
  return NextResponse.json({ report });
}
