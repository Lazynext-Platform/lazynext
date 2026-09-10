import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ items: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const items = await MailroomOperationsService.listItems(organizationId, opts as never);
  return NextResponse.json({ items });
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
    const item = await MailroomOperationsService.createItem(ws.organizationId, ws.id, {
      type: type as never,
      trackingNumber: body.trackingNumber, sender: body.sender, recipient: body.recipient,
      description: body.description, status: body.status, receivedDate: body.receivedDate,
      weight: body.weight, dimensions: body.dimensions, returnAddress: body.returnAddress, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[mailroom-operations/items] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_item' }, { status: 500 });
  }
}
