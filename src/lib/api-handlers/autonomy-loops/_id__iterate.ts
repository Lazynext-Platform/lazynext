import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutonomyLoopService } from '@/lib/services/autonomy-loop';
import { safeError } from '@/lib/security';

/**
 * POST /api/autonomy-loops/[id]/iterate
 * Run one iteration of the autonomy loop. The [id] segment is the agentId.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    const config = await AutonomyLoopService.getLoopConfig(id);
    if (!config) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!wsIds.includes(config.workspaceId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    const loop = await AutonomyLoopService.runIteration(id);
    return NextResponse.json({ loop });
  } catch (e) {
    return NextResponse.json(
      safeError(e, 'autonomy-loops/[id]/iterate', 'iterate_failed'),
      { status: 500 },
    );
  }
}
