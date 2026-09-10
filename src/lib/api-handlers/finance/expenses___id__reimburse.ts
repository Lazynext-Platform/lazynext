import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/expenses/[id]/reimburse — mark an expense as reimbursed.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const expense = await FinanceService.reimburseExpense(id);
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[finance/expenses] reimburse error:', e);
    return NextResponse.json({ error: 'failed_to_reimburse_expense' }, { status: 500 });
  }
}
