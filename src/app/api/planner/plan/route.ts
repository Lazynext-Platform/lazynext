import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { Planner } from '@/lib/services/planner';

/**
 * POST /api/planner/plan — create a plan from a goal/objective.
 *
 * Body:
 *   objective: string — what to plan for
 *   goalId?: string — associated goal ID
 *   constraints?: { budget?, timeframe?, availableAgents?, availableTools? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    objective?: string;
    goalId?: string;
    constraints?: { budget?: number; timeframe?: string; availableAgents?: string[]; availableTools?: string[] };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.objective?.trim()) {
    return NextResponse.json({ error: 'objective_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const result = await Planner.plan({
      workspaceId: workspace.id,
      organizationId: workspace.organizationId,
      goalId: body.goalId,
      objective: body.objective.slice(0, 5000),
      constraints: body.constraints,
      createdById: session.user.id,
    });

    return NextResponse.json({ plan: result }, { status: 201 });
  } catch (e) {
    console.error('[planner/plan] error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
