import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';

/** POST /api/inventory/transfer — transfer stock between warehouses */
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
  if (!body.itemId || !body.fromWarehouseId || !body.toWarehouseId || body.quantity === undefined) {
    return NextResponse.json({ error: 'itemId_fromWarehouseId_toWarehouseId_quantity_required' }, { status: 400 });
  }

  try {
    const result = await InventoryService.transferStock(organizationId, {
      itemId: body.itemId,
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      quantity: Number(body.quantity),
      notes: body.notes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_transfer_stock';
    if (msg === 'item_not_found' || msg === 'item_not_in_source_warehouse' || msg === 'insufficient_stock') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[inventory/transfer] error:', e);
    return NextResponse.json({ error: 'failed_to_transfer_stock' }, { status: 500 });
  }
}
