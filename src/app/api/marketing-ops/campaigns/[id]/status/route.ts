import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';
import type { CampaignStatus } from '@/lib/services/marketing-campaign-service';

/** POST /api/marketing-ops/campaigns/[id]/status — change status of a campaign */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }
  const campaign = await MarketingCampaignService.changeStatus(id, body.status as CampaignStatus);
  if (!campaign) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}
