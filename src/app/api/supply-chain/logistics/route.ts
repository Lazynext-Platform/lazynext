import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { LogisticsStatus, FreightMode } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/logistics — list logistics orders */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const orders = await SupplyChainService.listLogisticsOrders(organizationId, {
    status: (sp.get('status') as LogisticsStatus) || undefined,
    freightMode: (sp.get('freightMode') as FreightMode) || undefined,
  });

  return NextResponse.json({ orders });
}

/** POST /api/supply-chain/logistics — create a logistics order */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const orderDate = String(body.orderDate || '').trim();
  if (!orderDate) {
    return NextResponse.json({ error: 'orderDate_required' }, { status: 400 });
  }

  try {
    const order = await SupplyChainService.createLogisticsOrder(
      organizationId,
      body.workspaceId || organizationId,
      {
        shipmentId: body.shipmentId,
        supplierId: body.supplierId,
        orderDate,
        expectedDelivery: body.expectedDelivery,
        freightMode: body.freightMode as FreightMode | undefined,
        cost: body.cost,
        destination: body.destination,
        status: body.status as LogisticsStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error('[supply-chain/logistics] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_logistics_order' }, { status: 500 });
  }
}
