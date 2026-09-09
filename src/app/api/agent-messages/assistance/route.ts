import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentCommunication } from '@/lib/services/agent-communication';

/**
 * POST /api/agent-messages/assistance — an agent requests assistance from another.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    fromAgentId?: string;
    toAgentId?: string;
    taskId?: string;
    requestType?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.fromAgentId) {
    return NextResponse.json({ error: 'fromAgentId_required' }, { status: 400 });
  }
  if (!body.toAgentId) {
    return NextResponse.json({ error: 'toAgentId_required' }, { status: 400 });
  }
  if (!body.taskId) {
    return NextResponse.json({ error: 'taskId_required' }, { status: 400 });
  }
  if (!body.requestType) {
    return NextResponse.json({ error: 'requestType_required' }, { status: 400 });
  }
  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const request = await AgentCommunication.requestAssistance(workspace.id, {
      fromAgentId: body.fromAgentId,
      toAgentId: body.toAgentId,
      taskId: body.taskId,
      requestType: body.requestType,
      description: body.description,
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[agent-messages] assistance error:', e);
    return NextResponse.json({ error: 'failed_to_request_assistance' }, { status: 500 });
  }
}
