import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/analytics/system-health — system health summary.
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
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const health = await AnalyticsService.getSystemHealth(organizationId);
    return NextResponse.json(health);
  } catch (e) {
    console.error('[analytics/system-health] error:', e);
    return NextResponse.json({ error: 'failed_to_get_system_health' }, { status: 500 });
  }
}
