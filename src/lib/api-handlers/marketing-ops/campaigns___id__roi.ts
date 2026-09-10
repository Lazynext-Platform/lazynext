import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/[id]/roi — calculate ROI for a campaign */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const roi = await MarketingCampaignService.getROI(id);
  return NextResponse.json({ roi });
}
