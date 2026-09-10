import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutomationDispatcher } from '@/lib/automation/dispatcher';

/**
 * GET /api/automations/recent-dispatches — recent automation runs across the user's org.
 * Query: limit (default 20)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = parseInt(sp.get('limit') ?? '20', 10) || 20;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
    if (orgIds.length === 0) {
      return NextResponse.json({ dispatches: [] });
    }

    // Aggregate across all orgs the user belongs to.
    const results = await Promise.all(
      orgIds.map((orgId) => AutomationDispatcher.getRecentDispatches(orgId, limit)),
    );
    const dispatches = results
      .flat()
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ dispatches });
  } catch (e) {
    console.error('[automations/recent-dispatches] error:', e);
    return NextResponse.json({ error: 'failed_to_get_recent_dispatches' }, { status: 500 });
  }
}
