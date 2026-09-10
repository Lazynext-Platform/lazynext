import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/[id]/performance — aggregate performance metrics */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const performance = await MarketingCampaignService.getCampaignPerformance(id);
  return NextResponse.json({ performance });
}
