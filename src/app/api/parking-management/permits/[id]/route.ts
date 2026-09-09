import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const permit = await ParkingManagementService.getPermit(id);
  if (!permit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ permit });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const permit = await ParkingManagementService.updatePermit(id, body);
    if (!permit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ permit });
  } catch (e) {
    console.error('[parking-management/permits] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_permit' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ParkingManagementService.deletePermit(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
