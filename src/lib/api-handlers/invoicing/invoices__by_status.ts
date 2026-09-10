import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices/by-status?status=... — get invoices by status */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ invoices: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const invoices = await InvoiceService.getByStatus(organizationId, status);
  return NextResponse.json({ invoices });
}
