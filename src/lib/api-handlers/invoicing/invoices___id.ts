import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** GET /api/invoicing/invoices/[id] — get an invoice by ID */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const invoice = await InvoiceService.get(id);
  if (!invoice) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

/** PATCH /api/invoicing/invoices/[id] — update an invoice */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const invoice = await InvoiceService.update(id, {
      customerId: body.customerId,
      type: body.type,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      currency: body.currency,
      notes: body.notes,
      terms: body.terms,
      taxRate: body.taxRate,
      discountRate: body.discountRate,
      status: body.status,
    });
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_invoice' }, { status: 500 });
  }
}

/** DELETE /api/invoicing/invoices/[id] — delete an invoice */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await InvoiceService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
