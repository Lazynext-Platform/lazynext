import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** DELETE /api/invoicing/invoices/[id]/line-items/[lineItemId] — remove a line item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; lineItemId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, lineItemId } = params;
  try {
    const invoice = await InvoiceService.removeLineItem(id, lineItemId);
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices/line-items/delete] error:', e);
    return NextResponse.json({ error: 'failed_to_remove_line_item' }, { status: 500 });
  }
}
