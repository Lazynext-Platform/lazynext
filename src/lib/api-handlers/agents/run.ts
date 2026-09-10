import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AgentRuntime } from '@/lib/services/agent-runtime';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * POST /api/agents/run — start an agent run.
 *
 * Body:
 *   agentId: string — the agent definition ID
 *   objective: string — what the agent should accomplish
 *   taskId?: string — associated task ID
 *   planId?: string — associated plan ID
 *   context?: Record<string, unknown> — additional context
 *   idempotencyKey?: string — deduplication key
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    agentId?: string;
    objective?: string;
    taskId?: string;
    planId?: string;
    context?: Record<string, unknown>;
    idempotencyKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.agentId) {
    return NextResponse.json({ error: 'agent_id_required' }, { status: 400 });
  }
  if (!body.objective?.trim()) {
    return NextResponse.json({ error: 'objective_required' }, { status: 400 });
  }

  try {
    // Get the user's workspace to determine organization
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces[0];

    const result = await AgentRuntime.run({
      workspaceId: workspace.id,
      organizationId: workspace.organizationId,
      agentId: body.agentId,
      taskId: body.taskId,
      planId: body.planId,
      objective: body.objective.slice(0, 5000),
      context: body.context,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ run: result }, { status: result.status === 'failed' ? 500 : 201 });
  } catch (e) {
    console.error('[agents/run] error:', e);
    return NextResponse.json({ error: 'failed_to_run_agent' }, { status: 500 });
  }
}
