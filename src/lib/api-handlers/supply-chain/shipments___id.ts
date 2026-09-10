import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { ShipmentStatus } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/shipments/[id] — get a shipment by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const shipment = await SupplyChainService.getShipment(id);
  if (!shipment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ shipment });
}

/** PATCH /api/supply-chain/shipments/[id] — update a shipment */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const shipment = await SupplyChainService.updateShipment(id, {
      origin: body.origin,
      destination: body.destination,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
      status: body.status as ShipmentStatus | undefined,
      expectedArrival: body.expectedArrival,
      items: body.items,
      totalValue: body.totalValue,
    });
    if (!shipment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ shipment });
  } catch (e) {
    console.error('[supply-chain/shipments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_shipment' }, { status: 500 });
  }
}
