import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollService } from '@/lib/services/payroll-service';

/** GET /api/hr/payroll/summary — get payroll summary */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ summary: { totalRecords: 0, totalGross: 0, totalTax: 0, totalNet: 0, totalBenefits: 0, totalDeductions: 0, byStatus: {}, byPeriod: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || undefined;

  const summary = await PayrollService.getPayrollSummary(organizationId, period || undefined);
  return NextResponse.json({ summary });
}
