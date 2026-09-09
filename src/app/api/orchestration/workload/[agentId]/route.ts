import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OrchestrationService } from '@/lib/services/orchestration';

/**
 * GET /api/orchestration/workload/[agentId] — get an agent's current workload.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    const url = new URL(req.url);
    const wsId = url.searchParams.get('workspaceId');
    const workspace = workspaces.find((w) => w.id === wsId) || workspaces[0];

    const workload = await OrchestrationService.getAgentWorkload(workspace.id, agentId);
    return NextResponse.json({ workload });
  } catch (e) {
    console.error('[orchestration] workload error:', e);
    return NextResponse.json({ error: 'failed_to_get_workload' }, { status: 500 });
  }
}
