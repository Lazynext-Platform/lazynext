import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/expenses/summary — get expense summary (query: startDate, endDate).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ summary: { total: 0, byCategory: {}, byMonth: {}, pendingCount: 0, count: 0 } });
    }

    const organizationId = workspaces[0].organizationId;

    let startDate: Date | undefined;
    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
    let endDate: Date | undefined;
    if (endDateStr) {
      const parsed = new Date(endDateStr);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    const summary = await FinanceService.getExpenseSummary(organizationId, { startDate, endDate });
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[finance/expenses] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_expense_summary' }, { status: 500 });
  }
}
