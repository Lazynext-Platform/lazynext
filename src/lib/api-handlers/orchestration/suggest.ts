import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * POST /api/orchestration/suggest — suggest agents for a collaboration based on a goal.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; goalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.goalId) {
    return NextResponse.json({ error: 'goalId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const suggestion = await OrchestrationService.suggestCollaboration(
      workspace.id,
      workspace.organizationId,
      body.goalId,
    );

    return NextResponse.json({ suggestion });
  } catch (e) {
    console.error('[orchestration] suggest error:', e);
    return NextResponse.json({ error: 'failed_to_suggest_collaboration' }, { status: 500 });
  }
}
