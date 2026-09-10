import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/targets — list targets (query: organizationId, category, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ targets: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { category?: 'environmental'|'social'|'governance'; status?: 'on_track'|'ahead'|'behind'|'achieved'|'at_risk' } = {};
  const category = sp.get('category');
  const status = sp.get('status');
  if (category) opts.category = category as typeof opts.category;
  if (status) opts.status = status as typeof opts.status;

  const targets = await SustainabilityService.listTargets(organizationId, opts);
  return NextResponse.json({ targets });
}

/** POST /api/sustainability/targets — create a target */
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
  if (!body.name || !body.category || body.baseline === undefined || body.target === undefined || !body.targetDate) {
    return NextResponse.json({ error: 'name_category_baseline_target_targetDate_required' }, { status: 400 });
  }

  try {
    const target = await SustainabilityService.createTarget(
      organizationId,
      workspaceId,
      {
        metricId: body.metricId,
        name: body.name,
        category: body.category,
        baseline: Number(body.baseline),
        target: Number(body.target),
        targetDate: body.targetDate,
        current: body.current !== undefined ? Number(body.current) : undefined,
        status: body.status,
        description: body.description,
      },
      session.user.id,
    );
    return NextResponse.json({ target }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/targets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_target' }, { status: 500 });
  }
}
