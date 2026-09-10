import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ inventory: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const inventory = await FoodServicesService.listInventory(organizationId, opts as never);
  return NextResponse.json({ inventory });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const item = await FoodServicesService.createInventory(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, quantity: body.quantity,
      unit: body.unit, reorderLevel: body.reorderLevel, cost: body.cost,
      expiryDate: body.expiryDate, storageLocation: body.storageLocation,
      supplier: body.supplier, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[food-services/inventory] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_inventory' }, { status: 500 });
  }
}
