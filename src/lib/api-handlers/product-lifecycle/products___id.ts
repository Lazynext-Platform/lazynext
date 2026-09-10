import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ProductLifecycleService } from '@/lib/services/product-lifecycle-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const product = await ProductLifecycleService.getProduct(id);
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const product = await ProductLifecycleService.updateProduct(id, body);
    if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (e) {
    console.error('[product-lifecycle/products] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_product' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ProductLifecycleService.deleteProduct(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
