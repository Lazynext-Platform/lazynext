import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices/revenue-trend — get revenue trend by month */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ trend: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const months = parseInt(req.nextUrl.searchParams.get('months') || '12', 10);
  const trend = await InvoiceService.getRevenueTrend(organizationId, months);
  return NextResponse.json({ trend });
}
