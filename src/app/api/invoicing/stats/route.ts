import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';
import { ARService } from '@/lib/services/ar-service';
import { APService } from '@/lib/services/ap-service';

/** GET /api/invoicing/stats — get overall invoicing stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      invoices: { totalInvoices: 0, byStatus: {}, byType: {}, totalRevenue: 0, totalOutstanding: 0, totalOverdue: 0 },
      ar: { totalReceivables: 0, totalOverdue: 0, collectionRate: 0, avgDaysToPay: 0, invoiceCount: 0, overdueCount: 0 },
      ap: { totalPayables: 0, payableCount: 0, byCategory: {}, avgDaysToPay: 0, pendingApprovalCount: 0 },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const [invoiceStats, arStats, apStats] = await Promise.all([
    InvoiceService.getStats(organizationId),
    ARService.getStats(organizationId),
    APService.getStats(organizationId),
  ]);

  return NextResponse.json({
    invoices: invoiceStats,
    ar: arStats,
    ap: apStats,
  });
}
