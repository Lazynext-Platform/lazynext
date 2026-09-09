import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WasteManagementService } from '@/lib/services/waste-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const stream = await WasteManagementService.getWasteStream(id);
  if (!stream) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ stream });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const stream = await WasteManagementService.updateWasteStream(id, body);
    if (!stream) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ stream });
  } catch (e) {
    console.error('[waste-management/streams] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_stream' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await WasteManagementService.deleteWasteStream(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
