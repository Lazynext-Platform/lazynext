import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const phase = await ProductLifecycleService.getPhase(id);
  if (!phase) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ phase });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const phase = await ProductLifecycleService.updatePhase(id, body);
    if (!phase) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ phase });
  } catch (e) {
    console.error('[product-lifecycle/phases] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_phase' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ProductLifecycleService.deletePhase(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
