import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/deals — list deals */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ deals: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { partnerId?: string; stage?: string; status?: string } = {};
  const partnerId = url.searchParams.get('partnerId');
  const stage = url.searchParams.get('stage');
  const status = url.searchParams.get('status');
  if (partnerId) opts.partnerId = partnerId;
  if (stage) opts.stage = stage;
  if (status) opts.status = status;

  const deals = await PartnerService.listDeals(organizationId, opts as never);
  return NextResponse.json({ deals });
}

/** POST /api/partners/deals — create a deal */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const partnerId = String(body.partnerId || '').trim();
  const customerName = String(body.customerName || '').trim();
  const stage = String(body.stage || '').trim();
  const dealValue = Number(body.dealValue);
  if (!partnerId || !customerName || !stage || isNaN(dealValue)) {
    return NextResponse.json({ error: 'partnerId_customerName_stage_dealValue_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const deal = await PartnerService.createDeal(
      ws.organizationId, ws.id,
      {
        partnerId, customerName, dealValue, stage: stage as never,
        expectedCloseDate: body.expectedCloseDate, description: body.description,
        dealType: body.dealType, margin: body.margin, registeredDate: body.registeredDate,
        status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e) {
    console.error('[partners/deals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_deal' }, { status: 500 });
  }
}
