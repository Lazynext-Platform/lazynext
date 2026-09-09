import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InventoryService } from '@/lib/services/inventory-service';

/** GET /api/inventory/warehouses — list warehouses (query: organizationId, isActive) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ warehouses: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { isActive?: boolean } = {};
  const isActive = sp.get('isActive');
  if (isActive === 'true') opts.isActive = true;
  if (isActive === 'false') opts.isActive = false;

  const warehouses = await InventoryService.listWarehouses(organizationId, opts);
  return NextResponse.json({ warehouses });
}

/** POST /api/inventory/warehouses — create a warehouse */
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
  if (!body.name || !body.code) {
    return NextResponse.json({ error: 'name_code_required' }, { status: 400 });
  }

  try {
    const warehouse = await InventoryService.createWarehouse(organizationId, {
      name: body.name,
      code: body.code,
      location: body.location,
      address: body.address,
    });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_create_warehouse';
    if (msg === 'warehouse_code_already_exists') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[inventory/warehouses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_warehouse' }, { status: 500 });
  }
}
