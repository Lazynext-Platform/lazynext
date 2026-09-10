import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/deals — list M&A deals */
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
  const opts: { status?: string; type?: string; targetId?: string } = {};
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const targetId = url.searchParams.get('targetId');
  if (status) opts.status = status;
  if (type) opts.type = type;
  if (targetId) opts.targetId = targetId;

  const deals = await MAService.listDeals(organizationId, opts as never);
  return NextResponse.json({ deals });
}

/** POST /api/ma/deals — create an M&A deal */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetId = String(body.targetId || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!targetId || !name || !type) {
    return NextResponse.json({ error: 'targetId_name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const deal = await MAService.createDeal(
      ws.organizationId, ws.id,
      {
        targetId, name, type: type as never,
        status: body.status, dealValue: body.dealValue, structure: body.structure,
        expectedCloseDate: body.expectedCloseDate, lead: body.lead, team: body.team,
      },
      session.user.id,
    );
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e) {
    console.error('[ma/deals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_deal' }, { status: 500 });
  }
}
