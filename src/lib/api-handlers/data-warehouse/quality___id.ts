import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const quality = await DataWarehouseService.getQuality(id);
  if (!quality) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ quality });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const quality = await DataWarehouseService.updateQuality(id, body);
    if (!quality) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ quality });
  } catch (e) {
    console.error('[data-warehouse/quality] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_quality' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await DataWarehouseService.deleteQuality(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
