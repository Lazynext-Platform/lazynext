import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GoalService } from '@/lib/services/goal';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/goals/[id] — get a goal by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyGoalOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const goal = await GoalService.get(id);
    if (!goal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ goal });
  } catch (e) {
    console.error('[goals] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_goal' }, { status: 500 });
  }
}

/**
 * PATCH /api/goals/[id] — update a goal.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const sp = req.nextUrl.searchParams;
  const workspaceIdParam = sp.get('workspaceId') || undefined;

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let workspaceId = workspaceIdParam;
  if (workspaceId) {
    const hasAccess = workspaces.some((w) => w.id === workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } else {
    workspaceId = workspaces[0].id;
  }

  const owned = await TenantGuardService.verifyGoalOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    progress?: number;
    dueDate?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Verify the goal exists
    const existing = await GoalService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let dueDate: Date | null | undefined;
    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        dueDate = null;
      } else {
        const parsed = new Date(body.dueDate);
        if (!isNaN(parsed.getTime())) dueDate = parsed;
      }
    }

    const updated = await GoalService.update(id, {
      title: body.title?.trim(),
      description: body.description?.trim(),
      status: body.status?.trim(),
      priority: body.priority?.trim(),
      progress: body.progress,
      dueDate,
    });
    return NextResponse.json({ goal: updated });
  } catch (e) {
    console.error('[goals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_goal' }, { status: 500 });
  }
}
