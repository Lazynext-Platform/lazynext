import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices — list invoices for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ invoices: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const invoices = await InvoiceService.list(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    status: (sp.get('status') as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void') || undefined,
    type: (sp.get('type') as 'sales' | 'purchase' | 'credit' | 'debit') || undefined,
    customerId: sp.get('customerId') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ invoices });
}

/** POST /api/invoicing/invoices — create a new invoice */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.dueDate) {
    return NextResponse.json({ error: 'due_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const invoice = await InvoiceService.create({
      organizationId,
      workspaceId: body.workspaceId,
      customerId: body.customerId,
      type: body.type,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      dueDate: new Date(body.dueDate),
      currency: body.currency,
      notes: body.notes,
      terms: body.terms,
      taxRate: body.taxRate,
      discountRate: body.discountRate,
      lineItems: Array.isArray(body.lineItems) ? body.lineItems : undefined,
      createdBy: session.user.id,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    console.error('[invoicing/invoices] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_invoice' }, { status: 500 });
  }
}
