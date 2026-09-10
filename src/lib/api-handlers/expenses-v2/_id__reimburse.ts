import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** POST /api/expenses-v2/[id]/reimburse — mark an expense as reimbursed */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const expense = await ExpenseServiceV2.reimburse(id, session.user.id);
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[expenses-v2/reimburse] error:', e);
    return NextResponse.json({ error: 'failed_to_reimburse_expense' }, { status: 500 });
  }
}
