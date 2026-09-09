import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/items/[id] — get an item */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const item = await InventoryService.getItem(id);
  if (!item) {
    return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
  }
  return NextResponse.json({ item });
}

/** PATCH /api/inventory/items/[id] — update an item */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const item = await InventoryService.updateItem(id, {
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
      isActive: body.isActive,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[inventory/items] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_item' }, { status: 500 });
  }
}

/** DELETE /api/inventory/items/[id] — delete an item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await InventoryService.deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[inventory/items] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_item' }, { status: 500 });
  }
}
