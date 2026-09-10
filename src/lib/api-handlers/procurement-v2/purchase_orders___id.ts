import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders/[id] — get a PO by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const purchaseOrder = await PurchaseOrderService.get(id);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}

/** PATCH /api/procurement-v2/purchase-orders/[id] — update a PO */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const purchaseOrder = await PurchaseOrderService.update(id, {
      vendorName: body.vendorName,
      items: body.items,
      expectedDeliveryDate: body.expectedDeliveryDate,
      notes: body.notes,
    });
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ purchaseOrder });
  } catch (e) {
    console.error('[procurement-v2/purchase-orders] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_purchase_order' }, { status: 500 });
  }
}

/** DELETE /api/procurement-v2/purchase-orders/[id] — delete a PO */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await PurchaseOrderService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
