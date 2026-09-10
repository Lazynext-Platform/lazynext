import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PlanService } from '@/lib/services/plan';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/plans — list plans (query: workspaceId, status).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const status = sp.get('status') || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const plans = await PlanService.list(workspaceId, { status });
    return NextResponse.json({ plans });
  } catch (e) {
    console.error('[plans] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_plans' }, { status: 500 });
  }
}

/**
 * POST /api/plans — create a new plan.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    workspaceId?: string;
    organizationId?: string;
    goalId?: string;
    title?: string;
    objective?: string;
    reasoning?: string;
    priority?: string;
    riskLevel?: string;
    estimatedCost?: number;
    agentId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId_required' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const objective = body.objective?.trim();
  if (!objective) {
    return NextResponse.json({ error: 'objective_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace and get organizationId
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    const plan = await PlanService.create({
      workspaceId,
      organizationId,
      goalId: body.goalId?.trim() || undefined,
      title,
      objective,
      reasoning: body.reasoning?.trim() || undefined,
      priority: body.priority?.trim() || undefined,
      riskLevel: body.riskLevel?.trim() || undefined,
      estimatedCost: body.estimatedCost,
      createdById: session.user.id,
      agentId: body.agentId?.trim() || undefined,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
