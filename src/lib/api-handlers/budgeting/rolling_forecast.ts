import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** GET /api/budgeting/rolling-forecast — rolling forecast based on historical spending */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ forecast: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const monthsParam = sp.get('months');
  const opts: { months?: number } = {};
  if (monthsParam) opts.months = parseInt(monthsParam, 10);

  const forecast = await BudgetingService.getRollingForecast(organizationId, opts);
  return NextResponse.json({ forecast });
}
