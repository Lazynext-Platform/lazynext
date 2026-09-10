import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/stats — budgeting stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { budgetCount: 0, forecastCount: 0, scenarioCount: 0, totalBudgeted: 0, totalSpent: 0 } });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const stats = await BudgetingService.getStats(organizationId);
  return NextResponse.json({ stats });
}
