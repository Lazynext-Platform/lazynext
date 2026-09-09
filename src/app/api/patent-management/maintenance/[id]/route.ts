import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const maintenance = await PatentManagementService.getMaintenance(id);
  if (!maintenance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ maintenance });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const maintenance = await PatentManagementService.updateMaintenance(id, body);
    if (!maintenance) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ maintenance });
  } catch (e) {
    console.error('[patent-management/maintenance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_maintenance' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PatentManagementService.deleteMaintenance(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
