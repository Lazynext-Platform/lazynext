import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ApprovalService } from '@/lib/services/approval';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/approvals — list approvals (query: workspaceId, status).
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

    const approvals = await ApprovalService.list(workspaceId, {
      status: status as 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | undefined,
    });
    return NextResponse.json({ approvals });
  } catch (e) {
    console.error('[approvals] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_approvals' }, { status: 500 });
  }
}

/**
 * POST /api/approvals — create an approval request.
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
    agentRunId?: string;
    toolCallId?: string;
    taskId?: string;
    action?: string;
    description?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    estimatedCost?: number;
    affectedResources?: string[];
    expiresAt?: string;
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

  const action = body.action?.trim();
  if (!action) {
    return NextResponse.json({ error: 'action_required' }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace and get organizationId
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    let expiresAt: Date | undefined;
    if (body.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (!isNaN(parsed.getTime())) expiresAt = parsed;
    }

    const approval = await ApprovalService.request({
      workspaceId,
      organizationId,
      agentRunId: body.agentRunId?.trim() || undefined,
      toolCallId: body.toolCallId?.trim() || undefined,
      taskId: body.taskId?.trim() || undefined,
      action,
      description,
      riskLevel: body.riskLevel,
      estimatedCost: body.estimatedCost,
      affectedResources: body.affectedResources,
      requestedBy: session.user.id,
      expiresAt,
    });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (e) {
    console.error('[approvals] request error:', e);
    return NextResponse.json({ error: 'failed_to_create_approval' }, { status: 500 });
  }
}
