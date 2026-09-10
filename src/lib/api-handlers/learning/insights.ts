import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/learning/insights — extract insights from recent outcomes.
 * Query: workspaceId, organizationId, take?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const organizationId = sp.get('organizationId') || undefined;
  const take = sp.get('take') ? parseInt(sp.get('take')!, 10) : undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const insights = await LearningLoopService.extractInsights(
      workspaceId,
      organizationId,
      take ? { take } : undefined,
    );

    return NextResponse.json({ insights });
  } catch (e) {
    console.error('[learning/insights] error:', e);
    return NextResponse.json({ error: 'failed_to_extract_insights' }, { status: 500 });
  }
}
