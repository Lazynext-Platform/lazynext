import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { SupplyChainService } from '@/lib/services/supply-chain-service';
import type { ShipmentStatus } from '@/lib/services/supply-chain-service';

/** GET /api/supply-chain/shipments — list shipments */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const shipments = await SupplyChainService.listShipments(organizationId, {
    supplierId: sp.get('supplierId') || undefined,
    status: (sp.get('status') as ShipmentStatus) || undefined,
    carrier: sp.get('carrier') || undefined,
  });

  return NextResponse.json({ shipments });
}

/** POST /api/supply-chain/shipments — create a shipment */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const supplierId = String(body.supplierId || '').trim();
  const origin = String(body.origin || '').trim();
  const destination = String(body.destination || '').trim();
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId_required' }, { status: 400 });
  }
  if (!origin) {
    return NextResponse.json({ error: 'origin_required' }, { status: 400 });
  }
  if (!destination) {
    return NextResponse.json({ error: 'destination_required' }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  try {
    const shipment = await SupplyChainService.createShipment(
      organizationId,
      body.workspaceId || organizationId,
      {
        supplierId,
        origin,
        destination,
        carrier: body.carrier,
        trackingNumber: body.trackingNumber,
        status: body.status as ShipmentStatus | undefined,
        expectedArrival: body.expectedArrival,
        items: body.items,
        totalValue: body.totalValue,
      },
      userId,
    );
    return NextResponse.json({ shipment }, { status: 201 });
  } catch (e) {
    console.error('[supply-chain/shipments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_shipment' }, { status: 500 });
  }
}
