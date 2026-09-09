import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/transactions/[id] — get a single portfolio transaction */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const transaction = await PortfolioService.getTransaction(id);
  if (!transaction) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ transaction });
}

/** PATCH /api/portfolio/transactions/[id] — update a portfolio transaction */
export async function PATCH(
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
    const transaction = await PortfolioService.updateTransaction(id, {
      holdingId: body.holdingId, type: body.type, quantity: body.quantity,
      price: body.price, amount: body.amount, currency: body.currency,
      transactionDate: body.transactionDate, fees: body.fees, notes: body.notes,
    });
    if (!transaction) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error('[portfolio/transactions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_transaction' }, { status: 500 });
  }
}

/** DELETE /api/portfolio/transactions/[id] — delete a portfolio transaction */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await PortfolioService.deleteTransaction(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
