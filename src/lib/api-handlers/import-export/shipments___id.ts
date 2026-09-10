import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const shipment = await ImportExportService.getShipment(id);
  if (!shipment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ shipment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const shipment = await ImportExportService.updateShipment(id, body);
    if (!shipment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ shipment });
  } catch (e) {
    console.error('[import-export/shipments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_shipment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ImportExportService.deleteShipment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
