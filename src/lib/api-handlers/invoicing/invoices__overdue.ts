import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices/overdue — get overdue invoices */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ invoices: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const invoices = await InvoiceService.getOverdue(organizationId);
  return NextResponse.json({ invoices });
}
