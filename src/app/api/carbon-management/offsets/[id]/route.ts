import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const offset = await CarbonManagementService.getCarbonOffset(id);
  if (!offset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ offset });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const offset = await CarbonManagementService.updateCarbonOffset(id, body);
    if (!offset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ offset });
  } catch (e) {
    console.error('[carbon-management/offsets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_offset' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CarbonManagementService.deleteCarbonOffset(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
