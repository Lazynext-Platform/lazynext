import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/initiatives — list initiatives (query: organizationId, category, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ initiatives: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { category?: 'environmental'|'social'|'governance'; status?: 'planned'|'in_progress'|'completed'|'on_hold'|'cancelled' } = {};
  const category = sp.get('category');
  const status = sp.get('status');
  if (category) opts.category = category as typeof opts.category;
  if (status) opts.status = status as typeof opts.status;

  const initiatives = await SustainabilityService.listInitiatives(organizationId, opts);
  return NextResponse.json({ initiatives });
}

/** POST /api/sustainability/initiatives — create an initiative */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.name || !body.category || !body.startDate) {
    return NextResponse.json({ error: 'name_category_startDate_required' }, { status: 400 });
  }

  try {
    const initiative = await SustainabilityService.createInitiative(
      organizationId,
      workspaceId,
      {
        name: body.name,
        category: body.category,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
        owner: body.owner,
        budget: body.budget !== undefined ? Number(body.budget) : undefined,
        impact: body.impact,
        sdgGoals: body.sdgGoals,
      },
      session.user.id,
    );
    return NextResponse.json({ initiative }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/initiatives] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_initiative' }, { status: 500 });
  }
}
