import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/revenue-streams/[id] — get a single revenue stream */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const revenueStream = await PricingService.getRevenueStream(id);
  if (!revenueStream) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ revenueStream });
}

/** PATCH /api/pricing/revenue-streams/[id] — update a revenue stream */
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
    const revenueStream = await PricingService.updateRevenueStream(id, {
      name: body.name, type: body.type, description: body.description,
      pricingModelId: body.pricingModelId,
      currentMrr: body.currentMrr !== undefined ? Number(body.currentMrr) : undefined,
      projectedMrr: body.projectedMrr !== undefined ? Number(body.projectedMrr) : undefined,
      growthRate: body.growthRate !== undefined ? Number(body.growthRate) : undefined,
      status: body.status, startDate: body.startDate,
    });
    if (!revenueStream) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ revenueStream });
  } catch (e) {
    console.error('[pricing/revenue-streams] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_revenue_stream' }, { status: 500 });
  }
}

/** DELETE /api/pricing/revenue-streams/[id] — delete a revenue stream */
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
    const ok = await PricingService.deleteRevenueStream(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[pricing/revenue-streams] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_revenue_stream' }, { status: 500 });
  }
}
