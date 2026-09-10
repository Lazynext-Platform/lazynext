import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * POST /api/orchestration/resolve-conflict — resolve a conflict between agents.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    collaborationId?: string;
    taskId?: string;
    conflictingAgentIds?: string[];
    resolution?: string;
    decidedBy?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.collaborationId) {
    return NextResponse.json({ error: 'collaborationId_required' }, { status: 400 });
  }
  if (!body.taskId) {
    return NextResponse.json({ error: 'taskId_required' }, { status: 400 });
  }
  if (!body.conflictingAgentIds || body.conflictingAgentIds.length === 0) {
    return NextResponse.json({ error: 'conflictingAgentIds_required' }, { status: 400 });
  }
  if (!body.resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }
  if (!body.decidedBy) {
    return NextResponse.json({ error: 'decidedBy_required' }, { status: 400 });
  }

  const validResolutions = ['first', 'last', 'merge', 'escalate', 'manual'];
  if (!validResolutions.includes(body.resolution)) {
    return NextResponse.json({ error: 'invalid_resolution' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const resolution = await OrchestrationService.resolveConflict(
      workspace.id,
      body.collaborationId,
      {
        taskId: body.taskId,
        conflictingAgentIds: body.conflictingAgentIds,
        resolution: body.resolution as 'first' | 'last' | 'merge' | 'escalate' | 'manual',
        decidedBy: body.decidedBy,
        notes: body.notes,
      },
    );

    return NextResponse.json({ resolution });
  } catch (e) {
    console.error('[orchestration] resolve-conflict error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_conflict' }, { status: 500 });
  }
}
