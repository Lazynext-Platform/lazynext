import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/by-type — campaigns grouped by type */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const byType = await MarketingCampaignService.getByType(resolved.organizationId);
  return NextResponse.json({ byType });
}
