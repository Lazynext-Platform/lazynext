import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { category?: string; period?: string; periodLabel?: string } = {};
  const category = url.searchParams.get('category');
  const period = url.searchParams.get('period');
  const periodLabel = url.searchParams.get('periodLabel');
  if (category) opts.category = category;
  if (period) opts.period = period;
  if (periodLabel) opts.periodLabel = periodLabel;
  const metrics = await DeiService.listMetrics(organizationId, opts as never);
  return NextResponse.json({ metrics });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const category = String(body.category || '').trim();
  const period = String(body.period || '').trim();
  const periodLabel = String(body.periodLabel || '').trim();
  const metricName = String(body.metricName || '').trim();
  const value = Number(body.value);
  if (!category || !period || !periodLabel || !metricName || isNaN(value)) {
    return NextResponse.json({ error: 'required_fields_missing' }, { status: 400 });
  }
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const metric = await DeiService.createMetric(
      ws.organizationId, ws.id,
      {
        category: category as never, period: period as never, periodLabel, metricName, value,
        target: body.target, unit: body.unit, description: body.description,
        demographicBreakdown: body.demographicBreakdown, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    console.error('[dei/metrics] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_metric' }, { status: 500 });
  }
}
