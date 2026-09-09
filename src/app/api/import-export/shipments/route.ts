import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ shipments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['direction', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const shipments = await ImportExportService.listShipments(organizationId, opts as never);
  return NextResponse.json({ shipments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reference = String(body.reference || '').trim();
  const direction = String(body.direction || '').trim();
  const type = String(body.type || '').trim();
  if (!reference || !direction || !type) return NextResponse.json({ error: 'reference_direction_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const shipment = await ImportExportService.createShipment(ws.organizationId, ws.id, {
      reference, direction: direction as never, type: type as never,
      description: body.description, status: body.status,
      originCountry: body.originCountry, destinationCountry: body.destinationCountry,
      originPort: body.originPort, destinationPort: body.destinationPort,
      carrier: body.carrier, vessel: body.vessel, trackingNumber: body.trackingNumber,
      estimatedArrival: body.estimatedArrival, actualArrival: body.actualArrival,
      containerNumber: body.containerNumber, billOfLading: body.billOfLading,
      incoterms: body.incoterms, value: body.value, currency: body.currency, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ shipment }, { status: 201 });
  } catch (e) {
    console.error('[import-export/shipments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_shipment' }, { status: 500 });
  }
}
