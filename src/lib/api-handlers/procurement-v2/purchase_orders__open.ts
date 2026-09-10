import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders/open — open POs (not yet received) */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const purchaseOrders = await PurchaseOrderService.getOpenPOs(resolved.organizationId);
  return NextResponse.json({ purchaseOrders });
}
