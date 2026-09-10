import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/incidents — list incidents */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ incidents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; severity?: string; status?: string; location?: string } = {};
  const type = url.searchParams.get('type');
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  const location = url.searchParams.get('location');
  if (type) opts.type = type;
  if (severity) opts.severity = severity;
  if (status) opts.status = status;
  if (location) opts.location = location;

  const incidents = await HealthSafetyService.listIncidents(organizationId, opts as never);
  return NextResponse.json({ incidents });
}

/** POST /api/health-safety/incidents — create an incident */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const severity = String(body.severity || '').trim();
  const occurredAt = String(body.occurredAt || '').trim();
  if (!title || !type || !severity || !occurredAt) {
    return NextResponse.json({ error: 'title_type_severity_occurredAt_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const incident = await HealthSafetyService.createIncident(
      ws.organizationId, ws.id,
      {
        title, type: type as never, severity: severity as never, occurredAt,
        description: body.description, location: body.location, reportedBy: body.reportedBy,
        involvedPersons: body.involvedPersons, rootCause: body.rootCause,
        correctiveActions: body.correctiveActions, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ incident }, { status: 201 });
  } catch (e) {
    console.error('[health-safety/incidents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_incident' }, { status: 500 });
  }
}
