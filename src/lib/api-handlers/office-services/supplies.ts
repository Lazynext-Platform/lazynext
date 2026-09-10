import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ supplies: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const supplies = await OfficeServicesService.listSupplyOrders(organizationId, opts as never);
  return NextResponse.json({ supplies });
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
    const supply = await OfficeServicesService.createSupplyOrder(ws.organizationId, ws.id, {
      type: type as never,
      description: body.description, status: body.status, items: body.items,
      requestedBy: body.requestedBy, approvedBy: body.approvedBy, supplier: body.supplier,
      totalCost: body.totalCost, orderedDate: body.orderedDate, receivedDate: body.receivedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ supply }, { status: 201 });
  } catch (e) {
    console.error('[office-services/supplies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_supply_order' }, { status: 500 });
  }
}
