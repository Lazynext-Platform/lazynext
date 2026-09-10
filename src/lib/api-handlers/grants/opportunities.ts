import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/opportunities — list opportunities */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ opportunities: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; funder?: string; category?: string } = {};
  const status = url.searchParams.get('status');
  const funder = url.searchParams.get('funder');
  const category = url.searchParams.get('category');
  if (status) opts.status = status;
  if (funder) opts.funder = funder;
  if (category) opts.category = category;

  const opportunities = await GrantService.listOpportunities(organizationId, opts as never);
  return NextResponse.json({ opportunities });
}

/** POST /api/grants/opportunities — create an opportunity */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const funder = String(body.funder || '').trim();
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  if (!name || !funder || isNaN(amount)) {
    return NextResponse.json({ error: 'name_funder_amount_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const opportunity = await GrantService.createOpportunity(
      ws.organizationId, ws.id,
      {
        name, funder, program: body.program, eligibility: body.eligibility,
        amount, deadline: body.deadline, status: body.status, category: body.category,
        duration: body.duration, matchScore: body.matchScore, description: body.description,
      },
      session.user.id,
    );
    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (e) {
    console.error('[grants/opportunities] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_opportunity' }, { status: 500 });
  }
}
