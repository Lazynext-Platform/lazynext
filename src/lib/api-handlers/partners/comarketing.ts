import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/comarketing — list co-marketing campaigns */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ comarketing: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { partnerId?: string; type?: string; status?: string } = {};
  const partnerId = url.searchParams.get('partnerId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (partnerId) opts.partnerId = partnerId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const comarketing = await PartnerService.listCoMarketing(organizationId, opts as never);
  return NextResponse.json({ comarketing });
}

/** POST /api/partners/comarketing — create a co-marketing campaign */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const partnerId = String(body.partnerId || '').trim();
  const campaignName = String(body.campaignName || '').trim();
  const type = String(body.type || '').trim();
  if (!partnerId || !campaignName || !type) {
    return NextResponse.json({ error: 'partnerId_campaignName_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const comarketing = await PartnerService.createCoMarketing(
      ws.organizationId, ws.id,
      {
        partnerId, campaignName, type: type as never,
        description: body.description, budget: body.budget, costShare: body.costShare,
        startDate: body.startDate, endDate: body.endDate, status: body.status,
        expectedLeads: body.expectedLeads, actualLeads: body.actualLeads,
      },
      session.user.id,
    );
    return NextResponse.json({ comarketing }, { status: 201 });
  } catch (e) {
    console.error('[partners/comarketing] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_comarketing' }, { status: 500 });
  }
}
