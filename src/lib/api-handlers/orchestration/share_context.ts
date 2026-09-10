import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * POST /api/orchestration/share-context — share context between agents.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    collaborationId?: string;
    fromAgentId?: string;
    toAgentIds?: string[];
    contextKey?: string;
    contextValue?: string;
    memoryType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.collaborationId) {
    return NextResponse.json({ error: 'collaborationId_required' }, { status: 400 });
  }
  if (!body.fromAgentId) {
    return NextResponse.json({ error: 'fromAgentId_required' }, { status: 400 });
  }
  if (!body.toAgentIds || body.toAgentIds.length === 0) {
    return NextResponse.json({ error: 'toAgentIds_required' }, { status: 400 });
  }
  if (!body.contextKey) {
    return NextResponse.json({ error: 'contextKey_required' }, { status: 400 });
  }
  if (body.contextValue === undefined) {
    return NextResponse.json({ error: 'contextValue_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    const memories = await OrchestrationService.shareContext(workspace.id, body.collaborationId, {
      fromAgentId: body.fromAgentId,
      toAgentIds: body.toAgentIds,
      contextKey: body.contextKey,
      contextValue: body.contextValue,
      memoryType: body.memoryType as
        | 'fact'
        | 'knowledge'
        | 'decision'
        | 'preference'
        | 'outcome'
        | 'lesson'
        | 'active_context'
        | 'historical_context'
        | undefined,
    });

    return NextResponse.json({ memories });
  } catch (e) {
    console.error('[orchestration] share-context error:', e);
    return NextResponse.json({ error: 'failed_to_share_context' }, { status: 500 });
  }
}
