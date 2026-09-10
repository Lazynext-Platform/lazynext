import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GoalService } from '@/lib/services/goal';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/goals — list goals (query: organizationId, status, workspaceId).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const status = sp.get('status') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const goals = await GoalService.list(organizationId, { status, workspaceId });
    return NextResponse.json({ goals });
  } catch (e) {
    console.error('[goals] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_goals' }, { status: 500 });
  }
}

/**
 * POST /api/goals — create a new goal.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    organizationId?: string;
    workspaceId?: string;
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    dueDate?: string;
    parentGoalId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  try {
    // Verify the user has access to a workspace in this organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let dueDate: Date | undefined;
    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (!isNaN(parsed.getTime())) dueDate = parsed;
    }

    const goal = await GoalService.create({
      organizationId,
      workspaceId: body.workspaceId?.trim() || undefined,
      title,
      description: body.description?.trim() || undefined,
      type: body.type?.trim() || undefined,
      priority: body.priority?.trim() || undefined,
      dueDate,
      parentGoalId: body.parentGoalId?.trim() || undefined,
      createdById: session.user.id,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    console.error('[goals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_goal' }, { status: 500 });
  }
}
