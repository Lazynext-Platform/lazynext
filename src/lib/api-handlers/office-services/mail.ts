import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ mail: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const mail = await OfficeServicesService.listMail(organizationId, opts as never);
  return NextResponse.json({ mail });
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
    const mail = await OfficeServicesService.createMail(ws.organizationId, ws.id, {
      type: type as never,
      sender: body.sender, recipient: body.recipient, subject: body.subject,
      status: body.status, receivedDate: body.receivedDate, deliveredDate: body.deliveredDate,
      trackingNumber: body.trackingNumber, weight: body.weight, postage: body.postage, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ mail }, { status: 201 });
  } catch (e) {
    console.error('[office-services/mail] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_mail' }, { status: 500 });
  }
}
