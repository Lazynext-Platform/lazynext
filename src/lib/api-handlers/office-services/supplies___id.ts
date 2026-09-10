import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const supply = await OfficeServicesService.getSupplyOrder(id);
  if (!supply) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ supply });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const supply = await OfficeServicesService.updateSupplyOrder(id, body);
    if (!supply) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ supply });
  } catch (e) {
    console.error('[office-services/supplies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_supply_order' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await OfficeServicesService.deleteSupplyOrder(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
