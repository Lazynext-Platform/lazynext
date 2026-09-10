import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns/[id] — get a campaign by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const campaign = await MarketingCampaignService.get(id);
  if (!campaign) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

/** PATCH /api/marketing-ops/campaigns/[id] — update a campaign */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const campaign = await MarketingCampaignService.update(id, {
      name: body.name,
      description: body.description,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget !== undefined ? Number(body.budget) : undefined,
      channels: body.channels,
      goals: body.goals,
      targetAudience: body.targetAudience,
    });
    if (!campaign) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[marketing-ops/campaigns] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_campaign' }, { status: 500 });
  }
}

/** DELETE /api/marketing-ops/campaigns/[id] — delete a campaign */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await MarketingCampaignService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
