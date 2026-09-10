import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * GET /api/deployments/stats — get deployment statistics for a workspace.
 * Query: workspaceId (defaults to the user's first workspace)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({
        stats: {
          total: 0,
          byStatus: {},
          byEnvironment: {},
          successRate: 0,
          avgDurationMs: 0,
        },
      });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const stats = await DeploymentService.getDeploymentStats(wsId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[deployments] stats error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
