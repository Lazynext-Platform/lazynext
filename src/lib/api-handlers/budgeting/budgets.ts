import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService, type BudgetScope, type BudgetStatus, type BudgetPeriod } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/budgets — list budgets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ budgets: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { scope?: BudgetScope; status?: BudgetStatus; period?: BudgetPeriod; department?: string } = {};
  const scope = sp.get('scope');
  const status = sp.get('status');
  const period = sp.get('period');
  const department = sp.get('department');
  if (scope) opts.scope = scope as BudgetScope;
  if (status) opts.status = status as BudgetStatus;
  if (period) opts.period = period as BudgetPeriod;
  if (department) opts.department = department;

  const budgets = await BudgetingService.listBudgets(organizationId, opts);
  return NextResponse.json({ budgets });
}

/** POST /api/budgeting/budgets — create a budget */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.scope || !body.period || !body.startDate) {
    return NextResponse.json({ error: 'scope_period_startdate_required' }, { status: 400 });
  }

  try {
    const budget = await BudgetingService.createBudget(organizationId, workspaceId, {
      scope: body.scope,
      scopeId: body.scopeId,
      period: body.period,
      limitUsd: body.limitUsd !== undefined ? Number(body.limitUsd) : undefined,
      limitCredits: body.limitCredits !== undefined ? Number(body.limitCredits) : undefined,
      currency: body.currency,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      department: body.department,
      category: body.category,
    });
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    console.error('[budgeting] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_budget' }, { status: 500 });
  }
}
