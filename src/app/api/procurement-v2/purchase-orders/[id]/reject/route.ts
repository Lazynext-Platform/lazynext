import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/reject — reject a PO */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const purchaseOrder = await PurchaseOrderService.reject(id, body.reason);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
