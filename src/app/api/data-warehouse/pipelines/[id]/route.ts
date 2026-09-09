import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const pipeline = await DataWarehouseService.getPipeline(id);
  if (!pipeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ pipeline });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const pipeline = await DataWarehouseService.updatePipeline(id, body);
    if (!pipeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ pipeline });
  } catch (e) {
    console.error('[data-warehouse/pipelines] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_pipeline' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DataWarehouseService.deletePipeline(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
