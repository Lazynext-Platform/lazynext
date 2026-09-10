import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/dashboards/[id]/export — export a dashboard.
 * Query: format=json|csv
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const format = (sp.get('format') || 'json') as 'json' | 'csv';

  try {
    const dashboard = await AnalyticsService.getDashboard(id);
    if (!dashboard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === dashboard.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const exported = await AnalyticsService.exportDashboard(id, format);

    if (format === 'csv') {
      return new NextResponse(exported, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dashboard-${id}.csv"`,
        },
      });
    }

    return new NextResponse(exported, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dashboard-${id}.json"`,
      },
    });
  } catch (e) {
    console.error('[analytics/dashboards/export] error:', e);
    return NextResponse.json({ error: 'failed_to_export_dashboard' }, { status: 500 });
  }
}
