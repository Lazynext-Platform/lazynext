import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/expenses/[id]/approve — approve an expense.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const expense = await FinanceService.approveExpense(id, session.user.id);
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[finance/expenses] approve error:', e);
    return NextResponse.json({ error: 'failed_to_approve_expense' }, { status: 500 });
  }
}
