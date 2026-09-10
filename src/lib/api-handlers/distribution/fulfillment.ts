import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DistributionService } from '@/lib/services/distribution-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ fulfillments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'centerId', 'channelId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const fulfillments = await DistributionService.listFulfillments(organizationId, opts as never);
  return NextResponse.json({ fulfillments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId || '').trim();
  const type = String(body.type || '').trim();
  if (!orderId || !type) return NextResponse.json({ error: 'orderId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const fulfillment = await DistributionService.createFulfillment(ws.organizationId, ws.id, {
      orderId, type: type as never,
      status: body.status, centerId: body.centerId, channelId: body.channelId,
      customerId: body.customerId, customerName: body.customerName, items: body.items,
      shipTo: body.shipTo, trackingNumber: body.trackingNumber, carrier: body.carrier,
      priority: body.priority, scheduledDate: body.scheduledDate, completedDate: body.completedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ fulfillment }, { status: 201 });
  } catch (e) {
    console.error('[distribution/fulfillment] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_fulfillment' }, { status: 500 });
  }
}
