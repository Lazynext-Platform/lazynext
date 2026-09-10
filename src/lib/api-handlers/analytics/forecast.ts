import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService, type TrendMetric, type Granularity } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

const VALID_METRICS: TrendMetric[] = [
  'tasks_completed', 'goals_progress', 'agent_executions',
  'projects_active', 'revenue', 'tickets_resolved',
];
const VALID_GRANULARITIES: Granularity[] = ['day', 'week', 'month'];

/**
 * GET /api/analytics/forecast — predictive forecast for a metric.
 * Query: organizationId, metric, periods, granularity, workspaceId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const metric = (sp.get('metric') || 'tasks_completed') as TrendMetric;
  if (!VALID_METRICS.includes(metric)) {
    return NextResponse.json({ error: 'invalid_metric' }, { status: 400 });
  }

  const periodsParam = sp.get('periods') || '7';
  const periods = Math.max(1, Math.min(90, parseInt(periodsParam, 10) || 7));

  const granularityParam = sp.get('granularity') || 'day';
  const granularity = (VALID_GRANULARITIES.includes(granularityParam as Granularity)
    ? granularityParam
    : 'day') as Granularity;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const forecast = await AnalyticsService.getPredictiveForecast(organizationId, metric, {
      periods,
      granularity,
    });
    return NextResponse.json({ forecast, metric, periods, granularity });
  } catch (e) {
    console.error('[analytics/forecast] error:', e);
    return NextResponse.json({ error: 'failed_to_get_forecast' }, { status: 500 });
  }
}
