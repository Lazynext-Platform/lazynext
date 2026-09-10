import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentCommunication } from '@/lib/services/agent-communication';

/**
 * GET /api/agent-messages/conversation — get conversation between two agents.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const agent1Id = url.searchParams.get('agent1Id');
    const agent2Id = url.searchParams.get('agent2Id');
    const wsId = url.searchParams.get('workspaceId');
    const since = url.searchParams.get('since');
    const takeStr = url.searchParams.get('take');

    if (!agent1Id || !agent2Id) {
      return NextResponse.json({ error: 'agent1Id_and_agent2Id_required' }, { status: 400 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ messages: [] });
    }
    const workspace = workspaces.find((w) => w.id === wsId) || workspaces[0];

    const conversation = await AgentCommunication.getConversation(
      workspace.id,
      agent1Id,
      agent2Id,
      {
        since: since ? new Date(since) : undefined,
        take: takeStr ? parseInt(takeStr, 10) : undefined,
      },
    );

    return NextResponse.json({ conversation });
  } catch (e) {
    console.error('[agent-messages] conversation error:', e);
    return NextResponse.json({ error: 'failed_to_get_conversation' }, { status: 500 });
  }
}
