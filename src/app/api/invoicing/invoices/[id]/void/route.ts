import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** POST /api/invoicing/invoices/[id]/void — void an invoice */
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
    const invoice = await InvoiceService.void(id);
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices/void] error:', e);
    return NextResponse.json({ error: 'failed_to_void_invoice' }, { status: 500 });
  }
}
