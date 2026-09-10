import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ orders: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['recipientId', 'itemId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const orders = await GiftManagementService.listOrders(organizationId, opts as never);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recipientId = String(body.recipientId || '').trim();
  const itemId = String(body.itemId || '').trim();
  const type = String(body.type || '').trim();
  if (!recipientId || !itemId || !type) return NextResponse.json({ error: 'recipientId_itemId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const order = await GiftManagementService.createOrder(ws.organizationId, ws.id, {
      recipientId, itemId, type: type as never,
      quantity: body.quantity, description: body.description, status: body.status,
      occasion: body.occasion, message: body.message, budget: body.budget,
      orderedDate: body.orderedDate, deliveredDate: body.deliveredDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error('[gift-management/orders] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_order' }, { status: 500 });
  }
}
