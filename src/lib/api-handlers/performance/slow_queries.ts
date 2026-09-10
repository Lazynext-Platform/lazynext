import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceService } from '@/lib/services/performance';

/**
 * GET /api/performance/slow-queries — slow queries.
 *
 * Returns the slowest recorded query metrics for the given organization.
 * Query params: organizationId (required), limit? (default 20)
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

    const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : 20;
    const queries = await PerformanceService.getSlowQueries(organizationId, limit);
    return NextResponse.json({ queries });
  } catch (e) {
    console.error('[performance/slow-queries] error:', e);
    return NextResponse.json({ error: 'failed_to_get_slow_queries' }, { status: 500 });
  }
}
