import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/cancel — cancel a PO */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const purchaseOrder = await PurchaseOrderService.cancel(id);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
