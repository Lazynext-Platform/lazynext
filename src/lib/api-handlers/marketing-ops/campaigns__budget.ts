import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/budget — budget vs spend across campaigns */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const budget = await MarketingCampaignService.getBudgetUtilization(resolved.organizationId);
  return NextResponse.json({ budget });
}
