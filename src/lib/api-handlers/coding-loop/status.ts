import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * GET /api/coding-loop/status — get loop status by taskId.
 * Query params: taskId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'task_id_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const status = await CodingLoopService.getLoopStatus(workspace.id, taskId);
    return NextResponse.json({ status });
  } catch (e) {
    console.error('[coding-loop/status] error:', e);
    return NextResponse.json({ error: 'failed_to_get_status' }, { status: 500 });
  }
}
