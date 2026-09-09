import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const version = await ProductLifecycleService.getVersion(id);
  if (!version) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ version });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const version = await ProductLifecycleService.updateVersion(id, body);
    if (!version) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ version });
  } catch (e) {
    console.error('[product-lifecycle/versions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_version' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ProductLifecycleService.deleteVersion(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
