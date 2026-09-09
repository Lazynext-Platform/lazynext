import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** POST /api/invoicing/invoices/[id]/cancel — cancel an invoice */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const invoice = await InvoiceService.cancel(id);
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices/cancel] error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_invoice' }, { status: 500 });
  }
}
