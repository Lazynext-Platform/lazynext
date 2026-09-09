import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/learning/evaluate — evaluate an outcome.
 * Body: { workspaceId, organizationId, resourceType, resourceId, outcome, metrics?, notes? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    resourceType?: 'task' | 'agent_run' | 'plan';
    resourceId?: string;
    outcome?: 'success' | 'failure' | 'partial';
    metrics?: Record<string, number>;
    notes?: string;
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

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  if (!body.resourceType || !body.resourceId || !body.outcome) {
    return NextResponse.json(
      { error: 'resourceType_resourceId_outcome_required' },
      { status: 400 },
    );
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const memory = await LearningLoopService.evaluateOutcome(
      workspaceId,
      organizationId,
      {
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        outcome: body.outcome,
        metrics: body.metrics,
        notes: body.notes,
      },
    );

    return NextResponse.json({ memory }, { status: 201 });
  } catch (e) {
    console.error('[learning/evaluate] error:', e);
    return NextResponse.json({ error: 'failed_to_evaluate_outcome' }, { status: 500 });
  }
}
