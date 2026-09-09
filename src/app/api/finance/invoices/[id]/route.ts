import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * GET /api/finance/invoices/[id] — get an invoice by ID.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await FinanceService.getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[finance/invoices] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_invoice' }, { status: 500 });
  }
}

/**
 * PATCH /api/finance/invoices/[id] — update an invoice (only if draft).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    customerId?: string;
    type?: string;
    dueDate?: string;
    taxRate?: number;
    discountRate?: number;
    currency?: string;
    notes?: string;
    terms?: string;
    status?: string;
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      discountRate?: number;
      category?: string;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    let dueDate: Date | undefined;
    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (!isNaN(parsed.getTime())) dueDate = parsed;
    }

    const invoice = await FinanceService.updateInvoice(id, {
      customerId: body.customerId,
      type: body.type,
      dueDate,
      taxRate: body.taxRate,
      discountRate: body.discountRate,
      currency: body.currency,
      notes: body.notes,
      terms: body.terms,
      status: body.status,
      lineItems: body.lineItems?.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxRate: li.taxRate,
        discountRate: li.discountRate,
        category: li.category,
      })),
    });
    return NextResponse.json({ invoice });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'invoice_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (msg === 'invoice_not_editable') {
      return NextResponse.json({ error: 'invoice_not_editable' }, { status: 400 });
    }
    console.error('[finance/invoices] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_invoice' }, { status: 500 });
  }
}

/**
 * DELETE /api/finance/invoices/[id] — delete an invoice (only if draft).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await FinanceService.deleteInvoice(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'invoice_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (msg === 'invoice_not_deletable') {
      return NextResponse.json({ error: 'invoice_not_deletable' }, { status: 400 });
    }
    console.error('[finance/invoices] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_invoice' }, { status: 500 });
  }
}
