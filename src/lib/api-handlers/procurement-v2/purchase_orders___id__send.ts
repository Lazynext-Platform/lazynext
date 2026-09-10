import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/send — send a PO to vendor */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const purchaseOrder = await PurchaseOrderService.send(id);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
