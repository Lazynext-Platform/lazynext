import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/warehouses/[id] — get a warehouse */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const warehouse = await InventoryService.getWarehouse(id);
  if (!warehouse) {
    return NextResponse.json({ error: 'warehouse_not_found' }, { status: 404 });
  }
  return NextResponse.json({ warehouse });
}

/** PATCH /api/inventory/warehouses/[id] — update a warehouse */
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
    const warehouse = await InventoryService.updateWarehouse(id, {
      name: body.name,
      code: body.code,
      location: body.location,
      address: body.address,
      isActive: body.isActive,
    });
    return NextResponse.json({ warehouse });
  } catch (e) {
    console.error('[inventory/warehouses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_warehouse' }, { status: 500 });
  }
}

/** DELETE /api/inventory/warehouses/[id] — delete a warehouse */
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
    await InventoryService.deleteWarehouse(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[inventory/warehouses] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_warehouse' }, { status: 500 });
  }
}
