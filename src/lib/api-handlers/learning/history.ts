import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/learning/history — get learning cycle history.
 * Query: workspaceId, limit?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : 20;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const history = await LearningLoopService.getLearningHistory(workspaceId, limit);

    return NextResponse.json({ history });
  } catch (e) {
    console.error('[learning/history] error:', e);
    return NextResponse.json({ error: 'failed_to_get_history' }, { status: 500 });
  }
}
