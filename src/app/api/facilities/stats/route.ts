import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** GET /api/facilities/stats — facilities stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await FacilitiesService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
