import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ requests: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'priority']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const requests = await OfficeServicesService.listRequests(organizationId, opts as never);
  return NextResponse.json({ requests });
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
    const request = await OfficeServicesService.createRequest(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, priority: body.priority,
      requestedBy: body.requestedBy, assignedTo: body.assignedTo, location: body.location,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[office-services/requests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_request' }, { status: 500 });
  }
}
