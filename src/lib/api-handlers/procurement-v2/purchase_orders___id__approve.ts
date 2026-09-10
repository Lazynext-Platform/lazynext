import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** POST /api/procurement-v2/purchase-orders/[id]/approve — approve a PO */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = params;
  const purchaseOrder = await PurchaseOrderService.approve(id, session.user.id);
  if (!purchaseOrder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ purchaseOrder });
}
