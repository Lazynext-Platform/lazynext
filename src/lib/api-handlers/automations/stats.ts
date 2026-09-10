import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutomationService } from '@/lib/services/automation';

/**
 * GET /api/automations/stats — automation stats for a workspace.
 * Query: workspaceId (required)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const stats = await AutomationService.getStats(workspaceId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[automations] stats error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
