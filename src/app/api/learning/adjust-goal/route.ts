import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/learning/adjust-goal — adjust goal targets based on progress.
 * Body: { workspaceId, organizationId, goalId }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; organizationId?: string; goalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const goalId = body.goalId?.trim();
  if (!goalId) {
    return NextResponse.json({ error: 'goalId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const recommendation = await LearningLoopService.adjustGoalTargets(
      workspaceId,
      organizationId,
      goalId,
    );

    if (!recommendation) {
      return NextResponse.json({ error: 'goal_not_found' }, { status: 404 });
    }

    return NextResponse.json({ recommendation });
  } catch (e) {
    console.error('[learning/adjust-goal] error:', e);
    return NextResponse.json({ error: 'failed_to_adjust_goal' }, { status: 500 });
  }
}
