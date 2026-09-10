import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BudgetingService } from '@/lib/services/budgeting-service';

/** POST /api/budgeting/budgets/[id]/approve — approve a budget */
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
    const budget = await BudgetingService.approveBudget(id, session.user.id);
    if (!budget) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ budget });
  } catch (e) {
    console.error('[budgeting] approve error:', e);
    return NextResponse.json({ error: 'failed_to_approve_budget' }, { status: 500 });
  }
}
