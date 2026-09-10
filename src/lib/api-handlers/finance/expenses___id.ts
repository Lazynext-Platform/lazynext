import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * GET /api/finance/expenses/[id] — get an expense by ID.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const expense = await FinanceService.getExpense(id);
    if (!expense) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[finance/expenses] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_expense' }, { status: 500 });
  }
}

/**
 * PATCH /api/finance/expenses/[id] — update an expense.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    vendor?: string;
    description?: string;
    category?: string;
    amount?: number;
    currency?: string;
    status?: string;
    receiptUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const expense = await FinanceService.updateExpense(id, {
      vendor: body.vendor?.trim() || undefined,
      description: body.description?.trim() || undefined,
      category: body.category?.trim() || undefined,
      amount: body.amount,
      currency: body.currency?.trim() || undefined,
      status: body.status?.trim() || undefined,
      receiptUrl: body.receiptUrl?.trim() || undefined,
    });
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[finance/expenses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_expense' }, { status: 500 });
  }
}
