import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/[id]/metrics — get all metrics for a campaign */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const metrics = await MarketingCampaignService.getMetrics(id);
  return NextResponse.json({ metrics });
}

/** POST /api/marketing-ops/campaigns/[id]/metrics — record campaign metrics */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (!body.date) {
    return NextResponse.json({ error: 'date_required' }, { status: 400 });
  }

  try {
    const campaign = await MarketingCampaignService.recordMetrics(id, {
      impressions: body.impressions !== undefined ? Number(body.impressions) : undefined,
      clicks: body.clicks !== undefined ? Number(body.clicks) : undefined,
      conversions: body.conversions !== undefined ? Number(body.conversions) : undefined,
      leads: body.leads !== undefined ? Number(body.leads) : undefined,
      revenue: body.revenue !== undefined ? Number(body.revenue) : undefined,
      spend: body.spend !== undefined ? Number(body.spend) : undefined,
      date: body.date,
    });
    if (!campaign) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[marketing-ops/campaigns/metrics] error:', e);
    return NextResponse.json({ error: 'failed_to_record_metrics' }, { status: 500 });
  }
}
