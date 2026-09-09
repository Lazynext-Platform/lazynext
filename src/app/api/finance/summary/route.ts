import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/summary — get income, expense, net totals and category breakdown.
 * Query: workspaceId, startDate, endDate
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;
  const startDateStr = sp.get('startDate') || undefined;
  const endDateStr = sp.get('endDate') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ summary: { income: 0, expense: 0, net: 0, count: 0 }, byCategory: {} });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

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

    const [summary, byCategory] = await Promise.all([
      FinanceService.getSummary(wsId, startDate, endDate),
      FinanceService.getByCategory(wsId, startDate, endDate),
    ]);
    return NextResponse.json({ summary, byCategory });
  } catch (e) {
    console.error('[finance] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
