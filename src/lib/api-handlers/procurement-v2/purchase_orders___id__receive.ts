import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/receive — receive goods */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.receivedItems)) {
    return NextResponse.json({ error: 'received_items_required' }, { status: 400 });
  }
  const purchaseOrder = await PurchaseOrderService.receive(id, {
    receivedItems: body.receivedItems,
    notes: body.notes,
  });
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
