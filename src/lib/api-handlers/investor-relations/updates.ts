import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/updates — list updates */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ updates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; period?: string } = {};
  const status = url.searchParams.get('status');
  const period = url.searchParams.get('period');
  if (status) opts.status = status;
  if (period) opts.period = period;

  const updates = await InvestorRelationsService.listUpdates(organizationId, opts as never);
  return NextResponse.json({ updates });
}

/** POST /api/investor-relations/updates — create an update */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const period = String(body.period || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !period || !content) {
    return NextResponse.json({ error: 'title_period_and_content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const update = await InvestorRelationsService.createUpdate(
      ws.organizationId, ws.id,
      {
        title, period, content,
        metrics: body.metrics, highlights: body.highlights, challenges: body.challenges,
        financials: body.financials, status: body.status, sentTo: body.sentTo, date: body.date,
      },
      session.user.id,
    );
    return NextResponse.json({ update }, { status: 201 });
  } catch (e) {
    console.error('[investor-relations/updates] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_update' }, { status: 500 });
  }
}
