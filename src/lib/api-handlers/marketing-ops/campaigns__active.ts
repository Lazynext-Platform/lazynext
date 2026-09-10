import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/active — active campaigns */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const campaigns = await MarketingCampaignService.getActiveCampaigns(resolved.organizationId);
  return NextResponse.json({ campaigns });
}
