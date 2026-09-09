import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/invoices/[id]/payment — record a payment against an invoice.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.amount === undefined || isNaN(body.amount)) {
    return NextResponse.json({ error: 'amount_required' }, { status: 400 });
  }

  try {
    const invoice = await FinanceService.recordPayment(id, body.amount);
    return NextResponse.json({ invoice });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'invoice_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[finance/invoices] payment error:', e);
    return NextResponse.json({ error: 'failed_to_record_payment' }, { status: 500 });
  }
}
