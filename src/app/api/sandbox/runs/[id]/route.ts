import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SandboxService } from '@/lib/services/sandbox';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/sandbox/runs/[id] — get a single sandbox run.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    const run = await SandboxService.getRun(id);
    if (!run) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Verify the user is a member of the workspace that owns this run
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === run.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({ run });
  } catch (e) {
    console.error('[sandbox/runs/[id]] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_run' }, { status: 500 });
  }
}

/**
 * POST /api/sandbox/runs/[id] — cancel a sandbox run.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    const run = await SandboxService.getRun(id);
    if (!run) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Verify the user is a member of the workspace that owns this run
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === run.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const cancelled = await SandboxService.cancelRun(id);
    return NextResponse.json({ run: cancelled });
  } catch (e) {
    console.error('[sandbox/runs/[id]] cancel error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_run' }, { status: 500 });
  }
}
