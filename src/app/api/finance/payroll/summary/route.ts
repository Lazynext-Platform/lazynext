import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/finance/payroll/summary — get payroll summary (query: period).
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
      return NextResponse.json({ summary: { grossTotal: 0, taxTotal: 0, netTotal: 0, benefitsTotal: 0, paidCount: 0, count: 0 } });
    }

    const organizationId = workspaces[0].organizationId;

    const summary = await FinanceService.getPayrollSummary(organizationId, period);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error('[finance/payroll] summary error:', e);
    return NextResponse.json({ error: 'failed_to_get_payroll_summary' }, { status: 500 });
  }
}
