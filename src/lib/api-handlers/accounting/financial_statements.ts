import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/financial-statements — balance sheet, income statement, cash flow */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      balanceSheet: { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 },
      incomeStatement: { revenue: [], expenses: [], totalRevenue: 0, totalExpenses: 0, netIncome: 0 },
      cashFlowSummary: { operating: 0, investing: 0, financing: 0, netChange: 0 },
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { fromDate?: Date; toDate?: Date; period?: string } = {};
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  const period = sp.get('period');
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);
  if (period) opts.period = period;

  const statements = await AccountingService.getFinancialStatements(organizationId, opts);
  return NextResponse.json(statements);
}
