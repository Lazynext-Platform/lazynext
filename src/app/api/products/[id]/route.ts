import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ProductService } from '@/lib/services/product';

/**
 * GET /api/products/[id] — get a product by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const product = await ProductService.get(id);
    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (e) {
    console.error('[products] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_product' }, { status: 500 });
  }
}

/**
 * PATCH /api/products/[id] — update a product.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number;
    currency?: string;
    unit?: string;
    sku?: string;
    category?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.name !== undefined) {
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }
    body.name = name;
  }

  try {
    const existing = await ProductService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await ProductService.update(id, {
      name: body.name,
      description: body.description?.trim(),
      type: body.type?.trim(),
      status: body.status?.trim(),
      price: body.price,
      currency: body.currency?.trim(),
      unit: body.unit?.trim(),
      sku: body.sku?.trim(),
      category: body.category?.trim(),
    });
    return NextResponse.json({ product: updated });
  } catch (e) {
    console.error('[products] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_product' }, { status: 500 });
  }
}
