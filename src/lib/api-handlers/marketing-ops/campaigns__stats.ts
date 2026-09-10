import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/stats — campaign stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await MarketingCampaignService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
