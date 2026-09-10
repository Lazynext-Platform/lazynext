import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplierScorecardService } from '@/lib/services/supplier-scorecard-service';
import { PurchaseOrderService } from '@/lib/services/purchase-order-service';
import { RFQService } from '@/lib/services/rfq-service';

/** GET /api/procurement-v2/stats — overall procurement stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  const [scorecardStats, poStats, rfqStats] = await Promise.all([
    SupplierScorecardService.getStats(organizationId),
    PurchaseOrderService.getStats(organizationId),
    RFQService.getStats(organizationId),
  ]);

  return NextResponse.json({
    scorecards: scorecardStats,
    purchaseOrders: poStats,
    rfqs: rfqStats,
  });
}
