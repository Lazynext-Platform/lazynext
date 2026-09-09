import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/revenue/summary — get revenue summary (query: period).
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const period = sp.get('period') || '';

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ summary: { total: 0, recognized: 0, deferred: 0, byType: {}, count: 0 } });
    }

    const organizationId = workspaces[0].organizationId;

    const summary = await FinanceService.getRevenueSummary(organizationId, period);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[finance/revenue] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_revenue_summary' }, { status: 500 });
  }
}
