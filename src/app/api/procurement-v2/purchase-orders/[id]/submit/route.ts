import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/submit — submit for approval */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const purchaseOrder = await PurchaseOrderService.submit(id);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
