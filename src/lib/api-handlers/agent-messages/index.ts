import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentCommunication } from '@/lib/services/agent-communication';

/**
 * GET /api/agent-messages — get messages for an agent.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    const direction = url.searchParams.get('direction') as 'sent' | 'received' | null;
    const type = url.searchParams.get('type') as 'request' | 'response' | 'notification' | 'question' | null;
    const wsId = url.searchParams.get('workspaceId');
    const since = url.searchParams.get('since');
    const takeStr = url.searchParams.get('take');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId_required' }, { status: 400 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ messages: [] });
    }
    const workspace = workspaces.find((w) => w.id === wsId) || workspaces[0];

    const messages = await AgentCommunication.getMessages(workspace.id, agentId, {
      direction: direction || undefined,
      type: type || undefined,
      since: since ? new Date(since) : undefined,
      take: takeStr ? parseInt(takeStr, 10) : undefined,
    });

    return NextResponse.json({ messages });
  } catch (e) {
    console.error('[agent-messages] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_messages' }, { status: 500 });
  }
}

/**
 * POST /api/agent-messages — send a message from one agent to another.
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
    type?: string;
    content?: string;
    taskId?: string;
    collaborationId?: string;
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
  if (!body.type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  const validTypes = ['request', 'response', 'notification', 'question'];
  if (!validTypes.includes(body.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const message = await AgentCommunication.sendMessage(workspace.id, {
      fromAgentId: body.fromAgentId,
      toAgentId: body.toAgentId,
      type: body.type as 'request' | 'response' | 'notification' | 'question',
      content: body.content,
      taskId: body.taskId,
      collaborationId: body.collaborationId,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    console.error('[agent-messages] send error:', e);
    return NextResponse.json({ error: 'failed_to_send_message' }, { status: 500 });
  }
}
