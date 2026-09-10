import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders/by-vendor — POs grouped by vendor */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const byVendor = await PurchaseOrderService.getByVendor(resolved.organizationId);
  return NextResponse.json({ byVendor });
}
