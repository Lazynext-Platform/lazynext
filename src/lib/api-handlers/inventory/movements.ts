import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/movements — list movements (query: organizationId, warehouseId, inventoryItemId, type, fromDate, toDate) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ movements: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: {
    warehouseId?: string;
    inventoryItemId?: string;
    type?: 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'return';
    fromDate?: Date;
    toDate?: Date;
  } = {};
  const warehouseId = sp.get('warehouseId');
  const inventoryItemId = sp.get('inventoryItemId');
  const type = sp.get('type');
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (warehouseId) opts.warehouseId = warehouseId;
  if (inventoryItemId) opts.inventoryItemId = inventoryItemId;
  if (type) opts.type = type as 'inbound' | 'outbound' | 'transfer' | 'adjustment' | 'return';
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  const movements = await InventoryService.getMovements(organizationId, opts);
  return NextResponse.json({ movements });
}

/** POST /api/inventory/movements — record a stock movement */
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
  if (!body.warehouseId || !body.inventoryItemId || !body.type || body.quantity === undefined) {
    return NextResponse.json({ error: 'warehouseId_inventoryItemId_type_quantity_required' }, { status: 400 });
  }

  try {
    const result = await InventoryService.recordMovement(organizationId, {
      warehouseId: body.warehouseId,
      inventoryItemId: body.inventoryItemId,
      type: body.type,
      quantity: Number(body.quantity),
      reference: body.reference,
      notes: body.notes,
    });
    return NextResponse.json({ item: result.item, movement: result.movement }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_record_movement';
    if (msg === 'item_not_found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('[inventory/movements] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_movement' }, { status: 500 });
  }
}
