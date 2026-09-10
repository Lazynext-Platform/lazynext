import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/metrics — list metrics (query: organizationId, category, period) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { category?: 'environmental'|'social'|'governance'; period?: string } = {};
  const category = sp.get('category');
  const period = sp.get('period');
  if (category) opts.category = category as typeof opts.category;
  if (period) opts.period = period;

  const metrics = await SustainabilityService.listMetrics(organizationId, opts);
  return NextResponse.json({ metrics });
}

/** POST /api/sustainability/metrics — create a metric */
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
  if (!body.name || !body.category || !body.unit || body.value === undefined || !body.period) {
    return NextResponse.json({ error: 'name_category_unit_value_period_required' }, { status: 400 });
  }

  try {
    const metric = await SustainabilityService.createMetric(
      organizationId,
      workspaceId,
      {
        name: body.name,
        category: body.category,
        unit: body.unit,
        value: Number(body.value),
        target: body.target !== undefined ? Number(body.target) : undefined,
        period: body.period,
        description: body.description,
        trend: body.trend,
      },
      session.user.id,
    );
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error('[sustainability/metrics] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_metric' }, { status: 500 });
  }
}
