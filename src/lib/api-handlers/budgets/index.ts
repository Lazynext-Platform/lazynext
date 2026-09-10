import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetService } from '@/lib/services/budget';
import { WorkspaceService } from '@/lib/services/workspace';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/budgets — list budgets (query: workspaceId).
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

    const budgets = await BudgetService.list(workspaceId);
    return NextResponse.json({ budgets });
  } catch (e) {
    console.error('[budgets] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_budgets' }, { status: 500 });
  }
}

/**
 * POST /api/budgets — create a budget.
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
    scope?: 'company' | 'workspace' | 'agent' | 'task' | 'integration' | 'campaign' | 'period';
    scopeId?: string;
    period?: string;
    limitCredits?: number;
    limitUsd?: number;
    currency?: string;
    endDate?: string;
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

  const scope = body.scope;
  if (!scope) {
    return NextResponse.json({ error: 'scope_required' }, { status: 400 });
  }

  try {
    // Verify the user is a member of the workspace and get organizationId
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const organizationId = body.organizationId?.trim() || workspace.organizationId;

    let endDate: Date | undefined;
    if (body.endDate) {
      const parsed = new Date(body.endDate);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    const budget = await BudgetService.create({
      workspaceId,
      organizationId,
      scope,
      scopeId: body.scopeId?.trim() || undefined,
      period: body.period?.trim() || undefined,
      limitCredits: body.limitCredits,
      limitUsd: body.limitUsd,
      currency: body.currency?.trim() || undefined,
      endDate,
    });
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    console.error('[budgets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_budget' }, { status: 500 });
  }
}
