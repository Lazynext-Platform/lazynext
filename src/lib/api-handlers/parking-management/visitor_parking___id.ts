import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const visitorParking = await ParkingManagementService.getVisitorParking(id);
  if (!visitorParking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ visitorParking });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const visitorParking = await ParkingManagementService.updateVisitorParking(id, body);
    if (!visitorParking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ visitorParking });
  } catch (e) {
    console.error('[parking-management/visitor-parking] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_visitor_parking' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ParkingManagementService.deleteVisitorParking(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
