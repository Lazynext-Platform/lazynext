import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/discounts/[id] — get a single discount rule */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const discount = await PricingService.getDiscountRule(id);
  if (!discount) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ discount });
}

/** PATCH /api/pricing/discounts/[id] — update a discount rule */
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
    const discount = await PricingService.updateDiscountRule(id, {
      name: body.name, type: body.type,
      value: body.value !== undefined ? Number(body.value) : undefined,
      conditions: body.conditions, minQuantity: body.minQuantity, maxQuantity: body.maxQuantity,
      validFrom: body.validFrom, validTo: body.validTo, appliesTo: body.appliesTo,
      stackable: body.stackable, status: body.status,
      usageLimit: body.usageLimit, usageCount: body.usageCount,
    });
    if (!discount) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ discount });
  } catch (e) {
    console.error('[pricing/discounts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_discount' }, { status: 500 });
  }
}

/** DELETE /api/pricing/discounts/[id] — delete a discount rule */
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
    const ok = await PricingService.deleteDiscountRule(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[pricing/discounts] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_discount' }, { status: 500 });
  }
}
