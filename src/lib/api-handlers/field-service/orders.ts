import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ orders: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'priority']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const orders = await FieldServiceService.listOrders(organizationId, opts as never);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const order = await FieldServiceService.createOrder(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, customerId: body.customerId, customerName: body.customerName,
      address: body.address, contactPhone: body.contactPhone, contactEmail: body.contactEmail,
      priority: body.priority, status: body.status,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      estimatedDuration: body.estimatedDuration, actualDuration: body.actualDuration,
      cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error('[field-service/orders] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_order' }, { status: 500 });
  }
}
