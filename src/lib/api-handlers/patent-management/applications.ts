import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ applications: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const applications = await PatentManagementService.listApplications(organizationId, opts as never);
  return NextResponse.json({ applications });
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
    const application = await PatentManagementService.createApplication(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status,
      applicationNumber: body.applicationNumber, filingDate: body.filingDate, priorityDate: body.priorityDate,
      inventor: body.inventor, assignee: body.assignee, jurisdiction: body.jurisdiction,
      classification: body.classification, abstract: body.abstract, claims: body.claims,
      statusDate: body.statusDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ application }, { status: 201 });
  } catch (e) {
    console.error('[patent-management/applications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_application' }, { status: 500 });
  }
}
