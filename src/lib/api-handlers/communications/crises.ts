import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/crises — list crises */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ crises: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { severity?: string; status?: string; type?: string } = {};
  const severity = url.searchParams.get('severity');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (severity) opts.severity = severity;
  if (status) opts.status = status;
  if (type) opts.type = type;

  const crises = await CommunicationsService.listCrises(organizationId, opts as never);
  return NextResponse.json({ crises });
}

/** POST /api/communications/crises — create a crisis */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const severity = String(body.severity || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !severity || !type) {
    return NextResponse.json({ error: 'title_severity_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const crisis = await CommunicationsService.createCrisis(
      ws.organizationId, ws.id,
      {
        title, severity: severity as never, type: type as never,
        description: body.description, status: body.status, spokesperson: body.spokesperson,
        statements: body.statements, mediaInquiries: body.mediaInquiries,
        affectedAudiences: body.affectedAudiences, actionPlan: body.actionPlan, timeline: body.timeline,
      },
      session.user.id,
    );
    return NextResponse.json({ crisis }, { status: 201 });
  } catch (e) {
    console.error('[communications/crises] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_crisis' }, { status: 500 });
  }
}
