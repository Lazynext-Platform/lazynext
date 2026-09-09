import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AutonomyLoopService } from '@/lib/services/autonomy-loop';
import { safeError } from '@/lib/security';

/**
 * GET /api/autonomy-loops/[id]
 * Get loop state. The [id] segment is the agentId (loops are keyed by agentId).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    const loop = await AutonomyLoopService.getLoopState(id);
    if (!loop) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Verify the loop belongs to one of the user's workspaces
    const config = await AutonomyLoopService.getLoopConfig(id);
    if (config && !wsIds.includes(config.workspaceId)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    return NextResponse.json({ loop, config });
  } catch (e) {
    return NextResponse.json(safeError(e, 'autonomy-loops/[id]', 'get_failed'), { status: 500 });
  }
}

/**
 * PATCH /api/autonomy-loops/[id]
 * Update the loop — pause, resume, or stop.
 * Body: { action: 'pause' | 'resume' | 'stop' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { action?: 'pause' | 'resume' | 'stop' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'pause' && action !== 'resume' && action !== 'stop') {
    return NextResponse.json(
      { error: 'invalid_action', message: 'action must be pause, resume, or stop' },
      { status: 400 },
    );
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

    let loop;
    if (action === 'pause') loop = await AutonomyLoopService.pause(id);
    else if (action === 'resume') loop = await AutonomyLoopService.resume(id);
    else loop = await AutonomyLoopService.stop(id);

    return NextResponse.json({ loop });
  } catch (e) {
    return NextResponse.json(safeError(e, 'autonomy-loops/[id]', 'update_failed'), { status: 500 });
  }
}
