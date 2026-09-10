import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** GET /api/expenses-v2/[id] — get a single expense */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const expense = await ExpenseServiceV2.get(id);
  if (!expense) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ expense });
}

/** PATCH /api/expenses-v2/[id] — update an expense */
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
    const expense = await ExpenseServiceV2.update(id, {
      vendor: body.vendor,
      description: body.description,
      category: body.category,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      currency: body.currency,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
      receiptUrl: body.receiptUrl,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[expenses-v2] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_expense' }, { status: 500 });
  }
}

/** DELETE /api/expenses-v2/[id] — delete an expense */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await ExpenseServiceV2.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[expenses-v2] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_expense' }, { status: 500 });
  }
}
