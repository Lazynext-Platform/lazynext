import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * POST /api/orchestration/collaborations/[id]/end — end a collaboration.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: string; outcome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.outcome?.trim()) {
    return NextResponse.json({ error: 'outcome_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const summary = await OrchestrationService.endCollaboration(
      workspace.id,
      id,
      body.outcome.trim(),
    );

    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[orchestration] end error:', e);
    return NextResponse.json({ error: 'failed_to_end_collaboration' }, { status: 500 });
  }
}
