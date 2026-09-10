import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ orders: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['menuId', 'vendorId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const orders = await FoodServicesService.listOrders(organizationId, opts as never);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  if (!type) return NextResponse.json({ error: 'type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const order = await FoodServicesService.createOrder(ws.organizationId, ws.id, {
      type: type as never,
      menuId: body.menuId, vendorId: body.vendorId, description: body.description,
      status: body.status, requester: body.requester, department: body.department,
      headcount: body.headcount, budget: body.budget, deliveryDate: body.deliveryDate,
      deliveryLocation: body.deliveryLocation, specialRequests: body.specialRequests,
      dietaryRestrictions: body.dietaryRestrictions, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error('[food-services/orders] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_order' }, { status: 500 });
  }
}
