import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/stats — dashboard stats for an organization.
 * Query: organizationId
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
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const stats = await AnalyticsService.getDashboardStats(organizationId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[analytics/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
