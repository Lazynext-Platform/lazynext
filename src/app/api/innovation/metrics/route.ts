import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/metrics — list metrics */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; period?: string } = {};
  const category = url.searchParams.get('category');
  const period = url.searchParams.get('period');
  if (category) opts.category = category;
  if (period) opts.period = period;

  const metrics = await InnovationService.listMetrics(organizationId, opts as never);
  return NextResponse.json({ metrics });
}

/** POST /api/innovation/metrics — create a metric */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const unit = String(body.unit || '').trim();
  const period = String(body.period || '').trim();
  if (!name || !category || !unit || !period) {
    return NextResponse.json({ error: 'name_category_unit_period_required' }, { status: 400 });
  }
  if (typeof body.value !== 'number') {
    return NextResponse.json({ error: 'value_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const metric = await InnovationService.createMetric(
      ws.organizationId, ws.id,
      {
        name, category, value: body.value, unit, period,
        target: body.target, previousValue: body.previousValue, trend: body.trend,
      },
      session.user.id,
    );
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error('[innovation/metrics] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_metric' }, { status: 500 });
  }
}
