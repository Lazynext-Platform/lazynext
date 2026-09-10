import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService, type BudgetPeriod, type BudgetScope } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/budget-vs-actual — compare budget limits to actual spending */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ comparisons: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: BudgetPeriod; scope?: BudgetScope } = {};
  const period = sp.get('period');
  const scope = sp.get('scope');
  if (period) opts.period = period as BudgetPeriod;
  if (scope) opts.scope = scope as BudgetScope;

  const comparisons = await BudgetingService.getBudgetVsActual(organizationId, opts);
  return NextResponse.json({ comparisons });
}
