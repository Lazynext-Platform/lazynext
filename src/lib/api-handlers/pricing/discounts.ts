import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/discounts — list discount rules */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ discounts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const discounts = await PricingService.listDiscountRules(organizationId, opts as never);
  return NextResponse.json({ discounts });
}

/** POST /api/pricing/discounts — create a discount rule */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type || body.value === undefined) {
    return NextResponse.json({ error: 'name_type_value_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const discount = await PricingService.createDiscountRule(
      ws.organizationId, ws.id,
      {
        name, type: type as never, value: Number(body.value),
        conditions: body.conditions, minQuantity: body.minQuantity,
        maxQuantity: body.maxQuantity, validFrom: body.validFrom, validTo: body.validTo,
        appliesTo: body.appliesTo, stackable: body.stackable, status: body.status,
        usageLimit: body.usageLimit, usageCount: body.usageCount,
      },
      session.user.id,
    );
    return NextResponse.json({ discount }, { status: 201 });
  } catch (e) {
    console.error('[pricing/discounts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_discount' }, { status: 500 });
  }
}
