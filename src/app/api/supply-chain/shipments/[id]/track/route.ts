import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { ShipmentStatus } from '@/lib/services/supply-chain-service';

/** POST /api/supply-chain/shipments/[id]/track — track a shipment */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim() as ShipmentStatus;
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const shipment = await SupplyChainService.trackShipment(
      id,
      status,
      body.location,
      body.notes,
    );
    if (!shipment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ shipment });
  } catch (e) {
    console.error('[supply-chain/shipments/track] error:', e);
    return NextResponse.json({ error: 'failed_to_track_shipment' }, { status: 500 });
  }
}
