import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';

/** GET /api/procurement-v2/purchase-orders/by-status — POs grouped by status */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const byStatus = await PurchaseOrderService.getByStatus(resolved.organizationId);
  return NextResponse.json({ byStatus });
}
