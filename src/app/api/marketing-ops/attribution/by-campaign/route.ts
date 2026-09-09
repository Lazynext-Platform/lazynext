import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/by-campaign — attributions grouped by campaign */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const byCampaign = await LeadAttributionService.getByCampaign(resolved.organizationId);
  return NextResponse.json({ byCampaign });
}
