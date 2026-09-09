import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ incidents: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { crisisType?: string; severity?: string; status?: string } = {};
  const crisisType = url.searchParams.get('crisisType');
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  if (crisisType) opts.crisisType = crisisType;
  if (severity) opts.severity = severity;
  if (status) opts.status = status;
  const incidents = await CrisisService.listIncidents(organizationId, opts as never);
  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const crisisType = String(body.crisisType || '').trim();
  const severity = String(body.severity || '').trim();
  const reportedBy = String(body.reportedBy || '').trim();
  if (!title || !crisisType || !severity || !reportedBy) {
    return NextResponse.json({ error: 'title_type_severity_reportedBy_required' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const incident = await CrisisService.createIncident(
      ws.organizationId, ws.id,
      {
        title, crisisType: crisisType as never, severity: severity as never, reportedBy,
        description: body.description, reportedDate: body.reportedDate,
        affectedSystems: body.affectedSystems, affectedDepartments: body.affectedDepartments,
        impactAssessment: body.impactAssessment, status: body.status, planId: body.planId,
        estimatedCost: body.estimatedCost, estimatedDowntime: body.estimatedDowntime,
      },
      session.user.id,
    );
    return NextResponse.json({ incident }, { status: 201 });
  } catch (e) {
    console.error('[crisis/incidents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_incident' }, { status: 500 });
  }
}
