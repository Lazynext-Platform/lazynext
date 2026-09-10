import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PlanService } from '@/lib/services/plan';
import { WorkspaceService } from '@/lib/services/workspace';
import { TenantGuardService } from '@/lib/services/tenant-guard';

/**
 * GET /api/plans/[id] — get a plan by ID.
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

  const owned = await TenantGuardService.verifyPlanOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const plan = await PlanService.get(id);
    if (!plan) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[plans] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_plan' }, { status: 500 });
  }
}

/**
 * PATCH /api/plans/[id] — update a plan / approve a plan.
 * If `approved: true` is passed, the plan is approved by the current user.
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

  const owned = await TenantGuardService.verifyPlanOwnership(id, workspaceId);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: {
    title?: string;
    objective?: string;
    reasoning?: string;
    status?: string;
    priority?: string;
    riskLevel?: string;
    estimatedCost?: number;
    approved?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Verify the plan exists
    const existing = await PlanService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Approve flow
    if (body.approved === true) {
      const approved = await PlanService.approve(id, session.user.id);
      return NextResponse.json({ plan: approved });
    }

    const updated = await PlanService.update(id, {
      title: body.title?.trim(),
      objective: body.objective?.trim(),
      reasoning: body.reasoning?.trim(),
      status: body.status?.trim(),
      priority: body.priority?.trim(),
      riskLevel: body.riskLevel?.trim(),
      estimatedCost: body.estimatedCost,
    });
    return NextResponse.json({ plan: updated });
  } catch (e) {
    console.error('[plans] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_plan' }, { status: 500 });
  }
}
