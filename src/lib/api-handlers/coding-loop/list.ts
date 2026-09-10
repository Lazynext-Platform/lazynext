import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';

/**
 * GET /api/coding-loop/list — list coding loops for the user's workspace.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ loops: [] });
    }
    const workspace = workspaces[0];

    const loops = await CodingLoopService.listLoops(workspace.id);
    return NextResponse.json({ loops });
  } catch (e) {
    console.error('[coding-loop/list] error:', e);
    return NextResponse.json({ error: 'failed_to_list_loops' }, { status: 500 });
  }
}
