import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const source = await GHGEmissionsManagementService.getEmissionSource(id);
  if (!source) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ source });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const source = await GHGEmissionsManagementService.updateEmissionSource(id, body);
    if (!source) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ source });
  } catch (e) {
    console.error('[ghg-emissions-management/sources] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_source' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await GHGEmissionsManagementService.deleteEmissionSource(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
