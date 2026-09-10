import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices/stats — get invoice stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalInvoices: 0,
      byStatus: {},
      byType: {},
      totalRevenue: 0,
      totalOutstanding: 0,
      totalOverdue: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await InvoiceService.getStats(organizationId);
  return NextResponse.json(stats);
}
