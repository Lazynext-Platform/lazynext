import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/stats — attribution stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await LeadAttributionService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
