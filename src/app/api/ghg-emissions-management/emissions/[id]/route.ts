import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const emission = await GHGEmissionsManagementService.getGHGEmission(id);
  if (!emission) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ emission });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const emission = await GHGEmissionsManagementService.updateGHGEmission(id, body);
    if (!emission) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ emission });
  } catch (e) {
    console.error('[ghg-emissions-management/emissions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_emission' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await GHGEmissionsManagementService.deleteGHGEmission(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
