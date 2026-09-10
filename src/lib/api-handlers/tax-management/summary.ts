import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management/summary — tax summary */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ summary: { totalTaxableAmount: 0, totalTaxAmount: 0, byType: {}, byJurisdiction: {}, byStatus: {} } });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string; type?: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst'; fromDate?: Date; toDate?: Date } = {};
  const period = sp.get('period');
  const type = sp.get('type');
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (period) opts.period = period;
  if (type) opts.type = type as 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  const summary = await TaxManagementService.getTaxSummary(organizationId, opts);
  return NextResponse.json({ summary });
}
