import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ visits: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'hostId']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const visits = await VisitorManagementService.listVisits(organizationId, opts as never);
  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const visitorName = String(body.visitorName || '').trim();
  const type = String(body.type || '').trim();
  if (!visitorName || !type) return NextResponse.json({ error: 'visitorName_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const visit = await VisitorManagementService.createVisit(ws.organizationId, ws.id, {
      visitorName, type: type as never,
      description: body.description, status: body.status, hostId: body.hostId,
      hostName: body.hostName, company: body.company, email: body.email, phone: body.phone,
      purpose: body.purpose, expectedArrival: body.expectedArrival, expectedDeparture: body.expectedDeparture,
      actualArrival: body.actualArrival, actualDeparture: body.actualDeparture,
      escortRequired: body.escortRequired, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ visit }, { status: 201 });
  } catch (e) {
    console.error('[visitor-management/visits] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_visit' }, { status: 500 });
  }
}
