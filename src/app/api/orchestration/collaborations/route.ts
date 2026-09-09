import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * GET /api/orchestration/collaborations — list collaboration sessions.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ collaborations: [] });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const wsId = url.searchParams.get('workspaceId');

    // If a specific workspace is requested, use it; otherwise aggregate all
    if (wsId) {
      const ws = workspaces.find((w) => w.id === wsId);
      if (!ws) {
        return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 });
      }
      const collaborations = await OrchestrationService.listCollaborations(ws.id, { status });
      return NextResponse.json({ collaborations });
    }

    // Aggregate across all workspaces
    const allCollaborations = await Promise.all(
      workspaces.map((w) => OrchestrationService.listCollaborations(w.id, { status })),
    );
    const collaborations = allCollaborations.flat();
    return NextResponse.json({ collaborations });
  } catch (e) {
    console.error('[orchestration] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_collaborations' }, { status: 500 });
  }
}

/**
 * POST /api/orchestration/collaborations — create a collaboration session.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    goalId?: string;
    planId?: string;
    title?: string;
    description?: string;
    participantAgentIds?: string[];
    coordinatorAgentId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.coordinatorAgentId) {
    return NextResponse.json({ error: 'coordinator_required' }, { status: 400 });
  }
  if (!body.participantAgentIds || body.participantAgentIds.length === 0) {
    return NextResponse.json({ error: 'participants_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const collaboration = await OrchestrationService.createCollaboration(
      workspace.id,
      workspace.organizationId,
      {
        goalId: body.goalId,
        planId: body.planId,
        title: body.title.trim(),
        description: body.description || '',
        participantAgentIds: body.participantAgentIds,
        coordinatorAgentId: body.coordinatorAgentId,
      },
    );

    return NextResponse.json({ collaboration }, { status: 201 });
  } catch (e) {
    console.error('[orchestration] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_collaboration' }, { status: 500 });
  }
}
