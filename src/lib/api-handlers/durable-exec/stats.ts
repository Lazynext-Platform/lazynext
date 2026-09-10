import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DurableExecutionEngine } from '@/lib/services/durable-execution';

/**
 * GET /api/durable-exec/stats — get job statistics for a workspace.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ stats: { pending: 0, running: 0, completed: 0, failed: 0, deadLettered: 0 } });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || workspaces[0].id;
    const stats = await DurableExecutionEngine.getStats(workspaceId);

    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[durable-exec/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
