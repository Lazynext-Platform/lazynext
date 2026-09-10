import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SandboxService } from '@/lib/services/sandbox';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/sandbox/stats — get sandbox execution stats for a workspace.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const [stats, quota] = await Promise.all([
      SandboxService.getStats(workspaceId),
      SandboxService.checkQuota(workspaceId),
    ]);

    return NextResponse.json({ stats, quota });
  } catch (e) {
    console.error('[sandbox/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
