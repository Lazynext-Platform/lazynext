import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/reports/[id]/export — export a report.
 * Query: format=json|csv|markdown
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const format = (sp.get('format') || 'json') as 'json' | 'csv' | 'markdown';

  try {
    const report = await AnalyticsService.getReport(id);
    if (!report) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === report.organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const exported = await AnalyticsService.exportReport(id, format);

    if (format === 'csv') {
      return new NextResponse(exported, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${id}.csv"`,
        },
      });
    }

    if (format === 'markdown') {
      return new NextResponse(exported, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="report-${id}.md"`,
        },
      });
    }

    return new NextResponse(exported, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="report-${id}.json"`,
      },
    });
  } catch (e) {
    console.error('[analytics/reports/export] error:', e);
    return NextResponse.json({ error: 'failed_to_export_report' }, { status: 500 });
  }
}
