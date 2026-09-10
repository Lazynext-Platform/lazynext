import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const spot = await ParkingManagementService.getSpot(id);
  if (!spot) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ spot });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const spot = await ParkingManagementService.updateSpot(id, body);
    if (!spot) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ spot });
  } catch (e) {
    console.error('[parking-management/spots] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_spot' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ParkingManagementService.deleteSpot(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
