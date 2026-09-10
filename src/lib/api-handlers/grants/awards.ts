import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/awards — list awards */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ awards: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; funder?: string } = {};
  const status = url.searchParams.get('status');
  const funder = url.searchParams.get('funder');
  if (status) opts.status = status;
  if (funder) opts.funder = funder;

  const awards = await GrantService.listAwards(organizationId, opts as never);
  return NextResponse.json({ awards });
}

/** POST /api/grants/awards — create an award */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const funder = String(body.funder || '').trim();
  const amountAwarded = typeof body.amountAwarded === 'number' ? body.amountAwarded : Number(body.amountAwarded);
  const startDate = String(body.startDate || '').trim();
  if (!title || !funder || isNaN(amountAwarded) || !startDate) {
    return NextResponse.json({ error: 'title_funder_amountAwarded_startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const award = await GrantService.createAward(
      ws.organizationId, ws.id,
      {
        applicationId: body.applicationId, title, funder, amountAwarded, startDate,
        endDate: body.endDate, conditions: body.conditions,
        reportingRequirements: body.reportingRequirements, status: body.status,
        acceptedDate: body.acceptedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ award }, { status: 201 });
  } catch (e) {
    console.error('[grants/awards] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_award' }, { status: 500 });
  }
}
