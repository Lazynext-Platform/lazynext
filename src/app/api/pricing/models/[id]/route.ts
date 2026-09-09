import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PricingService } from '@/lib/services/pricing-service';

/** GET /api/pricing/models/[id] — get a single pricing model */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const model = await PricingService.getModel(id);
  if (!model) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ model });
}

/** PATCH /api/pricing/models/[id] — update a pricing model */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const model = await PricingService.updateModel(id, {
      name: body.name, type: body.type, description: body.description,
      currency: body.currency, status: body.status,
      effectiveDate: body.effectiveDate, version: body.version,
    });
    if (!model) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ model });
  } catch (e) {
    console.error('[pricing/models] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_model' }, { status: 500 });
  }
}

/** DELETE /api/pricing/models/[id] — delete a pricing model */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await PricingService.deleteModel(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[pricing/models] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_model' }, { status: 500 });
  }
}
