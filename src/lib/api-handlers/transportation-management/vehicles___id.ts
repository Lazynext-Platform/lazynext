import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const vehicle = await TransportationManagementService.getVehicle(id);
  if (!vehicle) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ vehicle });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const vehicle = await TransportationManagementService.updateVehicle(id, body);
    if (!vehicle) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ vehicle });
  } catch (e) {
    console.error('[transportation-management/vehicles] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_vehicle' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await TransportationManagementService.deleteVehicle(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
