import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/[id]/performance — aggregate performance metrics */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const performance = await MarketingCampaignService.getCampaignPerformance(id);
  return NextResponse.json({ performance });
}
