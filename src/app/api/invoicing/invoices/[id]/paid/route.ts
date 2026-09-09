import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvoiceService } from '@/lib/services/invoice-service';

/** POST /api/invoicing/invoices/[id]/paid — mark an invoice as paid */
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

  try {
    const invoice = await InvoiceService.markPaid(id, body.paidAmount);
    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[invoicing/invoices/paid] error:', e);
    return NextResponse.json({ error: 'failed_to_mark_paid' }, { status: 500 });
  }
}
