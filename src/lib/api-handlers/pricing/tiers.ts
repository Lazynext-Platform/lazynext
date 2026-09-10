import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/tiers — list pricing tiers */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tiers: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { modelId?: string; status?: string } = {};
  const modelId = url.searchParams.get('modelId');
  const status = url.searchParams.get('status');
  if (modelId) opts.modelId = modelId;
  if (status) opts.status = status;

  const tiers = await PricingService.listTiers(organizationId, opts as never);
  return NextResponse.json({ tiers });
}

/** POST /api/pricing/tiers — create a pricing tier */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const modelId = String(body.modelId || '').trim();
  const name = String(body.name || '').trim();
  const billingPeriod = String(body.billingPeriod || '').trim();
  if (!modelId || !name || !billingPeriod || body.price === undefined) {
    return NextResponse.json({ error: 'modelId_name_price_billingPeriod_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const tier = await PricingService.createTier(
      ws.organizationId, ws.id,
      {
        modelId, name, price: Number(body.price),
        billingPeriod: billingPeriod as never,
        features: body.features, limits: body.limits,
        targetSegment: body.targetSegment, status: body.status, sortOrder: body.sortOrder,
      },
      session.user.id,
    );
    return NextResponse.json({ tier }, { status: 201 });
  } catch (e) {
    console.error('[pricing/tiers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_tier' }, { status: 500 });
  }
}
