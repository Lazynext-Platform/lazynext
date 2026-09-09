import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** POST /api/expenses-v2/[id]/approve — approve an expense */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const expense = await ExpenseServiceV2.approve(id, session.user.id);
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[expenses-v2/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_expense' }, { status: 500 });
  }
}
