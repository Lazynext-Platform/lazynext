import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** POST /api/invoicing/invoices/[id]/line-items — add a line item to an invoice */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (!body.description) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 });
  }

  try {
    const invoice = await InvoiceService.addLineItem(id, {
      description: body.description,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      taxRate: body.taxRate,
      discountRate: body.discountRate,
      category: body.category,
    });
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices/line-items] error:', e);
    return NextResponse.json({ error: 'failed_to_add_line_item' }, { status: 500 });
  }
}
