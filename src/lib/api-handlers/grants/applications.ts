import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/applications — list applications */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ applications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; funder?: string } = {};
  const status = url.searchParams.get('status');
  const funder = url.searchParams.get('funder');
  if (status) opts.status = status;
  if (funder) opts.funder = funder;

  const applications = await GrantService.listApplications(organizationId, opts as never);
  return NextResponse.json({ applications });
}

/** POST /api/grants/applications — create an application */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const funder = String(body.funder || '').trim();
  const amountRequested = typeof body.amountRequested === 'number' ? body.amountRequested : Number(body.amountRequested);
  if (!title || !funder || isNaN(amountRequested)) {
    return NextResponse.json({ error: 'title_funder_amountRequested_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const application = await GrantService.createApplication(
      ws.organizationId, ws.id,
      {
        opportunityId: body.opportunityId, title, funder, amountRequested,
        narrative: body.narrative, budget: body.budget, timeline: body.timeline,
        team: body.team, status: body.status, submittedDate: body.submittedDate,
        deadline: body.deadline, attachments: body.attachments,
      },
      session.user.id,
    );
    return NextResponse.json({ application }, { status: 201 });
  } catch (e) {
    console.error('[grants/applications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_application' }, { status: 500 });
  }
}
