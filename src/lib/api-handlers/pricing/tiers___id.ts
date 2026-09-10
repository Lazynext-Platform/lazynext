import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/tiers/[id] — get a single pricing tier */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const tier = await PricingService.getTier(id);
  if (!tier) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ tier });
}

/** PATCH /api/pricing/tiers/[id] — update a pricing tier */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const tier = await PricingService.updateTier(id, {
      name: body.name, price: body.price !== undefined ? Number(body.price) : undefined,
      billingPeriod: body.billingPeriod, features: body.features, limits: body.limits,
      targetSegment: body.targetSegment, status: body.status, sortOrder: body.sortOrder,
    });
    if (!tier) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ tier });
  } catch (e) {
    console.error('[pricing/tiers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tier' }, { status: 500 });
  }
}

/** DELETE /api/pricing/tiers/[id] — delete a pricing tier */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await PricingService.deleteTier(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[pricing/tiers] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_tier' }, { status: 500 });
  }
}
