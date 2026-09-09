import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/learning/reprioritize — reprioritize tasks based on learning.
 * Body: { workspaceId, take? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; take?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const summary = await LearningLoopService.reprioritizeTasks(
      workspaceId,
      body.take ? { take: body.take } : undefined,
    );

    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[learning/reprioritize] error:', e);
    return NextResponse.json({ error: 'failed_to_reprioritize' }, { status: 500 });
  }
}
