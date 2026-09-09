import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';
import type { AttributionSource } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution — list attributions */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;

  const attributions = await LeadAttributionService.list(resolved.organizationId, {
    leadId: sp.get('leadId') || undefined,
    campaignId: sp.get('campaignId') || undefined,
    source: (sp.get('source') as AttributionSource) || undefined,
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
  });

  return NextResponse.json({ attributions });
}

/** POST /api/marketing-ops/attribution — create an attribution record */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const leadId = String(body.leadId || '').trim();
  if (!leadId) {
    return NextResponse.json({ error: 'lead_id_required' }, { status: 400 });
  }
  if (!body.source) {
    return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }

  try {
    const attribution = await LeadAttributionService.create(organizationId, {
      leadId,
      campaignId: body.campaignId,
      source: body.source,
      channel: body.channel,
      touchpoint: body.touchpoint,
      conversionValue: body.conversionValue !== undefined ? Number(body.conversionValue) : undefined,
      convertedAt: body.convertedAt,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ attribution }, { status: 201 });
  } catch (e) {
    console.error('[marketing-ops/attribution] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_attribution' }, { status: 500 });
  }
}
