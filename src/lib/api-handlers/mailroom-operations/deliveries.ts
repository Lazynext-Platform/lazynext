import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ deliveries: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'routeId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const deliveries = await MailroomOperationsService.listDeliveries(organizationId, opts as never);
  return NextResponse.json({ deliveries });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const type = String(body.type || '').trim();
  if (!itemId || !type) return NextResponse.json({ error: 'itemId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const delivery = await MailroomOperationsService.createDelivery(ws.organizationId, ws.id, {
      itemId, type: type as never,
      routeId: body.routeId, description: body.description, status: body.status,
      recipient: body.recipient, address: body.address, scheduledDate: body.scheduledDate,
      attemptedDate: body.attemptedDate, deliveredDate: body.deliveredDate,
      signatureRequired: body.signatureRequired, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ delivery }, { status: 201 });
  } catch (e) {
    console.error('[mailroom-operations/deliveries] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_delivery' }, { status: 500 });
  }
}
