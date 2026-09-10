import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceService } from '@/lib/services/performance';

/**
 * GET /api/performance/dashboard — performance dashboard.
 *
 * Combined view: index report, API health, slow queries, cache stats,
 * and performance recommendations.
 * Query params: organizationId (required)
 *
 * Requires an authenticated session with access to the organization.
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

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const dashboard = await PerformanceService.getPerformanceDashboard(organizationId);
    return NextResponse.json(dashboard);
  } catch (e) {
    console.error('[performance/dashboard] error:', e);
    return NextResponse.json({ error: 'failed_to_get_performance_dashboard' }, { status: 500 });
  }
}
