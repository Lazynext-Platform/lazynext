import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/transactions/[id] — get a single transaction */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const transaction = await BankingService.getTransaction(id);
  if (!transaction) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ transaction });
}

/** PATCH /api/banking/transactions/[id] — update a transaction */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const transaction = await BankingService.updateTransaction(id, {
      type: body.type, amount: body.amount, description: body.description,
      date: body.date, counterparty: body.counterparty, reference: body.reference,
      status: body.status, category: body.category,
    });
    if (!transaction) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error('[banking/transactions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_transaction' }, { status: 500 });
  }
}

/** DELETE /api/banking/transactions/[id] — delete a transaction */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await BankingService.deleteTransaction(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
