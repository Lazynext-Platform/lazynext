import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ inventory: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const inventory = await GiftManagementService.listInventory(organizationId, opts as never);
  return NextResponse.json({ inventory });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const type = String(body.type || '').trim();
  const quantity = Number(body.quantity);
  if (!itemId || !type || !Number.isFinite(quantity)) return NextResponse.json({ error: 'itemId_type_quantity_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const inventory = await GiftManagementService.createInventory(ws.organizationId, ws.id, {
      itemId, type: type as never, quantity,
      description: body.description, status: body.status, location: body.location,
      batchNumber: body.batchNumber, receivedDate: body.receivedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ inventory }, { status: 201 });
  } catch (e) {
    console.error('[gift-management/inventory] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_inventory' }, { status: 500 });
  }
}
