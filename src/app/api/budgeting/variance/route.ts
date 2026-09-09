import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService, type BudgetPeriod } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/variance — variance analysis */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ variances: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: BudgetPeriod; budgetId?: string } = {};
  const period = sp.get('period');
  const budgetId = sp.get('budgetId');
  if (period) opts.period = period as BudgetPeriod;
  if (budgetId) opts.budgetId = budgetId;

  const variances = await BudgetingService.getVarianceAnalysis(organizationId, opts);
  return NextResponse.json({ variances });
}
