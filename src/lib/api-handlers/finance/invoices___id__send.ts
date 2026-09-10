import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/invoices/[id]/send — mark an invoice as sent.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const invoice = await FinanceService.sendInvoice(id);
    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('[finance/invoices] send error:', e);
    return NextResponse.json({ error: 'failed_to_send_invoice' }, { status: 500 });
  }
}
