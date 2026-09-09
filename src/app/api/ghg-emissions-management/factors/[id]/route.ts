import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const factor = await GHGEmissionsManagementService.getEmissionFactor(id);
  if (!factor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ factor });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const factor = await GHGEmissionsManagementService.updateEmissionFactor(id, body);
    if (!factor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ factor });
  } catch (e) {
    console.error('[ghg-emissions-management/factors] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_factor' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await GHGEmissionsManagementService.deleteEmissionFactor(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
