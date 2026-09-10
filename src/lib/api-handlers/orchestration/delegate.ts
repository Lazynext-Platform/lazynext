import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * POST /api/orchestration/delegate — delegate a task to a specific agent.
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
    fromAgentId?: string;
    toAgentId?: string;
    instructions?: string;
    priority?: string;
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
  if (!body.fromAgentId) {
    return NextResponse.json({ error: 'fromAgentId_required' }, { status: 400 });
  }
  if (!body.toAgentId) {
    return NextResponse.json({ error: 'toAgentId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const task = await OrchestrationService.delegateTask(workspace.id, body.collaborationId, {
      taskId: body.taskId,
      fromAgentId: body.fromAgentId,
      toAgentId: body.toAgentId,
      instructions: body.instructions,
      priority: body.priority,
    });

    return NextResponse.json({ task });
  } catch (e) {
    console.error('[orchestration] delegate error:', e);
    return NextResponse.json({ error: 'failed_to_delegate_task' }, { status: 500 });
  }
}
