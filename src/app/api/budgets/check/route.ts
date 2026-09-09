import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetService } from '@/lib/services/budget';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/budgets/check — check if a spending action is within budget.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    organizationId?: string;
    scope?: 'company' | 'workspace' | 'agent' | 'task' | 'integration' | 'campaign' | 'period';
    scopeId?: string;
    amountCredits?: number;
    amountUsd?: number;
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

  const amountCredits = body.amountCredits;
  if (amountCredits === undefined || amountCredits < 0) {
    return NextResponse.json({ error: 'amountCredits_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace and get organizationId
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    const result = await BudgetService.check({
      workspaceId,
      organizationId,
      scope: body.scope,
      scopeId: body.scopeId?.trim() || undefined,
      amountCredits,
      amountUsd: body.amountUsd,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[budgets] check error:', e);
    return NextResponse.json({ error: 'failed_to_check_budget' }, { status: 500 });
  }
}
