import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/tax/summary — get tax summary (query: period).
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
      return NextResponse.json({ summary: { totalTax: 0, totalTaxable: 0, byType: {}, filedCount: 0, paidCount: 0, count: 0 } });
    }

    const organizationId = workspaces[0].organizationId;

    const summary = await FinanceService.getTaxSummary(organizationId, period);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[finance/tax] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_tax_summary' }, { status: 500 });
  }
}
