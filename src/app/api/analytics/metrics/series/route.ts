import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/metrics/series — time series for a metric name.
 * Query: organizationId, name, workspaceId?, since?, until?, bucket?, limit?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const name = sp.get('name') || undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const since = sp.get('since') ? new Date(sp.get('since')!) : undefined;
    const until = sp.get('until') ? new Date(sp.get('until')!) : undefined;
    const bucket = (sp.get('bucket') as 'hour' | 'day' | 'week') || undefined;
    const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;

    const series = await AnalyticsService.getMetricSeries(organizationId, name, {
      workspaceId: sp.get('workspaceId') || undefined,
      since,
      until,
      bucket,
      limit,
    });
    return NextResponse.json({ series });
  } catch (e) {
    console.error('[analytics/metrics/series] error:', e);
    return NextResponse.json({ error: 'failed_to_get_series' }, { status: 500 });
  }
}
