import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { LogisticsStatus, FreightMode } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/logistics/[id] — get a logistics order by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const order = await SupplyChainService.getLogisticsOrder(id);
  if (!order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ order });
}

/** PATCH /api/supply-chain/logistics/[id] — update a logistics order */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const order = await SupplyChainService.updateLogisticsOrder(id, {
      shipmentId: body.shipmentId,
      supplierId: body.supplierId,
      orderDate: body.orderDate,
      expectedDelivery: body.expectedDelivery,
      freightMode: body.freightMode as FreightMode | undefined,
      cost: body.cost,
      destination: body.destination,
      status: body.status as LogisticsStatus | undefined,
    });
    if (!order) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (e) {
    console.error('[supply-chain/logistics] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_logistics_order' }, { status: 500 });
  }
}
