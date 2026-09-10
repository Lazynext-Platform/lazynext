import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentSeedService } from '@/lib/services/agent-seed';

/**
 * POST /api/agents/seed — seed default agents for the authenticated user's workspace.
 *
 * Creates default agents (Growth Manager, Design Lead, Engineering Lead,
 * Research Analyst, Product Manager, Operations Manager) if they don't already
 * exist for the workspace.
 */
export async function POST(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const ws = workspaces[0];
    const agents = await AgentSeedService.seedDefaultAgents(
      ws.id,
      ws.organizationId,
      session.user.id,
    );

    const newCount = agents.filter((a) => a.isNew).length;
    return NextResponse.json({
      agents,
      created: newCount,
      total: agents.length,
    });
  } catch (e) {
    console.error('[agents/seed] error:', e);
    return NextResponse.json({ error: 'failed_to_seed_agents' }, { status: 500 });
  }
}
