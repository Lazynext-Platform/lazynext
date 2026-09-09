import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentCommunication } from '@/lib/services/agent-communication';

/**
 * POST /api/agent-messages/assistance/[id]/respond — respond to an assistance request.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    fromAgentId?: string;
    response?: string;
    result?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.fromAgentId) {
    return NextResponse.json({ error: 'fromAgentId_required' }, { status: 400 });
  }
  if (!body.response) {
    return NextResponse.json({ error: 'response_required' }, { status: 400 });
  }

  const validResponses = ['accepted', 'declined', 'completed'];
  if (!validResponses.includes(body.response)) {
    return NextResponse.json({ error: 'invalid_response' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const result = await AgentCommunication.respondToAssistance(workspace.id, {
      requestId: id,
      fromAgentId: body.fromAgentId,
      response: body.response as 'accepted' | 'declined' | 'completed',
      result: body.result,
    });

    return NextResponse.json({ response: result });
  } catch (e) {
    console.error('[agent-messages] respond error:', e);
    return NextResponse.json({ error: 'failed_to_respond_to_assistance' }, { status: 500 });
  }
}
