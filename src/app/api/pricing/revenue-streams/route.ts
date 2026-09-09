import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/revenue-streams — list revenue streams */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ revenueStreams: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const revenueStreams = await PricingService.listRevenueStreams(organizationId, opts as never);
  return NextResponse.json({ revenueStreams });
}

/** POST /api/pricing/revenue-streams — create a revenue stream */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const revenueStream = await PricingService.createRevenueStream(
      ws.organizationId, ws.id,
      {
        name, type: type as never,
        description: body.description, pricingModelId: body.pricingModelId,
        currentMrr: body.currentMrr, projectedMrr: body.projectedMrr,
        growthRate: body.growthRate, status: body.status, startDate: body.startDate,
      },
      session.user.id,
    );
    return NextResponse.json({ revenueStream }, { status: 201 });
  } catch (e) {
    console.error('[pricing/revenue-streams] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_revenue_stream' }, { status: 500 });
  }
}
