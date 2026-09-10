import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';
import type { CampaignType, CampaignStatus } from '@/lib/services/marketing-campaign-service';

/** GET /api/marketing-ops/campaigns — list campaigns */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;

  const campaigns = await MarketingCampaignService.list(resolved.organizationId, {
    type: (sp.get('type') as CampaignType) || undefined,
    status: (sp.get('status') as CampaignStatus) || undefined,
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ campaigns });
}

/** POST /api/marketing-ops/campaigns — create a campaign */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.type || !body.startDate) {
    return NextResponse.json({ error: 'type_and_start_date_required' }, { status: 400 });
  }

  try {
    const campaign = await MarketingCampaignService.create(organizationId, {
      name,
      description: body.description,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget !== undefined ? Number(body.budget) : undefined,
      status: body.status,
      channels: body.channels,
      goals: body.goals,
      targetAudience: body.targetAudience,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    console.error('[marketing-ops/campaigns] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_campaign' }, { status: 500 });
  }
}
