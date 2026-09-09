import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/invoices/[id]/cancel — cancel an invoice.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invoice = await FinanceService.cancelInvoice(id);
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[finance/invoices] cancel error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_invoice' }, { status: 500 });
  }
}
