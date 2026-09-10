import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/analytics/reports/[id]/run — run a report.
 * Body (optional): { workspaceId?: string }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: { workspaceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

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

    const result = await AnalyticsService.runReport(report.organizationId, id, {
      workspaceId: body.workspaceId?.trim() || undefined,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[analytics/reports/run] error:', e);
    return NextResponse.json({ error: 'failed_to_run_report' }, { status: 500 });
  }
}
