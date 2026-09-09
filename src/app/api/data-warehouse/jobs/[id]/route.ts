import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const job = await DataWarehouseService.getJob(id);
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const job = await DataWarehouseService.updateJob(id, body);
    if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    console.error('[data-warehouse/jobs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_job' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DataWarehouseService.deleteJob(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
