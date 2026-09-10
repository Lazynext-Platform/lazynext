import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentCommunication } from '@/lib/services/agent-communication';

/**
 * POST /api/agent-messages/broadcast — broadcast a message to multiple agents.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    fromAgentId?: string;
    toAgentIds?: string[];
    type?: string;
    content?: string;
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
  if (!body.toAgentIds || body.toAgentIds.length === 0) {
    return NextResponse.json({ error: 'toAgentIds_required' }, { status: 400 });
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

    const result = await AgentCommunication.broadcastMessage(workspace.id, {
      fromAgentId: body.fromAgentId,
      toAgentIds: body.toAgentIds,
      type: body.type as 'request' | 'response' | 'notification' | 'question',
      content: body.content,
      collaborationId: body.collaborationId,
    });

    return NextResponse.json({ count: result.count, messages: result.messages });
  } catch (e) {
    console.error('[agent-messages] broadcast error:', e);
    return NextResponse.json({ error: 'failed_to_broadcast_message' }, { status: 500 });
  }
}
