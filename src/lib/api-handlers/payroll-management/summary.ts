import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/summary — payroll summary (query: organizationId, period, fromDate, toDate) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalRecords: 0,
      totalGross: 0,
      totalTax: 0,
      totalNet: 0,
      totalBenefits: 0,
      totalDeductions: 0,
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string; fromDate?: Date; toDate?: Date } = {};
  const period = sp.get('period');
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (period) opts.period = period;
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  try {
    const summary = await PayrollManagementService.getPayrollSummary(organizationId, opts);
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[payroll-management/summary] error:', e);
    return NextResponse.json({ error: 'failed_to_get_summary' }, { status: 500 });
  }
}
