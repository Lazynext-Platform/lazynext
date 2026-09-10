import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/items — list items (query: organizationId, warehouseId, category, sku, lowStock, isActive) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: {
    warehouseId?: string;
    category?: string;
    sku?: string;
    lowStock?: boolean;
    isActive?: boolean;
  } = {};
  const warehouseId = sp.get('warehouseId');
  const category = sp.get('category');
  const sku = sp.get('sku');
  const lowStock = sp.get('lowStock');
  const isActive = sp.get('isActive');
  if (warehouseId) opts.warehouseId = warehouseId;
  if (category) opts.category = category;
  if (sku) opts.sku = sku;
  if (lowStock === 'true') opts.lowStock = true;
  if (isActive === 'true') opts.isActive = true;
  if (isActive === 'false') opts.isActive = false;

  const items = await InventoryService.listItems(organizationId, opts);
  return NextResponse.json({ items });
}

/** POST /api/inventory/items — create an item */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  if (!body.warehouseId || !body.sku || !body.name) {
    return NextResponse.json({ error: 'warehouseId_sku_name_required' }, { status: 400 });
  }

  try {
    const item = await InventoryService.createItem(organizationId, {
      warehouseId: body.warehouseId,
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      quantity: body.quantity,
      reorderPoint: body.reorderPoint,
      reorderQty: body.reorderQty,
      unitCost: body.unitCost,
      unitPrice: body.unitPrice,
      barcode: body.barcode,
      location: body.location,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_create_item';
    if (msg === 'item_sku_already_exists') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[inventory/items] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_item' }, { status: 500 });
  }
}
