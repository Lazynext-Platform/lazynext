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
 * GET /api/analytics/trends — get trend (time series) data.
 * Query: organizationId, metric, startDate, endDate, granularity, workspaceId
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

  const granularityParam = sp.get('granularity') || 'day';
  const granularity = (VALID_GRANULARITIES.includes(granularityParam as Granularity)
    ? granularityParam
    : 'day') as Granularity;

  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const points = await AnalyticsService.getTrend(organizationId, metric, {
      startDate,
      endDate,
      granularity,
    });
    return NextResponse.json({ points, metric, granularity });
  } catch (e) {
    console.error('[analytics/trends] error:', e);
    return NextResponse.json({ error: 'failed_to_get_trend' }, { status: 500 });
  }
}
