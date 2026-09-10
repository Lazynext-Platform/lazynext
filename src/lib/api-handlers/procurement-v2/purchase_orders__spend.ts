import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders/spend — total PO spend */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;
  const totalSpend = await PurchaseOrderService.getTotalSpend(resolved.organizationId, {
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
  });
  return NextResponse.json({ totalSpend });
}
