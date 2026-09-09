import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ProductService } from '@/lib/services/product';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/products — list products (query: workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ products: [] });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const products = await ProductService.list(wsId);
    return NextResponse.json({ products });
  } catch (e) {
    console.error('[products] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_products' }, { status: 500 });
  }
}

/**
 * POST /api/products — create a new product.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string;
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

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    let workspaceId = body.workspaceId?.trim();

    if (workspaceId) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      organizationId = ws.organizationId;
    } else {
      organizationId = organizationId || workspaces[0].organizationId;
      workspaceId = workspaces.find((w) => w.organizationId === organizationId)?.id;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
    }

    const product = await ProductService.create({
      organizationId,
      workspaceId,
      name,
      description: body.description?.trim() || undefined,
      type: body.type?.trim() || undefined,
      status: body.status?.trim() || undefined,
      price: body.price,
      currency: body.currency?.trim() || undefined,
      unit: body.unit?.trim() || undefined,
      sku: body.sku?.trim() || undefined,
      category: body.category?.trim() || undefined,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    console.error('[products] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_product' }, { status: 500 });
  }
}
